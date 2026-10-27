import { getRedis } from "./redis";

/* REDIS ANAHTAR DENETİMİ — yalnız okuma. Yanıtta anahtar adı ve değeri yok; yalnız önek grubu başına
   sayı ve en uzun kalan süre. Önek geçişi öncesi "eski sayaç var mı" sorusunu cevaplar. */
const GROUPS: Array<[string, string]> = [
  ["prod:usage:", "prod:usage"], ["prod:rl:", "prod:rl"], ["usage:", "eski:usage"], ["rl:", "eski:rl"],
  ["preview:", "preview"], ["dev:", "dev"], ["health:", "health"],
];
const groupOf = (k: string) => GROUPS.find(([p]) => k.startsWith(p))?.[1] ?? "diger";

export async function redisAudit() {
  const r = getRedis();
  if (!r) return { redis: "off" as const };
  const keys = (await r.eval("return redis.call('KEYS', '*')", [], [])) as string[];
  if (keys.length > 10000) return { redis: "ok" as const, tooMany: keys.length };
  const ttls = keys.length ? ((await r.eval("local o = {} for i, k in ipairs(KEYS) do o[i] = redis.call('TTL', k) end return o", keys, [])) as number[]) : [];
  const groups: Record<string, { keys: number; maxTtlSec: number }> = {};
  keys.forEach((k, i) => { const g = (groups[groupOf(k)] ??= { keys: 0, maxTtlSec: -2 }); g.keys++; const t = Number(ttls[i]); if (Number.isFinite(t)) g.maxTtlSec = Math.max(g.maxTtlSec, t); });
  return { redis: "ok" as const, total: keys.length, groups };
}
