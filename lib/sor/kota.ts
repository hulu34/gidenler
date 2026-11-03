import { getRedis, redisNs } from "@/lib/usage/redis";
import type { ProviderId } from "@/lib/ai/types";

/* SOR GİDENLER · ÜCRETSİZ KOTA FRENİ — hedef harcama 0 USD.
   Yalnız ücretsiz planı olan sağlayıcılar çağrılır; ücretli sağlayıcı ancak SOR_ALLOW_PAID=evet ile açılır (bugün kapalı).
   Her çağrıdan önce istek ve token, sağlayıcının ücretsiz sınırının %90'ında kesilecek biçimde ayrılır; aşılırsa model çağrılmaz.
   Sınırlar Groq "Free Plan Limits" tablosundan (console.groq.com/docs/rate-limits, 2026-11-03). Değişirse burada güncellenir;
   ortam değişkeniyle yükseltilemez. Gün UTC; sağlayıcının sıfırlama saati farklı olabilir, sapma 429'la yakalanır. */
export const FREE_PROVIDERS: ProviderId[] = ["groq"];
export const paidAllowed = () => process.env.SOR_ALLOW_PAID === "evet";
export const allowedProviders = (): ProviderId[] | undefined => (paidAllowed() ? undefined : FREE_PROVIDERS);

interface Limit { rpm: number; rpd: number; tpm: number; tpd: number }
const FREE_LIMITS: Record<string, Limit> = {
  "groq:openai/gpt-oss-120b": { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200_000 },
  "groq:openai/gpt-oss-20b": { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200_000 },
  "groq:qwen/qwen3.8-27b": { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200_000 },
};
const SHARE = 0.9;
/** Tabloda olmayan ücretsiz model çağrılmaz: sınırı bilinmeyen kota korunamaz. */
export const freeLimit = (provider: ProviderId, model: string): Limit | null => FREE_LIMITS[`${provider}:${model}`] ?? null;

const LUA = `
for i = 1, 4 do
  local cur = tonumber(redis.call('GET', KEYS[i]) or '0')
  if cur + tonumber(ARGV[i]) > tonumber(ARGV[i + 4]) then return 0 end
end
for i = 1, 4 do redis.call('INCRBY', KEYS[i], ARGV[i]); redis.call('EXPIRE', KEYS[i], ARGV[9 + (i % 2)]) end
return 1`;

const mem = new Map<string, number>();
const keysFor = (provider: ProviderId, model: string, now = new Date()) => {
  const iso = now.toISOString(), base = `${redisNs()}:sor:kota:${provider}:${model}`;
  /* sıra: dakika-istek, gün-istek, dakika-token, gün-token (Lua'da i%2 → TTL seçer) */
  return [`${base}:rm:${iso.slice(0, 16)}`, `${base}:rd:${iso.slice(0, 10)}`, `${base}:tm:${iso.slice(0, 16)}`, `${base}:td:${iso.slice(0, 10)}`] as const;
};

export type KotaResult = { ok: true; tokens: number; keys: readonly string[] } | { ok: false; why: "unknown_model" | "quota" | "store" };

/** İstek ve en kötü durum token'ı ayrılır. ok:false → model çağrılmaz. */
export async function reserveKota(provider: ProviderId, model: string, tokens: number): Promise<KotaResult> {
  if (paidAllowed() && !FREE_PROVIDERS.includes(provider)) return { ok: true, tokens: 0, keys: [] };
  const lim = freeLimit(provider, model);
  if (!lim) return { ok: false, why: "unknown_model" };
  const t = Math.max(1, Math.ceil(tokens)), ks = keysFor(provider, model);
  const caps = [lim.rpm, lim.rpd, lim.tpm, lim.tpd].map((x) => Math.floor(x * SHARE)), add = [1, 1, t, t];
  const redis = getRedis();
  if (redis) {
    try { return Number(await redis.eval(LUA, [...ks], [...add.map(String), ...caps.map(String), "172800", "120"])) === 1 ? { ok: true, tokens: t, keys: ks } : { ok: false, why: "quota" }; }
    catch { return { ok: false, why: "store" }; }
  }
  if (process.env.VERCEL_ENV === "production") return { ok: false, why: "store" };
  if (ks.some((k, i) => (mem.get(k) ?? 0) + add[i] > caps[i])) return { ok: false, why: "quota" };
  ks.forEach((k, i) => mem.set(k, (mem.get(k) ?? 0) + add[i]));
  return { ok: true, tokens: t, keys: ks };
}

/** Ayrılan token'ı gerçek kullanıma indirir. Gerçek fazlaysa fark eklenir. Hata: ayrılan kalır (güvenli yön). */
export async function settleKota(r: KotaResult, actualTokens: number) {
  if (!r.ok || !r.keys.length) return;
  const diff = Math.ceil(actualTokens) - r.tokens; if (!diff) return;
  const [, , tm, td] = r.keys, redis = getRedis();
  if (redis) { try { await redis.eval("redis.call('INCRBY', KEYS[1], ARGV[1]); redis.call('INCRBY', KEYS[2], ARGV[1]); return 1", [tm, td], [String(diff)]); } catch { /* güvenli yön */ } return; }
  for (const k of [tm, td]) mem.set(k, Math.max(0, (mem.get(k) ?? 0) + diff));
}

/** Sağlayıcı 429 verdiyse bir süre çağrı yapılmaz; sınır dolu bir hesaba istek yağdırılmaz. */
const cool = new Map<string, number>();
export async function coolDown(provider: ProviderId, model: string, sec = 60) {
  const until = Date.now() + Math.min(Math.max(sec, 10), 3600) * 1000, k = `${redisNs()}:sor:kota:${provider}:${model}:bekle`;
  cool.set(k, until);
  const redis = getRedis(); if (redis) { try { await redis.set(k, String(until), { ex: Math.ceil((until - Date.now()) / 1000) }); } catch { /* bellek yeter */ } }
}
export async function coolingDown(provider: ProviderId, model: string): Promise<boolean> {
  const k = `${redisNs()}:sor:kota:${provider}:${model}:bekle`, redis = getRedis();
  let until = cool.get(k) ?? 0;
  if (redis) { try { until = Math.max(until, Number((await redis.get(k)) ?? 0)); } catch { /* bellek */ } }
  return until > Date.now();
}

export async function kotaDurum(provider: ProviderId, model: string) {
  const lim = freeLimit(provider, model); if (!lim) return null;
  const [, rd, , td] = keysFor(provider, model), redis = getRedis();
  const get = async (k: string) => { if (redis) { try { return Number((await redis.get(k)) ?? 0); } catch { return null; } } return mem.get(k) ?? 0; };
  return { istekGun: await get(rd), istekSinir: Math.floor(lim.rpd * SHARE), tokenGun: await get(td), tokenSinir: Math.floor(lim.tpd * SHARE) };
}
/** Yalnız testler için. */
export const resetKotaForTests = () => { mem.clear(); cool.clear(); };
