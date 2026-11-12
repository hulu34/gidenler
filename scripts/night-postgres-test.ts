import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { appendRealVenues } from "../lib/db/appendVenues";
import { seedRealVenues } from "../lib/db/seed";
import { applyMigrations, type Executor } from "../lib/db/migrate";
import { realVenueRecords, type RealVenueRecord } from "../data/real";
import type { Db } from "../lib/db/client";
import * as schema from "../lib/db/schema";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/gidenler_night" && process.env.GIDENLER_ISOLATED_TEST_DB === "night-25" && process.env.VERCEL_ENV !== "production", "Only the isolated local test database is allowed");
  const pg = new Pool({ connectionString: process.env.DATABASE_URL });
  const x: Executor = { async query<T>(s: string) { return (await pg.query(s)).rows as T[]; }, async transaction(ss) { const tx=await pg.connect(); try { await tx.query("BEGIN"); for(const s of ss) await tx.query(s); await tx.query("COMMIT"); } catch(e){await tx.query("ROLLBACK");throw e;} finally{tx.release();} } };
  const db = drizzle(pg, { schema }) as unknown as Db;
  const additions: RealVenueRecord[] = [];
  for (let n=7;n<=14;n++) {
    const dir = `data/paket/istanbul-${n}${n===8?"-b1":""}`;
    for (const f of ["kayitlar.json","isletme-kayitlari.json"]) try { additions.push(...JSON.parse(readFileSync(`${dir}/${f}`,"utf8"))); } catch (e) { if (f==="kayitlar.json") throw e; }
  }
  assert.equal(additions.length,218);
  const addedSlugs = new Set(additions.map(r=>r.slug));
  const baseline = realVenueRecords.filter(r=>!addedSlugs.has(r.slug));
  const baselineCount = baseline.length, total = realVenueRecords.length;
  assert.equal(baselineCount + additions.length, total);
  await applyMigrations(x); await seedRealVenues(db,baseline);
  const snapshot = async () => (await pg.query("SELECT (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM places p) places, (SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM place_identifiers i) identifiers, (SELECT jsonb_agg(to_jsonb(f) ORDER BY id) FROM field_provenance f) provenance, (SELECT jsonb_agg(to_jsonb(v) ORDER BY place_id) FROM vertical_restaurant v) verticals")).rows;
  const old = await snapshot();
  const result = await appendRealVenues(x,additions,baselineCount);assert.equal(result.total,total);console.log(`✓ ${additions.length} eklendi; toplam ${total}`);
  const after = await snapshot();
  for (const k of ["places","identifiers","provenance","verticals"]) {
    const rows=(after[0] as Record<string, unknown[]>)[k];
    const oldRows=(old[0] as Record<string, unknown[]>)[k];
    for (const r of oldRows) assert.ok(rows.some(s=>JSON.stringify(r)===JSON.stringify(s)),`baseline changed:${k}`);
  }
  console.log(`✓ Eski ${baselineCount} mekân, kimlikler, kaynak ve restoran verileri değişmedi`);
  await appendRealVenues(x,additions,baselineCount);assert.deepEqual(await snapshot(),after);console.log("✓ Tekrarı tam no-op, kimlikler ve tarihler aynı");
  await assert.rejects(appendRealVenues(x,additions,baselineCount-1),/append_baseline_changed/);assert.deepEqual(await snapshot(),after);console.log("✓ Yanlış tabanda hiçbir yazma yok");
  await assert.rejects(appendRealVenues(x,[{...additions[0],name:"Başka işletme"},...additions.slice(1)],baselineCount),/append_existing_conflict/);assert.deepEqual(await snapshot(),after);console.log("✓ Çakışmada mevcut kayıt korunur");
  await assert.rejects(appendRealVenues(x,[additions[0],additions[0]],baselineCount),/duplicate_append_input/);console.log("✓ Tekrarlı giriş reddedilir");
  await pg.query("DELETE FROM places WHERE legacy_id LIKE 'ent.r.%' AND slug IN ("+additions.map(r=>"'"+r.slug+"'").join(",")+")");
  const beforeError=await snapshot();
  const broken:Executor={...x,transaction:ss=>x.transaction([...ss,"SELECT 1/0"])};
  await assert.rejects(appendRealVenues(broken,additions,baselineCount));assert.deepEqual(await snapshot(),beforeError);console.log("✓ Son adım hatası tüm eklemeyi geri alır");
  await appendRealVenues(x,additions,baselineCount);console.log("✓ Geri alınmış işlem yeniden tamamlanır");
  await pg.end();console.log("Sonuç: 8/8");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
