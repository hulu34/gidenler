import assert from 'node:assert/strict';
import {SHA,pool,source,save} from './pr41-fixture';
import {get,apply,rollback,business} from './pr41-http';
const out:any={sha:SHA,productionWrites:0,syntheticFixturesOnly:true,cases:[],complete:false,releaseGate:false};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function waitingWrite(done:()=>boolean){for(let i=0;i<160;i++){if(done())return false;const r=await pool.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND state='active' AND query ILIKE '%places%'");if(r.rows[0].n>0)return true;await sleep(50)}throw Error('Could not establish deterministic write interleaving')}
async function locked(slug:string){const c=await pool.connect();await c.query('BEGIN');const r=await c.query('SELECT id FROM places WHERE slug=$1 FOR NO KEY UPDATE',[slug]);assert.equal(r.rowCount,1);return {c,id:r.rows[0].id,async release(){await c.query('COMMIT');c.release()}}}
async function sharedLink(){
 const slug='alaf-besiktas',other='japon-erdal-beyoglu';assert.equal((await get(slug)).profile,null);
 const a=await apply(source(slug)),video=(await get(slug)).videos[0],otherId=(await pool.query('SELECT id FROM places WHERE slug=$1',[other])).rows[0].id;
 const lock=await locked(slug);let released=false,done=false;const pending=rollback(a.auditId).then(r=>{done=true;return r});
 try{
  const held=await waitingWrite(()=>done);if(!held){await lock.release();released=true;await pending;return {name:'committed_foreign_media_link_survives_rollback',orderedBeforeConcurrentChange:true,passed:true}}
  const ins=pool.query('INSERT INTO media_places(media_id,place_id) VALUES($1,$2)',[video.id,otherId]).then(()=>({committed:true,error:null})).catch((e:any)=>({committed:false,error:String(e.code)}));
  const early=await Promise.race([ins,sleep(500).then(()=>null)]);await lock.release();released=true;const rb=await pending,insert=await ins;
  const exists=(await pool.query('SELECT count(*)::int n FROM media_places WHERE media_id=$1 AND place_id=$2',[video.id,otherId])).rows[0].n;
  const row={name:'committed_foreign_media_link_survives_rollback',blockedWrite:true,incomingCommittedBeforeRollbackWrite:early?.committed===true,incoming:insert,rollbackStatus:rb.status,foreignLinkAfter:exists,passed:early?.committed!==true||exists===1};
  return row;
 }finally{if(!released)await lock.release();await pending.catch(()=>{});await pool.query('DELETE FROM media_places WHERE media_id=$1 AND place_id=$2',[video.id,otherId])}
}
async function newerRevision(){
 const slug='topaz-beyoglu',p=source(slug);assert.equal((await get(slug)).profile,null);const a=await apply(p);
 const next={...p,notes:[...(p.notes??[]),{value:'Yalnız sentetik eşzamanlı revizyon B',provider:'business',url:'https://example.invalid/race-only',checkedAt:'2026-11-13'}]};
 const lock=await locked(slug);let released=false,done=false;const pending=rollback(a.auditId).then(r=>{done=true;return r});
 try{
  const held=await waitingWrite(()=>done);if(!held){await lock.release();released=true;await pending;return {name:'newer_revision_survives_rollback_preflight_race',orderedBeforeConcurrentChange:true,passed:true}}
  const update=apply(next);const early=await Promise.race([update.then(r=>({done:true,auditId:r.auditId})),sleep(500).then(()=>null)]);
  await lock.release();released=true;const rb=await pending,b=await update,after=business(await get(slug));
  const correct=after.profile?.description?.value===p.description.value&&JSON.stringify(after.profile?.notes.map((n:any)=>n.value))===JSON.stringify(next.notes.map((n:any)=>n.value))&&JSON.stringify(after.profile?.menu?.sections)===JSON.stringify(p.menu.sections);
  return {name:'newer_revision_survives_rollback_preflight_race',blockedWrite:true,newerCommittedBeforeRollbackWrite:early?.done===true,newerAuditId:b.auditId,rollbackStatus:rb.status,descriptionAfter:after.profile?.description?.value??null,expectedDescription:p.description.value,newerContentIntact:correct,passed:correct};
 }finally{if(!released)await lock.release();await pending.catch(()=>{})}
}
async function main(){for(const run of [sharedLink,newerRevision]){try{out.cases.push(await run())}catch(e){out.cases.push({name:run.name,passed:false,error:String(e)})}save('races',out)}out.complete=true;out.releaseGate=out.cases.every((r:any)=>r.passed);save('races',out);console.log(JSON.stringify(out));process.exit(out.releaseGate?0:1)}
main().catch(e=>{out.failure=String(e);save('races',out);console.error(e);process.exit(1)});
