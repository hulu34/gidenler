import { and, eq, inArray, ne } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { notifications, places, ratingHistory, scoreWatches, user } from "@/lib/db/schema";
import { recordScore } from "@/lib/score/published";
import { getWatch, listNotifications, markNotificationsRead, setWatch, setWatchActive } from "@/lib/community/scoreWatch";

/* YALNIZ PREVIEW/YEREL — deneme eşiği uçtan uca senaryosu, gerçek veritabanında (Neon Preview dalı).
   API'nin kullandığı fonksiyonlarla (setWatch, recordScore, listNotifications…) iki test hesabı üzerinden çalışır.
   Örnek puanlar algorithmVersion "preview-test" ile yazılır; üretimde bu modül çağrılmaz (yönetim ucu reddeder).
   Her çalıştırma önce yalnız kendi test kayıtlarını temizler. */
const A = "test-esik-a", B = "test-esik-b", ALG = "preview-test";

export async function runThresholdScenario(db: Db, slug: string) {
  const [p] = await db.select({ id: places.id, name: places.name }).from(places).where(eq(places.slug, slug)).limit(1);
  if (!p) return { ok: false as const, error: "unknown_place" };
  /* yalnız test dışı puan geçmişi OLMAYAN mekânda: gerçek puan kayıtlarıyla karışmaz */
  const other = await db.select({ id: ratingHistory.id }).from(ratingHistory).where(and(eq(ratingHistory.placeId, p.id), ne(ratingHistory.algorithmVersion, ALG))).limit(1);
  if (other.length) return { ok: false as const, error: "place_has_other_scores" };
  await db.insert(user).values([
    { id: A, name: "Test Eşik A", email: "test-esik-a@example.invalid", kind: "user" },
    { id: B, name: "Test Eşik B", email: "test-esik-b@example.invalid", kind: "user" },
  ]).onConflictDoNothing();
  await db.delete(notifications).where(inArray(notifications.userId, [A, B]));
  await db.delete(scoreWatches).where(inArray(scoreWatches.userId, [A, B]));
  await db.delete(ratingHistory).where(and(eq(ratingHistory.placeId, p.id), eq(ratingHistory.algorithmVersion, ALG)));

  const res: { name: string; ok: boolean; info?: string }[] = [];
  const ok = (name: string, c: boolean, info?: unknown) => res.push({ name, ok: c, ...(info === undefined ? {} : { info: JSON.stringify(info).slice(0, 200) }) });
  const snap = (score: number | null) => ({ score, reviewCount: score === null ? 2 : 12, verifiedCount: score === null ? 0 : 3, confidence: score === null ? "yetersiz" : "orta", algorithmVersion: ALG });
  const n = async (u: string) => (await listNotifications(db, u)).items;

  const a1 = await setWatch(db, A, slug, 83);
  ok("A: puan yokken takip kaydedildi, 'Yeterli deneyim oluşması bekleniyor'", a1.ok && a1.watch.standing.message.startsWith("Yeterli deneyim oluşması bekleniyor"));
  await recordScore(db, p.id, snap(null));
  ok("yetersiz deneyim: bildirim yok", (await n(A)).length === 0);
  await recordScore(db, p.id, snap(9.1));
  const nA = await n(A);
  ok("A: ilk Gidenler puanı eşiğin üstünde oluştu → 1 bildirim", nA.length === 1 && nA[0].first && nA[0].score === 9.1 && nA[0].threshold === 8.3, nA[0]?.text);
  const b1 = await setWatch(db, B, slug, 80);
  ok("B: kurulumda zaten üstünde → 'Bu seviyeyi zaten karşılıyor', bildirim yok", b1.ok && b1.watch.standing.code === "karsiliyor" && (await n(B)).length === 0);
  await recordScore(db, p.id, snap(8.0));
  ok("puan 8,0 = B eşiği: bildirim yok (eşitlik)", (await n(B)).length === 0 && (await getWatch(db, B, slug)).watch?.standing.code === "altinda");
  await Promise.all([recordScore(db, p.id, snap(8.4)), recordScore(db, p.id, snap(8.4))]);
  await recordScore(db, p.id, snap(8.4));
  const nB = await n(B);
  ok("puan 8,4 > 8,0: B'ye tek bildirim (eşzamanlı + tekrarlı işleme)", nB.length === 1 && !nB[0].first && nB[0].score === 8.4, nB.map((x) => x.text));
  ok("A: aşıldıktan sonra dalgalanma ikinci bildirim üretmedi", (await n(A)).length === 1);
  const aId = nA[0]?.id ?? "yok";
  const cross = await markNotificationsRead(db, B, aId);
  ok("B, A'nın bildirimini okundu yapamaz", cross.updated === 0 && (await n(A))[0]?.read === false);
  await setWatch(db, A, slug, 86); await setWatchActive(db, A, slug, false);
  await recordScore(db, p.id, snap(8.9));
  ok("A takibi kapattı: yeni aşımda bildirim yok", (await n(A)).length === 1);
  const own = await markNotificationsRead(db, A, aId);
  ok("A kendi bildirimini okundu yaptı", own.updated === 1 && (await n(A))[0]?.read === true);
  return { ok: res.every((r) => r.ok), slug, place: p.name, results: res,
    evidence: { A: (await n(A)).map((x) => ({ id: x.id, text: x.text, scoredAt: x.scoredAt, read: x.read })), B: (await n(B)).map((x) => ({ id: x.id, text: x.text, scoredAt: x.scoredAt, read: x.read })) } };
}
