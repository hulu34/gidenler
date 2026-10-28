import { NextResponse } from "next/server";
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
import { googleMatchStats, matchGoogleBatch, pendingGoogleMatches, reviewGoogleMatch, googleEnabled, rollbackGoogleMatches, syncGoogleQueue, googleQueueStats, retryGoogleNoMatch } from "@/lib/providers/google";
import { usageSnapshot, spendReport } from "@/lib/usage/counter";
import { DEMO_VISIBLE } from "@/data/demoFlag";

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
    try { return NextResponse.json({ env: envName(), enabled: googleEnabled(), stats: await googleMatchStats(), queue: await googleQueueStats(), pending: await pendingGoogleMatches(), usage: await usageSnapshot(), spend: await spendReport() }, { headers: H }); }
    catch (e) { return fail(e); }
  }
  /* ?rapor=redis → yalnız okuma: önek grubu başına anahtar sayısı (değer yok) */
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
  let body: { action?: string; confirm?: string; target?: string; wave?: number; limit?: number; id?: string; decision?: string } = {};
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
        /* Ücretli: her çağrı Redis kota kontrolünden geçer; tek seferde en çok 25 restoran. */
        if (body.confirm !== "EVET") break;
        /* Harcama takibi okunamıyorsa ücretli toplu iş hiç başlamaz. */
        const before = await spendReport();
        if (!before) return NextResponse.json({ error: "spend_unknown" }, { status: 503, headers: H });
        const r = await matchGoogleBatch(Number(body.limit) || 20);
        return NextResponse.json({ action: "google-match", env: envName(), ...r, stats: await googleMatchStats(), usage: await usageSnapshot(), spend: await spendReport() }, { headers: H });
      }
      case "google-review": {
        if (body.confirm !== "EVET" || !body.id || !["confirmed", "rejected"].includes(body.decision ?? "")) break;
        return NextResponse.json({ action: "google-review", ...(await reviewGoogleMatch(body.id, body.decision as "confirmed" | "rejected")) }, { headers: H });
      }
      case "google-retry": {
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
