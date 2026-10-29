import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { places, ratingHistory, reviews, user, visitVerifications } from "@/lib/db/schema";
import { experienceWeight } from "@/lib/score/weights";
import { recordScore, toTenths, type ScoreSnapshot } from "@/lib/score/published";
import type { CommercialRelationship } from "@/lib/types";

/* ==========================================================================
   GERÇEK GİDENLER PUANI — ÜRETİM (algoritma v1-2026-11)
   --------------------------------------------------------------------------
   · Girdi (izin listesi): mekânın YAYINDAKİ ve "recommended" Gidenler deneyimleri. Test hesapları (user.kind
     "test") ve işletme hesapları girmez; işletme sahibi/çalışanı beyanı "not_recommended" olduğundan zaten girmez.
     Google/Tripadvisor puanları, Kaydet/Gittim/deneme eşiği seçimleri HİÇBİR yoldan girmez.
   · Hesap: yayımlanmış yöntemin ağırlıkları (lib/score/weights.ts: tazelik, doğrulanmış ziyaret, bağımsızlık;
     yazar güveni verisi olmadığı için herkese 1) ile ağırlıklı ortalama; tek ondalık.
   · Yayımlanabilirlik: en az MIN_AUTHORS farklı yazar. Doğrulanmış ziyaret şart değil (doğrulama üretimi yok);
     sayısı satırda ve güven etiketinde.
   · Yazma: yalnız recordScore (deneme eşiği bildirimleri aynı işlemde). Sonuç bir önceki satırla aynıysa yazılmaz.
     SCORE_PUBLISH=1 değilse hiç yazılmaz (yalnız rapor).
   ========================================================================== */

export const SCORE_ALGORITHM = "v1-2026-11";
export const MIN_AUTHORS = 5;
export const scorePublishEnabled = () => process.env.SCORE_PUBLISH === "1";
const MONTH = 30 * 86400_000;

export type Confidence = "yetersiz" | "sinirli" | "orta" | "yuksek";
export const CONFIDENCE_LABEL: Record<Confidence, string> = { yetersiz: "Yeterli deneyim yok", sinirli: "Sınırlı veri", orta: "Orta güven", yuksek: "Yüksek güven" };

export interface ScoreInputRow { userId: string; overall: number; visitedOn: string; disclosure: string; verified: boolean }

/** Saf hesap (test edilebilir): girdi satırları zaten izin listesinden geçmiş olmalı. */
export function computeFromRows(rows: ScoreInputRow[], now: Date): ScoreSnapshot & { confidence: Confidence; authors: number } {
  const authors = new Set(rows.map((r) => r.userId)).size;
  const w = rows.map((r) => ({ r, w: experienceWeight({ visitedAt: r.visitedOn, verified: r.verified, authorReputation: undefined, authorDisclosure: (r.disclosure as CommercialRelationship) }, now) }));
  const used = w.filter((x) => x.w > 0);
  const total = used.reduce((a, x) => a + x.w, 0);
  const verifiedCount = rows.filter((r) => r.verified).length;
  const recent = rows.filter((r) => now.getTime() - new Date(r.visitedOn).getTime() <= 12 * MONTH).length;
  const eligible = authors >= MIN_AUTHORS && total > 0;
  const score = eligible ? toTenths(used.reduce((a, x) => a + x.r.overall * x.w, 0) / total) / 10 : null;
  const n = rows.length;
  const confidence: Confidence = !eligible ? "yetersiz"
    : n >= 30 && verifiedCount / n >= 0.5 && recent / n >= 0.5 ? "yuksek"
    : n >= 10 && recent / n >= 0.5 ? "orta" : "sinirli";
  return { score, reviewCount: n, verifiedCount, confidence, authors, algorithmVersion: SCORE_ALGORITHM,
    components: { authors, minAuthors: MIN_AUTHORS, weightSum: Math.round(total * 1000) / 1000, recentShare: n ? Math.round((recent / n) * 100) / 100 : 0 } };
}

