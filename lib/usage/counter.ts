import { and, eq, like, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { getRedis, redisNs } from "./redis";
import { getDb } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

/* ──────────────────────────────────────────────────────────────────────────
   ÜCRETLİ ÇAĞRI SAYACI — "önce say, sonra çağır".
   · Aylık + günlük sınır tek atomik Redis betiğinde kontrol edilir ve artırılır;
     sınırı aşan istek sayacı geri alır ve REDDEDİLİR.
   · ÇALIŞMAZSA DURDUR: Redis yoksa, yanıt vermezse ya da beklenmedik yanıt verirse çağrı yapılmaz.
   · Google Cloud tarafındaki Places kotaları bu projede düşürülemiyor; asıl fren bu sayaçtır.
   · KALICI TABAN (Neon): Redis sayaçları silinirse (flush, tahliye, süre dolması) aylık tavan sıfırlanmasın diye
     her kalemin aylık sayısı Neon'a "en az bu kadar kullanıldı" tabanı olarak yazılır; bkz. FLOOR_STEP.
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
/** Günlük toplam harcama tavanı (USD): ay sonu gevşemesine karşı. Ortam değişkeniyle yalnız AŞAĞI çekilir. */
export const DAILY_USD_CAP = 3;
export const dailyUsdCap = () => Math.min(DAILY_USD_CAP, Math.max(0, Number(process.env.GOOGLE_DAILY_USD_CAP ?? DAILY_USD_CAP) || 0));
/** Bugünkü harcama: yalnız ücretsiz kotayı aşan kısmı. */
export function daySpendUsd(month: Partial<Record<BudgetKey, number>>, day: Partial<Record<BudgetKey, number>>) {
  return (Object.keys(PRICES) as BudgetKey[]).reduce((s, k) => {
    const m = month[k] ?? 0, d = day[k] ?? 0, free = PRICES[k].free;
    return s + ((Math.max(0, m - free) - Math.max(0, m - d - free)) * PRICES[k].usdPer1000) / 1000;
  }, 0);
}
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
   Dönüş: ≥1 izin (bu kalemin yeni aylık sayısı), 0 kalem sınırı, -1 toplam harcama tavanı. Reddedilen istek sayacı geri alır. */
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
return m`;

/* Tohum: KEYS = bütün kalemlerin aylık sayaçları; ARGV[1] TTL, ARGV[2..] kalem başına Neon tabanı.
   Sayaç yoksa ya da tabanın altındaysa tabana çekilir (asla AŞAĞI çekilmez). Eşzamanlı tohumlama zararsızdır. */
export const SEED_LUA = `
for i = 1, #KEYS do
  local cur = tonumber(redis.call('GET', KEYS[i]) or '-1')
  local floor = tonumber(ARGV[i + 1])
  if cur < floor then redis.call('SET', KEYS[i], floor, 'EX', ARGV[1]) end
end
return 1`;

/* ── KALICI TABAN ─────────────────────────────────────────────────────────────
   Her FLOOR_STEP istekte bir, Neon'a "bu ay bu kalemden en çok şu kadar kullanılmış olabilir" yazılır:
   sayaç m'ye ulaştığında (m % STEP === 1) taban = m − 1 + STEP. Böylece taban gerçek kullanımın
   hep ÜSTÜNDEdir (en çok STEP−1 fazla); Redis silinip tabandan yeniden kurulduğunda eksik sayılmaz.
   · Aylık sayaçlardan biri bile yoksa önce Neon'dan tohumlanır; Neon okunamazsa ücretli çağrı yapılmaz.
   · Taban yazılamazsa (Neon erişilemiyor) istek reddedilir ve artış geri alınır: sonraki her istek aynı eşikte
     yeniden yazmayı dener, yani Neon dönene kadar o kalemde ücretli çağrı durur.
   · Saklama: mevcut audit_log tablosu (yeni tablo/geçiş yok). ref_id = "<ortam>:<kalem>:<YYYYMM>". */
export const FLOOR_STEP = 10;
const FLOOR_ACTION = "usage_floor";
const UNDO_LUA = `-- undo
redis.call('DECR', KEYS[1]); redis.call('DECR', KEYS[2]); return 1`;
const ymOf = (now: Date) => `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}`;
const floorRef = (key: BudgetKey, ym: string) => `${redisNs()}:${key}:${ym}`;

/** Bu ayın kalem başına Neon tabanı; okunamazsa null (çağıran ücretli işlemi durdurur). */
export async function readFloors(now = new Date()): Promise<Record<BudgetKey, number> | null> {
  const db = getDb();
  if (!db) return null;
  const ym = ymOf(now);
  try {
    const rows = await db.select({ ref: auditLog.refId, n: sql<number>`max((${auditLog.detail}->>'floor')::int)` }).from(auditLog)
      .where(and(eq(auditLog.action, FLOOR_ACTION), like(auditLog.refId, `${redisNs()}:%:${ym}`))).groupBy(auditLog.refId);
    const out = Object.fromEntries((Object.keys(PRICES) as BudgetKey[]).map((k) => [k, 0])) as Record<BudgetKey, number>;
    for (const r of rows) { const k = (Object.keys(PRICES) as BudgetKey[]).find((x) => r.ref === floorRef(x, ym)); if (k) out[k] = Math.max(out[k], Number(r.n) || 0); }
    return out;
  } catch { return null; }
}

/* İlk eşitleme: Redis'teki aylık sayaç Neon tabanından büyükse (ör. bu kod yayına girmeden önceki kullanım,
   ya da kaybolan bir taban kaydı) taban, sayacın üstündeki ilk eşiğe çekilir. Sunucu örneği başına ayda bir kez;
   Neon okunamaz/yazılamazsa ücretli çağrı yapılmaz ve bir sonraki istekte yeniden denenir. */
let syncedFor: string | null = null;
let syncing: Promise<boolean> | null = null;
function syncFloors(now: Date, counts: Record<BudgetKey, number>): Promise<boolean> {
  const tag = `${redisNs()}:${ymOf(now)}`;
  if (syncedFor === tag) return Promise.resolve(true);
  syncing ??= (async () => {
    const floors = await readFloors(now);
    if (!floors) return false;
    for (const x of Object.keys(PRICES) as BudgetKey[]) {
      if (counts[x] > floors[x] && !(await writeFloor(x, now, Math.ceil(counts[x] / FLOOR_STEP) * FLOOR_STEP))) return false;
    }
    syncedFor = tag;
    return true;
  })().finally(() => { syncing = null; });
  return syncing;
}

async function writeFloor(key: BudgetKey, now: Date, floor: number) {
  const db = getDb();
  if (!db) return false;
  try {
    await db.insert(auditLog).values({ id: uuidv7(), actor: "system:usage", action: FLOOR_ACTION, refTable: "usage", refId: floorRef(key, ymOf(now)), detail: { floor } });
    return true;
  } catch { return false; }
}

const pad = (n: number) => String(n).padStart(2, "0");
export function periodKeys(key: string, now = new Date()) {
  const ym = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}`;
  const ns = redisNs();
  return { month: `${ns}:usage:${key}:m:${ym}`, day: `${ns}:usage:${key}:d:${ym}${pad(now.getUTCDate())}` };
}

