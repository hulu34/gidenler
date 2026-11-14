import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import type { Db } from "../lib/db/client";
import { applyMigrations, type Executor } from "../lib/db/migrate";
import { seedRealVenues } from "../lib/db/seed";
import { appendRealVenues } from "../lib/db/appendVenues";
import { rollbackWave, rollbackWavePreview } from "../lib/db/rollback";
import { realVenueRecords, realEntities, activeEntities, invalidRecord, type RealVenueRecord } from "../data/real";
import { realEntities as uiEntities } from "../data/real/presentation";
import { DataCompleteness } from "../components/venue/DataCompleteness";
import { completenessOf } from "../lib/completeness";
import { VENUES, parseQuery, answer, type Venue } from "../lib/sor/engine";
import { sor } from "../lib/sor/ask";
import { resetAIConfig } from "../lib/ai/config";
import additions from "../data/paket/pr48-kabul/kayitlar.json";
import manifest from "../docs/katalog/pr48-kabul-kaniti.json";

const BASE = "99568ec6e7385be51af2454330ef536c632b55d3";
let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`✓ ${label}`); }
async function main() {
  const added = additions as RealVenueRecord[], slugs = new Set(added.map(r => r.slug));
  const base = ["venues.json", "isletme.json"].flatMap(f => JSON.parse(execFileSync("git", ["show", `${BASE}:data/real/${f}`], {encoding:"utf8"}))) as RealVenueRecord[];
  const raw = ["venues.json", "isletme.json"].flatMap(f => JSON.parse(readFileSync(`data/real/${f}`, "utf8"))) as RealVenueRecord[];
  check("793 eski kayıt alanları aynen korunur", () => assert.deepEqual(raw.filter(r => !slugs.has(r.slug)), base));
  check("Uygulama 801 toplam / 766 aktif / 641 restoran / 114 kafe okur", () => {
    assert.equal(realVenueRecords.length, manifest.total); assert.equal(activeEntities.length, manifest.active);
    assert.equal(activeEntities.filter(e => e.categoryId === "cat.restaurant").length, manifest.activeRestaurant);
    assert.equal(activeEntities.filter(e => e.categoryId === "cat.cafe").length, manifest.activeCafe);
    assert.equal(new Set(realVenueRecords.map(r => r.slug)).size, manifest.total);
  });
  check("Yalnız sekiz onaylı restoran; gelecek tarih ve kafe yok", () => {
    assert.equal(added.length, 8); assert.deepEqual([...slugs].sort(), manifest.records.map(r=>r.slug).sort());
    assert.ok(added.every(r=>r.categoryId==="cat.restaurant" && r.verifiedAt! <= "2026-11-14" && !invalidRecord(r)));
  });
  check("Koordinatsız adresler korunur; harita noktası üretilmez", () => {
    for (const r of added) { const e=realEntities.find(e=>e.slug===r.slug)!; assert.equal(e.address,r.address);assert.equal(e.location?.geo,undefined); }
  });
  check("Bilinmeyen kalite ve A-konumsuz üzerindeki konum reddedilir", () => {
    assert.equal(invalidRecord({...added[0],kaliteSinifi:"unknown" as never}),"quality");
    assert.equal(invalidRecord({...added[0],lat:41,lng:29}),"quality");
    assert.equal(invalidRecord({...added[0],location:{provider:"osm",ref:"node/1",precision:"address"}}),"quality");
  });
  check("UI görünümü sunucu yükleyicisiyle alan alan aynı", () => assert.deepEqual(uiEntities,JSON.parse(JSON.stringify(realEntities))));
  check("İşletme profiline OSM kimlik atfı eklenmez; OSM kaynağında korunur", () => {
    const c=completenessOf(realEntities.find(e=>e.slug===added[0].slug)!);
    assert.doesNotMatch(renderToStaticMarkup(<DataCompleteness c={c} sourceProvider="business"/>),/OpenStreetMap/);
    assert.match(renderToStaticMarkup(<DataCompleteness c={c} sourceProvider="osm"/>),/OpenStreetMap/);
  });
  // Sadece testteki aday: kabul listesine/sunucu kataloğuna eklenmez.
  const fixture: Venue = {slug:"test-yuksel-balik",name:"Yüksel Balık",kind:"Balık restoranı",district:"Bakırköy",neighborhood:null,address:null,lat:null,lng:null,hours:null,description:null,notes:[],menu:[],priceRange:null,secki:null};
  VENUES.push(fixture);
  try {
    for(const q of ["En yüksek puanlı restoran hangisi","Yüksek puanlı restoran arıyorum","Puanı yüksek balık restoranı","En yüksek puan alan restoran"]) {
      check(`Sıralama özel ad değildir: ${q}`,()=>assert.equal(parseQuery(q).name,null));
    }
    for(const q of ["Yüksel Balık","Yuksel Balik","Yüksel Balık puanı yüksek mi?"]) check(`Gerçek işletme adı korunur: ${q}`,()=>assert.equal(parseQuery(q).name,fixture.slug));
    const ranking=answer(parseQuery("En yüksek puanlı restoran hangisi"));
    check("Kurallı sıralama puan uydurmaz",()=>{assert.equal(ranking.items.length,0);assert.match(JSON.stringify(ranking),/popülerlik sıralaması henüz yayımlanmadı/);});
    process.env.AI_PRIMARY_PROVIDER="none"; resetAIConfig();
    const fallback=await sor({query:"En yüksek puanlı restoran hangisi"});
    check("AI kapalı gerçek fallback yanlış işletmeyi seçmez",()=>{assert.equal(fallback.items.length,0);assert.equal(fallback.mode,"veri");});
  } finally { VENUES.splice(VENUES.indexOf(fixture),1); }

  const pg=new PGlite(), db=drizzle(pg,{schema}) as unknown as Db;
  const x:Executor={async query<T>(s:string){return(await pg.query(s)).rows as T[]},async transaction(ss){await pg.transaction(async tx=>{for(const s of ss) if(!s.startsWith("SELECT pg_advisory"))await tx.query(s);});}};
  await applyMigrations(x);await seedRealVenues(db,base);
  const oldPlace=(await db.select().from(schema.places).where(eq(schema.places.slug,"menemen-besiktas")))[0];
  await db.insert(schema.user).values({id:"pr48-local-test",name:"LOCAL TEST",email:"pr48@example.test"});
  await db.insert(schema.reviews).values({id:"pr48-old-review",placeId:oldPlace.id,userId:"pr48-local-test",visitedOn:"2026-11-01",overall:7,body:"TEST ONLY",ratings:{}});
  await db.insert(schema.menuItems).values({id:"pr48-old-menu",placeId:oldPlace.id,rawName:"TEST ONLY",source:"business"});
  await db.insert(schema.googleRatings).values({slug:oldPlace.slug,placeId:"TEST ONLY",rating:4.5,reviewCount:12,checkedAt:new Date("2026-11-14T00:00:00Z"),source:"local-test",confidence:"test",importId:"local-only"});
  const snapshot=async()=>JSON.stringify({places:await db.select().from(schema.places).orderBy(schema.places.id),ids:await db.select().from(schema.placeIdentifiers).orderBy(schema.placeIdentifiers.id),users:await db.select().from(schema.user),reviews:await db.select().from(schema.reviews),menu:await db.select().from(schema.menuItems),google:await db.select().from(schema.googleRatings)});
  const old=await snapshot(); const result=await appendRealVenues(x,added,793);
  check("Gerçek ekleme yordamı 8 ekler; toplam 801",()=>assert.equal(result.total,801));
  const after=await snapshot(); await appendRealVenues(x,added,793);
  const repeated=await snapshot();check("Tekrar tam no-op",()=>assert.equal(after,repeated));
  await assert.rejects(appendRealVenues(x,added,792),/append_baseline_changed/);passed++;console.log("✓ Yanlış taban yazmadan durur");
  const newPlace=(await db.select().from(schema.places).where(eq(schema.places.slug,added[0].slug)))[0];
  await db.insert(schema.reviews).values({id:"pr48-new-review",placeId:newPlace.id,userId:"pr48-local-test",visitedOn:"2026-11-01",overall:7,body:"TEST ONLY",ratings:{}});
  assert.equal((await rollbackWavePreview(x,[...slugs])).safe,false); await assert.rejects(rollbackWave(x,[...slugs]));passed++;console.log("✓ Deneyim bağlıyken geri alma reddedilir");
  await db.delete(schema.reviews).where(eq(schema.reviews.id,"pr48-new-review"));await rollbackWave(x,[...slugs]);
  const restored=await snapshot();check("Hedefli geri alma 793 + kullanıcı/deneyim/menü/Google verisini aynen korur",()=>assert.equal(restored,old));
  await pg.close(); console.log(`PR48 kabul: ${passed}/${passed}; remote database calls: 0`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
