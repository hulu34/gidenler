import { Redis } from "@upstash/redis";
import { DEMO_VISIBLE } from "@/data/demoFlag";

/* Upstash Redis (REST) — yalnız sunucu. Ortam değişkenleri Vercel entegrasyonundan gelir (KV_REST_API_*). */
let client: Redis | null | undefined;
let override: Pick<Redis, "eval" | "get" | "set" | "incr" | "expire" | "mget" | "ttl"> | null = null;

export type RedisLike = Pick<Redis, "eval" | "get" | "set" | "incr" | "expire" | "mget" | "ttl">;

export function getRedis(): RedisLike | null {
  if (override) return override;
  if (client !== undefined) return client;
  /* Yatırımcı demosu Redis'e bağlanmaz (sayaç, kota, hız sınırı karışmaz; ücretli yollar kapalı kalır). */
  const url = DEMO_VISIBLE ? undefined : process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token, automaticDeserialization: false }) : null;
  return client;
}

/** Ortam ad alanı: Production ve Preview aynı Redis'e bağlansa bile sayaçları, hız sınırları ve
    maliyet kayıtları ayrı anahtarlarda tutulur ("prod:", "preview:", "dev:"). */
export function redisNs(env = process.env.VERCEL_ENV) {
  return env === "production" ? "prod" : env === "preview" ? "preview" : "dev";
}

/** Yalnız testler için. */
export function setRedisForTests(r: RedisLike | null) { override = r; client = undefined; }
