import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "@/lib/db/client";
import { fieldProvenance, notifications, places, scoreWatches } from "@/lib/db/schema";
import { publishedScore, toTenths, type PublishedScore } from "@/lib/score/published";

/* ==========================================================================
   DENEME EŞİĞİ — "Kaç puanın üstüne çıkarsa denemek istersin?" (sunucu)
   --------------------------------------------------------------------------
   · Kullanıcı kimliği her zaman çağırandan (oturumdan) gelir; her sorgu user_id ile sınırlıdır.
   · Kişisel tercih: puana, sıralamaya, deneyim ve doğrulanmış ziyaret sayılarına girmez; user_place_status'tan bağımsız.
   · Eşik 1,0–9,9 (onda bir adım). Puan en çok 10 olduğundan "10'un üzerine çıkınca" gibi gerçekleşemeyecek eşik yok.
   · Kurulum/değişiklik/yeniden açma: sürüm artar, durum o anki yayımlanmış puana göre yeniden belirlenir
     (zaten üstündeyse "met": geçmiş bir yükseliş gibi bildirim üretilmez). Bildirimi lib/score/published.ts üretir.
   ========================================================================== */

export const MIN_TENTHS = 10, MAX_TENTHS = 99;

/** "8,3" / "8.3" / 8.3 → 83. Geçersizse null (en çok bir ondalık, 1,0–9,9). */
export function parseThreshold(v: unknown): number | null {
  const s = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim().replace(",", ".") : "";
  if (!/^\d{1,2}(\.\d)?$/.test(s)) return null;
  const t = Math.round(Number(s) * 10);
  return t >= MIN_TENTHS && t <= MAX_TENTHS ? t : null;
}

export type WatchState = "armed" | "met" | "fired";
export interface WatchView {
  slug: string; place: string; threshold: number; active: boolean; state: WatchState;
  firedAt: string | null; firedScore: number | null; updatedAt: string;
  published: PublishedScore | null;
  standing: { code: "kapali" | "bekleniyor" | "altinda" | "karsiliyor" | "asildi"; message: string };
}

