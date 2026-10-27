import { getRedis, redisNs } from "./redis";
import type { RateStore } from "@/lib/ai/ratelimit";

/* Kalıcı hız sınırı deposu — Redis varsa tüm sunucu örnekleri aynı sayacı görür.
   Redis yoksa bellek içi depo kullanılmaya devam eder (yalnız ücretsiz yollar için). */
export class RedisRateStore implements RateStore {
  async incr(key: string, ttlSec: number) {
    const r = getRedis();
    if (!r) throw new Error("no_redis");
    const v = await r.eval(
      "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n",
      [`${redisNs()}:rl:${key}`], [String(ttlSec)],
    );
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
