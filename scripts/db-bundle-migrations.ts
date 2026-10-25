/* drizzle/*.sql → lib/db/migrations.generated.ts
   Geçiş SQL'leri uygulama paketine gömülür; yönetim ucu dosya sistemi okumadan çalışır.
   Kullanım: npm run db:generate (drizzle-kit generate + bu betik). */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: Array<{ idx: number; tag: string }> };
const list = journal.entries.sort((a, b) => a.idx - b.idx).map((e) => {
  const text = readFileSync(`drizzle/${e.tag}.sql`, "utf8");
  const statements = text.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
  return { tag: e.tag, hash: createHash("sha256").update(text).digest("hex"), statements };
});
writeFileSync("lib/db/migrations.generated.ts",
  `/* OTOMATİK ÜRETİLDİ — elle düzenlemeyin. Kaynak: drizzle/*.sql (scripts/db-bundle-migrations.ts) */\n` +
  `export const MIGRATIONS: Array<{ tag: string; hash: string; statements: string[] }> = ${JSON.stringify(list, null, 1)};\n`);
console.log(`${list.length} geçiş paketlendi: ${list.map((l) => l.tag).join(", ")}`);
