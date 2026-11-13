import { createHash } from "node:crypto";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { getDb, type Db } from "@/lib/db/client";
import { auditLog, mediaItems, mediaPlaces, places } from "@/lib/db/schema";
import { parseVideoUrl, type VideoPlatform } from "./embed";

/* ──────────────────────────────────────────────────────────────────────────
   MEKÂN VİDEOLARI — mevcut media_items + media_places tabloları (yeni altyapı yok).
   · type "embed", storage_class "id_only": yalnız platform + kimlik + kanonik bağlantı + atıf (credit).
   · Yönetimden eklenen içerik "editor" kaynağıyla doğrudan onaylıdır.
   · YouTube ve TikTok bağlantıları resmî oEmbed ile doğrulanır (anahtarsız, ücretsiz); Instagram oEmbed
     Meta uygulama anahtarı istediği için yalnız bağlantı biçimi doğrulanır.
   Güvenlik sözleşmesi (issue #41):
   · Önce doğrula, sonra yaz: planPlaceVideos ağdan ve veritabanından okur, hiçbir şey yazmaz. Yazım videoLinkQueries ile
     çağıranın TEK işlemine (Neon HTTP batch ya da PostgreSQL transaction) eklenir; okuma-yazma araya girmez.
   · Var olan bir video (başka mekâna bağlı olsun olmasın) yeniden eklenince atfı, sponsorluk işareti ve durumu DEĞİŞMEZ;
     yalnız bu mekânla ilişkisi eklenir. Kaldırılmış (status "removed") video örtük yeniden yayımlanmaz.
   · Mekândan kaldırma yalnız o mekânın ilişkisini siler (unlinkPlaceVideo); başka mekânı etkilemez.
     Videoyu her yerde yayından kaldırmak ayrı ve açık bir küresel moderasyondur (moderateVideoGlobally).
   ────────────────────────────────────────────────────────────────────────── */

export interface PlaceVideo { id: string; platform: VideoPlatform; externalId: string; url: string; credit: string | null; category: string | null; sponsored: boolean }

const PLATFORMS: VideoPlatform[] = ["youtube", "instagram", "tiktok"];

export async function listPlaceVideos(slug: string): Promise<PlaceVideo[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select({ id: mediaItems.id, platform: mediaItems.platform, externalId: mediaItems.externalId, url: mediaItems.url, credit: mediaItems.credit, category: mediaItems.category, sponsored: mediaItems.sponsored })
    .from(mediaItems).innerJoin(mediaPlaces, eq(mediaPlaces.mediaId, mediaItems.id)).innerJoin(places, eq(places.id, mediaPlaces.placeId))
    .where(and(eq(places.slug, slug), eq(mediaItems.status, "approved"), inArray(mediaItems.type, ["embed", "video"]), inArray(mediaItems.platform, PLATFORMS)))
    .orderBy(desc(mediaItems.createdAt)).limit(30);
  return rows.filter((r) => r.externalId).map((r) => ({ ...r, platform: r.platform as VideoPlatform, externalId: r.externalId! }));
}

type OEmbed = { author_name?: string; title?: string; embed_product_id?: string };
/** oEmbed sonucu: bulundu | bulunamadı (404) | gömmeye kapalı (401/403) | ulaşılamadı (ağ/zaman aşımı/5xx) | denetlenmez (Instagram) */
export type OEmbedResult = { kind: "ok"; data: OEmbed } | { kind: "not_found" } | { kind: "not_embeddable" } | { kind: "unavailable" } | { kind: "skip" };
/** Yalnız yerel/Preview test kancası: gerçek ağ hatasını ya da bulunamayan videoyu taklit eder (Production'da çağıran yok sayar). */
export type OEmbedSimulation = "network" | "not_found";

