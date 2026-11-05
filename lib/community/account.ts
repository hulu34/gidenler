import { eq, inArray } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "@/lib/db/client";
import { auditLog, places, reviews, user } from "@/lib/db/schema";
import type { MediaStorage } from "@/lib/media/storage";
import { removeUserPhotos } from "@/lib/media/photoArchive";
import { recomputePlace } from "@/lib/score/compute";

/* HESAP KAPATMA — kullanıcının kendi isteğiyle, geri alınamaz.
   Sıra: 1) fotoğraflar yayından düşer, dosyaları silinir (silinemeyen dosya temizlik kuyruğunda kalır ve görev tamamlar)
         2) etkilenen mekânlar not edilir  3) kullanıcı satırı silinir: oturum, bağlı hesap, deneyim, liste, bildirim ve eşikler
            veritabanı ilişkisiyle (cascade) gider  4) etkilenen mekânların Gidenler puanı yeniden hesaplanır.
   Denetim kaydı silinmez (sahibin kuralı); yalnız kullanıcı kimliği ve sayılar yazılır, e-posta ya da metin yazılmaz.
   AÇIK KARARLAR (hukuk görüşü): denetim kaydı ve moderasyon kanıtlarının saklama süresi, silme talebinin kimlik doğrulaması.
   Production'da ACCOUNT_DELETE_ENABLED=1 olmadan kapalıdır. */
export const accountDeleteEnabled = (env: NodeJS.ProcessEnv = process.env) => env.ACCOUNT_DELETE_ENABLED === "1" || env.VERCEL_ENV === "preview" || !env.VERCEL;
export const CLOSE_CONFIRM = "HESABIMI KAPAT";

export async function closeAccount(db: Db, storage: MediaStorage | null, userId: string) {
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  if (!u) return { ok: false as const, error: "not_found" as const };
  const photos = storage ? await removeUserPhotos(db, storage, userId) : 0;
  const mine = await db.select({ placeId: reviews.placeId }).from(reviews).where(eq(reviews.userId, userId));
  const placeIds = [...new Set(mine.map((r) => r.placeId))];
  const slugs = placeIds.length ? (await db.select({ slug: places.slug }).from(places).where(inArray(places.id, placeIds))).map((p) => p.slug) : [];
  await db.insert(auditLog).values({ id: uuidv7(), actor: `user:${userId}`, action: "account_close", refTable: "user", refId: userId, detail: { reviews: mine.length, photos, places: placeIds.length } });
  await db.delete(user).where(eq(user.id, userId));
  let rescored = 0;
  for (const id of placeIds) { try { await recomputePlace(db, id); rescored++; } catch { /* günlük uzlaştırma telafi eder */ } }
  return { ok: true as const, reviews: mine.length, photos, places: slugs, rescored };
}
