import { NextResponse } from "next/server";
import { z } from "zod";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { rateStore } from "@/lib/ai/ratelimit";
import { sameOrigin } from "./http";
import { DISCLOSURES, RETURN_INTENTS, reviewsTag, type ReviewError } from "./reviews";
import { eq } from "drizzle-orm";
import { places } from "@/lib/db/schema";
import { recomputePlace } from "@/lib/score/compute";
import { scoreTags } from "@/lib/live";
export { reviewsTag };

/* Deneyim API'lerinin ortak parçaları: oturum, köken, hız sınırı, gövde şeması, hata metinleri, önbellek. */
export const H = { "cache-control": "no-store" };
export const ReviewBody = z.object({
  body: z.string().max(6000),
  visitMonth: z.string().regex(/^\d{4}-\d{2}$/),
  overall: z.number().int().min(1).max(10).nullable(),
  ratings: z.record(z.string().max(40), z.number().int().min(1).max(10)).refine((r) => Object.keys(r).length <= 12),
  returnIntent: z.enum(RETURN_INTENTS),
  disclosure: z.enum(DISCLOSURES),
}).strict();

export const MESSAGES: Record<ReviewError, string> = {
  body_short: "En az bir paragraf yaz (40 karakter).", body_long: "Metin çok uzun (en çok 5.000 karakter).",
  contact_info: "Bağlantı, e-posta ya da telefon numarası paylaşılamaz.", repetitive: "Metin tekrar eden karakterlerden oluşuyor; olayı anlat.",
  month_invalid: "Ziyaret ayı son 24 ay içinde olmalı.", overall_required: "Genel puanı seç (1–10).", overall_invalid: "Genel puan 1–10 arası olmalı.",
  rating_invalid: "Puanlar 1–10 arası olmalı.", unknown_place: "Mekân bulunamadı.", exists: "Bu mekân için zaten bir deneyimin var; onu düzenleyebilirsin.",
  recently_removed: "Bu mekân için deneyimini yeni sildin; 24 saat sonra yeniden yazabilirsin.", not_found: "Deneyim bulunamadı.",
  moderated: "Bu deneyim moderasyon nedeniyle gizlendi; düzenlenemez.", own_review: "Kendi deneyimini bildiremezsin.", already_reported: "Bu deneyimi zaten bildirdin.",
};

type Ok = { db: NonNullable<ReturnType<typeof getDb>>; user: { id: string; kind?: string | null } };
/** Oturum + (yazmada) aynı köken + kullanıcı başına hız sınırı. */
export async function guard(req: Request, opts: { write: boolean; limit?: { key: string; max: number; windowSec: number } }): Promise<Ok | NextResponse> {
  if (opts.write && !sameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: H });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_database" }, { status: 503, headers: H });
  const u = await currentUser(req.headers);
  if (!u) return NextResponse.json({ error: "unauthorized", message: "Giriş yapman gerekiyor." }, { status: 401, headers: H });
  if (opts.limit) {
    const w = Math.floor(Date.now() / 1000 / opts.limit.windowSec);
    if ((await rateStore().incr(`${opts.limit.key}:${u.id}:${w}`, opts.limit.windowSec + 10)) > opts.limit.max) {
      return NextResponse.json({ error: "rate_limited", message: "Çok sık işlem yaptın; biraz sonra yeniden dene." }, { status: 429, headers: H });
    }
  }
  return { db, user: { id: u.id, kind: (u as { kind?: string | null }).kind } };
}

/** Aynı kullanıcı + mekân için eşzamanlı ikinci yazmayı engeller (çift gönderim / paralel istekle iki deneyim). */
export async function lockOnce(key: string) {
  return (await rateStore().incr(`rvlock:${key}`, 15)) === 1;
}

export const fail = (e: ReviewError, status = 400) => NextResponse.json({ error: e, message: MESSAGES[e] }, { status, headers: H });
/* deneyim değişince: liste önbelleği + mekânın Gidenler puanı yeniden hesaplanır (yanıttan sonra; hata işlemi bozmaz,
   kaçan olayı günlük uzlaştırma yakalar) */
export const refresh = (slug: string) => after(async () => { revalidateTag(reviewsTag(slug)); await rescoreSlug(slug); });
export async function rescoreSlug(slug: string) {
  const db = getDb();
  if (!db) return;
  try {
    const [p] = await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)).limit(1);
    if (!p) return;
    const r = await recomputePlace(db, p.id);
    if (r.action === "written") for (const t of scoreTags(slug)) revalidateTag(t);
  } catch { /* günlük uzlaştırma telafi eder */ }
}
