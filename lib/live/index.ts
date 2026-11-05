import { unstable_cache } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mediaItems, mediaPlaces, places, reviews, user } from "@/lib/db/schema";
import { googleUsableSlugs } from "@/lib/providers/google";
import { listPlaceReviews, reviewsTag, type PublicReview } from "@/lib/community/reviews";
import { readProfile, type PlaceProfile } from "@/lib/profile";
import { publishedScoreBySlug, publishedScoresBySlug, type PublishedScore } from "@/lib/score/published";
import type { PublishedMap } from "@/lib/score/publishedCards";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { getStorage } from "@/lib/media/storage";
import { approvedPhotos, coverCandidates, type PublicPhoto } from "@/lib/media/photoArchive";
import { applyRegistry, type LiveCoverMap, type RegistryState } from "@/lib/media/cover";
import { readRegistry } from "@/lib/media/registry";
import { realEntities } from "@/data/real";

/* ──────────────────────────────────────────────────────────────────────────
   CANLI VERİ (sunucu) — yeniden derleme gerektirmeyen, veritabanından okunan sayfa bilgisi.
   · Google ile doğrulanmış restoranlar (onaylı ya da otomatik Place ID) ve gerçek video sayıları.
   · Tek sorgu bütün restoranlar için; sonuç 1 saat önbellekte (Next veri önbelleği). Yönetimde eşleşme onayı,
     bekletme, video ekleme/kaldırma ilgili etiketi hemen geçersiz kılar → sayfalar bir sonraki istekte güncellenir.
   · Veritabanı yoksa ya da hata verirse boş döner: Google kapalı, sayfa bozulmaz.
   ────────────────────────────────────────────────────────────────────────── */

export const TAG_GOOGLE = "google-usable";
export const TAG_MEDIA = "media";
export const TAG_PHOTOS = "photos";
export const TAG_COVERS = "photo-covers";
export const profileTag = (slug: string) => `profile:${slug}`;

export const googleUsable = unstable_cache(async (): Promise<string[]> => {
  try { return (await googleUsableSlugs()) ?? []; } catch { return []; }
}, ["google-usable-v1"], { revalidate: 3600, tags: [TAG_GOOGLE] });

export const videoCounts = unstable_cache(async (): Promise<Record<string, number>> => {
  const db = getDb();
  if (!db) return {};
  try {
    const rows = await db.select({ slug: places.slug, n: sql<number>`count(*)::int` }).from(mediaItems)
      .innerJoin(mediaPlaces, eq(mediaPlaces.mediaId, mediaItems.id)).innerJoin(places, eq(places.id, mediaPlaces.placeId))
      .where(and(eq(mediaItems.status, "approved"), inArray(mediaItems.type, ["embed", "video"]), inArray(mediaItems.platform, ["youtube", "instagram", "tiktok"])))
      .groupBy(places.slug);
    return Object.fromEntries(rows.map((r) => [r.slug, Number(r.n)]));
  } catch { return {}; }
}, ["video-counts-v1"], { revalidate: 3600, tags: [TAG_MEDIA] });

/** Mekânın yayındaki Gidenler deneyimleri. Yayın/düzenleme/silme/moderasyon etiketi hemen geçersiz kılar.
    Veritabanı yoksa ya da hata verirse boş liste (sayfa bozulmaz). */
export function placeReviews(slug: string): Promise<PublicReview[]> {
  return unstable_cache(async () => {
    const db = getDb();
    if (!db) return [];
    try { return await listPlaceReviews(db, slug); } catch { return []; }
  }, ["place-reviews-v1", slug], { revalidate: 3600, tags: [reviewsTag(slug)] })();
}

/** Restoran profili (tanıtım, iletişim, kurallar, olanaklar, resmî menü) — yönetimden uygulanınca etiketi hemen geçersiz kılınır.
    Kayıt yoksa ya da veritabanı hata verirse null: sayfa yalnız mevcut kimlik bilgisini gösterir. */
export function placeProfile(slug: string): Promise<PlaceProfile | null> {
  return unstable_cache(async () => {
    const db = getDb();
    if (!db) return null;
    try { return await readProfile(db, slug); } catch { return null; }
  }, ["place-profile-v1", slug], { revalidate: 3600, tags: [profileTag(slug)] })();
}

export const scoreTag = (slug: string) => `score:${slug}`;
export const TAG_SCORES = "scores";
/** Bir mekânın puanı yazılınca: o mekânın sayfası ve bütün kart listeleri. */
export const scoreTags = (slug: string) => [scoreTag(slug), TAG_SCORES];
/** Kart ve listeler için yayımlanmış puanlar: tek sorgu, ortak önbellek; puan yazılınca etiket hemen geçersiz kılar.
    Yatırımcı demosunda boş (demo kartlar değişmez). Hata/tablo yoksa boş: kartlar "bekleniyor" der, sayfa bozulmaz. */
