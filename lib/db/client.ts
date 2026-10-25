import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/* ──────────────────────────────────────────────────────────────────────────
   VERİTABANI İSTEMCİSİ — yalnız sunucu.
   · DATABASE_URL yoksa (statik GitHub Pages derlemesi, yerel geliştirme) null döner;
     çağıran taraf statik veriye düşer. Site veritabanı olmadan da çalışır.
   · Çalışma zamanında Neon HTTP sürücüsü (sunucusuz ortama uygun, bağlantı havuzu gerektirmez).
   · Testlerde `setDbForTests` ile gömülü Postgres (PGlite) verilir.
   ────────────────────────────────────────────────────────────────────────── */

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let cached: Db | null | undefined;
let override: Db | null = null;

export function getDb(): Db | null {
  if (override) return override;
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) return (cached = null);
  cached = drizzle(neon(url), { schema }) as unknown as Db;
  return cached;
}

/** Yalnız testler için. */
export function setDbForTests(db: Db | null) { override = db; cached = undefined; }

export { schema };
