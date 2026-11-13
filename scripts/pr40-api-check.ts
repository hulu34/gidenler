import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TARGETS,SHA,pool,source,save,snapshot,folder} from './pr40-fixture';
const origin='http://localhost:3189';const result:any={sha:SHA,productionWrites:0,environment:'isolated cloud Preview-mode app with PostgreSQL17',apply:[],profileRollback:[],videoRollback:[],repeat:[],releaseBlockers:[]};
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export async function request(path:string,body?:unknown,extra={}){return fetch(origin+path,{method:body?'POST':'GET',redirect:'error',headers:{Origin:origin,'Content-Type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000)})}
export async function json(path:string,body?:unknown){const r=await request(path,body);assert.equal(r.status,200,path+':'+r.status);return r.json()}
const get=(slug:string)=>json('/api/admin/db/?rapor=profil&slug='+slug);
const post=(profile:any)=>json('/api/admin/db/',{action:'profile-apply',target:'preview',confirm:'EVET',profile});
const normalized=(p:any)=>{const{updatedAt,...rest}=p;return rest};
function checkProfile(j:any,p:any){assert.equal(j.env,'preview');assert.equal(j.slug,p.slug);for(const k of ['address','phone','website','instagram','hours','description','reservation'])if(p[k])assert.equal(j.profile[k].value,p[k].value,p.slug+' '+k);assert.deepEqual(j.profile.notes.map((n:any)=>n.value),(p.notes??[]).map((n:any)=>n.value));if(p.menu)assert.deepEqual(j.profile.menu.sections,p.menu.sections);assert.equal(j.videos.length,(p.videos??[]).length)}
async function main(){
 let ready=false;for(let i=0;i<90;i++){try{const r=await request('/api/admin/db/?rapor=profil&slug=menemen-besiktas');if(r.status===200){ready=true;break}}catch{}await delay(1000)}assert(ready,'Test server unavailable');
 const st=await json('/api/admin/db/');assert.equal(st.env,'preview');assert.equal(st.db.writeGuard.ok,true);assert.equal(st.integrity.present,793);assert.equal(st.integrity.ok,true);for(const k of ['pending','drift','unknown'])assert.deepEqual(st.migrations[k],[]);result.runtime={environment:st.env,fingerprint:st.db.fingerprint,guard:st.db.writeGuard,catalog:st.integrity.present};
 const before=JSON.parse(readFileSync(folder+'/protected-before.json','utf8'));assert.deepEqual(await snapshot(),before);const menemen=await get('menemen-besiktas');assert.equal(menemen.profile.menu.sections.flatMap((s:any)=>s.items).length,45);assert.equal(menemen.videos[0].externalId,'e6OmpzizSoo');
 const wrong=await request('/api/admin/db/',{action:'profile-apply',target:'production',confirm:'EVET',profile:source(TARGETS[0])});assert.equal(wrong.status,400);
 const csrf=await request('/api/admin/db/',{action:'profile-apply',target:'preview',confirm:'EVET',profile:source(TARGETS[0])},{Origin:'https://untrusted.invalid','Sec-Fetch-Site':'cross-site'});assert.equal(csrf.status,403);
 const anon=await request('/api/reviews/',{});assert.equal(anon.status,401);
 const forced=await request('/api/admin/db/',{action:'profile-apply',target:'preview',confirm:'EVET',profile:source(TARGETS[0]),simulateFailure:true});assert.equal(forced.status,500);assert.equal((await forced.json()).error,'apply_failed_rolled_back');assert.equal((await get(TARGETS[0])).profile,null);assert.deepEqual(await snapshot(),before);
 const originals:any={};
 for(const slug of TARGETS){const j=await get(slug);assert.equal(j.profile,null);originals[slug]=normalized(j.place);const r=await post(source(slug));assert(r.ok&&r.profileOk);result.apply.push({slug,auditId:r.auditId,fields:r.fields,menuItems:r.menuItems,videos:r.videos,videosOk:r.videosOk});checkProfile(await get(slug),source(slug))}
 assert.equal(result.apply.reduce((n:number,r:any)=>n+r.videosOk,0),16);assert.deepEqual(await snapshot(),before);
 for(const r of result.apply){const rb=await json('/api/admin/db/',{action:'profile-rollback',target:'preview',confirm:'GERI-AL',auditId:r.auditId});assert(rb.ok);const j=await get(r.slug);assert.equal(j.profile,null);assert.deepEqual(normalized(j.place),originals[r.slug]);result.profileRollback.push({slug:r.slug,profileRestored:true,videosStillVisible:j.videos.length});
  for(const v of r.videos){assert(v.created,'Only new, exclusively linked media can be removed in this bounded test');const links=(await pool.query('SELECT place_id FROM media_places WHERE media_id=$1',[v.id])).rows;assert.equal(links.length,1);assert((await json('/api/admin/db/',{action:'media-remove',target:'preview',confirm:'EVET',id:v.id})).ok);result.videoRollback.push({slug:r.slug,id:v.id,exclusivelyLinked:true,removed:true})}assert.equal((await get(r.slug)).videos.length,0);
 }
 result.releaseBlockers.push({code:'profile_rollback_leaves_videos',visibleVideos:result.profileRollback.reduce((n:number,r:any)=>n+r.videosStillVisible,0)});assert.deepEqual(await snapshot(),before);
 for(const slug of TARGETS){const r=await post(source(slug));assert(r.ok);checkProfile(await get(slug),source(slug));const counts=(await get(slug)).counts;const repeat=await post(source(slug));assert(repeat.ok&&repeat.unchanged);assert.deepEqual((await get(slug)).counts,counts);assert.deepEqual(repeat.videos.map((v:any)=>v.id),r.videos.map((v:any)=>v.id));result.repeat.push({slug,unchanged:true,meaningfulAuditId:r.auditId,repeatAuditId:repeat.auditId})}
 assert.deepEqual(await snapshot(),before);assert.deepEqual(await get('menemen-besiktas'),menemen);
 assert.deepEqual((await pool.query('SELECT id,slug FROM places')).rows.sort((a:any,b:any)=>a.slug.localeCompare(b.slug)),JSON.parse(readFileSync(folder+'/all-place-ids.json','utf8')));
 result.catalog=793;result.protectedGroups=Object.keys(before).length;result.untargetedPlaces=before.untargeted_places.n;result.menemenUnchanged=true;result.security={wrongProductionTarget:400,crossOrigin:403,anonymousReview:401,atomicFailure:500};result.complete=true;save('protected-after',await snapshot());save('api',result);console.log(JSON.stringify(result));
}
main().then(()=>process.exit(0)).catch(e=>{result.complete=false;result.error=String(e);save('api',result);console.error(e);process.exit(1)});