async function oembed(platform: VideoPlatform, url: string, f: typeof fetch, simulate?: OEmbedSimulation): Promise<OEmbedResult> {
  const endpoint = platform === "youtube" ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
    : platform === "tiktok" ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}` : null;
  if (!endpoint) return { kind: "skip" };
  if (simulate === "network") return { kind: "unavailable" };
  if (simulate === "not_found") return { kind: "not_found" };
  /* TikTok oEmbed bazı ağlardan ara sıra geçici hata verir: en çok 3 deneme */
  let last: OEmbedResult = { kind: "unavailable" };
  for (let i = 0; i < 3; i++) {
    try {
      const r = await f(endpoint, { cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (r.ok) return { kind: "ok", data: await r.json() as OEmbed };
      if (r.status === 404 || r.status === 400) { last = { kind: "not_found" }; if (platform === "youtube") return last; }
      else if (r.status === 401 || r.status === 403) { last = { kind: "not_embeddable" }; if (platform === "youtube") return last; }
      else last = { kind: "unavailable" };
    } catch { last = { kind: "unavailable" }; }
    if (i < 2) await new Promise((res) => setTimeout(res, 800 * (i + 1)));
  }
  return last;
}

export interface VideoInput { url: string; credit?: string; category?: string; sponsored?: boolean; verifiedElsewhere?: boolean }
export type VideoPlanError = "bad_url" | "not_found_on_platform" | "not_embeddable" | "oembed_unavailable" | "media_removed";
/** Tek videonun planı. existing: kayıt önceden vardı (atfı/sponsorluğu/durumu korunur); relationExisted: bu mekâna zaten bağlıydı. */
export type VideoPlanItem =
  | { ok: true; index: number; platform: VideoPlatform; externalId: string; url: string; mediaId: string; existing: boolean; relationExisted: boolean; duplicateOf?: number;
      insert?: typeof mediaItems.$inferInsert; keptMetadata?: { credit: string | null; sponsored: boolean; status: string } }
  | { ok: false; index: number; url: string; error: VideoPlanError };
export type VideoPlan = { ok: true; placeId: string; items: Extract<VideoPlanItem, { ok: true }>[] } | { ok: false; placeId: string; items: VideoPlanItem[] };

/** Yeni video kaydının kimliği platform + video kimliğinden türetilir: eşzamanlı iki ekleme aynı kayda bağlanır. */
const mediaIdFor = (platform: string, externalId: string) => `vid_${createHash("sha256").update(`${platform}:${externalId}`).digest("hex").slice(0, 24)}`;

/** Okur, doğrular, plan çıkarır; HİÇBİR ŞEY yazmaz. Bir video bile geçersizse plan ok:false olur (çağıran hiçbir şey yazmamalı). */
export async function planPlaceVideos(db: Db, placeId: string, inputs: VideoInput[], f: typeof fetch = fetch, simulate?: OEmbedSimulation): Promise<VideoPlan> {
  const out: VideoPlanItem[] = [];
  const seen = new Map<string, number>();
  for (const [index, input] of inputs.entries()) {
    let raw = input.url.trim();
    if (/^https?:\/\/(vm|vt)\.tiktok\.com\//i.test(raw)) {
      const o = await oembed("tiktok", raw, f, simulate);
      if (o.kind === "ok" && o.data.embed_product_id) raw = `https://www.tiktok.com/video/${o.data.embed_product_id}`;
    }
    const v = parseVideoUrl(raw);
    if (!v) { out.push({ ok: false, index, url: input.url, error: "bad_url" }); continue; }
    const key = `${v.platform}:${v.id}`;
    /* aynı video aynı istekte iki biçimde (watch + Shorts) verildiyse tek ilişki */
    if (seen.has(key)) { const first = out[seen.get(key)!]; if (first.ok) out.push({ ...first, index, duplicateOf: first.index, insert: undefined }); else out.push({ ...first, index }); continue; }
    seen.set(key, out.length);
    let o = await oembed(v.platform, v.url, f, simulate);
    if (o.kind === "not_found" && v.platform === "tiktok" && input.verifiedElsewhere) o = { kind: "skip" };
    if (o.kind === "not_found") { out.push({ ok: false, index, url: input.url, error: "not_found_on_platform" }); continue; }
    if (o.kind === "not_embeddable") { out.push({ ok: false, index, url: input.url, error: "not_embeddable" }); continue; }
    if (o.kind === "unavailable") { out.push({ ok: false, index, url: input.url, error: "oembed_unavailable" }); continue; }
    const [dup] = await db.select({ id: mediaItems.id, credit: mediaItems.credit, sponsored: mediaItems.sponsored, status: mediaItems.status })
      .from(mediaItems).where(and(eq(mediaItems.platform, v.platform), eq(mediaItems.externalId, v.id))).limit(1);
    if (dup && dup.status !== "approved") { out.push({ ok: false, index, url: input.url, error: "media_removed" }); continue; }
    const rel = dup ? (await db.select({ m: mediaPlaces.mediaId }).from(mediaPlaces).where(and(eq(mediaPlaces.mediaId, dup.id), eq(mediaPlaces.placeId, placeId))).limit(1)).length > 0 : false;
    if (dup) { out.push({ ok: true, index, platform: v.platform, externalId: v.id, url: v.url, mediaId: dup.id, existing: true, relationExisted: rel, keptMetadata: { credit: dup.credit, sponsored: dup.sponsored, status: dup.status } }); continue; }
    const handle = raw.match(/(?:tiktok\.com|instagram\.com)\/(@?[A-Za-z0-9._]{2,30})\//)?.[1];
    const fromUrl = handle && !["reel", "reels", "p", "video"].includes(handle) ? (handle.startsWith("@") ? handle : `@${handle}`) : undefined;
    const credit = (input.credit?.trim() || (o.kind === "ok" ? o.data.author_name : undefined) || fromUrl || null)?.slice(0, 120) ?? null;
    const mediaId = mediaIdFor(v.platform, v.id);
    out.push({ ok: true, index, platform: v.platform, externalId: v.id, url: v.url, mediaId, existing: false, relationExisted: false,
      insert: { id: mediaId, type: "embed", platform: v.platform, url: v.url, externalId: v.id, storageClass: "id_only", category: input.category?.slice(0, 32) || "video", credit, source: "editor", status: "approved", lastCheckedAt: new Date(), sponsored: input.sponsored === true } });
  }
  return out.every((x) => x.ok) ? { ok: true, placeId, items: out as Extract<VideoPlanItem, { ok: true }>[] } : { ok: false, placeId, items: out };
}

