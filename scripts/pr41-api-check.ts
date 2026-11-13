import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TARGETS,PR39_TARGETS,PR40_TARGETS,SHA,pool,source,save,snapshot,folder} from './pr41-fixture';
import {request,get,apply,rollback,business,requireRolledBack} from './pr41-http';
import {checkAddresses} from './pr41-address-check';
const out:any={sha:SHA,productionWrites:0,realYouTubeOembed:true,profiles:[],apply:[],complete:false};
async function main(){
 let ready=false;for(let i=0;i<90;i++){try{if((await request()).status===200){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,1000))}assert(ready,'Isolated app did not start');
 const st=await request();assert.equal(st.body.env,'preview');assert.equal(st.body.db.writeGuard.ok,true);assert.equal(st.body.integrity.present,793);assert.deepEqual(st.body.migrations.pending,[]);assert.deepEqual(st.body.migrations.drift,[]);assert.deepEqual(st.body.migrations.unknown,[]);
 const before=JSON.parse(readFileSync(folder+'/protected-before.json','utf8'));assert.deepEqual(await snapshot(),before);const menemen=business(await get('menemen-besiktas'));
 assert.equal((await request({action:'profile-apply',target:'production',confirm:'EVET',profile:source(TARGETS[0])})).status,400);
 assert.equal((await request({action:'profile-apply',target:'preview',confirm:'EVET',profile:source(TARGETS[0])},{Origin:'https://untrusted.invalid','Sec-Fetch-Site':'cross-site'})).status,403);
 assert.equal((await request({}, {}, '/api/reviews/')).status,401);
 for(const slug of TARGETS){
  const p=source(slug),original=business(await get(slug));assert.equal(original.profile,null,slug+' unexpected prior profile');
  const first=await apply(p),once=await get(slug);assert(once.profile);assert.equal(once.videos.length,(p.videos??[]).length);if(p.menu)assert.deepEqual(once.profile.menu.sections,p.menu.sections);
  const repeat=await apply(p),twice=await get(slug);assert.deepEqual(business(twice),business(once),slug+' repeat changed content');assert.deepEqual(twice.counts,once.counts,slug+' duplicated content rows');
  requireRolledBack(await rollback(first.auditId));assert.deepEqual(business(await get(slug)),original,slug+' original operation not completely rolled back after repeat');
  const twiceRollback=await rollback(first.auditId);assert(twiceRollback.status<500);assert.deepEqual(business(await get(slug)),original,slug+' double rollback changed prior state');
  const reapplied=await apply(p);assert.equal((await get(slug)).videos.length,(p.videos??[]).length);requireRolledBack(await rollback(reapplied.auditId));assert.deepEqual(business(await get(slug)),original,slug+' reapply rollback failed');
  const final=await apply(p);out.apply.push({slug,auditId:final.auditId,videosOk:(p.videos??[]).length});out.profiles.push({slug,repeatWithoutDuplicateRows:true,originalAuditRollbackAfterRepeat:true,doubleRollbackSafe:true,reapplyRollback:true});save('api',out);
 }
 assert.equal(out.profiles.length,26);assert.equal(out.apply.reduce((n:number,r:any)=>n+r.videosOk,0),16);assert.deepEqual(await snapshot(),before);assert.deepEqual(business(await get('menemen-besiktas')),menemen);
 assert.deepEqual((await pool.query('SELECT id,slug FROM places')).rows.sort((a:any,b:any)=>a.slug.localeCompare(b.slug)),JSON.parse(readFileSync(folder+'/all-place-ids.json','utf8')));
 out.addressPatch=await checkAddresses();assert.deepEqual(await snapshot(),before);
 out.pr39Profiles=PR39_TARGETS.length;out.pr40Profiles=PR40_TARGETS.length;out.protectedGroups=Object.keys(before).length;out.untargetedPlaces=before.untargeted_places.n;out.catalog=793;out.menemenUnchanged=true;out.runtime={env:st.body.env,fingerprint:st.body.db.fingerprint};out.complete=true;save('protected-after',await snapshot());save('api',out);console.log(JSON.stringify(out));
}
main().then(()=>process.exit(0)).catch(e=>{out.failure=String(e);save('api',out);console.error(e);process.exit(1)});
