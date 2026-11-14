import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const cfg=JSON.parse(fs.readFileSync('operation01-production.json'));
const SHA='a225e8c1336fecc2ca6ce1ef67e09d2bb6361481',BASE='c0af4987c19146841494242e65d1cb0bc4dbe1a8';
assert.equal(cfg.approvedSha,SHA);assert(['before','after'].includes(cfg.phase));assert(/^https:\/\/gidenler-[a-z0-9]+-hulu34\.vercel\.app$/.test(cfg.origin));
assert.equal(execFileSync('git',['-C','candidate','rev-parse','HEAD'],{encoding:'utf8'}).trim(),SHA);
assert(process.env.VERCEL_BYPASS&&!process.env.DATABASE_URL&&!process.env.GROQ_API_KEY);
const out='operation01-production-evidence';fs.mkdirSync(out,{recursive:true});
const e={phase:cfg.phase,approvedSha:SHA,baseSha:BASE,origin:cfg.origin,at:new Date().toISOString(),writes:0,complete:false};
const save=()=>fs.writeFileSync(out+'/'+cfg.phase+'.json',JSON.stringify(e,null,2));
const hash=j=>createHash('sha256').update(JSON.stringify(j)).digest('hex');
async function get(path){assert(path.startsWith('/api/admin/db/'));const r=await fetch(cfg.origin+path,{method:'GET',redirect:'error',headers:{'x-vercel-protection-bypass':process.env.VERCEL_BYPASS},signal:AbortSignal.timeout(45000)});assert.equal(r.status,200,'Read-only check status');return r.json();}
try{
 const ref=await fetch('https://api.github.com/repos/hulu34/gidenler/git/ref/heads/feature/investor-v1',{headers:{authorization:'Bearer '+process.env.GITHUB_TOKEN},signal:AbortSignal.timeout(15000)});assert.equal(ref.status,200);assert.equal((await ref.json()).object.sha,cfg.phase==='before'?BASE:SHA);
 const s=await get('/api/admin/db/');assert.equal(s.env,'production');assert.equal(s.db.fingerprint,'37811a6487ca5441');assert.equal(s.integrity.present,793);assert.equal(s.integrity.ok,true);for(const key of ['pending','drift','unknown'])assert.deepEqual(s.migrations[key],[]);
 e.state={fingerprint:s.db.fingerprint,catalog:s.integrity.present,users:s.rollback.migration.users,reviews:s.rollback.migration.reviews,migrations:s.migrations.applied.length};save();
 const slugs=fs.readdirSync('candidate/content/profiles').filter(x=>x.endsWith('.json')).map(x=>x.slice(0,-5));e.profileHashes={};
 for(const slug of slugs){const j=await get('/api/admin/db/?rapor=profil&slug='+encodeURIComponent(slug));assert.equal(j.env,'production');assert(j.place&&j.profile,slug);const safe={place:j.place,profile:j.profile,videos:j.videos.map(v=>({id:v.id,platform:v.platform,externalId:v.externalId,url:v.url,credit:v.credit,sponsored:v.sponsored})).sort((a,b)=>a.id.localeCompare(b.id))};e.profileHashes[slug]=hash(safe);if(slug==='menemen-besiktas'){e.menemen={menuItems:j.profile.menu.sections.flatMap(x=>x.items).length,videos:j.videos.map(v=>v.externalId)};assert.equal(e.menemen.menuItems,45);assert.deepEqual(e.menemen.videos,['e6OmpzizSoo']);}}
 const g=await get('/api/admin/db/?rapor=google-slug');assert.equal(g.env,'production');e.google={count:g.slugs.length,hash:hash([...g.slugs].sort())};
 const scores=await get('/api/admin/db/?rapor=puan');assert.equal(scores.env,'production');e.scoreSummaryHash=hash(scores);save();
 if(cfg.phase==='after'){const b=JSON.parse(fs.readFileSync('operation01-before.json'));assert.equal(b.complete,true);assert.deepEqual(e.state,b.state);assert.deepEqual(e.profileHashes,b.profileHashes);assert.deepEqual(e.google,b.google);assert.equal(e.scoreSummaryHash,b.scoreSummaryHash);e.beforeAfterUnchanged=true;}
 e.complete=true;save();console.log(JSON.stringify({phase:e.phase,state:e.state,profiles:slugs.length,google:e.google.count,complete:true,writes:0}));
}catch(err){e.failure=err.message;save();console.error(err.message);process.exitCode=1;}