/** Planın yazımı: çağıranın tek işlemine eklenecek sorgular (okuma yok). Var olan kayda dokunulmaz, yalnız ilişki eklenir. */
export function videoLinkQueries(q: Db, plan: Extract<VideoPlan, { ok: true }>) {
  const qs: PromiseLike<unknown>[] = [];
  for (const it of plan.items) {
    if (it.duplicateOf !== undefined) continue;
    if (it.insert) qs.push(q.insert(mediaItems).values(it.insert).onConflictDoNothing());
    if (!it.relationExisted) qs.push(q.insert(mediaPlaces).values({ mediaId: it.mediaId, placeId: plan.placeId }).onConflictDoNothing());
  }
  return qs;
}

/** Denetim kaydına yazılan iz: geri alma yalnız bu uygulamanın eklediği ilişkileri ve oluşturduğu kayıtları hedefler. */
export const videoTrace = (plan: Extract<VideoPlan, { ok: true }>) => plan.items.filter((it) => it.duplicateOf === undefined)
  .map((it) => ({ mediaId: it.mediaId, platform: it.platform, externalId: it.externalId, created: !it.existing, relationAdded: !it.relationExisted }));

/** Tek işlem yardımcı: Neon HTTP'de batch (non-interactive transaction), PGlite/pg'de transaction. */
async function atomicQ(db: Db, build: (q: Db) => PromiseLike<unknown>[]) {
  const batch = (db as unknown as { batch?: (qs: PromiseLike<unknown>[]) => Promise<unknown> }).batch;
  if (typeof batch === "function") { await batch.call(db, build(db)); return; }
  await db.transaction(async (tx) => { for (const s of build(tx as unknown as Db)) await s; });
}

export type AddVideoResult =
  | { ok: true; id: string; platform: VideoPlatform; externalId: string; created: boolean; relationAdded: boolean; keptMetadata?: { credit: string | null; sponsored: boolean; status: string } }
  | { ok: false; error: "no_db" | "no_place" | VideoPlanError };

