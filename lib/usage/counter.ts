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
/* SKU'lar ve ücretsiz kotalar Google'ın resmî fiyat listesinden (Places API New, 14.10.2026):
   · Text Search Pro (id, displayName, location, formattedAddress)      → 5.000/ay ücretsiz, sonra $32/1.000
   · Place Details Enterprise (nationalPhoneNumber, websiteUri)          → 1.000/ay ücretsiz, sonra $20/1.000
   · Place Details Enterprise + Atmosphere (reviews dahil sayfa isteği)  → 1.000/ay ücretsiz, sonra $25/1.000
   · Place Details Photos (fotoğraf başına)                              → 1.000/ay ücretsiz, sonra $7/1.000
   Sınırlar ücretsiz kotanın ~%12 altında: Preview payı (%10) eklense de toplam ücretsiz kotayı aşmaz. */
export const BUDGETS = {
  "google:text_search_pro": { monthly: 4500, daily: 150 },       // eşleştirme araması
  "google:details_enterprise": { monthly: 880, daily: 100 },     // eşleştirme doğrulaması (telefon, web)
  "google:details_atmosphere": { monthly: 880, daily: 29 },      // sayfa: puan, yorum, saatler
  "google:photo": { monthly: 880, daily: 29 },                   // sayfa: fotoğraf başına
} satisfies Record<string, Budget>;
export type BudgetKey = keyof typeof BUDGETS;

/** Preview, Production ile aynı Google projesini kullanır: payı %10 ile sınırlanır,
    böylece iki ortamın toplamı da ücretsiz kotanın altında kalır (ör. 4.500 + 450 < 5.000). */
export function budgetFor(key: BudgetKey, env = process.env.VERCEL_ENV): Budget {
  const b = BUDGETS[key];
  if (env !== "preview") return b;
  return { monthly: Math.max(1, Math.floor(b.monthly / 10)), daily: Math.max(1, Math.floor(b.daily / 10)) };
}

/* KEYS[3], KEYS[4] (yalnız Production): önek öncesi eski sayaçlar. Yeni anahtar henüz yoksa eski değer
   bir kez devralınır — ortam öneki geçişinde sayaç sıfırlanıp kota iki kez kullanılamaz. */
export const LUA = `
for i = 1, 2 do
  if KEYS[i + 2] and redis.call('EXISTS', KEYS[i]) == 0 then
    local o = redis.call('GET', KEYS[i + 2])
    if o then redis.call('SET', KEYS[i], o, 'EX', ARGV[i + 2]) end
  end
end
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
  const legacy = { month: `usage:${key}:m:${ym}`, day: `usage:${key}:d:${ym}${pad(now.getUTCDate())}` };
  return { month: `${ns}:${legacy.month}`, day: `${ns}:${legacy.day}`, legacy: ns === "prod" ? legacy : null };
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
      const v = await r.eval(LUA, k.legacy ? [k.month, k.day, k.legacy.month, k.legacy.day] : [k.month, k.day], [String(b.monthly), String(b.daily), String(40 * 86400), String(2 * 86400)]);
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
