import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TARGETS,SHA,pool,source,save,folder} from './pr40-fixture';
const origin='http://localhost:3189',out:any={sha:SHA,productionWrites:0,syntheticAdversarialFixturesOnly:true,repeatRollback:[],blockers:[]};
async function req(body:any){const r=await fetch(origin+'/api/admin/db/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({target:'preview',...body}),signal:AbortSignal.timeout(90000)});return {status:r.status,body:await r.json()}}
async function get(slug:string){return (await fetch(origin+'/api/admin/db/?rapor=profil&slug='+slug)).json()}
async function main(){
 const api=JSON.parse(readFileSync(folder+'/api.json','utf8'));assert(api.complete);
 for(const r of api.repeat){const original=await req({action:'profile-rollback',confirm:'GERI-AL',auditId:r.meaningfulAuditId});assert.equal(original.body.error,'not_latest');const latest=await req({action:'profile-rollback',confirm:'GERI-AL',auditId:r.repeatAuditId});assert(latest.body.ok);const stillPresent=!!(await get(r.slug)).profile;assert(stillPresent);const retry=await req({action:'profile-rollback',confirm:'GERI-AL',auditId:r.meaningfulAuditId});assert.equal(retry.body.error,'not_latest');out.repeatRollback.push({slug:r.slug,originalStatus:original.status,repeatRollbackStatus:latest.status,profileStillPresent:stillPresent,originalRetryError:retry.body.error})}
 out.blockers.push({code:'repeat_audit_prevents_complete_profile_rollback',profiles:12});
 const target='ciya-sofrasi-kadikoy',video=(await get(target)).videos[0],other='japon-erdal-beyoglu';assert(video);
 const otherId=(await pool.query('SELECT id FROM places WHERE slug=$1',[other])).rows[0].id;
 await pool.query('INSERT INTO media_places(media_id,place_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[video.id,otherId]);
 await pool.query("UPDATE media_items SET credit='Synthetic pre-existing independent credit',sponsored=true WHERE id=$1",[video.id]);
 const before=(await pool.query('SELECT id,credit,sponsored,status FROM media_items WHERE id=$1',[video.id])).rows[0];
 const applied=await req({action:'profile-apply',confirm:'EVET',profile:source(target)});assert.equal(applied.status,200);
 const after=(await pool.query('SELECT id,credit,sponsored,status FROM media_items WHERE id=$1',[video.id])).rows[0];assert.equal(after.sponsored,false);assert.notEqual(after.credit,before.credit);
 const otherBefore=(await get(other)).videos.some((v:any)=>v.id===video.id);assert(otherBefore);
 const removed=await req({action:'media-remove',confirm:'EVET',id:video.id});assert(removed.body.ok);const otherAfter=(await get(other)).videos.some((v:any)=>v.id===video.id);assert.equal(otherAfter,false);
 out.sharedVideo={syntheticAdditionalLink:other,before,after,otherBefore,otherAfter};out.blockers.push({code:'shared_video_metadata_overwrite_and_global_removal',sponsorshipDowngraded:true,otherVenueVideoHidden:true});
 const partial=await req({action:'profile-apply',confirm:'EVET',profile:{...source('topaz-beyoglu'),videos:[{url:'https://example.invalid/not-a-platform',credit:'Synthetic invalid video',sponsored:false}]}});assert.equal(partial.status,207);assert.equal(partial.body.profileOk,true);assert.equal(partial.body.ok,false);assert.equal(partial.body.videos[0].error,'bad_url');out.partialFailure={status:207,profileCommitted:true,videoError:'bad_url',auditId:partial.body.auditId};out.blockers.push({code:'partial_video_failure_commits_profile',requiresExplicitCompensation:true});
 out.complete=true;out.releaseGate=false;save('negative',out);console.log(JSON.stringify(out));
}
main().then(()=>process.exit(0)).catch(e=>{out.complete=false;out.error=String(e);save('negative',out);console.error(e);process.exit(1)});