const f1 = (n: number) => n.toFixed(1).replace(".", ",");
const ACC = ["ı", "i", "yi", "ü", "ü", "i", "yı", "yi", "i", "u"];
export const withAcc = (n: number) => `${f1(n)}'${ACC[Math.round(n * 10) % 10]}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

export function standingOf(w: { thresholdTenths: number; active: boolean; state: string; firedAt: Date | null; firedScore: number | null }, pub: PublishedScore | null): WatchView["standing"] {
  const t = w.thresholdTenths / 10;
  if (!w.active) return { code: "kapali", message: `Takip kapalı; ${f1(t)} eşiğin saklı. Açarsan o anki puana göre yeniden başlar.` };
  if (w.state === "fired") return { code: "asildi", message: `Eşiğin aşıldı: Gidenler puanı ${f1(w.firedScore ?? 0)}${w.firedAt ? ` (${day(w.firedAt.toISOString())})` : ""}. Yeni bildirim için eşiği değiştir ya da takibi yeniden başlat.` };
  if (!pub || pub.score === null) return { code: "bekleniyor", message: `Yeterli deneyim oluşması bekleniyor. İlk Gidenler puanı ${withAcc(t)} aşarsa hesabına bildirim gelir.` };
  if (w.state === "met") return { code: "karsiliyor", message: `Bu seviyeyi zaten karşılıyor: Gidenler puanı ${f1(pub.score)}. Puan ${f1(t)} ya da altına inip yeniden aşarsa haber veririz.` };
  return { code: "altinda", message: `Gidenler puanı şu an ${f1(pub.score)}. ${withAcc(t)} aşınca hesabına bildirim gelir.` };
}

async function placeOf(db: Db, slug: string) {
  const [p] = await db.select({ id: places.id, name: places.name, slug: places.slug }).from(places).where(eq(places.slug, slug)).limit(1);
  return p ?? null;
}

async function view(db: Db, w: typeof scoreWatches.$inferSelect, p: { name: string; slug: string }): Promise<WatchView> {
  const pub = await publishedScore(db, w.placeId);
  return { slug: p.slug, place: p.name, threshold: w.thresholdTenths / 10, active: w.active, state: w.state as WatchState,
    firedAt: w.firedAt?.toISOString() ?? null, firedScore: w.firedScore, updatedAt: w.updatedAt.toISOString(), published: pub, standing: standingOf(w, pub) };
}

/** Takip kur ya da eşiği değiştir (ve yeniden başlat). */
export async function setWatch(db: Db, userId: string, slug: string, thresholdTenths: number, now = new Date()):
  Promise<{ ok: true; watch: WatchView } | { ok: false; error: "unknown_place" | "invalid_threshold" }> {
  if (!Number.isInteger(thresholdTenths) || thresholdTenths < MIN_TENTHS || thresholdTenths > MAX_TENTHS) return { ok: false, error: "invalid_threshold" };
  const p = await placeOf(db, slug);
  if (!p) return { ok: false, error: "unknown_place" };
  const pub = await publishedScore(db, p.id);
  const state: WatchState = pub?.score != null && toTenths(pub.score) > thresholdTenths ? "met" : "armed";
  const [w] = await db.insert(scoreWatches).values({ id: uuidv7(), userId, placeId: p.id, thresholdTenths, active: true, state, version: 1, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: [scoreWatches.userId, scoreWatches.placeId],
      set: { thresholdTenths, active: true, state, version: sql`${scoreWatches.version} + 1`, firedAt: null, firedScore: null, updatedAt: now } })
    .returning();
  return { ok: true, watch: await view(db, w, p) };
}

/** Takibi kapat / aç. Açmak açık bir yeniden başlatmadır (sürüm artar, durum o anki puana göre). */
export async function setWatchActive(db: Db, userId: string, slug: string, active: boolean, now = new Date()):
  Promise<{ ok: true; watch: WatchView } | { ok: false; error: "unknown_place" | "not_found" | "invalid_threshold" }> {
  const p = await placeOf(db, slug);
  if (!p) return { ok: false, error: "unknown_place" };
  const [cur] = await db.select().from(scoreWatches).where(and(eq(scoreWatches.userId, userId), eq(scoreWatches.placeId, p.id))).limit(1);
  if (!cur) return { ok: false, error: "not_found" };
  if (active) return setWatch(db, userId, slug, cur.thresholdTenths, now);
  const [w] = await db.update(scoreWatches).set({ active: false, version: sql`${scoreWatches.version} + 1`, updatedAt: now })
    .where(and(eq(scoreWatches.userId, userId), eq(scoreWatches.placeId, p.id))).returning();
  return { ok: true, watch: await view(db, w, p) };
}

export async function deleteWatch(db: Db, userId: string, slug: string): Promise<{ ok: boolean }> {
  const p = await placeOf(db, slug);
  if (!p) return { ok: false };
  const r = await db.delete(scoreWatches).where(and(eq(scoreWatches.userId, userId), eq(scoreWatches.placeId, p.id))).returning({ id: scoreWatches.id });
  return { ok: r.length > 0 };
}

export async function getWatch(db: Db, userId: string, slug: string) {
  const p = await placeOf(db, slug);
  if (!p) return { ok: false as const, error: "unknown_place" as const };
  const [w] = await db.select().from(scoreWatches).where(and(eq(scoreWatches.userId, userId), eq(scoreWatches.placeId, p.id))).limit(1);
  return { ok: true as const, watch: w ? await view(db, w, p) : null, published: await publishedScore(db, p.id) };
}

export async function listWatches(db: Db, userId: string): Promise<WatchView[]> {
  const rows = await db.select({ w: scoreWatches, name: places.name, slug: places.slug }).from(scoreWatches)
    .innerJoin(places, eq(places.id, scoreWatches.placeId)).where(eq(scoreWatches.userId, userId)).orderBy(desc(scoreWatches.updatedAt)).limit(200);
  return Promise.all(rows.map((r) => view(db, r.w, { name: r.name, slug: r.slug })));
}

export interface NotificationView {
  id: string; kind: string; createdAt: string; read: boolean;
  slug: string; place: string; threshold: number; score: number; scoredAt: string; first: boolean; text: string;
  /** mekânın kaynaklı menüsü varsa bildirimden menüye geçilir */
  menu: boolean;
}
export function notificationText(p: { place: string; threshold: number; score: number; first: boolean }) {
  return p.first
    ? `${p.place}: İlk Gidenler puanı oluştu ve seçtiğin ${f1(p.threshold)} eşiğinin üzerinde — ${f1(p.score)}.`
    : `${p.place}: Gidenler puanı seçtiğin ${f1(p.threshold)} eşiğini aştı — ${f1(p.score)}.`;
}

export async function listNotifications(db: Db, userId: string, limit = 50): Promise<{ items: NotificationView[]; unread: number }> {
  const rows = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  const pids = [...new Set(rows.map((r) => r.placeId).filter((x): x is string => !!x))];
  const withMenu = new Set(pids.length ? (await db.selectDistinct({ id: fieldProvenance.placeId }).from(fieldProvenance)
    .where(and(inArray(fieldProvenance.placeId, pids), eq(fieldProvenance.field, "profile.menu")))).map((m) => m.id) : []);
  return {
    unread: Number(n),
    items: rows.map((r) => {
      const p = r.payload as { placeName: string; slug: string; threshold: number | string; score: number | string; scoredAt: string; first: boolean };
      const v = { place: p.placeName, threshold: Number(p.threshold), score: Number(p.score), first: !!p.first };
      return { id: r.id, kind: r.kind, createdAt: r.createdAt.toISOString(), read: !!r.readAt, slug: p.slug, scoredAt: p.scoredAt, ...v, text: notificationText(v), menu: !!r.placeId && withMenu.has(r.placeId) };
    }),
  };
}

/** Okundu işaretle (tek ya da "all"); yalnız kullanıcının kendi bildirimleri. */
export async function markNotificationsRead(db: Db, userId: string, id: string | "all", now = new Date()) {
  const r = await db.update(notifications).set({ readAt: now })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), ...(id === "all" ? [] : [eq(notifications.id, id)]))).returning({ id: notifications.id });
  return { updated: r.length };
}
