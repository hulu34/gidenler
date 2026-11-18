import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import {eq} from 'drizzle-orm';
import * as schema from '../lib/db/schema';
import type {Db} from '../lib/db/client';
import {applyMigrations,type Executor} from '../lib/db/migrate';
import {seedRealVenues} from '../lib/db/seed';
import {appendRealVenues} from '../lib/db/appendVenues';
import {rollbackWave,rollbackWavePreview} from '../lib/db/rollback';
import {realVenueRecords,activeEntities,realEntities,invalidRecord,type RealVenueRecord} from '../data/real';
import additions from '../data/paket/birlesik-879-kabul/kayitlar.json';
import manifest from '../docs/katalog/birlesik-879-kabul.json';
import {parseQuery,answer} from '../lib/sor/engine';
// The exact Production tree is verified against GitHub's f4ebf2fe commit; local snapshot metadata is not used as release history.
const BASE_TREE='af780e09dfb0f891fa2854a6de67d81644b3eec2';
const slugs=['il-cortile-beyoglu','dafni-atesbasi-uskudar','parle-zorlu-besiktas','sushi-barba-istinyepark-sariyer','akbabali-meyhane-beyoglu'];
let passed=0;function test(name:string,fn:()=>void){fn();passed++;console.log('PASS '+name);}
async function main(){
const added=additions as RealVenueRecord[];const target=new Set(slugs);
const base=['venues.json','isletme.json'].flatMap(f=>JSON.parse(execFileSync('git',['show',`${BASE_TREE}:data/real/${f}`],{encoding:'utf8'}))) as RealVenueRecord[];
const current=['venues.json','isletme.json'].flatMap(f=>JSON.parse(readFileSync('data/real/'+f,'utf8'))) as RealVenueRecord[];
const historicalSlugs=new Set([...base,...added].map(r=>r.slug));
const historicalRecords=realVenueRecords.filter(r=>historicalSlugs.has(r.slug));
const historicalActive=activeEntities.filter(r=>historicalSlugs.has(r.slug));
test('Tarihî879 kayıt bütün alanlarıyla ve sırayla korunur',()=>{assert.equal(base.length,879);assert.deepEqual(current.filter(r=>historicalSlugs.has(r.slug)&&!target.has(r.slug)),base);});
test('Tarihî884/849aktif/724restoran/114kafe/11bar/35kapalı altkümesi',()=>{assert.equal(historicalRecords.length,884);assert.equal(historicalActive.length,849);for(const [k,v] of [['cat.restaurant',724],['cat.cafe',114],['cat.bar',11]] as const)assert.equal(historicalActive.filter(e=>e.categoryId===k).length,v);assert.equal(historicalRecords.length-historicalActive.length,35);});
test('Kapsam yalnız beş kaynaklı yeni restoran; Maderia bekler',()=>{assert.deepEqual(added.map(r=>r.slug),slugs);assert.deepEqual(manifest.records.map(r=>r.slug),slugs);assert.ok(!added.some(r=>/maderia|madera|hamdi|suna|chalet|pizza-emirgan/.test(r.slug)));assert.equal(manifest.summary.previewAdded,0);assert.equal(manifest.summary.newProductionRecords,0);});
test('Kimlikler tekil ve kaynaklar güncel; kaynak türü uydurulmaz',()=>{assert.equal(new Set(current.map(r=>r.slug)).size,current.length);assert.equal(new Set(current.map(r=>r.ref)).size,current.length);for(const r of added){assert.equal(invalidRecord(r),null);assert.equal(r.categoryId,'cat.restaurant');assert.equal(r.ref,'isletme/'+r.slug);assert.equal(r.wave,24);assert.equal(r.kaliteSinifi,'A-konumsuz');}for(const r of manifest.records){assert.notEqual(new URL(r.officialSource).hostname,new URL(r.independentSource).hostname);assert.ok(r.independentDate>='2025-11-18'&&r.independentDate<='2026-11-18');}});
test('Konum/OSM/telefon/saat/puan/medya/menü eklenmez',()=>{for(const r of added){for(const k of ['lat','lng','location','osmRef','phone','openingHours','image'])assert.equal(r[k as keyof RealVenueRecord],undefined);assert.equal(realEntities.find(e=>e.slug===r.slug)?.location?.geo,undefined);assert.ok(r.verification?.includes('eklenmedi'));}});
test('Adres tercihi açık; eski kapı farkı ayrı şube üretemez',()=>{assert.equal(added[0].address,'Bereketzade Mahallesi, Galata Kulesi Sokak No:20/A, Beyoğlu');assert.ok(added[1].address?.includes('Nakkaştepe Yolu No:56'));assert.ok(added[2].address?.includes('Vadi Caddesi No:2'));assert.ok(added[3].address?.includes('Birim No:89'));assert.ok(added[4].address?.includes('İşhanı No:7'));assert.ok(manifest.records.every(r=>r.addressNote.length>50));});
test('883 araştırma satırı canlı879 ile karşılaştırıldı; sayımlar karışmaz',()=>{assert.equal(manifest.researchComparison.researchRows,883);assert.equal(manifest.researchComparison.catalogTotal,879);assert.equal(manifest.summary.acceptedCodeCandidates,5);assert.equal(manifest.researchComparison.researchSha,'73a07d5c06371414ced3254be277de732186d8e0');});
test('Google, Excel/yedek, Menemen/izin ve Sor güvenliği korunur; yalnız onaylı kategori adı değişir',()=>{for(const f of ['.github/workflows/gpuan-gunluk.yml','scripts/gpuan-guncelle.ts','ops/gpuan-yedek.pem','vercel.json','data/real/izinli-fotograflar.json','content/profiles/menemen-besiktas.json','lib/sor/engine.ts','lib/sor/ask.ts']){
 const before=execFileSync('git',['show',`${BASE_TREE}:${f}`],{encoding:'utf8'});
 // Exact allowlist: the published category label and its exact generic-category name guard are the only permitted engine differences.
 const expected=f==='lib/sor/engine.ts'?before.replaceAll('Balık restoranı','Deniz ürünleri').replace("  const toks = nameQuery.trim().split(/\\s+/).filter((t) => t.length >= 3);","  nameQuery = nameQuery.replace(/\\bdeniz urun\\w*\\b/g, \" \"); // Kategori ifadesi Deniz Park ad eşleşmesi değildir.\n  const toks = nameQuery.trim().split(/\\s+/).filter((t) => t.length >= 3);"):before;
 assert.equal(readFileSync(f,'utf8'),expected);
}});
test('Son birleşik Sor indeksi ve istemci veri dosyası güncel',()=>{execFileSync(process.execPath,['--import','tsx','scripts/sor-index.ts','--check']);execFileSync(process.execPath,['--import','tsx','scripts/client-catalog.ts','--check']);});
test('Yüksek sıralama ve olumsuz tercih kuralları korunur',()=>{assert.equal(parseQuery('En yüksek puanlı restoran hangisi?').name,null);assert.equal(answer(parseQuery('En yüksek puanlı restoran hangisi?')).items.length,0);assert.equal(answer(parseQuery('Balık sevmiyor, kırmızı et yemiyor ve sadece viski içiyor')).items.length,0);});
const pg=new PGlite();const db=drizzle(pg,{schema}) as unknown as Db;
const x:Executor={query:async<T>(s:string)=>(await pg.query(s)).rows as T[],transaction:async ss=>{await pg.transaction(async tx=>{for(const s of ss)if(!s.startsWith('SELECT pg_advisory'))await tx.query(s);});}};
await applyMigrations(x);await seedRealVenues(db,base);
const menemen=(await db.select().from(schema.places).where(eq(schema.places.slug,'menemen-besiktas')))[0];
await db.insert(schema.user).values({id:'pkg879-user',name:'LOCAL TEST',email:'pkg879@example.test'});await db.insert(schema.reviews).values({id:'pkg879-review',placeId:menemen.id,userId:'pkg879-user',visitedOn:'2026-11-18',overall:7,body:'LOCAL TEST ONLY',ratings:{}});await db.insert(schema.menuItems).values({id:'pkg879-menu',placeId:menemen.id,rawName:'LOCAL TEST',source:'business'});await db.insert(schema.googleRatings).values({slug:menemen.slug,placeId:'TEST',rating:4.5,reviewCount:12,checkedAt:new Date('2026-11-18'),source:'local-test',confidence:'test',importId:'local-only'});
const snap=async()=>JSON.stringify({places:await db.select().from(schema.places).orderBy(schema.places.id),ids:await db.select().from(schema.placeIdentifiers).orderBy(schema.placeIdentifiers.id),users:await db.select().from(schema.user),reviews:await db.select().from(schema.reviews),menu:await db.select().from(schema.menuItems),google:await db.select().from(schema.googleRatings)});
const before=await snap();const first=await appendRealVenues(x,added,879);test('Gerçek yönetim ekleyicisi yalnız5ekler; toplam884',()=>assert.equal(first.total,884));const applied=await snap();await appendRealVenues(x,added,879);const repeated=await snap();test('Tekrar tam no-op; kimlik ve eski kullanıcı verisi aynı',()=>assert.equal(repeated,applied));
await assert.rejects(appendRealVenues(x,added,878),/append_baseline_changed/);const wrongBaselineAfter=await snap();test('Yanlış taban geri alınır; mevcut durum değişmez',()=>assert.equal(wrongBaselineAfter,applied));
await assert.rejects(appendRealVenues(x,[{...added[0],address:'CONFLICT TEST ONLY'},...added.slice(1)],879),/append_existing_conflict/);const conflictAfter=await snap();test('Aynı kimlik farklı alanla gelirse reddedilir; eski alan ezilmez',()=>assert.equal(conflictAfter,applied));
const fresh=(await db.select().from(schema.places).where(eq(schema.places.slug,added[0].slug)))[0];await db.insert(schema.reviews).values({id:'pkg879-new-review',placeId:fresh.id,userId:'pkg879-user',visitedOn:'2026-11-18',overall:7,body:'LOCAL TEST ONLY',ratings:{}});const related=await snap();assert.equal((await rollbackWavePreview(x,slugs)).safe,false);await assert.rejects(rollbackWave(x,slugs));const refused=await snap();test('Kullanıcı ilişkisi varsa geri alma bütün paketi korur',()=>assert.equal(refused,related));
await db.delete(schema.reviews).where(eq(schema.reviews.id,'pkg879-new-review'));await rollbackWave(x,slugs);const restored=await snap();test('Hedefli geri alma879tabanını ve kullanıcı/menü/Google verisini tam korur',()=>assert.equal(restored,before));
await pg.close();console.log(`TOPLU884: ${passed}/${passed}`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
