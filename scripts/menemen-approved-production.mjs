import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const sha='2031408276fc5e4a24223a4e45fa70f656ffb604';
const origin='https://gidenler-hy9xmwtrx-hulu34.vercel.app';
const slug='menemen-besiktas',placeId='01a1cfe7-1c12-732c-b839-4d0bdae7f7bb';
const source=JSON.parse(readFileSync('../candidate/content/profiles/'+slug+'.json','utf8'));
const out='menemen-live-evidence';mkdirSync(out,{recursive:true});
const evidence={approvedSha:sha,deploymentOrigin:origin,slug,expectedPlaceId:placeId,authorization:'Explicit user approval for exact SHA + existing Menemen profile/45 archived menu items/one video on 2026-11-13',productionPostAttempts:0,productionDatabaseCredentialReceived:false};
const save=()=>writeFileSync(out+'/apply.json',JSON.stringify(evidence,null,2));
assert.equal(execFileSync('git',['-C','../candidate','rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
assert(!process.env.DATABASE_URL&&!process.env.DATABASE_URL_UNPOOLED);assert(process.env.VERCEL_BYPASS);
assert.equal(source.slug,slug);assert.equal(source.menu.archivedAt,'2024-01-20');assert.equal(source.menu.sections.flatMap(s=>s.items).length,45);assert.equal(source.videos.length,1);assert(source.videos[0].url.includes('e6OmpzizSoo'));assert.equal(source.videos[0].sponsored,true);
async function request(path,body){assert(path.startsWith('/')&&!path.startsWith('//'));return fetch(origin+path,{method:body?'POST':'GET',redirect:'error',headers:{'x-vercel-protection-bypass':process.env.VERCEL_BYPASS,...(body?{'Content-Type':'application/json',Origin:origin,'Sec-Fetch-Site':'same-origin'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000)})}
async function get(path){const r=await request(path);assert.equal(r.status,200,`Read-only preflight returned ${r.status}`);return r.json()}
function validate(j){assert.equal(j.env,'production');assert.equal(j.place.id,placeId);const p=j.profile;assert(p);assert.equal(p.menu.archivedAt,'2024-01-20');assert.equal(p.menu.pricesPublished,false);assert.deepEqual(p.menu.sections,source.menu.sections);for(const k of ['description','hours','instagram'])assert.equal(p[k].value,source[k].value);assert.deepEqual(p.notes.map(x=>x.value),source.notes.map(x=>x.value));assert.equal(j.counts.menuRows,45);assert.equal(j.videos.length,1);assert.equal(j.videos[0].externalId,'e6OmpzizSoo');assert.equal(j.videos[0].sponsored,true);assert.equal(j.videos[0].credit,source.videos[0].credit)}
try{
 const refResponse=await fetch('https://api.github.com/repos/hulu34/gidenler/git/ref/heads/feature/investor-v1',{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});assert.equal(refResponse.status,200);assert.equal((await refResponse.json()).object.sha,sha);
 const status=await get('/api/admin/db/');assert.equal(status.env,'production');assert(status.db?.fingerprint);assert.equal(status.integrity?.present,793);assert.equal(status.integrity?.ok,true);for(const k of ['pending','drift','unknown'])assert.deepEqual(status.migrations[k],[]);
 evidence.before={environment:status.env,fingerprint:status.db.fingerprint,catalog:status.integrity.present,migrations:status.migrations.applied.length};save();
 const before=await get('/api/admin/db/?rapor=profil&slug='+slug);assert.equal(before.env,'production');assert.equal(before.place?.id,placeId);evidence.beforeTarget=before;save();
 if(before.profile){validate(before);evidence.alreadyApplied=true;evidence.afterTarget=before;}
 else{
  assert.equal(before.counts.menuRows,0);assert.equal(before.videos.length,0);assert.equal(before.audits.length,0,'Unexpected existing profile history: do not overwrite');
  evidence.productionPostAttempts=1;save();
  const response=await request('/api/admin/db/',{action:'profile-apply',target:'production',confirm:'EVET',profile:source});
  const result=await response.json();evidence.applyHttpStatus=response.status;evidence.apply=result;save();
  assert.equal(response.status,200,'Partial application is not complete; preserve audit evidence for targeted recovery');assert.equal(result.env,'production');assert.equal(result.ok,true);assert.equal(result.profileOk,true);assert.equal(result.videosOk,1);assert.equal(result.videosTotal,1);assert.equal(result.videos[0].externalId,'e6OmpzizSoo');assert.equal(result.videos[0].created,true);assert(result.auditId);
  const after=await get('/api/admin/db/?rapor=profil&slug='+slug);validate(after);evidence.afterTarget=after;
 }
 const final=await get('/api/admin/db/');assert.equal(final.env,'production');assert.equal(final.integrity.present,793);assert.equal(final.integrity.ok,true);assert.equal(final.db.fingerprint,evidence.before.fingerprint);evidence.after={environment:final.env,fingerprint:final.db.fingerprint,catalog:final.integrity.present};
 evidence.complete=true;save();console.log(JSON.stringify({sha,complete:true,postAttempts:evidence.productionPostAttempts,alreadyApplied:!!evidence.alreadyApplied,auditId:evidence.apply?.auditId,menuItems:45,videos:1,catalog:793}));
}catch(e){evidence.complete=false;evidence.error=String(e);save();console.error(e);process.exit(1)}
