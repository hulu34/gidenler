import { createHash } from "node:crypto";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "@/lib/db/client";
import { auditLog, moderationQueue, places, reviews, user } from "@/lib/db/schema";

/* ==========================================================================
   GİDENLER DENEYİMLERİ — yayınlama, düzenleme, silme, şikâyet (sunucu).
   --------------------------------------------------------------------------
   · Yalnız giriş yapmış kullanıcı, yalnız gerçek mekân (places). Google içeriğiyle HİÇBİR bağı yok.
   · PUAN MANİPÜLASYONU: kullanıcı başına mekân başına TEK etkin deneyim (yayında / incelemede / gizlenmiş).
     Yeni ziyaret aynı deneyimin güncellenmesidir (visit_no artar); eskisi audit_log'da kalır, puana girmez.
     Silinen deneyim "removed" olur (satır kalır, moderasyon izi); 24 saat içinde aynı mekâna yeniden yazılamaz.
   · Ölçek: genel puan ve boyutlar 1–10 tam sayı (Gidenler puanı 10 üzerinden). Puan hesabı burada YOK;
     yetersiz deneyimde puan üretilmez.
   · ZİYARET: her deneyim "doğrulanmamış ziyaret" olarak başlar; bu modül doğrulama ÜRETMEZ.
   · TARAFSIZLIK: yazarın işletmeyle bağı (sahip/çalışan) ya da işletme hesabı → trust "not_recommended"
     (yayında, etiketli, puana girmez — lib/score/weights.ts INDEPENDENCE ile aynı kural).
   · SPAM: bağlantı / e-posta / telefon reddedilir; aynı metnin başka mekânda tekrarı incelemeye düşer.
   ========================================================================== */

/** Mekân sayfasındaki deneyim listesinin önbellek etiketi (yayın/düzenleme/silme/moderasyon hemen geçersiz kılar). */
export const reviewsTag = (slug: string) => `reviews:${slug}`;

export const RETURN_INTENTS = ["evet", "hayır", "emin değil"] as const;
export const DISCLOSURES = ["none", "invited", "gifted", "sponsored", "employee", "owner_related"] as const;
export type Disclosure = (typeof DISCLOSURES)[number];
export const BODY_MIN = 40, BODY_MAX = 5000;

export interface ReviewInput {
  body: string;
  visitMonth: string;                  // YYYY-MM
  overall: number | null;              // 1–10; düzenlenmiş kategoride null
  ratings: Record<string, number>;     // boyut anahtarı → 1–10
  returnIntent: (typeof RETURN_INTENTS)[number];
  disclosure: Disclosure;
}
export interface PlaceRules { dimensions: string[]; regulated: boolean }

export type ReviewError =
  | "body_short" | "body_long" | "contact_info" | "repetitive" | "month_invalid" | "overall_required" | "overall_invalid"
  | "rating_invalid" | "unknown_place" | "exists" | "recently_removed" | "not_found" | "moderated" | "own_review" | "already_reported";

const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|me|tr|app|link|ly)\b)/i;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /\+?\d[\d\s().-]{8,}\d/g;
/* fiyat aralıkları ("1.500 - 2.000 TL") telefon sayılmaz: en az 10 rakam gerekir */
const hasPhone = (s: string) => (s.match(PHONE_RE) ?? []).some((m) => m.replace(/\D/g, "").length >= 10);

export function normalizeBody(s: string) {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
const fingerprint = (s: string) => normalizeBody(s).toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}]+/gu, "");

/** Saf doğrulama (testlenebilir). Hata yoksa null. */
export function validateReview(i: ReviewInput, rules: PlaceRules, now = new Date()): ReviewError | null {
  const body = normalizeBody(i.body);
  if (body.length < BODY_MIN) return "body_short";
  if (body.length > BODY_MAX) return "body_long";
  if (URL_RE.test(body) || EMAIL_RE.test(body) || hasPhone(body)) return "contact_info";
  if (/(.)\1{9,}/u.test(body) || new Set(fingerprint(body)).size < 8) return "repetitive";
  const m = /^(\d{4})-(\d{2})$/.exec(i.visitMonth);
  if (!m) return "month_invalid";
  const months = (now.getFullYear() - Number(m[1])) * 12 + (now.getMonth() + 1 - Number(m[2]));
  if (Number(m[2]) < 1 || Number(m[2]) > 12 || months < 0 || months > 23) return "month_invalid";
  const int10 = (v: unknown) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 10;
  if (rules.regulated) {
    if (i.overall !== null || Object.keys(i.ratings).length) return "rating_invalid";
  } else {
    if (i.overall === null) return "overall_required";
    if (!int10(i.overall)) return "overall_invalid";
    for (const [k, v] of Object.entries(i.ratings)) if (!rules.dimensions.includes(k) || !int10(v)) return "rating_invalid";
  }
  return null;
}

export const trustOf = (disclosure: Disclosure, authorKind: string) =>
  disclosure === "owner_related" || disclosure === "employee" || authorKind === "business" ? "not_recommended" : "recommended";

