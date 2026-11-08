/* Sunucu tarafı kampanya sayacı. Yazılan tek şey (gün, kod, adım, günlük ziyaretçi özeti). Ham IP, kullanıcı kimliği,
   arama metni ve seçilen mekân SAKLANMAZ. Üretimde bot, önizleme isteği ve test başlıklı istekler sayılmaz
   (signals.countable); Preview'da test doğrulaması için sayılır. */
import { sql } from "drizzle-orm";
import { campaignEvents } from "@/lib/db/schema";
import { countable, dayOf, visitorOf } from "@/lib/signals";
import { ALL_CODES, STEPS, isCode, type Step } from "./index";

import type { Db } from "@/lib/db/client";
const STEP_SET = new Set<string>(STEPS.map(([s]) => s));
export const isStep = (s: unknown): s is Step => typeof s === "string" && STEP_SET.has(s);
const KEEP_DAYS = 120;

export function measurable(h: Headers) {
  return process.env.VERCEL_ENV !== "production" || countable(h);
}
/** Ziyaretçi özeti: IP + tarayıcı imzası, günlük tuzla. Girişli kullanıcıda giriş öncesi/sonrası aynı kişi sayılsın diye kimlik kullanılmaz. */
export function visitorParts(h: Headers) {
  return [(h.get("x-forwarded-for") ?? "").split(",")[0].trim(), h.get("user-agent") ?? ""];
}

export async function recordCampaign(db: Db, code: string, step: Step, h: Headers, now = new Date()) {
  if (!isCode(code) || !isStep(step) || !measurable(h)) return false;
  const day = dayOf(now);
  await db.insert(campaignEvents).values({ day, code, step, visitor: visitorOf(day, ["kampanya", ...visitorParts(h)]) }).onConflictDoNothing();
  if (Math.random() < 0.02) await db.delete(campaignEvents).where(sql`${campaignEvents.day} < ${dayOf(new Date(now.getTime() - KEEP_DAYS * 864e5))}`).catch(() => {});
  return true;
}

export interface CampaignRow { code: string; label: string; steps: Record<string, number> }
/** Son `days` gün: kod × adım için günlük tekil ziyaretçi toplamı (günler arası tekilleştirme yapılamaz — tasarım gereği). */
export async function campaignReport(db: Db, days = 30, now = new Date()) {
  const since = dayOf(new Date(now.getTime() - (days - 1) * 864e5));
  const rows = await db.select({ code: campaignEvents.code, step: campaignEvents.step, n: sql<number>`count(*)::int` })
    .from(campaignEvents).where(sql`${campaignEvents.day} >= ${since}`).groupBy(campaignEvents.code, campaignEvents.step);
  const out: CampaignRow[] = ALL_CODES.map((c) => ({ code: c.code, label: c.label, steps: {} }));
  for (const r of rows) { const o = out.find((x) => x.code === r.code); if (o) o.steps[r.step] = r.n; }
  const total: Record<string, number> = {};
  for (const o of out) for (const [s, n] of Object.entries(o.steps)) total[s] = (total[s] ?? 0) + n;
  return { since, days, rows: out, total };
}
