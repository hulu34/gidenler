/* ==========================================================================
   VERİTABANI GEÇİŞİ + TOHUM — Vercel üretim derlemesinde (vercel-build) çalışır.
   · Yalnız VERCEL_ENV=production'da ya da DB_MIGRATE=1 ile; önizleme derlemeleri
     üretim veritabanını DEĞİŞTİRMEZ (aynı veritabanını paylaşıyorlar).
   · Bağlantı adresi yoksa sessizce atlar (statik derleme, yerel geliştirme).
   · Gizli değer yazdırılmaz; yalnız sayılar.
   ========================================================================== */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "../lib/db/schema";
import { seedRealVenues } from "../lib/db/seed";
import { realVenueRecords } from "../data/real";
import type { Db } from "../lib/db/client";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  const allowed = process.env.VERCEL_ENV === "production" || process.env.DB_MIGRATE === "1";
  if (!url) { console.log("[db] DATABASE_URL yok — geçiş atlandı."); return; }
  if (!allowed) { console.log(`[db] VERCEL_ENV=${process.env.VERCEL_ENV ?? "-"} — yalnız üretimde geçiş yapılır, atlandı.`); return; }

  const pool = new Pool({ connectionString: url, max: 2 });
  try {
    const db = drizzle(pool, { schema });
    const t0 = Date.now();
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log(`[db] geçişler uygulandı (${Date.now() - t0} ms)`);
    const r = await seedRealVenues(db as unknown as Db, realVenueRecords);
    console.log(`[db] tohum: ${r.inserted} yeni, ${r.updated} güncellendi, toplam ${r.total} mekân`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error("[db] geçiş başarısız:", e instanceof Error ? e.message : e); process.exit(1); });
