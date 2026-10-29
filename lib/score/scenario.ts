import { and, eq, inArray, ne, notInArray } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "@/lib/db/client";
import { notifications, places, ratingHistory, reviews, scoreWatches, user } from "@/lib/db/schema";
import { moderateReview } from "@/lib/community/reviews";
import { listNotifications, setWatch } from "@/lib/community/scoreWatch";
import { publishedScore } from "@/lib/score/published";
import { recomputePlace, SCORE_ALGORITHM } from "@/lib/score/compute";

/* YALNIZ PREVIEW/YEREL — gerçek puan üretimi uçtan uca (Neon Preview dalı): test kullanıcılarının örnek deneyimleri →
   recomputePlace (yazma bu senaryoda açık) → recordScore → deneme eşiği bildirimi; moderasyon ve uzlaştırma.
   Mekânda senaryo dışı deneyim ya da başka algoritma sürümünde puan geçmişi varsa çalışmaz. Üretimde çağrılmaz. */
const W = "puan-test-w";
const R = ["puan-test-1", "puan-test-2", "puan-test-3", "puan-test-4", "puan-test-5"];

export async function runScoreScenario(db: Db, slug: string) {
  const [p] = await db.select({ id: places.id, name: places.name }).from(places).where(eq(places.slug, slug)).limit(1);
  if (!p) return { ok: false as const, error: "unknown_place" };
  const foreignReviews = await db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.placeId, p.id), notInArray(reviews.userId, R))).limit(1);
  const foreignHistory = await db.select({ id: ratingHistory.id }).from(ratingHistory).where(and(eq(ratingHistory.placeId, p.id), ne(ratingHistory.algorithmVersion, SCORE_ALGORITHM))).limit(1);
  if (foreignReviews.length || foreignHistory.length) return { ok: false as const, error: "place_not_clean" };
  await db.insert(user).values([W, ...R].map((id) => ({ id, name: id, email: `${id}@example.invalid`, kind: "user" }))).onConflictDoNothing();
  await db.delete(notifications).where(eq(notifications.userId, W));
  await db.delete(scoreWatches).where(eq(scoreWatches.userId, W));
  await db.delete(reviews).where(and(eq(reviews.placeId, p.id), inArray(reviews.userId, R)));
  await db.delete(ratingHistory).where(eq(ratingHistory.placeId, p.id));

  const res: { name: string; ok: boolean; info?: string }[] = [];
  const ok = (name: string, c: boolean, info?: unknown) => res.push({ name, ok: c, ...(info === undefined ? {} : { info: JSON.stringify(info).slice(0, 200) }) });
  const add = (u: string, overall: number) => db.insert(reviews).values({ id: uuidv7(), placeId: p.id, userId: u, visitedOn: "2026-10-01", overall, ratings: {}, body: "Preview puan senaryosu örnek deneyimi (gerçek değil).".padEnd(60, "."), returnIntent: "evet" }).returning({ id: reviews.id });
  const pub = async () => (await publishedScore(db, p.id))?.score ?? null;
  const notes = async () => (await listNotifications(db, W)).items;

  await setWatch(db, W, slug, 85);
  for (const [i, u] of R.slice(0, 4).entries()) await add(u, [9, 9, 8, 9][i]);
  const a = await recomputePlace(db, p.id, { write: true });
  ok("4 farklı yazar: puan yayımlanmaz, 'yetersiz' satırı", a.action === "written" && (await pub()) === null && a.result.authors === 4);
  const [fifth] = await add(R[4], 9);
  const b = await recomputePlace(db, p.id, { write: true });
  const n1 = await notes();
  ok("5. farklı yazar: ilk Gidenler puanı 8,8 yayımlandı (Sınırlı veri)", b.action === "written" && (await pub()) === 8.8 && b.result.confidence === "sinirli", b.result);
  ok("8,5 eşiği: 'İlk Gidenler puanı oluştu' bildirimi aynı işlemde", n1.length === 1 && n1[0].first && n1[0].score === 8.8, n1[0]?.text);
  await moderateReview(db, "admin", fifth.id, "hide");
  await recomputePlace(db, p.id, { write: true });
  ok("moderasyonla gizleme: puan geri çekildi (yetersiz), bildirim çoğalmadı", (await pub()) === null && (await notes()).length === 1);
  await moderateReview(db, "admin", fifth.id, "restore");
  const c = await recomputePlace(db, p.id, { write: true }), d = await recomputePlace(db, p.id, { write: true });
  ok("geri yayın: puan döndü; tekrar hesap yazmadı; ateşlenmiş takip yeni bildirim üretmedi", c.action === "written" && d.action === "unchanged" && (await pub()) === 8.8 && (await notes()).length === 1);
  return { ok: res.every((r) => r.ok), slug, place: p.name, results: res, evidence: (await notes()).map((x) => ({ id: x.id, text: x.text, scoredAt: x.scoredAt })) };
}
