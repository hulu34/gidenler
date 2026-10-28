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
/* SKU'lar, ücretsiz kotalar ve fiyatlar Google'ın resmî fiyat listesinden (Places API New, 23.10.2026, ilk kademe):
   · Text Search Pro (id, displayName, location, formattedAddress)      → 5.000/ay ücretsiz, sonra $32/1.000
   · Place Details Enterprise (nationalPhoneNumber, websiteUri)          → 1.000/ay ücretsiz, sonra $20/1.000
   · Place Details Enterprise + Atmosphere (reviews dahil sayfa isteği)  → 1.000/ay ücretsiz, sonra $25/1.000
   · Place Details Essentials (yalnız photos alanı)                      → 10.000/ay ücretsiz, sonra $5/1.000
   · Place Details Photos (fotoğraf başına)                              → 1.000/ay ücretsiz, sonra $7/1.000
   Üç fren (hepsi aynı atomik Redis betiğinde, önce say sonra çağır):
   1) kalem başına günlük sınır, 2) kalem başına aylık sınır, 3) BÜTÜN kalemlerin toplam aylık harcama tavanı
   (sahibin onayı: aylık 100 USD; 28.10.2026). Ücretsiz kota önce tüketilir; tavan, ücretsiz kotayı aşan kısmın
   liste fiyatıyla hesaplanır. Redis yoksa / hata verirse / sayaç okunamazsa ücretli çağrı yapılmaz. */
export const BUDGETS = {
  "google:text_search_pro": { monthly: 8000, daily: 1000 },      // eşleştirme araması
  "google:details_enterprise": { monthly: 3000, daily: 600 },    // eşleştirme doğrulaması (telefon, web)
  /* Sayfa görünümü (otomatik): 1 Details (E+A) + fotoğraflar. Fotoğraf, mobilde yalnız görünen kare için istenir.
     Aylık sınırlar SKU'ların ayrı ücretsiz kotalarını (1.000 + 1.000) ve 100 USD tavanını birlikte kullanacak biçimde;
     asıl fren toplam 100 USD tavanıdır. Günlük sınır SABİT DEĞİL: kalan aylık hak / kalan gün × 1,5 (PACED). */
  "google:details_atmosphere": { monthly: 3200, daily: 0 },      // sayfa: puan, sayı, yorum, saatler, foto listesi (zamanlanmış)
  "google:details_essentials": { monthly: 9000, daily: 300 },    // sayfa, kullanıcı isteyince: fotoğraf adları
  "google:photo": { monthly: 8000, daily: 0 },                   // sayfa ve galeri: fotoğraf başına (zamanlanmış)
} satisfies Record<string, Budget>;
export type BudgetKey = keyof typeof BUDGETS;

/** Günlük payı ay boyunca kendiliğinden ayarlanan kalemler: yoğun bir gün içeriği erken kapatmaz,
    ayın ilk günleri de bütün ayı tüketemez. Pay = ⌈(aylık sınır − bugünden önce harcanan) / kalan gün × PACE⌉. */
export const PACED = new Set<BudgetKey>(["google:details_atmosphere", "google:photo"]);
export const PACE = 1.5;
export function pacedDaily(monthly: number, usedBeforeToday: number, now = new Date()) {
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const daysLeft = daysInMonth - now.getUTCDate() + 1;
  return Math.max(1, Math.ceil((Math.max(0, monthly - usedBeforeToday) / daysLeft) * PACE));
}

/** Aylık ücretsiz kota ve ücretsiz kotayı aşan her istek için liste fiyatı (USD / 1.000). */
export const PRICES: Record<BudgetKey, { free: number; usdPer1000: number }> = {
  "google:text_search_pro": { free: 5000, usdPer1000: 32 },
  "google:details_enterprise": { free: 1000, usdPer1000: 20 },
  "google:details_atmosphere": { free: 1000, usdPer1000: 25 },
  "google:details_essentials": { free: 10000, usdPer1000: 5 },
  "google:photo": { free: 1000, usdPer1000: 7 },
};
/** Toplam aylık harcama tavanı (USD). Ortam değişkeniyle yalnız AŞAĞI çekilebilir; 100'ün üstü sayılmaz. */
export const MONTHLY_USD_CAP = 100;
export const usdCap = () => Math.min(MONTHLY_USD_CAP, Math.max(0, Number(process.env.GOOGLE_MONTHLY_USD_CAP ?? MONTHLY_USD_CAP) || 0));

/** Preview, Production ile aynı Google projesini kullanır: payı %10 ile sınırlanır. (Preview'da Redis yok;
    ücretli çağrılar zaten kapalı kalır.) */
export function budgetFor(key: BudgetKey, env = process.env.VERCEL_ENV): Budget {
  const b = BUDGETS[key];
  if (env !== "preview") return b;
  return { monthly: Math.max(1, Math.floor(b.monthly / 10)), daily: Math.max(1, Math.floor(b.daily / 10)) };
}

/** Harcama (USD): her kalem için ücretsiz kotayı aşan istek × liste fiyatı. */
export function spendUsd(monthCounts: Partial<Record<BudgetKey, number>>) {
  return (Object.keys(PRICES) as BudgetKey[]).reduce((s, k) => s + Math.max(0, (monthCounts[k] ?? 0) - PRICES[k].free) * PRICES[k].usdPer1000 / 1000, 0);
}

