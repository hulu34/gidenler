import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const SHA='c0af4987c19146841494242e65d1cb0bc4dbe1a8',BASE='2031408276fc5e4a24223a4e45fa70f656ffb604';
const cfg=JSON.parse(fs.readFileSync('pr43-production-config.json','utf8')),origin=cfg.origin;
assert.equal(cfg.approvedSha,SHA);assert.equal(cfg.oldProductionSha,BASE);assert.equal(cfg.productionFingerprint,'37811a6487ca5441');
assert(/^https:\/\/gidenler-[a-z0-9]+-hulu34\.vercel\.app$/.test(origin));assert(['preflight','apply','verify'].includes(cfg.phase));
assert.equal(execFileSync('git',['-C','../candidate','rev-parse','HEAD'],{encoding:'utf8'}).trim(),SHA);
assert(process.env.VERCEL_BYPASS&&process.env.GITHUB_TOKEN);assert(!process.env.DATABASE_URL&&!process.env.DATABASE_URL_UNPOOLED);
const source=slug=>JSON.parse(fs.readFileSync('../candidate/content/profiles/'+slug+'.json','utf8'));
const PR39=['turk-fatih-tutak-sisli','nicole-beyoglu','mutfakkoz-kadikoy','cuma-beyoglu','fauna-atasehir','aida-vino-e-cucina-kadikoy','mikla-turkey-fusion-beyoglu','aseka-beyoglu','calipso-fish-maltepe','rumelihisari-iskele-sariyer','sade-bes-denizler-mutfagi-sisli','deraliye-fatih','tavaci-recep-usta-bostanci-maltepe','ali-ocakbasi-karakoy-beyoglu'];
const PR40=JSON.parse(fs.readFileSync('../candidate/data/katalog/zengin-30/envanter.json','utf8')).restoranlar.filter(r=>r.profil==='yapildi').map(r=>r.slug),TARGETS=[...PR40,...PR39];
assert.equal(TARGETS.length,26);assert.equal(TARGETS.reduce((n,s)=>n+(source(s).menu?.sections.flatMap(x=>x.items).length??0),0),411);assert.equal(TARGETS.reduce((n,s)=>n+(source(s).videos??[]).length,0),16);
const BASELINE=execFileSync('git',['-C','../candidate','ls-tree','-r','--name-only',BASE,'content/profiles'],{encoding:'utf8'}).trim().split('\n').map(p=>path.basename(p,'.json'));assert.equal(BASELINE.length,44);assert(BASELINE.every(s=>!TARGETS.includes(s)));
const folder='pr43-production-evidence';fs.mkdirSync(folder,{recursive:true});
const out={approvedSha:SHA,previousSha:BASE,origin,phase:cfg.phase,authorization:cfg.authorization,databaseCredentialsReceived:false,postAttempts:0,applied:[],complete:false};
const save=()=>fs.writeFileSync(folder+'/'+cfg.phase+'.json',JSON.stringify(out,null,2));
function business(j){return{place:j.place,profile:j.profile,videos:j.videos.map(v=>({id:v.id,platform:v.platform,externalId:v.externalId,url:v.url,credit:v.credit,sponsored:v.sponsored})).sort((a,b)=>a.id.localeCompare(b.id))}}
async function request(p,body){assert(p.startsWith('/')&&!p.startsWith('//'));if(body){assert.equal(cfg.phase,'apply');assert.equal(body.action,'profile-apply');assert(TARGETS.includes(body.profile?.slug));assert.equal(body.target,'production');assert.equal(body.confirm,'EVET');out.postAttempts++;save()}
 const r=await fetch(origin+p,{method:body?'POST':'GET',redirect:'error',headers:{'x-vercel-protection-bypass':process.env.VERCEL_BYPASS,...(body?{'Content-Type':'application/json',Origin:origin,'Sec-Fetch-Site':'same-origin'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{throw Error('Unexpected non-JSON '+r.status+' for '+p)}return{status:r.status,body:data}}
async function get(p){const r=await request(p);assert.equal(r.status,200,p+' '+r.status);return r.body}
const profile=slug=>get('/api/admin/db/?rapor=profil&slug='+slug);
async function ref(){const r=await fetch('https://api.github.com/repos/hulu34/gidenler/git/ref/heads/feature/investor-v1',{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+process.env.GITHUB_TOKEN},signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);return(await r.json()).object.sha}
async function ready(){const s=await get('/api/admin/db/');assert.equal(s.env,'production');assert.equal(s.db.fingerprint,cfg.productionFingerprint);assert.equal(s.integrity.present,793);assert.equal(s.integrity.ok,true);for(const k of['pending','drift','unknown'])assert.deepEqual(s.migrations[k],[]);return{environment:s.env,fingerprint:s.db.fingerprint,catalog:s.integrity.present,users:s.rollback.migration.users,reviews:s.rollback.migration.reviews,migrations:s.migrations.applied.length}}
function validate(j,p,original){assert.equal(j.env,'production');assert.equal(j.place.id,original.place.id);assert(j.profile);for(const k of['address','phone','website','instagram','hours','description','reservation'])if(p[k]){assert.equal(j.profile[k].value,p[k].value,p.slug+' '+k);assert.equal(j.profile[k].url,p[k].url)}
 if(p.menu){assert.deepEqual(j.profile.menu.sections,p.menu.sections);assert.equal(j.profile.menu.pricesPublished,p.menu.pricesPublished)}
 assert.deepEqual(j.profile.notes.map(n=>n.value),(p.notes??[]).map(n=>n.value));if(p.amenities)assert.deepEqual(j.profile.amenities.items,p.amenities.items);
 const id=u=>{const x=new URL(u);return x.hostname==='youtu.be'?x.pathname.slice(1):x.searchParams.get('v')??x.pathname.split('/').filter(Boolean).at(-1)};
 const expected=new Set([...original.videos.map(v=>v.platform+':'+v.externalId),...(p.videos??[]).map(v=>'youtube:'+id(v.url))]);assert.deepEqual(new Set(j.videos.map(v=>v.platform+':'+v.externalId)),expected);
 for(const old of original.videos)assert.deepEqual(business(j).videos.find(v=>v.id===old.id),old,'Existing video metadata changed');
}
try{
 assert.equal(await ref(),cfg.phase==='preflight'?BASE:SHA);out.initial=await ready();save();
 if(cfg.phase==='preflight'){
  assert.equal(origin,'https://gidenler-hy9xmwtrx-hulu34.vercel.app');const targets={},baseline={};
  for(const slug of TARGETS){const j=await profile(slug);assert(j.place?.id);assert.equal(j.profile,null,slug+' unexpectedly already has a profile; do not overwrite');targets[slug]=business(j)}
  for(const slug of BASELINE)baseline[slug]=business(await profile(slug));
  const m=baseline['menemen-besiktas'];assert.equal(m.profile.menu.sections.flatMap(s=>s.items).length,45);assert.equal(m.videos.length,1);assert.equal(m.videos[0].externalId,'e6OmpzizSoo');assert.equal(m.videos[0].sponsored,true);
  fs.writeFileSync(folder+'/production-before.json',JSON.stringify({approvedSha:SHA,baseSha:BASE,initial:out.initial,targets,baseline},null,2));out.targetProfiles=26;out.baselineProfiles=44;out.productionWrites=0;out.complete=true;save();console.log('Read-only Production preflight passed; 26 target before-images and 44 protected profiles saved.');
 }else{
  const before=JSON.parse(fs.readFileSync('pr43-production-before.json','utf8'));assert.equal(before.approvedSha,SHA);assert.equal(before.baseSha,BASE);
  if(cfg.phase==='apply'){
   for(const slug of TARGETS)assert.deepEqual(business(await profile(slug)),before.targets[slug],slug+' changed after preflight; refusing all writes');
   for(const slug of BASELINE)assert.deepEqual(business(await profile(slug)),before.baseline[slug],slug+' protected profile changed');
   for(const slug of TARGETS){assert.equal(await ref(),SHA);assert.deepEqual(business(await profile(slug)),before.targets[slug],slug+' changed immediately before write');
    const result=await request('/api/admin/db/',{action:'profile-apply',target:'production',confirm:'EVET',profile:source(slug)});out.lastResponse={slug,...result};save();assert.equal(result.status,200,'Stopped; preserve audit trail for targeted recovery');assert.equal(result.body.ok,true);assert.equal(result.body.applied,true);assert(result.body.auditId);
    out.applied.push({slug,auditId:result.body.auditId,videosOk:result.body.videosOk,menuItems:result.body.menuItems});save();validate(await profile(slug),source(slug),before.targets[slug]);console.log('Applied and verified '+slug);
   }
   assert.equal(out.postAttempts,26);assert.equal(out.applied.length,26);
  }
  for(const slug of TARGETS)validate(await profile(slug),source(slug),before.targets[slug]);
  for(const slug of BASELINE)assert.deepEqual(business(await profile(slug)),before.baseline[slug],slug+' protected baseline changed');
  out.final=await ready();assert(out.final.users>=before.initial.users);assert(out.final.reviews>=before.initial.reviews);out.baseline44Unchanged=true;out.menuItems=411;out.videos=16;out.targetProfiles=26;out.complete=true;delete out.lastResponse;save();
  if(cfg.phase==='apply')fs.writeFileSync(folder+'/targeted-rollback-plan.json',JSON.stringify({approvedSha:SHA,previousCode:BASE,origin,fingerprint:cfg.productionFingerprint,execute:false,operations:[...out.applied].reverse().map(a=>({slug:a.slug,body:{action:'profile-rollback',target:'production',confirm:'GERI-AL',auditId:a.auditId}})),stopOnNewerChange:true,deleteSharedMedia:false,resetSeed:false},null,2));
 }
}catch(e){out.failure=String(e);save();console.error(e);process.exit(1)}
