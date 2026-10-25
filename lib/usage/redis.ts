import { Redis } from "@upstash/redis";

/* Upstash Redis (REST) — yalnız sunucu. Ortam değişkenleri Vercel entegrasyonundan gelir (KV_REST_API_*). */
let client: Redis | null | undefined;
let override: Pick<Redis, "eval" | "get" | "set" | "incr" | "expire" | "mget"> | null = null;

export type RedisLike = Pick<Redis, "eval" | "get" | "set" | "incr" | "expire" | "mget">;

export function getRedis(): RedisLike | null {
  if (override) return override;
  if (client !== undefined) return client;
  const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token, automaticDeserialization: false }) : null;
  return client;
}

/** Yalnız testler için. */
export function setRedisForTests(r: RedisLike | null) { override = r; client = undefined; }