/* KEYS[1] = bu kalemin aylık, KEYS[2] = günlük sayacı; KEYS[3..] = BÜTÜN kalemlerin aylık sayaçları (bu kalem dahil).
   ARGV: 1 aylık sınır, 2 günlük sınır, 3 aylık TTL, 4 günlük TTL, 5 tavan (mikro-USD), sonra kalem başına
   (ücretsiz adet, istek başı mikro-USD) çiftleri, KEYS[3..] ile aynı sırada.
   Dönüş: 1 izin, 0 kalem sınırı, -1 toplam harcama tavanı. Reddedilen istek sayacı geri alır. */
export const LUA = `
local m = redis.call('INCR', KEYS[1]); if m == 1 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
local d = redis.call('INCR', KEYS[2]); if d == 1 then redis.call('EXPIRE', KEYS[2], ARGV[4]) end
if m > tonumber(ARGV[1]) or d > tonumber(ARGV[2]) then
  redis.call('DECR', KEYS[1]); redis.call('DECR', KEYS[2]); return 0
end
local spend = 0
for i = 3, #KEYS do
  local n = tonumber(redis.call('GET', KEYS[i]) or '0')
  local free = tonumber(ARGV[6 + (i - 3) * 2])
  local micro = tonumber(ARGV[7 + (i - 3) * 2])
  if n > free then spend = spend + (n - free) * micro end
end
if spend > tonumber(ARGV[5]) then
  redis.call('DECR', KEYS[1]); redis.call('DECR', KEYS[2]); return -1
end
return 1`;

const pad = (n: number) => String(n).padStart(2, "0");
export function periodKeys(key: string, now = new Date()) {
  const ym = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}`;
  const ns = redisNs();
  return { month: `${ns}:usage:${key}:m:${ym}`, day: `${ns}:usage:${key}:d:${ym}${pad(now.getUTCDate())}` };
}

export type ReserveResult = { ok: true } | { ok: false; reason: "no_redis" | "limit" | "spend_cap" | "error" };

/** `n` adet ücretli çağrı için yer ayırır. ok:false ise çağrı YAPILMAMALI. */
export async function reserve(key: BudgetKey, n = 1, now = new Date()): Promise<ReserveResult> {
  const r = getRedis();
  if (!r) return { ok: false, reason: "no_redis" };
  const b = budgetFor(key);
  const k = periodKeys(key, now);
  /* zamanlanmış kalem: bugünkü pay, ay içindeki gerçek harcamadan hesaplanır (okunamazsa çağrı yapılmaz) */
  let daily = b.daily;
  if (PACED.has(key)) {
    try {
      const [m, d] = await r.mget<(string | null)[]>(k.month, k.day);
      daily = pacedDaily(b.monthly, Number(m ?? 0) - Number(d ?? 0), now);
    } catch { return { ok: false, reason: "error" }; }
  }
  const all = Object.keys(PRICES) as BudgetKey[];
  const keys = [k.month, k.day, ...all.map((x) => periodKeys(x, now).month)];
  const args = [String(b.monthly), String(daily), String(40 * 86400), String(2 * 86400), String(Math.round(usdCap() * 1e6)),
    ...all.flatMap((x) => [String(PRICES[x].free), String(PRICES[x].usdPer1000 * 1000)])];
  try {
    for (let i = 0; i < n; i++) {
      const v = Number(await r.eval(LUA, keys, args));
      if (v === -1) return { ok: false, reason: "spend_cap" };
      if (v !== 1) return { ok: false, reason: "limit" };
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
      month: Number(vals[2 * i] ?? 0), day: Number(vals[2 * i + 1] ?? 0),
      budget: PACED.has(k) ? { ...budgetFor(k), daily: pacedDaily(budgetFor(k).monthly, Number(vals[2 * i] ?? 0) - Number(vals[2 * i + 1] ?? 0), now) } : budgetFor(k),
      free: PRICES[k].free, billable: Math.max(0, Number(vals[2 * i] ?? 0) - PRICES[k].free),
    }]));
  } catch {
    return null;
  }
}

/** Gerçek maliyet raporu: bu ay kalem başına kullanım, ücretsiz kota, faturalanacak adet ve USD; toplam ve tavan.
    Sayaç okunamazsa null (çağıran taraf ücretli işlemi başlatmamalı). */
export async function spendReport(now = new Date()) {
  const s = await usageSnapshot(now);
  if (!s) return null;
  const months = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.month])) as Record<BudgetKey, number>;
  const usd = spendUsd(months);
  return { month: `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`, usd: Math.round(usd * 100) / 100, capUsd: usdCap(),
    perSku: Object.fromEntries((Object.keys(PRICES) as BudgetKey[]).map((k) => [k, { used: months[k], free: PRICES[k].free,
      billable: Math.max(0, months[k] - PRICES[k].free), usd: Math.round(Math.max(0, months[k] - PRICES[k].free) * PRICES[k].usdPer1000 / 10) / 100 }])) };
}
