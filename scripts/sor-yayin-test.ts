import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VENUES,parseQuery,fold} from '../lib/sor/engine';
import type {RealVenueRecord} from '../data/real';
const additions:RealVenueRecord[]=[];
for(let n=7;n<=14;n++)for(const f of ['kayitlar.json','isletme-kayitlari.json'])try{additions.push(...JSON.parse(readFileSync(`data/paket/istanbul-${n}${n===8?'-b1':''}/${f}`,'utf8')))}catch(e){if(f==='kayitlar.json')throw e}
let n=0;
for(const r of additions.filter(r=>fold(r.name).length>=8)){
 const i=parseQuery(r.name);const found=VENUES.find(v=>v.slug===i.name);
 assert.equal(fold(found?.name??''),fold(r.name),r.name+' → '+found?.name);n++;
}
for(const q of ['Develi Samatya','Develi Samatya nasıl?','Develi Samatya’da yemek'])assert.equal(parseQuery(q).name,'develi-samatya-fatih',q);
console.log(`Sor yayın: ${n} yeni tam ad + 3 Develi Samatya senaryosu geçti`);
