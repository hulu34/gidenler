import { getRedis, redisNs } from "./redis";

/* ──────────────────────────────────────────────────────────────────────────
   ÜCRETLİ ÇAĞRI SAYACI — "önce say, sonra çağır".
   · Aylık + günlük sınır tek atomik Redis betiğinde kontrol edilir ve artırılır;
     sınırı aşan istek sayacı geri alır ve REDDEDİLİR.
   · ÇALIŞMAZSA DURDUR: Redis yoksa, yanıt vermezse ya da beklenmedik yanıt verirse çağrı yapılmaz.
   · Google Cloud günlük kotaları ikinci, bağımsız frendir (bkz. plan).
   · Ay ve gün UTC'dir; sınırlar Google'ın ücretsiz kotasının altında güvenlik payıyla seçilir.
   ────────────────────────────────────────────────────────────────────────── */

export interface Budget { monthly: number; daily: number }

/** Sağlayıcı kalemleri ve sınırları. Değiştirmek bilinçli bir maliyet kararıdır. */
export const BUDGETS = {
  "google:text_search_pro": { monthly: 4500, daily: 150 },       // ücretsiz: 5.000/ay
  "google:details_atmosphere": { monthly: 880, daily: 29 },      // ücretsiz: 1.000/ay
  "google:photo": { monthly: 880, daily: 29 },                   // ücretsiz: 1.000/ay
} satisfies Record<string, Budget>;
export type BudgetKey = keyof typeof BUDGETS;

/** Preview, Production ile aynı Google projesini kullanır: payı %10 ile sınırlanır,
    böylece iki ortamın toplamı da ücretsiz kotanın altında kalır (ör. 4.500 + 450 < 5.000). */
export function budgetFor(key: BudgetKey, env = process.env.VERCEL_ENV): Budget {
  const b = BUDGETS[key];
  if (env !== "preview") return b;
  return { monthly: Math.max(1, Math.floor(b.monthly / 10)), daily: Math.max(1, Math.floor(b.daily / 10)) };
}

const LUA = `
local m = redis.call('INCR', KEYS[1]); if m == 1 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
local d = redis.call('INCR', KEYS[2]); if d == 1 then redis.call('EXPIRE', KEYS[2], ARGV[4]) end
if m > tonumber(ARGV[1]) or d > tonumber(ARGV[2]) then
  redis.call('DECR', KEYS[1]); redis.call('DECR', KEYS[2]); return 0
end
return 1`;

const pad = (n: number) => String(n).padStart(2, "0");
export function periodKeys(key: string, now = new Date()) {
  const ym = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}`;
  const ns = redisNs();
  return { month: `${ns}:usage:${key}:m:${ym}`, day: `${ns}:usage:${key}:d:${ym}${pad(now.getUTCDate())}` };
}

export type ReserveResult = { ok: true } | { ok: false; reason: "no_redis" | "limit" | "error" };

/** `n` adet ücretli çağrı için yer ayırır. ok:false ise çağrı YAPILMAMALI. */
export async function reserve(key: BudgetKey, n = 1, now = new Date()): Promise<ReserveResult> {
  const r = getRedis();
  if (!r) return { ok: false, reason: "no_redis" };
  const b = budgetFor(key);
  const k = periodKeys(key, now);
  try {
    for (let i = 0; i < n; i++) {
      const v = await r.eval(LUA, [k.month, k.day], [String(b.monthly), String(b.daily), String(40 * 86400), String(2 * 86400)]);
      if (Number(v) !== 1) return { ok: false, reason: "limit" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Yönetim ve sağlık ekranı için: kalem başına bu ay / bugün kullanılan. */
export async function usageSnapshot(now = new Date()) {
  const r = getRedis();
  if (!r) return null;
  const keys = Object.keys(BUDGETS) as BudgetKey[];
  try {
    const flat = keys.flatMap((k) => { const p = periodKeys(k, now); return [p.month, p.day]; });
    const vals = await r.mget<(string | null)[]>(...flat);
    return Object.fromEntries(keys.map((k, i) => [k, {
      month: Number(vals[2 * i] ?? 0), day: Number(vals[2 * i + 1] ?? 0), budget: budgetFor(k),
    }]));
  } catch {
    return null;
  }
}
