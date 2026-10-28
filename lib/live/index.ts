import { unstable_cache } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mediaItems, mediaPlaces, places } from "@/lib/db/schema";
import { googleUsableSlugs } from "@/lib/providers/google";
import { listPlaceReviews, reviewsTag, type PublicReview } from "@/lib/community/reviews";
import { readProfile, type PlaceProfile } from "@/lib/profile";

/* ──────────────────────────────────────────────────────────────────────────
   CANLI VERİ (sunucu) — yeniden derleme gerektirmeyen, veritabanından okunan sayfa bilgisi.
   · Google ile doğrulanmış restoranlar (onaylı ya da otomatik Place ID) ve gerçek video sayıları.
   · Tek sorgu bütün restoranlar için; sonuç 1 saat önbellekte (Next veri önbelleği). Yönetimde eşleşme onayı,
     bekletme, video ekleme/kaldırma ilgili etiketi hemen geçersiz kılar → sayfalar bir sonraki istekte güncellenir.
   · Veritabanı yoksa ya da hata verirse boş döner: Google kapalı, sayfa bozulmaz.
   ────────────────────────────────────────────────────────────────────────── */

export const TAG_GOOGLE = "google-usable";
export const TAG_MEDIA = "media";
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
