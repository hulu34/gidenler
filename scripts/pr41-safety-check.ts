import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SHA,pool,source,save,folder,snapshot} from './pr41-fixture';
import {request,get,apply,rollback,business,requireRolledBack} from './pr41-http';
const out:any={sha:SHA,productionWrites:0,syntheticFixturesOnly:true,checks:[],complete:false};
const api=JSON.parse(readFileSync(folder+'/api.json','utf8'));assert(api.complete);
async function cleanTarget(slug:string){const a=api.apply.find((r:any)=>r.slug===slug);assert(a);requireRolledBack(await rollback(a.auditId));assert.equal((await get(slug)).profile,null);assert.equal((await get(slug)).videos.length,0)}
async function unchangedFailure(profile:any,label:string){const before=business(await get(profile.slug));const r=await request({action:'profile-apply',target:'preview',confirm:'EVET',profile});assert(r.status>=400||r.status===207,label+' false success');assert.notEqual(r.body.ok,true);assert.deepEqual(business(await get(profile.slug)),before,label+' left partial content');out.checks.push({label,status:r.status,priorContentRestored:true});save('safety',out)}
async function main(){
 await cleanTarget('topaz-beyoglu');
 const topaz=source('topaz-beyoglu');
 // The first video is real and independently verified; the second fails URL validation.
 await unchangedFailure({...topaz,videos:[source('ciya-sofrasi-kadikoy').videos[0],{url:'https://example.invalid/not-a-video',credit:'Synthetic invalid second video',sponsored:false}]},'valid_first_invalid_second');
 // This one is an explicitly injected network fault, not evidence of a real YouTube outage.
 await unchangedFailure({...topaz,videos:[{url:'https://www.youtube.com/watch?v=gIdEnLeR404',credit:'Synthetic oEmbed fault fixture',sponsored:false}]},'synthetic_oembed_timeout');
 const original=business(await get(topaz.slug)),a=await apply(topaz),stateA=business(await get(topaz.slug));
 const variant={...topaz,notes:[...(topaz.notes??[]),{value:'Yalnız sentetik geri dönüş testi B',provider:'business',url:'https://example.invalid/ci-only',checkedAt:'2026-11-13'}]};
 const b=await apply(variant),stateB=business(await get(topaz.slug));
 const old=await rollback(a.auditId);assert(old.status===400||old.status===409);assert.deepEqual(business(await get(topaz.slug)),stateB,'old rollback overwrote later update');
 requireRolledBack(await rollback(b.auditId));assert.deepEqual(business(await get(topaz.slug)),stateA);requireRolledBack(await rollback(a.auditId));assert.deepEqual(business(await get(topaz.slug)),original);out.checks.push({label:'newer_application_protected_and_history_unwinds',ok:true});save('safety',out);
 // Inject a real PostgreSQL error exactly when the second video's place link is inserted.
 await cleanTarget('alaf-besiktas');
 await pool.query("CREATE FUNCTION pr41_fail_video_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM media_items WHERE id=NEW.media_id AND external_id='0TBFqnYvlpg') THEN RAISE EXCEPTION 'synthetic second video relation write failure'; END IF; RETURN NEW; END $$");
 await pool.query('CREATE TRIGGER pr41_fail_video_fixture BEFORE INSERT ON media_places FOR EACH ROW EXECUTE FUNCTION pr41_fail_video_fixture()');
 try{await unchangedFailure(source('alaf-besiktas'),'postgres_error_on_second_video_relation')}finally{await pool.query('DROP TRIGGER IF EXISTS pr41_fail_video_fixture ON media_places');await pool.query('DROP FUNCTION IF EXISTS pr41_fail_video_fixture()')}
 // Make a pre-existing sponsored video belong to another restaurant. Only the synthetic fixture changes via SQL.
 const target='ciya-sofrasi-kadikoy',other='japon-erdal-beyoglu',v=source(target).videos[0];await cleanTarget(target);
 const ext=new URL(v.url).searchParams.get('v');let row=(await pool.query('SELECT * FROM media_items WHERE platform=\'youtube\' AND external_id=$1',[ext])).rows[0];
 if(!row){row=(await pool.query("INSERT INTO media_items(id,type,platform,url,external_id,storage_class,category,credit,source,status,sponsored) VALUES('pr41-shared-existing','embed','youtube',$1,$2,'id_only','influencer','Synthetic pre-existing credit','editor','approved',true) RETURNING *",[v.url,ext])).rows[0]}
 await pool.query("UPDATE media_items SET status='approved',sponsored=true,credit='Synthetic pre-existing credit' WHERE id=$1",[row.id]);
 const otherId=(await pool.query('SELECT id FROM places WHERE slug=$1',[other])).rows[0].id;await pool.query('INSERT INTO media_places(media_id,place_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[row.id,otherId]);
 const mediaBefore=(await pool.query('SELECT credit,sponsored,status,category FROM media_items WHERE id=$1',[row.id])).rows[0],otherBefore=business(await get(other)),targetBefore=business(await get(target));
 const shared=await request({action:'profile-apply',target:'preview',confirm:'EVET',profile:source(target)});
 assert.deepEqual((await pool.query('SELECT credit,sponsored,status,category FROM media_items WHERE id=$1',[row.id])).rows[0],mediaBefore,'shared metadata changed');assert.deepEqual(business(await get(other)),otherBefore,'other restaurant changed');
 if(shared.status===200){assert(shared.body.ok);requireRolledBack(await rollback(shared.body.auditId));assert.deepEqual(business(await get(target)),targetBefore)}else{assert(shared.status===400||shared.status===409);assert.deepEqual(business(await get(target)),targetBefore,'safe shared conflict left partial profile')}
 const wrong=await request({action:'media-remove',target:'preview',confirm:'EVET',slug:target,id:row.id});assert(wrong.status<500);assert.deepEqual(business(await get(other)),otherBefore,'targeted remove hid another restaurant video');assert.deepEqual((await pool.query('SELECT credit,sponsored,status,category FROM media_items WHERE id=$1',[row.id])).rows[0],mediaBefore);
 out.checks.push({label:'shared_credit_sponsorship_and_other_restaurant_preserved',applyStatus:shared.status,removeStatus:wrong.status,ok:true});
 // Remove only our own synthetic second link after the assertions. This is fixture cleanup, not product rollback evidence.
 await pool.query('DELETE FROM media_places WHERE media_id=$1 AND place_id=$2',[row.id,otherId]);
 assert.deepEqual(await snapshot(),JSON.parse(readFileSync(folder+'/protected-before.json','utf8')));out.complete=true;out.releaseGate=true;save('safety',out);console.log(JSON.stringify(out));
}
main().then(()=>process.exit(0)).catch(e=>{out.failure=String(e);out.releaseGate=false;save('safety',out);console.error(e);process.exit(1)});
