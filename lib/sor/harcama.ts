import { getRedis, redisNs } from "@/lib/usage/redis";

/* SOR GİDENLER · HARCAMA FRENİ — "önce ayır, sonra çağır". Aylık hedef 10 USD; ortam değişkeniyle yalnız AŞAĞI çekilir.
   Her çağrıdan önce en kötü durum maliyeti atomik olarak ayrılır, çağrıdan sonra gerçek maliyete indirilir.
   Production'da Redis yoksa ya da hata verirse model ÇAĞRILMAZ. Preview'da Redis yok: sayaç örnek içi ve daha dar;
   asıl tavan sağlayıcı tarafındadır. Ay ve gün UTC. */
export const SOR_MONTHLY_CAP_USD = 10;
const MICRO = 1_000_000;
export const sorCapUsd = () => { const preview = process.env.VERCEL_ENV === "preview" ? 2 : SOR_MONTHLY_CAP_USD; const n = Number(process.env.SOR_MONTHLY_BUDGET_USD); return Math.min(preview, Number.isFinite(n) && n > 0 ? n : preview); };
/* yoğun bir gün bütün ayı tüketemez: günlük pay, aylık hedefin %10'u */
const dayCap = () => sorCapUsd() * 0.1;

const LUA = `
local m = tonumber(redis.call('GET', KEYS[1]) or '0'); local d = tonumber(redis.call('GET', KEYS[2]) or '0'); local r = tonumber(ARGV[1])
if m + r > tonumber(ARGV[2]) or d + r > tonumber(ARGV[3]) then return -1 end
redis.call('INCRBY', KEYS[1], r); redis.call('EXPIRE', KEYS[1], ARGV[4]); redis.call('INCRBY', KEYS[2], r); redis.call('EXPIRE', KEYS[2], ARGV[5])
return m + r`;

const mem = new Map<string, number>();
const keys = (now = new Date()) => { const iso = now.toISOString(), ns = redisNs(); return [`${ns}:sor:usd:m:${iso.slice(0, 7)}`, `${ns}:sor:usd:d:${iso.slice(0, 10)}`] as const; };
const warned = new Set<string>();
function warn(usedMicro: number) {
  const ratio = usedMicro / (sorCapUsd() * MICRO), level = ratio >= 1 ? 100 : ratio >= 0.8 ? 80 : ratio >= 0.5 ? 50 : 0;
  const k = `${keys()[0]}:${level}`;
  if (level && !warned.has(k)) { warned.add(k); console.warn(`[sor-butce] aylık hedefin %${level} eşiği aşıldı`); }
}

/** Ayırma. false: çağrı yapılmaz. */
export async function reserve(usd: number): Promise<boolean> {
  const r = Math.max(1, Math.ceil(usd * MICRO)), [m, d] = keys(), cap = Math.round(sorCapUsd() * MICRO), dc = Math.round(dayCap() * MICRO);
  const redis = getRedis();
  if (redis) {
    try { const out = Number(await redis.eval(LUA, [m, d], [String(r), String(cap), String(dc), "3024000", "172800"])); if (!Number.isFinite(out) || out < 0) return false; warn(out); return true; }
    catch { return false; }
  }
  if (process.env.VERCEL_ENV === "production") return false;
  const mm = mem.get(m) ?? 0, dd = mem.get(d) ?? 0;
  if (mm + r > cap || dd + r > dc) return false;
  mem.set(m, mm + r); mem.set(d, dd + r); warn(mm + r);
  return true;
}

/** Ayrılan tutarı gerçek maliyete indirir. Hata verirse ayrılan kalır: sapma güvenli yöndedir. */
export async function settle(reservedUsd: number, actualUsd: number) {
  const back = Math.floor((reservedUsd - actualUsd) * MICRO); if (back <= 0) return;
  const [m, d] = keys(), redis = getRedis();
  if (redis) { try { await redis.eval("redis.call('DECRBY', KEYS[1], ARGV[1]); redis.call('DECRBY', KEYS[2], ARGV[1]); return 1", [m, d], [String(back)]); } catch { /* güvenli yön */ } return; }
  mem.set(m, Math.max(0, (mem.get(m) ?? 0) - back)); mem.set(d, Math.max(0, (mem.get(d) ?? 0) - back));
}

export async function spentUsd(): Promise<number | null> {
  const [m] = keys(), redis = getRedis();
  if (!redis) return (mem.get(m) ?? 0) / MICRO;
  try { return Number((await redis.get(m)) ?? 0) / MICRO; } catch { return null; }
}
/** Yalnız testler için. */
export const resetHarcamaForTests = () => mem.clear();