/** İzin listesindeki deneyimler (yalnız okuma). */
export async function scoreInputs(db: Db, placeId: string): Promise<ScoreInputRow[]> {
  const rows = await db.select({ id: reviews.id, userId: reviews.userId, overall: reviews.overall, visitedOn: reviews.visitedOn, disclosure: reviews.disclosure })
    .from(reviews).innerJoin(user, eq(user.id, reviews.userId))
    .where(and(eq(reviews.placeId, placeId), eq(reviews.status, "published"), eq(reviews.trust, "recommended"), ne(user.kind, "test"), ne(user.kind, "business"),
      sql`${reviews.overall} between 1 and 10`));
  /* doğrulanmış ziyaret: aynı kullanıcı + mekân için "likely" ya da "strong" düzeyinde doğrulama kaydı (bugün üretilmiyor) */
  const ver = rows.length ? await db.select({ userId: visitVerifications.userId }).from(visitVerifications)
    .where(and(eq(visitVerifications.placeId, placeId), inArray(visitVerifications.level, ["likely", "strong"]), inArray(visitVerifications.userId, rows.map((r) => r.userId)))) : [];
  const v = new Set(ver.map((x) => x.userId));
  return rows.map((r) => ({ userId: r.userId, overall: r.overall, visitedOn: String(r.visitedOn), disclosure: r.disclosure, verified: v.has(r.userId) }));
}

export type RecomputeResult = { placeId: string; slug?: string; result: ReturnType<typeof computeFromRows>; previous: { score: number | null; confidence: string; reviewCount: number } | null;
  action: "written" | "unchanged" | "nothing" | "dry_run" };

/** Bir mekânın puanını yeniden hesapla; değiştiyse ve yazma açıksa recordScore ile yaz. */
export async function recomputePlace(db: Db, placeId: string, opts: { write?: boolean; now?: Date } = {}): Promise<RecomputeResult> {
  const now = opts.now ?? new Date();
  const result = computeFromRows(await scoreInputs(db, placeId), now);
  const [last] = await db.select().from(ratingHistory).where(eq(ratingHistory.placeId, placeId)).orderBy(desc(ratingHistory.computedAt), desc(ratingHistory.id)).limit(1);
  const previous = last ? { score: last.score === null ? null : toTenths(last.score) / 10, confidence: last.confidence, reviewCount: last.reviewCount } : null;
  const same = last && previous!.score === result.score && last.confidence === result.confidence && last.reviewCount === result.reviewCount
    && last.verifiedCount === result.verifiedCount && last.algorithmVersion === result.algorithmVersion;
  /* hiç geçmişi ve hiç deneyimi olmayan mekâna boş satır yazılmaz */
  if (same || (!last && result.reviewCount === 0)) return { placeId, result, previous, action: same ? "unchanged" : "nothing" };
  if (!(opts.write ?? scorePublishEnabled())) return { placeId, result, previous, action: "dry_run" };
  await recordScore(db, placeId, { ...result, computedAt: now });
  return { placeId, result, previous, action: "written" };
}

/** Uzlaştırma: deneyimi ya da puan geçmişi olan bütün mekânlar (yalnız veritabanı; dış servis yok). */
export async function reconcileScores(db: Db, opts: { write?: boolean; now?: Date } = {}) {
  const ids = await db.selectDistinct({ id: reviews.placeId }).from(reviews)
    .union(db.selectDistinct({ id: ratingHistory.placeId }).from(ratingHistory));
  const slugs = new Map((ids.length ? await db.select({ id: places.id, slug: places.slug }).from(places).where(inArray(places.id, ids.map((i) => i.id))) : []).map((p) => [p.id, p.slug]));
  const out: RecomputeResult[] = [];
  for (const { id } of ids) out.push({ ...(await recomputePlace(db, id, opts)), slug: slugs.get(id) });
  return out;
}
