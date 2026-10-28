/* Eşzamanlılık ve hata testi — CANLI KOD (5240cdb) gerçek Redis 7 üzerinde (Actions servis konteyneri).
   Canlı Redis'e, Google'a ve siteye hiçbir istek gitmez. Log yalnız sayı. */
import Redis from "ioredis";
import { setRedisForTests, type RedisLike } from "../../lib/usage/redis";
import { reserve, periodKeys, spendUsd, BUDGETS, PRICES, type BudgetKey } from "../../lib/usage/counter";

const io = new Redis({ host: "127.0.0.1", port: 6379, lazyConnect: true, maxRetriesPerRequest: 0 });
const adapt = (c: Redis): RedisLike => ({
  eval: (s: string, k: string[], a: string[]) => c.eval(s, k.length, ...k, ...a),
  get: (k: string) => c.get(k), mget: (...k: string[]) => c.mget(...k),
  set: (k: string, v: unknown, o?: { ex?: number }) => (o?.ex ? c.set(k, String(v), "EX", o.ex) : c.set(k, String(v))),
  incr: (k: string) => c.incr(k), expire: (k: string, s: number) => c.expire(k, s), ttl: (k: string) => c.ttl(k),
} as unknown as RedisLike);
const results: boolean[] = [];
const ok = (n: string, c: boolean, info: unknown = "") => { results.push(c); console.log(`${c ? "✓" : "✗"} ${n}`, info === "" ? "" : JSON.stringify(info)); };
const now = new Date(Date.UTC(2026, 9, 28, 12));
const all = Object.keys(PRICES) as BudgetKey[];
const monthCounts = async () => Object.fromEntries(await Promise.all(all.map(async (k) => [k, Number(await io.get(periodKeys(k, now).month) ?? 0)]))) as Record<BudgetKey, number>;

await io.connect(); setRedisForTests(adapt(io));

/* 1) günlük sınır: 1.500 eşzamanlı istek, sınır 600 */
await io.flushall();
const r1 = await Promise.all(Array.from({ length: 1500 }, () => reserve("google:details_enterprise", 1, now)));
const g1 = r1.filter((r) => r.ok).length, d1 = Number(await io.get(periodKeys("google:details_enterprise", now).day));
ok("1.500 eşzamanlı istek → tam 600 izin, sayaç 600", g1 === BUDGETS["google:details_enterprise"].daily && d1 === g1, { izin: g1, sayac: d1 });

/* 2) 100 USD tavanı: kalan pay 0,40 USD → E+A için tam 16 istek */
await io.flushall();
await io.set(periodKeys("google:text_search_pro", now).month, String(5000 + 2800));   // 2.800 × 0,032 = 89,60 USD
await io.set(periodKeys("google:details_atmosphere", now).month, String(1000 + 400));  //   400 × 0,025 = 10,00 USD
const r2 = await Promise.all(Array.from({ length: 300 }, () => reserve("google:details_atmosphere", 1, now)));
const g2 = r2.filter((r) => r.ok).length, cap2 = r2.filter((r) => !r.ok && r.reason === "spend_cap").length, s2 = spendUsd(await monthCounts());
ok("tavana 0,40 USD kala 300 eşzamanlı istek → tam 16 izin, harcama ≤ 100", g2 === 16 && cap2 === 284 && s2 <= 100, { izin: g2, red: cap2, usd: Math.round(s2 * 1000) / 1000 });

/* 3) karışık kalemler aynı anda tavana yüklenir: toplam asla 100 USD'yi aşmaz */
await io.flushall();
await io.set(periodKeys("google:text_search_pro", now).month, String(5000 + 3000)); // 96 USD
await io.set(periodKeys("google:photo", now).month, String(1000));
await io.set(periodKeys("google:details_atmosphere", now).month, String(1000));
await io.set(periodKeys("google:details_enterprise", now).month, String(1000));
const mix: BudgetKey[] = ["google:photo", "google:details_atmosphere", "google:details_enterprise", "google:details_essentials"];
const r3 = await Promise.all(Array.from({ length: 2000 }, (_, i) => reserve(mix[i % 4], 1, now)));
const s3 = spendUsd(await monthCounts());
ok("2.000 eşzamanlı karışık istek (4 kalem) → toplam harcama ≤ 100 USD", s3 <= 100 && s3 > 99.9, { izin: r3.filter((r) => r.ok).length, usd: Math.round(s3 * 1000) / 1000 });

/* 4) Redis hatası: bağlantı yok → izin yok, Google'a istek yok */
const dead = new Redis({ host: "127.0.0.1", port: 6390, lazyConnect: true, maxRetriesPerRequest: 0, retryStrategy: () => null });
setRedisForTests(adapt(dead));
const r4 = await Promise.all(Array.from({ length: 50 }, (_, i) => reserve(all[i % all.length], 1, now)));
ok("Redis'e ulaşılamıyor → 50 isteğin hiçbirine izin yok (error)", r4.every((r) => !r.ok && r.reason === "error"), r4.slice(0, 1));
setRedisForTests(null);
await io.quit(); dead.disconnect();
console.log(`Sonuç: ${results.filter(Boolean).length}/${results.length}`);
process.exit(results.every(Boolean) ? 0 : 1);