const ACTIVE = ["published", "pending", "hidden"];

async function placeBySlug(db: Db, slug: string) {
  const [p] = await db.select({ id: places.id, slug: places.slug }).from(places).where(and(eq(places.slug, slug), eq(places.status, "active")));
  return p ?? null;
}
const audit = (db: Db, actor: string, action: string, refId: string, detail: unknown) =>
  db.insert(auditLog).values({ id: uuidv7(), actor, action, refTable: "reviews", refId, detail });

/** Aynı kullanıcının aynı metni başka mekânda da yazdıysa → incelemeye. */
async function looksDuplicated(db: Db, userId: string, placeId: string, body: string) {
  const fp = fingerprint(body);
  const rows = await db.select({ body: reviews.body }).from(reviews)
    .where(and(eq(reviews.userId, userId), ne(reviews.placeId, placeId), ne(reviews.status, "removed"))).limit(50);
  return rows.some((r) => fingerprint(r.body) === fp);
}

export async function createReview(db: Db, author: { id: string; kind?: string | null }, slug: string, i: ReviewInput, rules: PlaceRules, now = new Date()):
  Promise<{ ok: true; id: string; status: string } | { ok: false; error: ReviewError; id?: string }> {
  const err = validateReview(i, rules, now);
  if (err) return { ok: false, error: err };
  const place = await placeBySlug(db, slug);
  if (!place) return { ok: false, error: "unknown_place" };
  const mine = await db.select({ id: reviews.id, status: reviews.status, updatedAt: reviews.updatedAt }).from(reviews)
    .where(and(eq(reviews.userId, author.id), eq(reviews.placeId, place.id))).orderBy(desc(reviews.updatedAt));
  const active = mine.find((r) => ACTIVE.includes(r.status));
  if (active) return { ok: false, error: "exists", id: active.id };
  const removed = mine.find((r) => r.status === "removed");
  if (removed && now.getTime() - removed.updatedAt.getTime() < 24 * 3600_000) return { ok: false, error: "recently_removed" };
  const body = normalizeBody(i.body);
  const status = (await looksDuplicated(db, author.id, place.id, body)) ? "pending" : "published";
  /* aynı anda gelen gönderimler aynı kimliği üretir, birincil anahtar tek kayda izin verir: Redis kilidi düşse de çift deneyim oluşmaz */
  const h = createHash("sha256").update(`${author.id}:${place.id}:${mine.length}`).digest("hex");
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  const won = await db.insert(reviews).values({
    id, placeId: place.id, userId: author.id, visitedOn: `${i.visitMonth}-01`, visitNo: 1, overall: i.overall ?? 0, ratings: i.ratings,
    body, returnIntent: i.returnIntent, disclosure: i.disclosure, status, trust: trustOf(i.disclosure, author.kind ?? "user"),
  }).onConflictDoNothing().returning({ id: reviews.id });
  if (!won.length) return { ok: false, error: "exists", id };
  if (status === "pending") await db.insert(moderationQueue).values({ id: uuidv7(), kind: "review_spam", refTable: "reviews", refId: id, reason: "Aynı metin başka mekânda da yazılmış" });
  await audit(db, `user:${author.id}`, "review_create", id, { place: slug, status });
  return { ok: true, id, status };
}

export async function updateReview(db: Db, author: { id: string; kind?: string | null }, id: string, i: ReviewInput, rules: PlaceRules, now = new Date()):
  Promise<{ ok: true; id: string; status: string } | { ok: false; error: ReviewError }> {
  const [r] = await db.select().from(reviews).where(and(eq(reviews.id, id), eq(reviews.userId, author.id)));
  if (!r || r.status === "removed") return { ok: false, error: "not_found" };
  if (r.status === "hidden") return { ok: false, error: "moderated" };
  const err = validateReview(i, rules, now);
  if (err) return { ok: false, error: err };
  const body = normalizeBody(i.body);
  const visitedOn = `${i.visitMonth}-01`;
  const visitNo = visitedOn > r.visitedOn ? r.visitNo + 1 : r.visitNo;
  const status = r.status === "pending" || (await looksDuplicated(db, author.id, r.placeId, body)) ? "pending" : "published";
  /* Önceki sürüm moderasyon izi için saklanır (puana girmez). */
  await audit(db, `user:${author.id}`, "review_edit", id, { before: { body: r.body, overall: r.overall, ratings: r.ratings, visitedOn: r.visitedOn, returnIntent: r.returnIntent, disclosure: r.disclosure } });
  await db.update(reviews).set({ body, visitedOn, visitNo, overall: i.overall ?? 0, ratings: i.ratings, returnIntent: i.returnIntent, disclosure: i.disclosure,
    trust: trustOf(i.disclosure, author.kind ?? "user"), status, updatedAt: now }).where(and(eq(reviews.id, id), eq(reviews.userId, author.id)));
  return { ok: true, id, status };
}