/** Yönetim: mekâna tek video bağlar. Var olan kaydın atfı/sponsorluğu/durumu değişmez; kaldırılmış video yeniden yayımlanmaz. */
export async function addPlaceVideo(input: { slug: string } & VideoInput, f: typeof fetch = fetch, dbArg?: Db | null): Promise<AddVideoResult> {
  const db = dbArg ?? getDb();
  if (!db) return { ok: false, error: "no_db" };
  const [p] = await db.select({ id: places.id }).from(places).where(eq(places.slug, input.slug)).limit(1);
  if (!p) return { ok: false, error: "no_place" };
  const plan = await planPlaceVideos(db, p.id, [input], f);
  if (!plan.ok) { const e = plan.items[0]; return { ok: false, error: (e.ok ? "bad_url" : e.error) as VideoPlanError }; }
  const it = plan.items[0];
  await atomicQ(db, (q) => [...videoLinkQueries(q, plan),
    q.insert(auditLog).values({ id: uuidv7(), actor: "admin", action: "media_link", refTable: "places", refId: p.id, detail: { slug: input.slug, media: videoTrace(plan) } })]);
  return { ok: true, id: it.mediaId, platform: it.platform, externalId: it.externalId, created: !it.existing, relationAdded: !it.relationExisted, ...(it.keptMetadata ? { keptMetadata: it.keptMetadata } : {}) };
}

/** Yönetim: videoyu YALNIZ bu mekândan kaldırır (ilişkiyi siler); başka mekânlardaki görünümü ve kaydın kendisi değişmez.
    Video bu mekâna bağlı değilse reddedilir (yanlış mekân/kimlik). */
export async function unlinkPlaceVideo(slug: string, mediaId: string, dbArg?: Db | null) {
  const db = dbArg ?? getDb();
  if (!db) return { ok: false as const, error: "no_db" };
  const [p] = await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)).limit(1);
  if (!p) return { ok: false as const, error: "no_place" };
  const [rel] = await db.select({ m: mediaPlaces.mediaId }).from(mediaPlaces).where(and(eq(mediaPlaces.mediaId, mediaId), eq(mediaPlaces.placeId, p.id))).limit(1);
  if (!rel) return { ok: false as const, error: "not_linked_to_place" };
  await atomicQ(db, (q) => [
    q.delete(mediaPlaces).where(and(eq(mediaPlaces.mediaId, mediaId), eq(mediaPlaces.placeId, p.id))),
    q.insert(auditLog).values({ id: uuidv7(), actor: "admin", action: "media_unlink", refTable: "places", refId: p.id, detail: { slug, mediaId } }),
  ]);
  const others = await db.select({ placeId: mediaPlaces.placeId }).from(mediaPlaces).where(and(eq(mediaPlaces.mediaId, mediaId), ne(mediaPlaces.placeId, p.id)));
  return { ok: true as const, slug, mediaId, otherPlaces: others.length };
}

/** Yönetim: AÇIK küresel moderasyon — videoyu her mekânda yayından kaldırır (kayıt ve geçmiş kalır). Mekân ilişkileri silinmez. */
export async function moderateVideoGlobally(mediaId: string, dbArg?: Db | null) {
  const db = dbArg ?? getDb();
  if (!db) return { ok: false as const, error: "no_db" };
  const linked = await db.select({ placeId: mediaPlaces.placeId }).from(mediaPlaces).where(eq(mediaPlaces.mediaId, mediaId));
  const r = await db.update(mediaItems).set({ status: "removed" }).where(eq(mediaItems.id, mediaId)).returning({ id: mediaItems.id });
  if (!r.length) return { ok: false as const, error: "not_found" };
  await db.insert(auditLog).values({ id: uuidv7(), actor: "admin", action: "media_remove_global", refTable: "media_items", refId: null, detail: { mediaId, places: linked.map((x) => x.placeId) } });
  return { ok: true as const, mediaId, places: linked.length };
}
