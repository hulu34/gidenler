import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {realVenueRecords,realEntities,activeEntities,invalidRecord,type RealVenueRecord} from '../data/real';
import first from '../data/paket/katalog-905/kayitlar.json';
import next from '../data/paket/katalog-913/kayitlar.json';
import firstEvidence from '../docs/katalog/katalog-905.json';
import nextEvidence from '../docs/katalog/katalog-913.json';
const staged='def101fe9aecf563c663f6632621d0b8ae8d33db', live='9a2f2f482b65709e862397911438d99b06230e2c';
const old=(sha:string,f:string)=>execFileSync('git',['show',`${sha}:${f}`],{encoding:'utf8'});
const read=(f:string)=>readFileSync(f,'utf8');
const x=new Set(next.map(v=>v.slug)), full=new Set([...first,...next].map(v=>v.slug));
assert.equal(x.size,8);assert.equal(full.size,21); assert(next.every(r=>r.slug.startsWith('burger-yiyelim-')));
assert.equal(new Set([...firstEvidence.sources,...nextEvidence.sources].map(r=>r.activitySource)).size,21);
assert.deepEqual([...x],nextEvidence.sources.map(e=>e.slug));assert.equal(nextEvidence.previewAdded+nextEvidence.productionAdded,0);
assert(!['burger-yiyelim-basak-basaksehir','burger-yiyelim-kayabasi-basaksehir','burger-yiyelim-yenisehir-pendik','mama-bowl-kitchen-moda-kadikoy'].some(s=>full.has(s)));
for(const f of ['isletme','presentation','sor-index']){
 const path=`data/real/${f}.json`, now=JSON.parse(read(path)) as {slug:string}[];
 assert.deepEqual(now.filter(r=>!x.has(r.slug)),JSON.parse(old(staged,path)),`${f}: previous draft exact rows/order`);
 assert.deepEqual(now.filter(r=>!full.has(r.slug)),JSON.parse(old(live,path)),`${f}: production exact rows/order`);
 assert.deepEqual(new Set(now.filter(r=>full.has(r.slug)).map(r=>r.slug)),full,`${f}: only cumulative 21`);
}
assert.deepEqual(JSON.parse(read('data/real/isletme.json')).slice(-21),[...first,...next]);
for(const f of ['data/paket/katalog-905/kayitlar.json','docs/katalog/katalog-905.json','scripts/katalog-905-kabul-test.ts','data/real/venues.json','data/real/kapanis.json','data/real/duzeltmeler.json','data/real/izinli-fotograflar.json','data/real/sitemap-adressiz.json','lib/venueLinkSafety.ts','lib/sor/engine.ts','app/sitemap.ts','app/harita/page.tsx','vercel.json'])assert.equal(read(f),old(staged,f),`${f} protected`);
for(const row of [...first,...next] as RealVenueRecord[]){
 assert.equal(invalidRecord(row),null,row.slug);assert.equal(row.ref,'isletme/'+row.slug);assert.equal(row.kaliteSinifi,'A-konumsuz');assert.equal(row.categoryId,'cat.restaurant');
 for(const k of ['lat','lng','location','osmRef','phone','openingHours','photos','menu','rating','instagram'])assert(!Object.hasOwn(row,k),`${row.slug}: no ${k}`);
 assert(activeEntities.some(e=>e.slug===row.slug&&e.address===row.address&&!e.location?.geo),row.slug);
}
assert.equal(realEntities.length,913);assert.equal(realVenueRecords.length,913);assert.equal(activeEntities.length,878);
assert.equal(new Set(realVenueRecords.map(r=>r.slug)).size,913);assert.equal(new Set(realVenueRecords.map(r=>r.ref)).size,913);
assert.deepEqual(Object.fromEntries(['cat.restaurant','cat.cafe','cat.bar'].map(k=>[k,activeEntities.filter(e=>e.categoryId===k).length])),{'cat.restaurant':753,'cat.cafe':114,'cat.bar':11});
console.log('PASS: exact 905 draft and 892 Production rows/indexes preserved; +8 local, +21 cumulative; 913/878/753');
