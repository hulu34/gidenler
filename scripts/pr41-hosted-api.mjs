import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const SHA='c0af4987c19146841494242e65d1cb0bc4dbe1a8',BASE='2031408276fc5e4a24223a4e45fa70f656ffb604';
const cfg=JSON.parse(fs.readFileSync('pr41-hosted-config.json','utf8')),origin=cfg.origin;
assert(/^https:\/\/gidenler-[a-z0-9]+-hulu34\.vercel\.app$/.test(origin));
assert.notEqual(cfg.fingerprint,'37811a6487ca5441');assert(cfg.fingerprints.length===2&&cfg.fingerprints.every(f=>/^[a-f0-9]{16}$/.test(f)));
assert.equal(cfg.branchId,'br-spring-cherry-bavhyz5y');assert(process.env.VERCEL_BYPASS);
assert(!process.env.DATABASE_URL&&!process.env.DATABASE_URL_UNPOOLED);
assert.equal(execFileSync('git',['-C','../candidate','rev-parse','HEAD'],{encoding:'utf8'}).trim(),SHA);
const folder='pr41-hosted-evidence';fs.mkdirSync(folder,{recursive:true});
const source=slug=>JSON.parse(fs.readFileSync('../candidate/content/profiles/'+slug+'.json','utf8'));
const PR39=['turk-fatih-tutak-sisli','nicole-beyoglu','mutfakkoz-kadikoy','cuma-beyoglu','fauna-atasehir','aida-vino-e-cucina-kadikoy','mikla-turkey-fusion-beyoglu','aseka-beyoglu','calipso-fish-maltepe','rumelihisari-iskele-sariyer','sade-bes-denizler-mutfagi-sisli','deraliye-fatih','tavaci-recep-usta-bostanci-maltepe','ali-ocakbasi-karakoy-beyoglu'];
const PR40=JSON.parse(fs.readFileSync('../candidate/data/katalog/zengin-30/envanter.json','utf8')).restoranlar.filter(r=>r.profil==='yapildi').map(r=>r.slug);
const TARGETS=[...PR40,...PR39];assert.equal(TARGETS.length,26);
const r={sha:SHA,base:BASE,origin,phase:cfg.phase,environment:'actual protected Vercel Preview / isolated Neon HTTP',productionWrites:0,runnerDatabaseCredentials:false,apply:[],profiles:[],complete:false};
const save=()=>fs.writeFileSync(folder+'/'+(cfg.phase==='full'?'api':'bootstrap-api')+'.json',JSON.stringify(r,null,2));
async function request(p='/api/admin/db/',body,extra={}){assert(p.startsWith('/')&&!p.startsWith('//'));const res=await fetch(origin+p,{method:body?'POST':'GET',redirect:'error',headers:{'x-vercel-protection-bypass':process.env.VERCEL_BYPASS,Origin:origin,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});const text=await res.text();let data;try{data=JSON.parse(text)}catch{data={unexpected:text.slice(0,150)}}return{status:res.status,body:data}}
async function json(p,body){const j=await request(p,body);assert.equal(j.status,200,JSON.stringify(j));return j.body}
const get=slug=>json('/api/admin/db/?rapor=profil&slug='+slug);
const apply=p=>json('/api/admin/db/',{action:'profile-apply',target:'preview',confirm:'EVET',profile:p});
const rollback=auditId=>request('/api/admin/db/',{action:'profile-rollback',target:'preview',confirm:'GERI-AL',auditId});
function business(j){const{updatedAt,...place}=j.place;return{place,profile:j.profile,videos:j.videos.map(v=>({id:v.id,externalId:v.externalId,credit:v.credit,sponsored:v.sponsored,status:v.status})).sort((a,b)=>a.id.localeCompare(b.id))}}
async function ready(complete=true){const st=await json('/api/admin/db/');assert.equal(st.env,'preview');assert(cfg.fingerprints.includes(st.db.fingerprint),'Unexpected database fingerprint');assert.notEqual(st.db.fingerprint,'37811a6487ca5441');assert.equal(st.db.writeGuard.ok,true);assert.deepEqual(st.migrations.pending,[]);assert.deepEqual(st.migrations.drift,[]);assert.deepEqual(st.migrations.unknown,[]);if(complete){assert.equal(st.integrity.present,793);assert.equal(st.integrity.ok,true)}return st}
function videoId(u){const x=new URL(u);return x.hostname==='youtu.be'?x.pathname.slice(1):x.searchParams.get('v')??x.pathname.split('/').filter(Boolean).at(-1)}
function verify(j,p,original){assert(j.profile);for(const k of ['address','phone','website','instagram','hours','description','reservation'])if(p[k]){assert.equal(j.profile[k].value,p[k].value,p.slug+' '+k);assert.equal(j.profile[k].url,p[k].url)}if(p.menu)assert.deepEqual(j.profile.menu.sections,p.menu.sections);const expected=new Set([...(original?.videos??[]).map(v=>v.externalId),...(p.videos??[]).map(v=>videoId(v.url))]);assert.deepEqual(new Set(j.videos.map(v=>v.externalId)),expected);for(const old of original?.videos??[])assert.deepEqual(business(j).videos.find(v=>v.id===old.id),old,'existing video metadata changed')}
async function main(){
 r.initial=await ready(cfg.phase!=='bootstrap');save();
 assert.equal((await request('/api/admin/db/',{action:'profile-apply',target:'production',confirm:'EVET',profile:source(TARGETS[0])})).status,400);
 if(cfg.phase==='bootstrap'){
  const plan=JSON.parse(fs.readFileSync('pr41-preview-append-plan.json','utf8'));assert.equal(plan.branchId,cfg.branchId);assert.equal(plan.missingSlugs.length,336);assert.equal(r.initial.quality.placesTotal,457);
  for(const slug of TARGETS)assert.equal((await get(slug)).profile,null,slug+' existing profile must not be overwritten');
  const body={action:'seed-add-only',target:'preview',confirm:'EVET',slugs:plan.missingSlugs,baselineCount:457};
  r.append=await json('/api/admin/db/',body);assert.equal(r.append.mode,'insert-only');assert.equal(r.append.total,793);assert.equal(r.append.expected,336);save();
  r.appendRepeat=await json('/api/admin/db/',body);assert.equal(r.appendRepeat.total,793);save();
  assert.equal((await get('menemen-besiktas')).profile,null);r.menemenBaseline=await apply(source('menemen-besiktas'));save();
  const m=await get('menemen-besiktas');assert.equal(m.profile.menu.sections.flatMap(s=>s.items).length,45);assert.equal(m.videos.length,1);assert.equal(m.videos[0].externalId,'e6OmpzizSoo');
  r.final=await ready();r.complete=true;save();return;
 }
 assert.equal(cfg.phase,'full');const baseline=execFileSync('git',['-C','../candidate','ls-tree','-r','--name-only',BASE,'content/profiles'],{encoding:'utf8'}).trim().split('\n').map(p=>path.basename(p,'.json'));assert.equal(baseline.length,44);
 const before={};for(const slug of baseline)before[slug]=business(await get(slug));fs.writeFileSync(folder+'/baseline-44-before.json',JSON.stringify(before,null,2));
 assert.equal((await request('/api/admin/db/',{action:'profile-apply',target:'preview',confirm:'EVET',profile:source(TARGETS[0])},{'Sec-Fetch-Site':'cross-site'})).status,403);
 assert.equal((await request('/api/reviews/',{})).status,401);
 r.originalVideos={};for(const slug of TARGETS){const j=await get(slug);assert.equal(j.profile,null,slug+' prior profile');r.originalVideos[slug]=business(j).videos}save();
 const faultSlug=PR40.find(slug=>(source(slug).videos??[]).length>0),faultProfile=source(faultSlug),faultBefore=business(await get(faultSlug));
 const invalid=await request('/api/admin/db/',{action:'profile-apply',target:'preview',confirm:'EVET',profile:{...faultProfile,videos:[...(faultProfile.videos??[]).slice(0,1),{url:'https://example.invalid/not-a-video',credit:'Synthetic invalid link; never stored'}]}});assert.equal(invalid.status,422);assert.deepEqual(business(await get(faultSlug)),faultBefore);
 const unavailable=await request('/api/admin/db/',{action:'profile-apply',target:'preview',confirm:'EVET',profile:faultProfile,simulateVideoFailure:'network'});assert.equal(unavailable.status,502);assert.deepEqual(business(await get(faultSlug)),faultBefore);
 const atomic=await request('/api/admin/db/',{action:'profile-apply',target:'preview',confirm:'EVET',profile:faultProfile,simulateFailure:true});assert.equal(atomic.status,500);assert.equal(atomic.body.error,'apply_failed_rolled_back');assert.deepEqual(business(await get(faultSlug)),faultBefore);
 r.neonAtomicFailure={invalidVideo:422,providerFailureSimulation:502,midBatchRollback:500,partialData:false};save();
 for(const slug of TARGETS){
  const p=source(slug),original=business(await get(slug));assert.equal(original.profile,null,slug+' must have no prior profile');
  const first=await apply(p),once=await get(slug);verify(once,p,original);
  const repeat=await apply(p),twice=await get(slug);assert(repeat.unchanged);assert.deepEqual(business(twice),business(once));assert.deepEqual(twice.counts,once.counts);
  const rb=await rollback(first.auditId);assert.equal(rb.status,200,JSON.stringify(rb));assert.deepEqual(business(await get(slug)),original,slug+' full original rollback after repeat');
  const double=await rollback(first.auditId);assert.equal(double.status,200);assert.deepEqual(business(await get(slug)),original);
  const second=await apply(p);assert.equal((await rollback(second.auditId)).status,200);assert.deepEqual(business(await get(slug)),original);
  const final=await apply(p);verify(await get(slug),p,original);r.apply.push({slug,auditId:final.auditId,videosOk:(p.videos??[]).length});r.profiles.push({slug,originalAuditRollbackAfterRepeat:true,doubleRollbackSafe:true,reapplyRollback:true});save();
 }
 const after={};for(const slug of baseline){after[slug]=business(await get(slug));assert.deepEqual(after[slug],before[slug],slug+' baseline changed')}fs.writeFileSync(folder+'/baseline-44-after.json',JSON.stringify(after,null,2));
 r.final=await ready();r.pr39Profiles=14;r.pr40Profiles=12;r.targetVideos=r.apply.reduce((n,v)=>n+v.videosOk,0);assert.equal(r.targetVideos,16);r.baseline44Unchanged=true;r.menemenUnchanged=true;r.complete=true;save();console.log(JSON.stringify({sha:SHA,profiles:r.profiles.length,videos:r.targetVideos,complete:true}));
}
main().catch(e=>{r.failure=String(e);save();console.error(e);process.exit(1)});
