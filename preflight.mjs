import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const origin='https://gidenler-8z4tjti3l-hulu34.vercel.app';
const access=process.env.VERCEL_ACCESS;assert.ok(access);
async function admin(path){const r=await fetch(origin+path,{headers:{'x-vercel-protection-bypass':access},redirect:'error',signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,path);const j=await r.json();assert.equal(j.env,'production');return j}
const status=await admin('/api/admin/db/');assert.equal(status.integrity.ok,true);assert.equal(status.integrity.expected,574);assert.equal(status.integrity.present,574);assert.equal(status.db.writeGuard.ok,true);assert.ok(status.db.fingerprint);assert.deepEqual(status.migrations.pending,[]);assert.deepEqual(status.migrations.drift,[]);
const additions=[];for(let n=7;n<=14;n++)for(const f of ['kayitlar.json','isletme-kayitlari.json'])try{additions.push(...JSON.parse(readFileSync(`reviewed/data/paket/istanbul-${n}${n===8?'-b1':''}/${f}`)))}catch(e){if(f==='kayitlar.json')throw e}
assert.equal(additions.length,218);assert.equal(new Set(additions.map(r=>r.slug)).size,218);const queue=additions.map(r=>r.slug);let absent=0;
await Promise.all(Array.from({length:5},async()=>{while(queue.length){const slug=queue.shift();const r=await admin('/api/admin/db/?rapor=profil&slug='+slug);assert.equal(r.place,null,slug+' already present');absent++}}));
const google=await admin('/api/admin/google-puan/?rapor=gunluk');
const r=await fetch('https://www.gidenler.com/',{headers:{'x-gidenler-test':'1'},signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);const html=await r.text();const top=[...html.matchAll(/data-top10-satir="([^"]+)"/g)].map(m=>m[1]);assert.ok(top.length);
const branch=await fetch('https://api.github.com/repos/hulu34/gidenler/branches/feature%2Finvestor-v1',{headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,'User-Agent':'Gidenler-independent-release-check'}}).then(r=>r.json());assert.equal(branch.commit.sha,'b95d2844d9ff7641dcfaf6043870e71599d94f51');
const result={mode:'read-only',production:branch.commit.sha,host:origin,places:574,newAbsent:absent,dbFingerprint:status.db.fingerprint,integrity:status.integrity.ok,topCount:top.length,topHash:createHash('sha256').update(JSON.stringify(top)).digest('hex'),googleShown:google.site?.shown};
writeFileSync('production-preflight.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
