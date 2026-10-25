/* ==========================================================================
   YEREL / ELLE GEÇİŞ KOMUTU — derlemede ÇALIŞMAZ.
   Kullanım:
     DATABASE_URL_UNPOOLED=… npx tsx scripts/db-migrate.ts            → yalnız durum (değişiklik yok)
     DATABASE_URL_UNPOOLED=… npx tsx scripts/db-migrate.ts --apply    → bekleyen geçişleri uygula
     DATABASE_URL_UNPOOLED=… npx tsx scripts/db-migrate.ts --seed     → 148 mekân tohumu + bütünlük kontrolü
   Gizli değer yazdırılmaz.
   ========================================================================== */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../lib/db/schema";
import { applyMigrations, migrationStatus, type Executor } from "../lib/db/migrate";
import { seedRealVenues, verifyRealVenues } from "../lib/db/seed";
import { realVenueRecords } from "../data/real";
import type { Db } from "../lib/db/client";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL_UNPOOLED gerekli."); process.exit(2); }
  const pool = new Pool({ connectionString: url, max: 1 });
  const x: Executor = {
    async query<T>(text: string) { return (await pool.query(text)).rows as T[]; },
    async transaction(stmts: string[]) {
      const c = await pool.connect();
      try { await c.query("BEGIN"); for (const s of stmts) await c.query(s); await c.query("COMMIT"); }
      catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
    },
  };
  try {
    if (process.argv.includes("--apply")) console.log(JSON.stringify(await applyMigrations(x), null, 1));
    else console.log(JSON.stringify(await migrationStatus(x), null, 1));
    if (process.argv.includes("--seed")) {
      const db = drizzle(pool, { schema }) as unknown as Db;
      console.log(JSON.stringify(await seedRealVenues(db, realVenueRecords)));
      const v = await verifyRealVenues(db, realVenueRecords);
      console.log(JSON.stringify(v));
      if (!v.ok) process.exitCode = 1;
    }
  } finally { await pool.end(); }
}
main().catch((e) => { console.error("Geçiş başarısız:", e instanceof Error ? e.message : e); process.exit(1); });