/** Kullanıcının kendi deneyimini silmesi: kamudan kalkar ("removed"); satır moderasyon izi için kalır. */
export async function deleteReview(db: Db, userId: string, id: string, now = new Date()): Promise<{ ok: true } | { ok: false; error: ReviewError }> {
  const res = await db.update(reviews).set({ status: "removed", updatedAt: now })
    .where(and(eq(reviews.id, id), eq(reviews.userId, userId), ne(reviews.status, "removed"))).returning({ id: reviews.id });
  if (!res.length) return { ok: false, error: "not_found" };
  await audit(db, `user:${userId}`, "review_delete", id, {});
  return { ok: true };
}

/** Şikâyet: moderasyon kuyruğuna (kişi başına deneyim başına bir kez). Otomatik gizleme YOK — karar moderatörde. */
export async function reportReview(db: Db, reporterId: string, id: string, reason: string): Promise<{ ok: true } | { ok: false; error: ReviewError }> {
  const [r] = await db.select({ userId: reviews.userId, status: reviews.status }).from(reviews).where(eq(reviews.id, id));
  if (!r || r.status !== "published") return { ok: false, error: "not_found" };
  if (r.userId === reporterId) return { ok: false, error: "own_review" };
  const tag = `reporter:${reporterId}`;
  const dup = await db.select({ id: moderationQueue.id }).from(moderationQueue)
    .where(and(eq(moderationQueue.kind, "review_report"), eq(moderationQueue.refId, id), sql`${moderationQueue.reason} like ${tag + " %"}`)).limit(1);
  if (dup.length) return { ok: false, error: "already_reported" };
  await db.insert(moderationQueue).values({ id: uuidv7(), kind: "review_report", refTable: "reviews", refId: id, reason: `${tag} ${reason.slice(0, 300)}` });
  return { ok: true };
}

/** Moderatör: gizle / geri yayınla. */
export async function moderateReview(db: Db, actor: string, id: string, action: "hide" | "restore") {
  const res = await db.update(reviews).set({ status: action === "hide" ? "hidden" : "published", updatedAt: new Date() })
    .where(and(eq(reviews.id, id), inArray(reviews.status, action === "hide" ? ["published", "pending"] : ["hidden", "pending"]))).returning({ id: reviews.id, placeId: reviews.placeId });
  if (!res.length) return null;
  await db.update(moderationQueue).set({ status: action === "hide" ? "approved" : "rejected", decidedBy: actor, decidedAt: new Date() })
    .where(and(eq(moderationQueue.refId, id), eq(moderationQueue.status, "open"), inArray(moderationQueue.kind, ["review_report", "review_spam"])));
  await audit(db, actor, `review_${action}`, id, {});
  const [p] = await db.select({ slug: places.slug }).from(places).where(eq(places.id, res[0].placeId));
  return p?.slug ?? null;
}

/** Kamuya açık ad: "Ad S." (soyadın yalnız baş harfi). */
export function publicName(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Gidenler kullanıcısı";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toLocaleUpperCase("tr")}.`;
}

export interface PublicReview {
  id: string; author: string; authorId: string; visitedOn: string; visitNo: number; overall: number; ratings: Record<string, number>;
  body: string; returnIntent: string | null; disclosure: string; trust: string; createdAt: string; updatedAt: string; edited: boolean;
}

/** Mekân sayfası: yalnız yayındaki deneyimler (en yeni ziyaret önce). */
export async function listPlaceReviews(db: Db, slug: string): Promise<PublicReview[]> {
  const rows = await db.select({ r: reviews, name: user.name }).from(reviews)
    .innerJoin(places, eq(places.id, reviews.placeId)).innerJoin(user, eq(user.id, reviews.userId))
    .where(and(eq(places.slug, slug), eq(reviews.status, "published"))).orderBy(desc(reviews.visitedOn), desc(reviews.createdAt)).limit(200);
  return rows.map(({ r, name }) => ({
    id: r.id, author: publicName(name), authorId: r.userId, visitedOn: r.visitedOn, visitNo: r.visitNo, overall: r.overall, ratings: r.ratings,
    body: r.body, returnIntent: r.returnIntent, disclosure: r.disclosure, trust: r.trust, createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(), edited: r.updatedAt.getTime() - r.createdAt.getTime() > 60_000,
  }));
}

/** Profil: kullanıcının kendi deneyimleri (silinenler hariç; incelemede/gizlenmiş olanlar durumu ile). */
export async function listUserReviews(db: Db, userId: string) {
  const rows = await db.select({ r: reviews, slug: places.slug, name: places.name }).from(reviews)
    .innerJoin(places, eq(places.id, reviews.placeId)).where(and(eq(reviews.userId, userId), ne(reviews.status, "removed"))).orderBy(desc(reviews.updatedAt));
  return rows.map(({ r, slug, name }) => ({
    id: r.id, slug, place: name, visitedOn: r.visitedOn, visitNo: r.visitNo, overall: r.overall, ratings: r.ratings, body: r.body,
    returnIntent: r.returnIntent, disclosure: r.disclosure, status: r.status, trust: r.trust, updatedAt: r.updatedAt.toISOString(),
  }));
}
