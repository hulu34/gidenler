/* Kalıcı taban + eşzamanlılık — butce/kalici-taban kodu gerçek Redis 7 (servis konteyneri) + PGlite (Neon yerine).
   Canlı Redis'e, Neon'a, Google'a ve siteye hiçbir istek gitmez. Log yalnız sayı. */
import Redis from "ioredis";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../../lib/db/schema";
import { setDbForTests, type Db } from "../../lib/db/client";
import { applyMigrations, type Executor } from "../../lib/db/migrate";
import { setRedisForTests, type RedisLike } from "../../lib/usage/redis";
import { reserve, readFloors, periodKeys, spendUsd, BUDGETS, PRICES, type BudgetKey } from "../../lib/usage/counter";

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
const counts = async () => Object.fromEntries(await Promise.all(all.map(async (k) => [k, Number(await io.get(periodKeys(k, now).month) ?? 0)]))) as Record<BudgetKey, number>;

async function main() {
  const pg = new PGlite(); const db = drizzle(pg, { schema }) as unknown as Db;
  const x: Executor = {
    async query<T>(t: string) { return (await pg.query(t)).rows as T[]; },
    async transaction(stmts: string[]) { await pg.transaction(async (tx) => { for (const st of stmts) { if (st.startsWith("SELECT pg_advisory")) continue; await tx.query(st); } }); },
  };
  await applyMigrations(x); setDbForTests(db);
  const clearFloors = () => db.delete(schema.auditLog).where(eq(schema.auditLog.action, "usage_floor"));
  await io.connect(); setRedisForTests(adapt(io));

  /* 1) günlük sınır + taban, soğuk başlangıç (tohumlama eşzamanlı) */
  await io.flushall(); await clearFloors();
  const r1 = await Promise.all(Array.from({ length: 1500 }, () => reserve("google:details_enterprise", 1, now)));
  const g1 = r1.filter((r) => r.ok).length, f1 = (await readFloors(now))?.["google:details_enterprise"] ?? -1;
  ok("1.500 eşzamanlı (soğuk Redis) → tam 600 izin; Neon tabanı ≥ 600 ve ≤ 609", g1 === BUDGETS["google:details_enterprise"].daily && f1 >= 600 && f1 <= 609, { izin: g1, taban: f1 });

  /* 2) 100 USD tavanı: kalan 0,40 USD → E+A için tam 16 istek */
  await io.flushall(); await clearFloors();
  await io.set(periodKeys("google:text_search_pro", now).month, String(5000 + 2800));
  await io.set(periodKeys("google:details_atmosphere", now).month, String(1000 + 400));
  const r2 = await Promise.all(Array.from({ length: 300 }, () => reserve("google:details_atmosphere", 1, now)));
  const g2 = r2.filter((r) => r.ok).length, s2 = spendUsd(await counts());
  ok("tavana 0,40 USD kala 300 eşzamanlı → tam 16 izin, harcama ≤ 100", g2 === 16 && s2 <= 100, { izin: g2, usd: Math.round(s2 * 1000) / 1000 });

  /* 3) karışık kalemler tavana yüklenir, sonra Redis eşzamanlı yük altında SİLİNİR */
  await io.flushall(); await clearFloors();
  const mix: BudgetKey[] = ["google:photo", "google:details_atmosphere", "google:details_enterprise", "google:details_essentials"];
  const real: Record<BudgetKey, number> = Object.fromEntries(all.map((k) => [k, 0])) as Record<BudgetKey, number>;
  /* önce gerçek isteklerle 96 USD'ye kadar Text Search harca (5.000 ücretsiz + 3.000 ücretli) — tabanı da gerçek yollar yazar */
  for (let i = 0; i < 8000; i += 500) { const rr = await Promise.all(Array.from({ length: 500 }, () => reserve("google:text_search_pro", 1, new Date(Date.UTC(2026, 9, 1 + Math.floor(i / 1000), 12))))); real["google:text_search_pro"] += rr.filter((r) => r.ok).length; }
  for (const k of ["google:photo", "google:details_atmosphere", "google:details_enterprise"] as BudgetKey[]) { await io.set(periodKeys(k, now).month, "1000"); real[k] = 1000; }
  const fill = await Promise.all(Array.from({ length: 1000 }, (_, i) => reserve(mix[i % 4], 1, now).then((r) => ({ k: mix[i % 4], ok: r.ok }))));
  for (const f of fill) if (f.ok) real[f.k]++;
  const before = spendUsd(real);
  await io.flushall();                                       // Redis silindi (tahliye/flush)
  const after = await Promise.all(Array.from({ length: 2000 }, (_, i) => reserve(mix[i % 4], 1, now).then((r) => ({ k: mix[i % 4], ok: r.ok }))));
  for (const f of after) if (f.ok) real[f.k]++;
  const total = spendUsd(real), seeded = spendUsd(await counts());
  ok("Redis yük altında silinse de GERÇEK toplam harcama ≤ 100 USD", total <= 100 && real["google:text_search_pro"] === 8000, { once: Math.round(before * 1000) / 1000, sonra: Math.round(total * 1000) / 1000, ekIzin: after.filter((f) => f.ok).length, sayacUsd: Math.round(seeded * 1000) / 1000 });
  const c3 = await counts();
  ok("silinip tohumlanan sayaç her kalemde gerçek kullanımın altında değil", all.every((k) => c3[k] >= real[k]), { sayac: c3, gercek: real });

  /* 4) Neon erişilemiyor: soğuk Redis → hiç izin yok */
  await io.flushall();
  setDbForTests(new Proxy({}, { get: () => { throw new Error("neon down"); } }) as unknown as Db);
  const r4 = await Promise.all(Array.from({ length: 50 }, (_, i) => reserve(all[i % all.length], 1, now)));
  ok("Neon erişilemiyor → 50 eşzamanlı isteğin hiçbirine izin yok", r4.every((r) => !r.ok && r.reason === "error"));
  setDbForTests(db);

  /* 5) Redis'e ulaşılamıyor */
  const dead = new Redis({ host: "127.0.0.1", port: 6390, lazyConnect: true, maxRetriesPerRequest: 0, retryStrategy: () => null });
  dead.on("error", () => {});
  setRedisForTests(adapt(dead));
  const r5 = await Promise.all(Array.from({ length: 50 }, (_, i) => reserve(all[i % all.length], 1, now)));
  ok("Redis'e ulaşılamıyor → 50 isteğin hiçbirine izin yok", r5.every((r) => !r.ok && r.reason === "error"));
  setRedisForTests(null); await io.quit(); dead.disconnect();
  console.log(`Sonuç: ${results.filter(Boolean).length}/${results.length}`);
  process.exit(results.every(Boolean) ? 0 : 1);
}
main().catch((e) => { console.log("✗ beklenmeyen hata", String(e).slice(0, 300)); process.exit(1); });