export type ReserveResult = { ok: true } | { ok: false; reason: "no_redis" | "limit" | "spend_cap" | "day_cap" | "paused" | "error" };

/* Sigorta: Google kota/faturalama hatası (429/403) verirse bütün Google çağrıları bir süre durur.
   Google tarafındaki kotalar bu projede düşürülemiyor; tekrar tekrar başarısız istek atılmasın, site kendi içeriğiyle sürsün. */
export const PAUSE_SECONDS: Record<number, number> = { 429: 15 * 60, 403: 60 * 60 };
const pauseKey = () => `${redisNs()}:usage:google:pause`;
export async function pauseGoogle(status: number) {
  const ex = PAUSE_SECONDS[status];
  const r = getRedis();
  if (!ex || !r) return false;
  try { await r.set(pauseKey(), String(status), { ex }); return true; } catch { return false; }
}
export async function googlePause() {
  const r = getRedis();
  if (!r) return null;
  try { const [v, ttl] = await Promise.all([r.get<string | number>(pauseKey()), r.ttl(pauseKey())]); return v ? { status: Number(v), seconds: ttl } : null; } catch { return null; }
}

/** `n` adet ücretli çağrı için yer ayırır. ok:false ise çağrı YAPILMAMALI. */
export async function reserve(key: BudgetKey, n = 1, now = new Date(), opts: { durable?: boolean } = {}): Promise<ReserveResult> {
  const r = getRedis();
  if (!r) return { ok: false, reason: "no_redis" };
  const durable = opts.durable !== false;           // yalnız Redis öz testi kapatır (2099 anahtarları, Neon'a yazmaz)
  const b = budgetFor(key);
  const k = periodKeys(key, now);
  const all = Object.keys(PRICES) as BudgetKey[];
  const monthKeys = all.map((x) => periodKeys(x, now).month);
  /* sigorta + kalıcı taban + zamanlanmış kalem: bugünkü pay, ay içindeki gerçek harcamadan hesaplanır (okunamazsa çağrı yapılmaz) */
  let daily = b.daily;
  try {
    const dayKeys = all.map((x) => periodKeys(x, now).day);
    const [p, m, d, ...rest] = await r.mget<(string | null)[]>(pauseKey(), k.month, k.day, ...monthKeys, ...dayKeys);
    if (p) return { ok: false, reason: "paused" };
    const months = rest.slice(0, all.length), days = rest.slice(all.length);
    /* günlük tavan: sayaçtan okunur; aynı anda gelen birkaç istek kadar aşabilir, aylık tavan ayrıca atomik korur */
    const spentToday = daySpendUsd(Object.fromEntries(all.map((x, i) => [x, Number(months[i] ?? 0)])), Object.fromEntries(all.map((x, i) => [x, Number(days[i] ?? 0)])));
    if (spentToday >= dailyUsdCap()) return { ok: false, reason: "day_cap" };
    let used = Number(m ?? 0);
    if (durable && months.some((v) => v === null)) {
      const floors = await readFloors(now);
      if (!floors) return { ok: false, reason: "error" };
      await r.eval(SEED_LUA, monthKeys, [String(40 * 86400), ...all.map((x) => String(floors[x]))]);
      used = Math.max(used, floors[key]);
    }
    if (durable && !(await syncFloors(now, Object.fromEntries(all.map((x, i) => [x, Number(months[i] ?? 0)])) as Record<BudgetKey, number>))) {
      return { ok: false, reason: "error" };
    }
    if (PACED.has(key)) daily = pacedDaily(b.monthly, used - Number(d ?? 0), now);
  } catch { return { ok: false, reason: "error" }; }
  const keys = [k.month, k.day, ...monthKeys];
  const args = [String(b.monthly), String(daily), String(40 * 86400), String(2 * 86400), String(Math.round(usdCap() * 1e6)),
    ...all.flatMap((x) => [String(PRICES[x].free), String(PRICES[x].usdPer1000 * 1000)])];
  try {
    for (let i = 0; i < n; i++) {
      const v = Number(await r.eval(LUA, keys, args));
      if (v === -1) return { ok: false, reason: "spend_cap" };
      if (!(v >= 1)) return { ok: false, reason: "limit" };
      if (durable && v % FLOOR_STEP === 1 && !(await writeFloor(key, now, v - 1 + FLOOR_STEP))) {
        await r.eval(UNDO_LUA, [k.month, k.day], []).catch(() => null);
        return { ok: false, reason: "error" };
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Mekân ve kalem kırılımı (yalnız görünürlük): yazılamazsa çağrıyı etkilemez. */
const placeKey = (now: Date) => `${redisNs()}:usage:place:${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}`;
export async function notePlaceUse(slug: string, key: BudgetKey, n: number, now = new Date()) {
  const r = getRedis();
  if (!r) return;
  try { await r.hincrby(placeKey(now), `${slug}|${key}`, n); await r.expire(placeKey(now), 40 * 86400); } catch { /* yalnız rapor */ }
}
/** Bu ay en çok maliyet oluşturan mekânlar (liste fiyatı, ücretsiz kota düşülmeden). */
export async function placeUseReport(top = 10, now = new Date()) {
  const r = getRedis();
  if (!r) return null;
  try {
    const h = (await r.hgetall<Record<string, number>>(placeKey(now))) ?? {};
    const by = new Map<string, { usd: number; calls: Partial<Record<BudgetKey, number>> }>();
    for (const [f, v] of Object.entries(h)) { const [slug, key] = f.split("|") as [string, BudgetKey]; const e = by.get(slug) ?? { usd: 0, calls: {} }; e.calls[key] = Number(v); e.usd += (Number(v) * (PRICES[key]?.usdPer1000 ?? 0)) / 1000; by.set(slug, e); }
    return [...by.entries()].map(([slug, e]) => ({ slug, ...e })).sort((a, b) => b.usd - a.usd).slice(0, top);
  } catch { return null; }
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
