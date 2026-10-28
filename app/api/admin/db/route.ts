import { after, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { TAG_GOOGLE, TAG_MEDIA, profileTag } from "@/lib/live";
import { applyProfile, ProfileInput, readProfile, rollbackProfile } from "@/lib/profile";
import { uuidv7 } from "uuidv7";
import { getDb } from "@/lib/db/client";
import { executorFor } from "@/lib/db/executors";
import { applyMigrations, migrationStatus } from "@/lib/db/migrate";
import { seedRealVenues, verifyRealVenues } from "@/lib/db/seed";
import { rollbackSeed, rollbackSeedPreview, rollbackMigration, rollbackMigrationPreview, rollbackWave, rollbackWavePreview } from "@/lib/db/rollback";
import { realVenueRecords } from "@/data/real";
import { dbFingerprint, previewWriteGuard } from "@/lib/db/fingerprint";
import { missingByRestaurant, qualityReport } from "@/lib/db/quality";
import { redisSelfTest } from "@/lib/usage/selftest";
import { redisAudit } from "@/lib/usage/audit";
import { googleMatchStats, matchGoogleBatch, pendingGoogleMatches, reviewGoogleMatch, googleEnabled, rollbackGoogleMatches, syncGoogleQueue, googleQueueStats, retryGoogleNoMatch, holdGoogleMatches, googleUsableSlugs } from "@/lib/providers/google";
import { usageSnapshot, spendReport, googlePause } from "@/lib/usage/counter";
import { addPlaceVideo, listPlaceVideos, removePlaceVideo } from "@/lib/media/store";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { moderateReview, reviewsTag } from "@/lib/community/reviews";
import { and, desc, eq, inArray } from "drizzle-orm";
import { auditLog, fieldProvenance, menuItems, moderationQueue, places, reviews } from "@/lib/db/schema";

/* ──────────────────────────────────────────────────────────────────────────
   /api/admin/db — KONTROLLÜ GEÇİŞ, TOHUM VE GERİ DÖNÜŞ (derlemede otomatik çalışmaz).
   Koruma:
   1. Yalnız dağıtıma özgü adresten (VERCEL_URL, ör. gidenler-ab12cd-…vercel.app) çalışır. Bu adresler
      Vercel Authentication ile korunur; herkese açık alan adlarında (gidenler.vercel.app, gidenler.com) 404.
   2. Her ortam kendi veritabanını değiştirir: Preview → Neon "preview/<dal>" dalı; Production → ana dal.
   3. Yazma: aynı köken + POST + { confirm: "EVET", target: <bu dağıtımın ortamı> }.
      Geri alma ayrıca { confirm: "GERI-AL" } ister ve kullanıcı verisi varsa durur.
   ────────────────────────────────────────────────────────────────────────── */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const H = { "Cache-Control": "no-store" };
/* sayfalarda gösterilen canlı veriyi değiştiren yönetim işlemleri: ilgili önbellek etiketi hemen geçersiz */
/* yanıt gönderildikten SONRA (veritabanı yazıldıktan sonra) çalışır; arada eski veri önbelleğe girmez */
const fresh = (tag: string) => { try { after(() => revalidateTag(tag)); } catch { /* istek dışı ortam (test) */ } };
const nf = () => new NextResponse(null, { status: 404 });
const envName = () => process.env.VERCEL_ENV ?? "local";

/** Vercel'de: istek yalnız bu dağıtımın kendine özgü (korumalı) adresine geldiyse. Yerelde: DB_ADMIN_LOCAL=1. */
function allowed(req: Request) {
  if (!process.env.VERCEL) return process.env.DB_ADMIN_LOCAL === "1";
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  const own = (process.env.VERCEL_URL ?? "").toLowerCase();
  return !!own && host === own;
}

const dbUrl = () => (DEMO_VISIBLE ? undefined : process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
function exec() {
  const url = dbUrl();
  return url ? executorFor(url) : null;
}
const fail = (e: unknown, status = 500) =>
  NextResponse.json({ error: "failed", message: e instanceof Error ? e.message.slice(0, 300) : "error" }, { status, headers: H });

export async function GET(req: Request) {
  if (!allowed(req)) return nf();
  /* ?rapor=google → eşleşme sayıları, onay bekleyenler (yalnız place_id + bizim kayıtlarımız), SKU bazında kullanım */
  if (new URL(req.url).searchParams.get("rapor") === "google") {
    try { return NextResponse.json({ env: envName(), enabled: googleEnabled(), stats: await googleMatchStats(), queue: await googleQueueStats(), pending: await pendingGoogleMatches(), usage: await usageSnapshot(), spend: await spendReport(), pause: await googlePause() }, { headers: H }); }
    catch (e) { return fail(e); }
  }
  /* ?rapor=google-slug → Google içeriği gösterilebilen restoranlar (yalnız okuma; sayfalar lib/live ile dinamik okur) */
  if (new URL(req.url).searchParams.get("rapor") === "google-slug") {
    try { return NextResponse.json({ env: envName(), slugs: await googleUsableSlugs() }, { headers: H }); } catch (e) { return fail(e); }
  }
  /* ?rapor=profil&slug=… → restoran profili (yalnız okuma) */
  if (new URL(req.url).searchParams.get("rapor") === "profil") {
    const db = getDb(); const slug = new URL(req.url).searchParams.get("slug") ?? "";
    if (!db) return NextResponse.json({ error: "no_database" }, { status: 503, headers: H });
    try {
      const [pl] = await db.select({ id: places.id, address: places.address, phone: places.phone, website: places.website, instagram: places.instagram, openingHours: places.openingHours }).from(places).where(eq(places.slug, slug)).limit(1);
      const count = async (t: typeof menuItems | typeof fieldProvenance) => (pl ? (await db.select({ id: t.id }).from(t).where(eq(t.placeId, pl.id))).length : 0);
      const audits = pl ? await db.select({ id: auditLog.id, action: auditLog.action, at: auditLog.at }).from(auditLog).where(and(eq(auditLog.refId, pl.id), inArray(auditLog.action, ["profile_apply", "profile_rollback"]))).orderBy(desc(auditLog.at)).limit(5) : [];
      return NextResponse.json({ env: envName(), slug, place: pl ?? null, counts: { menuRows: await count(menuItems), provRows: await count(fieldProvenance) }, audits, profile: await readProfile(db, slug), videos: await listPlaceVideos(slug) }, { headers: H });
    } catch (e) { return fail(e); }
  }
  /* ?rapor=redis → yalnız okuma: önek grubu başına anahtar sayısı (değer yok) */
  /* ?rapor=yorumlar → açık şikâyet / spam kayıtları ve ilgili deneyimin durumu (metin dahil; yalnız yönetim) */
  if (new URL(req.url).searchParams.get("rapor") === "yorumlar") {
    const db = getDb();
    if (!db) return NextResponse.json({ error: "no_database" }, { status: 503, headers: H });
    try {
      const open = await db.select({ q: moderationQueue, status: reviews.status, body: reviews.body }).from(moderationQueue)
        .leftJoin(reviews, eq(reviews.id, moderationQueue.refId))
        .where(and(eq(moderationQueue.status, "open"), inArray(moderationQueue.kind, ["review_report", "review_spam"]))).orderBy(desc(moderationQueue.createdAt)).limit(200);
      return NextResponse.json({ env: envName(), open }, { headers: H });
    } catch (e) { return fail(e); }
  }
  if (new URL(req.url).searchParams.get("rapor") === "redis") {
    try { return NextResponse.json({ env: envName(), ...(await redisAudit()) }, { headers: H }); } catch (e) { return fail(e); }
  }
  const x = exec(), db = getDb();
  if (!x || !db) return NextResponse.json({ error: "no_database" }, { status: 503, headers: H });
  try {
    /* ?rapor=eksik → restoran başına eksik alan listesi */
    if (new URL(req.url).searchParams.get("rapor") === "eksik") return NextResponse.json({ env: envName(), restaurants: await missingByRestaurant(x) }, { headers: H });
    const migrations = await migrationStatus(x);
    const ready = !migrations.pending.length;
    const integrity = ready ? await verifyRealVenues(db, realVenueRecords).catch(() => null) : null;
    const waves = [...new Set(realVenueRecords.map((r) => r.wave ?? 0))].filter((w) => w > 0);
    const rollback = ready ? {
      seed: await rollbackSeedPreview(x), migration: await rollbackMigrationPreview(x),
      waves: Object.fromEntries(await Promise.all(waves.map(async (w) => [w, await rollbackWavePreview(x, realVenueRecords.filter((r) => r.wave === w).map((r) => r.slug))]))),
    } : null;
    const quality = ready ? await qualityReport(x).catch(() => null) : null;
    return NextResponse.json({ env: envName(), db: { fingerprint: dbFingerprint(dbUrl()), writeGuard: previewWriteGuard(dbUrl()) }, migrations, integrity, rollback, quality }, { headers: H });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  if (!allowed(req)) return nf();
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return NextResponse.json({ error: "cross_site" }, { status: 403, headers: H });
  let body: { action?: string; confirm?: string; target?: string; wave?: number; limit?: number; id?: string; decision?: string; slug?: string; url?: string; credit?: string; category?: string; slugs?: string[]; why?: string; verifiedElsewhere?: boolean; profile?: Record<string, unknown>; simulateFailure?: boolean; auditId?: string } = {};
  try { body = await req.json(); } catch { /* boş */ }
  if (body.target !== envName()) return NextResponse.json({ error: "target_mismatch", expected: envName() }, { status: 400, headers: H });
  const guard = previewWriteGuard(dbUrl());
  if (!guard.ok) return NextResponse.json({ error: "write_locked", reason: guard.reason }, { status: 409, headers: H });
  /* Redis öz testi veritabanına dokunmaz; yazma kilidinden önce değil, onay ve hedef kontrolünden sonra. */
  if (body.action === "redis-selftest") {
    if (body.confirm !== "EVET") return NextResponse.json({ error: "confirm_required" }, { status: 400, headers: H });
    try { return NextResponse.json({ action: "redis-selftest", env: envName(), ...(await redisSelfTest()) }, { headers: H }); }
    catch (e) { return fail(e); }
  }
  const x = exec(), db = getDb();
  if (!x || !db) return NextResponse.json({ error: "no_database" }, { status: 503, headers: H });
  try {
    switch (body.action) {
      case "migrate":
        if (body.confirm !== "EVET") break;
        return NextResponse.json({ action: "migrate", env: envName(), ...(await applyMigrations(x)) }, { headers: H });
      case "seed": {
        if (body.confirm !== "EVET") break;
        const st = await migrationStatus(x);
        if (st.pending.length) return NextResponse.json({ error: "pending_migrations", pending: st.pending }, { status: 409, headers: H });
        const r = await seedRealVenues(db, realVenueRecords);
        return NextResponse.json({ action: "seed", env: envName(), ...r, integrity: await verifyRealVenues(db, realVenueRecords) }, { headers: H });
      }
      case "rollback-seed":
        if (body.confirm !== "GERI-AL") break;
        return NextResponse.json({ action: "rollback-seed", env: envName(), ...(await rollbackSeed(x)) }, { headers: H });
      case "google-match": {
        fresh(TAG_GOOGLE);
        /* Ücretli: her çağrı Redis kota kontrolünden geçer; tek seferde en çok 25 restoran. */
        if (body.confirm !== "EVET") break;
        /* Harcama takibi okunamıyorsa ücretli toplu iş hiç başlamaz. */
        const before = await spendReport();
        if (!before) return NextResponse.json({ error: "spend_unknown" }, { status: 503, headers: H });
        const r = await matchGoogleBatch(Number(body.limit) || 20);
        return NextResponse.json({ action: "google-match", env: envName(), ...r, stats: await googleMatchStats(), usage: await usageSnapshot(), spend: await spendReport() }, { headers: H });
      }
      case "google-review": {
        fresh(TAG_GOOGLE);
        if (body.confirm !== "EVET" || !body.id || !["confirmed", "rejected"].includes(body.decision ?? "")) break;
        return NextResponse.json({ action: "google-review", ...(await reviewGoogleMatch(body.id, body.decision as "confirmed" | "rejected")) }, { headers: H });
      }
      case "google-hold": {
        fresh(TAG_GOOGLE);
        /* Şüpheli otomatik eşleşmeleri gösterimden çeker (silmez). */
        if (body.confirm !== "EVET" || !Array.isArray(body.slugs) || !body.slugs.length) break;
        return NextResponse.json({ action: "google-hold", env: envName(), ...(await holdGoogleMatches(body.slugs.map(String), body.why ?? "canlı öncesi denetim")), stats: await googleMatchStats() }, { headers: H });
      }
      case "media-add": {
        fresh(TAG_MEDIA);
        /* Mekâna video bağlantısı (YouTube / Instagram / TikTok). Yalnız kimlik ve atıf saklanır. */
        if (body.confirm !== "EVET" || !body.slug || !body.url) break;
        const r = await addPlaceVideo({ slug: body.slug, url: body.url, credit: body.credit, category: body.category, verifiedElsewhere: body.verifiedElsewhere === true });
        return NextResponse.json({ action: "media-add", env: envName(), ...r, videos: await listPlaceVideos(body.slug) }, { status: r.ok ? 200 : 400, headers: H });
      }
      case "profile-apply": {
        /* Restoran profili: content/profiles/<slug>.json. Profil kısmı TEK işlemde yazılır (yarıda kalırsa hiçbiri kalmaz);
           mevcut veri silinmez, önceki değerler ve eklenen kayıtlar denetim kaydında. Videolar ayrı eklenir ve ayrı raporlanır. */
        if (body.confirm !== "EVET" || !body.profile) break;
        const { videos, _kaynak_notu: _n, ...rest } = body.profile as { videos?: { url: string; credit?: string; category?: string; sponsored?: boolean }[]; _kaynak_notu?: string };
        void _n;
        const parsed = ProfileInput.safeParse(rest);
        if (!parsed.success) return NextResponse.json({ error: "invalid_profile", issues: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400, headers: H });
        /* zorlanan hata yalnız test ortamında (Preview / yerel) */
        const failMidway = body.simulateFailure === true && envName() !== "production";
        let r;
        try { r = await applyProfile(db, parsed.data, { failMidway }); }
        catch (e) { fresh(profileTag(parsed.data.slug)); return NextResponse.json({ action: "profile-apply", env: envName(), ok: false, error: "apply_failed_rolled_back", message: e instanceof Error ? e.message.slice(0, 200) : "error", profile: await readProfile(db, parsed.data.slug) }, { status: 500, headers: H }); }
        if (!r.ok) return NextResponse.json({ action: "profile-apply", env: envName(), ...r }, { status: 400, headers: H });
        const v: Awaited<ReturnType<typeof addPlaceVideo>>[] = [];
        for (const it of Array.isArray(videos) ? videos.slice(0, 20) : []) v.push(await addPlaceVideo({ slug: parsed.data.slug, url: it.url, credit: it.credit, category: it.category, sponsored: it.sponsored === true }));
        const vOk = v.filter((x) => x.ok).length;
        if (v.length) await db.insert(auditLog).values({ id: uuidv7(), actor: "admin", action: "profile_videos", refTable: "places", refId: null, detail: { slug: parsed.data.slug, of: r.auditId, media: v.map((x) => (x.ok ? { id: x.id, created: x.created } : { error: x.error })) } });
        fresh(profileTag(parsed.data.slug)); fresh(TAG_MEDIA);
        const complete = vOk === v.length;
        return NextResponse.json({ action: "profile-apply", env: envName(), ...r, ok: complete, profileOk: true, videosOk: vOk, videosTotal: v.length, videos: v, profile: await readProfile(db, parsed.data.slug) }, { status: complete ? 200 : 207, headers: H });
      }
      case "profile-rollback": {
        /* Veri geri dönüşü: bir profile_apply kaydını geri alır (kimlik alanları + olanaklar önceki değerine, o uygulamanın kaynak kayıtları kaldırılır). */
        if (body.confirm !== "GERI-AL" || typeof body.auditId !== "string") break;
        const r = await rollbackProfile(db, body.auditId);
        if (r.ok) fresh(profileTag(r.slug));
        return NextResponse.json({ action: "profile-rollback", env: envName(), ...r }, { status: r.ok ? 200 : 400, headers: H });
      }
      case "review-hide":
      case "review-restore": {
        /* Moderasyon: deneyimi gizle / geri yayınla (silmez). */
        if (body.confirm !== "EVET" || typeof body.id !== "string") break;
        const slug = await moderateReview(db, "admin", body.id, body.action === "review-hide" ? "hide" : "restore");
        if (slug) fresh(reviewsTag(slug));
        return NextResponse.json({ action: body.action, env: envName(), ok: !!slug }, { headers: H });
      }
      case "media-remove": {
        fresh(TAG_MEDIA);
        if (body.confirm !== "EVET" || !body.id) break;
        return NextResponse.json({ action: "media-remove", env: envName(), ...(await removePlaceVideo(body.id)) }, { headers: H });
      }
      case "google-retry": {
        fresh(TAG_GOOGLE);
        /* Ücretli: eşleşmeyenler için alternatif arama; tek seferde en çok 15 restoran, her biri 30 günde bir kez. */
        if (body.confirm !== "EVET") break;
        const before = await spendReport();
        if (!before) return NextResponse.json({ error: "spend_unknown" }, { status: 503, headers: H });
        const r = await retryGoogleNoMatch(Number(body.limit) || 10);
        return NextResponse.json({ action: "google-retry", env: envName(), ...r, stats: await googleMatchStats(), spend: await spendReport() }, { headers: H });
      }
      case "google-queue-sync": {
        /* Onaylanmış/reddedilmiş eşleşmelerin açık kuyruk satırlarını kapatır; silmez. */
        if (body.confirm !== "EVET") break;
        return NextResponse.json({ action: "google-queue-sync", env: envName(), ...(await syncGoogleQueue()), stats: await googleMatchStats() }, { headers: H });
      }
      case "rollback-google": {
        fresh(TAG_GOOGLE);
        /* Yalnız Google eşleşmeleri (pilot geri alma); başka hiçbir veriye dokunmaz. */
        if (body.confirm !== "GERI-AL") break;
        return NextResponse.json({ action: "rollback-google", env: envName(), ...(await rollbackGoogleMatches()) }, { headers: H });
      }
      case "rollback-wave": {
        if (body.confirm !== "GERI-AL") break;
        /* Dalga 0 (ilk 148) bu yolla silinemez; onun için rollback-seed. */
        if (!Number.isInteger(body.wave) || body.wave! < 1) return NextResponse.json({ error: "wave_required" }, { status: 400, headers: H });
        const slugs = realVenueRecords.filter((r) => r.wave === body.wave).map((r) => r.slug);
        return NextResponse.json({ action: "rollback-wave", wave: body.wave, env: envName(), ...(await rollbackWave(x, slugs)) }, { headers: H });
      }
      case "rollback-migration":
        if (body.confirm !== "GERI-AL") break;
        return NextResponse.json({ action: "rollback-migration", env: envName(), ...(await rollbackMigration(x)) }, { headers: H });
      default:
        return NextResponse.json({ error: "unknown_action" }, { status: 400, headers: H });
    }
    return NextResponse.json({ error: "confirm_required" }, { status: 400, headers: H });
  } catch (e) { return fail(e, 409); }
}
