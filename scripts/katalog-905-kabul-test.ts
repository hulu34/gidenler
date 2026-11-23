import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {realVenueRecords,activeEntities,realEntities,invalidRecord,type RealVenueRecord} from '../data/real';
import packageRows from '../data/paket/katalog-905/kayitlar.json';
import proof from '../docs/katalog/katalog-905.json';
const base='9a2f2f482b65709e862397911438d99b06230e2c';
const old=(f:string)=>execFileSync('git',['show',`${base}:${f}`],{encoding:'utf8'});
const read=(f:string)=>readFileSync(f,'utf8');
const add=new Set(packageRows.map(x=>x.slug));
assert.equal(add.size,13); assert.equal(packageRows.filter(x=>x.slug.startsWith('burger-yiyelim-')).length,12); assert(add.has('suimaki-sisli'));
assert(!add.has('burger-yiyelim-yenisehir-pendik')&&!add.has('mama-bowl-kitchen-moda-kadikoy'));
assert.equal(proof.localAdded,13);assert.equal(proof.previewAdded,0);assert.equal(proof.productionAdded,0);
assert.equal(new Set(proof.sources.map(r=>r.activitySource)).size,13);assert.deepEqual(proof.sources.map(r=>r.slug),packageRows.map(x=>x.slug));
for(const f of ['isletme','presentation','sor-index']) {
 const path=`data/real/${f}.json`,now=JSON.parse(read(path)) as {slug:string}[];
 assert.deepEqual(now.filter(x=>!add.has(x.slug)),JSON.parse(old(path)),`${f}: all old rows and order preserved`);
 assert.deepEqual(new Set(now.filter(x=>add.has(x.slug)).map(x=>x.slug)),add,`${f}: only 13 new entries`);
}
assert.deepEqual(JSON.parse(read('data/real/isletme.json')).slice(-13),packageRows);
for(const f of ['data/real/venues.json','data/real/duzeltmeler.json','data/real/kapanis.json','data/real/izinli-fotograflar.json','data/real/sitemap-adressiz.json','lib/venueLinkSafety.ts','lib/sor/engine.ts','app/sitemap.ts','app/harita/page.tsx','vercel.json'])assert.equal(read(f),old(f),`${f} protected`);
for(const r of packageRows as RealVenueRecord[]){
 assert.equal(invalidRecord(r),null,r.slug); assert.equal(r.ref,'isletme/'+r.slug);
 assert.equal(r.kaliteSinifi,'A-konumsuz'); assert.equal(r.categoryId,'cat.restaurant');
 for(const k of ['lat','lng','location','osmRef','phone','openingHours','photos','menu','rating','instagram'])assert(!Object.hasOwn(r,k),`${r.slug}: no ${k}`);
 assert(activeEntities.some(e=>e.slug===r.slug&&e.address===r.address&&!e.location?.geo),r.slug);
}
assert.equal(realEntities.length,905);assert.equal(realVenueRecords.length,905);assert.equal(activeEntities.length,870);assert.equal(new Set(realVenueRecords.map(r=>r.slug)).size,905);assert.equal(new Set(realVenueRecords.map(r=>r.ref)).size,905);
assert.deepEqual(Object.fromEntries(['cat.restaurant','cat.cafe','cat.bar'].map(k=>[k,activeEntities.filter(e=>e.categoryId===k).length])),{'cat.restaurant':745,'cat.cafe':114,'cat.bar':11});
console.log('PASS: 13 and only 13 append rows, all source/index/protected data preserved; 905 total / 870 active / 745 active restaurants');
