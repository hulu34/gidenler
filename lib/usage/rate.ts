import { getRedis, redisNs } from "./redis";
import type { RateStore } from "@/lib/ai/ratelimit";

export const RATE_LUA = `if KEYS[2] and redis.call('EXISTS', KEYS[1]) == 0 then
  local o = redis.call('GET', KEYS[2]) if o then redis.call('SET', KEYS[1], o, 'EX', ARGV[1]) end
end
local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n`;

/* Kalıcı hız sınırı deposu — Redis varsa tüm sunucu örnekleri aynı sayacı görür.
   Redis yoksa bellek içi depo kullanılmaya devam eder (yalnız ücretsiz yollar için). */
export class RedisRateStore implements RateStore {
  async incr(key: string, ttlSec: number) {
    const r = getRedis();
    if (!r) throw new Error("no_redis");
    /* Production'da önek öncesi eski anahtar (rl:…) bir kez devralınır: geçişte hız sınırı sıfırlanmaz. */
    const ns = redisNs();
    const v = await r.eval(RATE_LUA, ns === "prod" ? [`${ns}:rl:${key}`, `rl:${key}`] : [`${ns}:rl:${key}`], [String(ttlSec)]);
    return Number(v);
  }
  async reset() { /* yalnız bellek deposunda anlamlı */ }
}

/** Ücretli yollar için: Redis yoksa ya da hata verirse "aşıldı" say (çalışmazsa durdur). */
export async function strictHit(key: string, limit: number, ttlSec: number): Promise<boolean> {
  try {
    const n = await new RedisRateStore().incr(key, ttlSec);
    return n <= limit;
  } catch {
    return false;
  }
}

/** Ücretsiz yollar için (kampanya sayacı, mekân önerisi): Redis varsa ortak sayaç; Redis yoksa ya da hata verirse
 *  bu sunucu örneğinin belleğinde sayılır (sınır yine uygulanır, yalnız örnekler arası paylaşılmaz). Ücretli yolda KULLANMA. */
const mem = new Map<string, { n: number; until: number }>();
export async function softHit(key: string, limit: number, ttlSec: number): Promise<boolean> {
  try {
    return (await new RedisRateStore().incr(key, ttlSec)) <= limit;
  } catch {
    const now = Date.now();
    const e = mem.get(key);
    if (!e || e.until < now) { mem.set(key, { n: 1, until: now + ttlSec * 1000 }); if (mem.size > 5000) mem.clear(); return 1 <= limit; }
    e.n++;
    return e.n <= limit;
  }
}
