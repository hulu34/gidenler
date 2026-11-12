import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { realEntities, realVenueRecords } from "../data/real";
import { appendRealVenues } from "../lib/db/appendVenues";
import { seedRealVenues } from "../lib/db/seed";
import { applyMigrations, type Executor } from "../lib/db/migrate";
import { ProfileInput } from "../lib/profile";
import type { Db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import plan from "../data/yayin/secki-menemen-20261112.json";

async function main() {
  assert.deepEqual(plan.slugs, ["menemen-besiktas"]);
  assert.equal(plan.baselineCount, 792); assert.equal(plan.expectedCount, 793);
  const original = (p: string) => execFileSync("git", ["show", `${plan.baselineCommit}:${p}`], { encoding: "utf8" });
  for (const p of ["data/real/venues.json", "data/real/duzeltmeler.json"]) assert.equal(readFileSync(p,"utf8"), original(p), `${p}: baseline changed`);
  const beforeBusiness = JSON.parse(original("data/real/isletme.json"));
  const nowBusiness = JSON.parse(readFileSync("data/real/isletme.json","utf8"));
  assert.equal(nowBusiness.length, beforeBusiness.length + 1);
  for (const r of beforeBusiness) assert.deepEqual(nowBusiness.find((x: {slug:string}) => x.slug === r.slug), r);
  const baseline = realVenueRecords.filter(r => !plan.slugs.includes(r.slug));
  const additions = realVenueRecords.filter(r => plan.slugs.includes(r.slug));
  assert.equal(baseline.length, 792); assert.equal(additions.length, 1); assert.equal(realVenueRecords.length, 793);
  assert.equal(additions[0].ref, "isletme/menemen-besiktas");
  const profile = ProfileInput.parse(JSON.parse(readFileSync("content/profiles/neolokal-beyoglu.json","utf8")));
  assert.equal(profile.address?.provider, "official_site");
  assert.equal(realEntities.find(e=>e.slug===profile.slug)?.address, profile.address?.value);
  assert.equal(baseline.find(r=>r.slug===profile.slug)?.address, "11, Beyoğlu");
  console.log("✓ 792 baseline records retained; only Menemen added; Neolokal is a sourced display correction");

  let x: Executor, db: Db, close: () => Promise<void>;
  if (process.env.DB_DRIVER === "pg") {
    const url = new URL(process.env.DATABASE_URL!);
    assert.ok(["localhost","127.0.0.1"].includes(url.hostname), "Database tests require an isolated local server");
    const pool = new Pool({ connectionString: url.href });
    x = { async query<T>(s:string) { return (await pool.query(s)).rows as T[]; }, async transaction(ss) { const tx=await pool.connect(); try { await tx.query("BEGIN"); for(const s of ss) await tx.query(s); await tx.query("COMMIT"); } catch(e) { await tx.query("ROLLBACK"); throw e; } finally { tx.release(); } } };
    db = drizzlePg(pool, {schema}) as unknown as Db; close=()=>pool.end();
  } else {
    const pg = new PGlite();
    x = { async query<T>(s:string) { return (await pg.query(s)).rows as T[]; }, async transaction(ss) { await pg.transaction(async tx=>{for(const s of ss) if(!s.startsWith("SELECT pg_advisory")) await tx.query(s);}); } };
    db = drizzlePglite(pg, {schema}) as unknown as Db; close=()=>pg.close();
  }
  try {
    await applyMigrations(x); await seedRealVenues(db, baseline);
    const [place] = await x.query<{id:string}>("SELECT id FROM places WHERE slug='ciya-sofrasi-kadikoy'");
    await x.query(`INSERT INTO "user"(id,name,email,email_verified,kind) VALUES ('secki-preserve-user','Isolated fixture','secki-preserve@example.invalid',true,'test')`);
    await x.query(`INSERT INTO reviews(id,place_id,user_id,visited_on,overall,ratings,body,status) VALUES ('secki-preserve-review','${place.id}','secki-preserve-user','2026-11-01',8,'{}','Existing isolated review fixture','pending')`);
    await x.query(`INSERT INTO google_ratings(slug,place_id,rating,review_count,checked_at,source,confidence,import_id) VALUES ('ciya-sofrasi-kadikoy','ChIJisolatedFixture',4.4,100,now(),'isolated-test','confirmed','secki-preserve-import')`);
    const snapshot = async () => (await x.query<Record<string, unknown[]>>(`SELECT
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM places p) places,
      (SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM place_identifiers i) identifiers,
      (SELECT jsonb_agg(to_jsonb(f) ORDER BY id) FROM field_provenance f) provenance,
      (SELECT jsonb_agg(to_jsonb(v) ORDER BY place_id) FROM vertical_restaurant v) verticals,
      (SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM "user" u) users,
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM reviews r) reviews,
      (SELECT jsonb_agg(to_jsonb(g) ORDER BY slug) FROM google_ratings g) google`))[0];
    const old = await snapshot();
    const broken: Executor = {...x, transaction:ss=>x.transaction([...ss,"SELECT 1/0"])};
    await assert.rejects(appendRealVenues(broken, additions, 792)); assert.deepEqual(await snapshot(), old);
    console.log("✓ Forced transaction failure leaves the full 792 baseline unchanged");
    const result = await appendRealVenues(x, additions, 792); assert.equal(result.total,793);
    const after = await snapshot();
    for(const key of ["places","identifiers","provenance","verticals"]) for(const row of old[key]) assert.ok(after[key].some(r=>JSON.stringify(r)===JSON.stringify(row)),`baseline changed: ${key}`);
    for(const key of ["users","reviews","google"]) assert.deepEqual(after[key],old[key]);
    console.log("✓ Exactly one insert; all 792 existing venues, sources, reviews and Google fixtures retained");
    await appendRealVenues(x, additions, 792); assert.deepEqual(await snapshot(),after);
    console.log("✓ Replay is a complete no-op");
    await assert.rejects(appendRealVenues(x, additions, 791),/append_baseline_changed/);
    await assert.rejects(appendRealVenues(x,[{...additions[0],name:"Conflicting name"}],792),/append_existing_conflict/);
    await assert.rejects(appendRealVenues(x,[additions[0],additions[0]],792),/duplicate_append_input/);
    await assert.rejects(appendRealVenues(x,[{...additions[0],ref:"isletme/wrong-source"}],792),/invalid_append_record/);
    assert.deepEqual(await snapshot(),after);
    console.log("✓ Wrong baseline, changed record, duplicate and invalid source all rejected without writes");
    if(process.env.SECKI_EVIDENCE_PATH) writeFileSync(process.env.SECKI_EVIDENCE_PATH,JSON.stringify({baselineCommit:plan.baselineCommit,baseline:792,added:1,total:793,slugs:plan.slugs,baselinePreserved:true,reviewAndGoogleFixturesPreserved:true,replayNoOp:true,rollback:true},null,2));
  } finally { await close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
