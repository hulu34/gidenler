import { and, desc, eq, inArray } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { getDb } from "@/lib/db/client";
import { mediaItems, mediaPlaces, places } from "@/lib/db/schema";
import { parseVideoUrl, type VideoPlatform } from "./embed";

/* ──────────────────────────────────────────────────────────────────────────
   MEKÂN VİDEOLARI — mevcut media_items + media_places tabloları (yeni altyapı yok).
   · type "embed", storage_class "id_only": yalnız platform + kimlik + kanonik bağlantı + atıf (credit).
   · Yönetimden eklenen içerik "editor" kaynağıyla doğrudan onaylıdır; kaldırma silmez, status "removed" yapar.
   · YouTube ve TikTok bağlantıları resmî oEmbed ile doğrulanır (anahtarsız, ücretsiz); Instagram oEmbed
     Meta uygulama anahtarı istediği için yalnız bağlantı biçimi doğrulanır.
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
async function oembed(platform: VideoPlatform, url: string, f: typeof fetch): Promise<OEmbed | null | "skip"> {
  const endpoint = platform === "youtube" ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
    : platform === "tiktok" ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}` : null;
  if (!endpoint) return "skip";
  /* TikTok oEmbed bazı ağlardan ara sıra geçici hata verir: en çok 3 deneme */
  for (let i = 0; i < 3; i++) {
    try {
      const r = await f(endpoint, { cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (r.ok) return await r.json() as OEmbed;
      if (r.status === 404 && platform === "youtube") return null;
    } catch { /* yeniden dene */ }
    if (i < 2) await new Promise((res) => setTimeout(res, 800 * (i + 1)));
  }
  return null;
}

export type AddVideoResult =
  | { ok: true; id: string; platform: VideoPlatform; externalId: string; created: boolean }
  | { ok: false; error: "no_db" | "bad_url" | "no_place" | "not_found_on_platform" };

/** Yönetim: mekâna video bağlantısı ekler (aynı bağlantı tekrar eklenirse mevcut kayıt bağlanır). */
export async function addPlaceVideo(input: { slug: string; url: string; credit?: string; category?: string; verifiedElsewhere?: boolean; sponsored?: boolean }, f: typeof fetch = fetch): Promise<AddVideoResult> {
  const db = getDb();
  if (!db) return { ok: false, error: "no_db" };
  let raw = input.url.trim();
  /* TikTok kısa bağlantısı (vm./vt.tiktok.com): resmî oEmbed kimliği verir */
  if (/^https?:\/\/(vm|vt)\.tiktok\.com\//i.test(raw)) {
    const o = await oembed("tiktok", raw, f);
    if (o && o !== "skip" && o.embed_product_id) raw = `https://www.tiktok.com/video/${o.embed_product_id}`;
  }
  const v = parseVideoUrl(raw);
  if (!v) return { ok: false, error: "bad_url" };
  const [p] = await db.select({ id: places.id }).from(places).where(eq(places.slug, input.slug)).limit(1);
  if (!p) return { ok: false, error: "no_place" };
  let o = await oembed(v.platform, v.url, f);
  /* TikTok oEmbed bazı veri merkezlerinden bölgesel olarak "bulunamadı" döner: yönetici bağlantıyı başka ağdan
     doğruladıysa (verifiedElsewhere) yalnız TikTok için kabul edilir; atıf elle ya da @kullanıcı adından gelir. */
  if (o === null && v.platform === "tiktok" && input.verifiedElsewhere) o = "skip";
  if (o === null) return { ok: false, error: "not_found_on_platform" };
  /* atıf: elle girilen > platformun oEmbed'teki kanal adı > bağlantıdaki @kullanıcı adı */
  const handle = raw.match(/(?:tiktok\.com|instagram\.com)\/(@?[A-Za-z0-9._]{2,30})\//)?.[1];
  const fromUrl = handle && !["reel", "reels", "p", "video"].includes(handle) ? (handle.startsWith("@") ? handle : `@${handle}`) : undefined;
  const credit = (input.credit?.trim() || (o !== "skip" ? o.author_name : undefined) || fromUrl || null)?.slice(0, 120) ?? null;

  /* aynı video farklı bağlantı biçimiyle (Shorts / watch / youtu.be) ikinci kayıt olmaz: platform + kimlik tekildir */
  const [dup] = await db.select({ id: mediaItems.id }).from(mediaItems).where(and(eq(mediaItems.platform, v.platform), eq(mediaItems.externalId, v.id))).limit(1);
  if (dup) {
    /* yeniden ekleme: yayına alır; elle atıf verildiyse günceller */
    await db.update(mediaItems).set({ status: "approved", lastCheckedAt: new Date(), ...(input.credit?.trim() ? { credit: input.credit.trim().slice(0, 120) } : {}), ...(input.sponsored !== undefined ? { sponsored: input.sponsored } : {}) }).where(eq(mediaItems.id, dup.id));
    await db.insert(mediaPlaces).values({ mediaId: dup.id, placeId: p.id }).onConflictDoNothing();
    return { ok: true, id: dup.id, platform: v.platform, externalId: v.id, created: false };
  }
  const id = uuidv7();
  const ins = await db.insert(mediaItems).values({
    id, type: "embed", platform: v.platform, url: v.url, externalId: v.id, storageClass: "id_only",
    category: input.category?.slice(0, 32) || "video", credit, source: "editor", status: "approved", lastCheckedAt: new Date(), sponsored: input.sponsored === true,
  }).onConflictDoNothing().returning({ id: mediaItems.id });
  const mediaId = ins[0]?.id ?? (await db.select({ id: mediaItems.id }).from(mediaItems).where(eq(mediaItems.url, v.url)).limit(1))[0]?.id;
  if (!ins.length) await db.update(mediaItems).set({ status: "approved" }).where(eq(mediaItems.id, mediaId));
  await db.insert(mediaPlaces).values({ mediaId, placeId: p.id }).onConflictDoNothing();
  return { ok: true, id: mediaId, platform: v.platform, externalId: v.id, created: ins.length > 0 };
}

/** Yönetim: videoyu yayından kaldırır (kayıt ve geçmiş kalır). */
export async function removePlaceVideo(mediaId: string) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "no_db" };
  const r = await db.update(mediaItems).set({ status: "removed" }).where(eq(mediaItems.id, mediaId)).returning({ id: mediaItems.id });
  return r.length ? { ok: true as const } : { ok: false as const, error: "not_found" };
}