export const publishedScores = unstable_cache(async (): Promise<PublishedMap> => {
  const db = getDb();
  if (!db || DEMO_VISIBLE) return {};
  try { return await publishedScoresBySlug(db); } catch { return {}; }
}, ["published-scores-v1"], { revalidate: 3600, tags: [TAG_SCORES] });
/** Yayımlanmış Gidenler puanı (rating_history son satırı) — restoran sayfası ve bildirim aynı kaynağı okur.
    Puan yayını (recordScore çağıran yol) etiketi hemen geçersiz kılar. Hata/tablo yoksa null. */
export function placeScore(slug: string): Promise<PublishedScore | null> {
  return unstable_cache(async () => {
    const db = getDb();
    if (!db) return null;
    try { return await publishedScoreBySlug(db, slug); } catch { return null; }
  }, ["place-score-v1", slug], { revalidate: 3600, tags: [scoreTag(slug)] })();
}

/** Onaylı kullanıcı fotoğrafları. Depolama yoksa veritabanına hiç gidilmez (bugünkü Production); hata ya da tablo yoksa boş. */
export function placePhotos(slug: string): Promise<PublicPhoto[]> {
  return unstable_cache(async () => {
    const db = getDb(), storage = getStorage();
    if (!db || !storage || DEMO_VISIBLE) return [];
    try { return await approvedPhotos(db, storage, slug); } catch { return []; }
  }, ["place-photos-v1", slug], { revalidate: 3600, tags: [TAG_PHOTOS] })();
}
/** Mekânın izinli fotoğraf kararı (yönetici editörü). */
export function placeRegistry(slug: string): Promise<RegistryState | null> {
  return unstable_cache(async () => {
    const db = getDb();
    if (!db || DEMO_VISIBLE) return null;
    try { return (await readRegistry(db, slug)).get(slug) ?? null; } catch { return null; }
  }, ["place-registry-v1", slug], { revalidate: 3600, tags: [TAG_COVERS] })();
}
export const liveCovers = unstable_cache(async (): Promise<LiveCoverMap> => {
  const db = getDb(), storage = getStorage();
  if (!db || DEMO_VISIBLE) return {};
  const out: LiveCoverMap = {};
  if (storage) {
    try {
      const m = await coverCandidates(db, storage);
      for (const [k, v] of Object.entries(m)) out[k] = { src: v.photo.src, srcSet: v.photo.srcSet, credit: v.photo.credit, focus: v.photo.focus, selected: v.selected };
    } catch { /* tablo yoksa kullanıcı kapağı yok */ }
  }
  try {
    /* yönetici kararı olan izinli fotoğraflar; kullanıcı fotoğrafından seçilmiş kapak önceliklidir */
    for (const [slug, st] of (await readRegistry(db))) {
      if (out[slug]?.selected) continue;
      const e = realEntities.find((x) => x.slug === slug);
      if (!e) continue;
      const first = st.cover || st.hidden.length ? applyRegistry(e.photos ?? [], st)[0] : undefined;
      if (first) out[slug] = { src: first.src, srcSet: first.srcSet, credit: first.credit, license: first.license, alt: first.alt, focus: first.focus ?? null, selected: true, source: first.addedBy === "işletme" ? "isletme" : first.addedBy === "commons" ? "commons" : "gidenler" };
      else if (st.hidden.length) out[slug] = { ...(out[slug] ?? { src: "", credit: "", focus: null, selected: false }), hideRegistry: true };
    }
  } catch { /* okunamazsa dosyadaki kayıt geçerli */ }
  return out;
}, ["photo-covers-v2"], { revalidate: 3600, tags: [TAG_COVERS] });

/** Son deneyim yazılan gerçek mekânlar: yalnız yayında ve gerçek kullanıcı (test hesabı değil). Kimlik ya da metin dönmez. */
export const recentlyReviewed = unstable_cache(async (): Promise<string[]> => {
  const db = getDb();
  if (!db || DEMO_VISIBLE) return [];
  try {
    const rows = await db.select({ slug: places.slug, at: sql<string>`max(${reviews.createdAt})` }).from(reviews).innerJoin(places, eq(places.id, reviews.placeId)).innerJoin(user, eq(user.id, reviews.userId))
      .where(and(eq(reviews.status, "published"), eq(user.kind, "user"))).groupBy(places.slug).orderBy(sql`max(${reviews.createdAt}) desc`).limit(8);
    return rows.map((r) => r.slug);
  } catch { return []; }
}, ["recently-reviewed-v1"], { revalidate: 600 });
