import { and, desc, eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "@/lib/db/client";
import { notifications, places, ratingHistory, scoreWatches } from "@/lib/db/schema";
import { atomic } from "@/lib/profile";

/* ==========================================================================
   YAYIMLANMIŞ GİDENLER PUANI (gerçek mekân) — tek kaynak
   --------------------------------------------------------------------------
   · Yayımlanmış puan = mekânın rating_history'deki SON satırı. score null → yeterli deneyim yok, puan yayımlanmadı.
     Yeterlilik kararını puanı üreten taraf verir ve satıra yazar; burada ikinci bir ortalama ya da algoritma YOK.
   · Ekranda tek ondalık görünür; eşik karşılaştırması da aynı yuvarlamayla (onda bir tam sayı) yapılır:
     8,25 → 8,3; eşik 8,3 iken bildirim YOK (yalnız "üstüne çıkınca", eşitlikte değil).
   · recordScore: puan güncellemesinin TEK yazma yolu. Tarih satırı ve ilgili deneme eşiği takiplerinin
     değerlendirilmesi TEK bölünmez işlemde yazılır; bildirim o anki takip durumuna göre (kapalı/değişmiş takip
     bildirim almaz) ve (takip, sürüm) anahtarıyla tekilleştirilerek üretilir: tekrar işleme ya da eşzamanlı iki
     yayın ikinci bildirim üretmez.
   · DURUM (2026-10-29): Production'da gerçek deneyimlerden puan ÜRETEN bir iş henüz yok; bu fonksiyonu çağıran
     tek yol Preview'daki test eylemidir. Puan üretimi eklenince yalnız recordScore'u çağırması yeterli.
   · Google, Tripadvisor vb. puanlar buraya HİÇBİR yoldan girmez.
   ========================================================================== */

export const toTenths = (n: number) => Math.round(n * 10);

export interface PublishedScore {
  /** tek ondalığa yuvarlanmış yayımlanmış puan; null = yeterli deneyim yok */
  score: number | null;
  reviewCount: number;
  verifiedCount: number;
  computedAt: string;
  algorithmVersion: string;
  /** güven etiketi kodu (yetersiz | sinirli | orta | yuksek); eski satırlarda serbest metin olabilir */
  confidence: string;
}

export async function publishedScore(db: Db, placeId: string): Promise<PublishedScore | null> {
  const [r] = await db.select().from(ratingHistory).where(eq(ratingHistory.placeId, placeId))
    .orderBy(desc(ratingHistory.computedAt), desc(ratingHistory.id)).limit(1);
  if (!r) return null;
  return { score: r.score === null ? null : toTenths(r.score) / 10, reviewCount: r.reviewCount, verifiedCount: r.verifiedCount,
    computedAt: r.computedAt.toISOString(), algorithmVersion: r.algorithmVersion, confidence: r.confidence };
}

export async function publishedScoreBySlug(db: Db, slug: string) {
  const [p] = await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)).limit(1);
  return p ? publishedScore(db, p.id) : null;
}

export interface ScoreSnapshot {
  /** 1–10; null = yeterli deneyim yok (yayımlanmaz) */
  score: number | null;
  reviewCount: number;
  /** gerçekten doğrulanmış ziyarete bağlı deneyim sayısı (Google ile giriş doğrulama DEĞİLDİR) */
  verifiedCount: number;
  confidence: string;
  algorithmVersion: string;
  components?: unknown;
  computedAt?: Date;
}

export type RecordError = "invalid_score" | "invalid_counts";

/** Puan güncellemesini kaydeder ve aynı işlemde deneme eşiği takiplerini değerlendirir. */
export async function recordScore(db: Db, placeId: string, snap: ScoreSnapshot):
  Promise<{ ok: true; historyId: string; score: number | null } | { ok: false; error: RecordError }> {
  if (snap.score !== null && !(Number.isFinite(snap.score) && snap.score >= 1 && snap.score <= 10)) return { ok: false, error: "invalid_score" };
  if (!Number.isInteger(snap.reviewCount) || !Number.isInteger(snap.verifiedCount) || snap.reviewCount < 0 || snap.verifiedCount < 0 || snap.verifiedCount > snap.reviewCount)
    return { ok: false, error: "invalid_counts" };
  const id = uuidv7();
  const at = snap.computedAt ?? new Date();
  const s = snap.score === null ? null : toTenths(snap.score);
  /* yalnız etkin, "armed" ve eşiği yeni puanın ALTINDA olan takipler (eşitlik bildirmez) */
  const crossing = s === null ? null : and(eq(scoreWatches.placeId, placeId), eq(scoreWatches.active, true), eq(scoreWatches.state, "armed"), sql`${scoreWatches.thresholdTenths} < ${s}`);
  await atomic(db, (q) => [
    q.insert(ratingHistory).values({ id, placeId, computedAt: at, algorithmVersion: snap.algorithmVersion, score: snap.score, reviewCount: snap.reviewCount,
      verifiedCount: snap.verifiedCount, confidence: snap.confidence, components: snap.components ?? null }),
    ...(s === null || !crossing ? [] : [
      q.insert(notifications).select(
        q.select({
          id: sql<string>`'esik:' || ${scoreWatches.id} || ':v' || ${scoreWatches.version}`.as("id"),
          userId: scoreWatches.userId,
          kind: sql<string>`'score_threshold'`.as("kind"),
          placeId: scoreWatches.placeId,
          payload: sql`jsonb_build_object(
            'placeName', ${places.name}, 'slug', ${places.slug},
            'threshold', ${scoreWatches.thresholdTenths}::numeric / 10, 'score', ${s}::numeric / 10,
            'scoredAt', ${at.toISOString()}::text, 'historyId', ${id}::text, 'watchVersion', ${scoreWatches.version},
            'first', NOT EXISTS (SELECT 1 FROM rating_history h WHERE h.place_id = ${placeId} AND h.score IS NOT NULL AND h.id <> ${id}))`.as("payload"),
          createdAt: sql`${at.toISOString()}::timestamptz`.as("created_at"),
          readAt: sql`NULL::timestamptz`.as("read_at"),
        }).from(scoreWatches).innerJoin(places, eq(places.id, scoreWatches.placeId)).where(crossing),
      ).onConflictDoNothing(),
      q.update(scoreWatches).set({ state: "fired", firedAt: at, firedScore: s / 10, updatedAt: new Date() }).where(crossing),
      /* kurulduğunda zaten üstündeyken (met) puan eşiğe ya da altına indiyse: sonraki gerçek yükselişte bildirir */
      q.update(scoreWatches).set({ state: "armed", updatedAt: new Date() })
        .where(and(eq(scoreWatches.placeId, placeId), eq(scoreWatches.state, "met"), sql`${scoreWatches.thresholdTenths} >= ${s}`)),
    ]),
  ]);
  return { ok: true, historyId: id, score: s === null ? null : s / 10 };
}
