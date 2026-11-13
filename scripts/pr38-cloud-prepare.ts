import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {realVenueRecords} from '../../candidate/data/real';
import {seedRealVenues} from '../../candidate/lib/db/seed';
import {applyMigrations,type Executor} from '../../candidate/lib/db/migrate';
import {getDb} from '../../candidate/lib/db/client';
import {ProfileInput,applyProfile,readProfile,rollbackProfile} from '../../candidate/lib/profile';
import {addPlaceVideo,listPlaceVideos} from '../../candidate/lib/media/store';
const req=createRequire(resolve('../candidate/package.json'));
const {Pool}=req('pg');
const url=new URL(process.env.DATABASE_URL!);
assert(['localhost','127.0.0.1'].includes(url.hostname));
assert.equal(url.pathname,'/gidenler_menemen_audit');
assert.equal(process.env.GIDENLER_TEST_ONLY,'pr38-20261113');
assert.equal(process.env.DB_DRIVER,'pg');assert(!process.env.VERCEL);
assert.notEqual(process.env.VERCEL_ENV,'production');
const pool=new Pool({connectionString:url.href});
const x:Executor={async query(s){return(await pool.query(s)).rows},async transaction(ss){const c=await pool.connect();try{await c.query('BEGIN');for(const s of ss)await c.query(s);await c.query('COMMIT')}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}};
const out:any={sourceSha:'2031408276fc5e4a24223a4e45fa70f656ffb604',originalPrSha:'3036b6a872e23306f19e49154c6b629d8a2cbc38',environment:'GitHub Actions isolated PostgreSQL 17, localhost only',productionCredentials:false,productionWrites:0};
mkdirSync('menemen-cloud-evidence',{recursive:true});
const save=()=>writeFileSync('menemen-cloud-evidence/database.json',JSON.stringify(out,null,2));
async function main(){
 await applyMigrations(x);const db=getDb()!;assert(db);await seedRealVenues(db,realVenueRecords);
 const source=JSON.parse(readFileSync('../candidate/content/profiles/menemen-besiktas.json','utf8'));
 const {videos,_kaynak_notu,...raw}=source;const p=ProfileInput.parse(raw);
 const others=[];for(const f of readdirSync('../candidate/content/profiles').filter(f=>f.endsWith('.json')&&f!=='menemen-besiktas.json')){const{videos,_kaynak_notu,...r}=JSON.parse(readFileSync('../candidate/content/profiles/'+f,'utf8'));const q=ProfileInput.parse(r);assert((await applyProfile(db,q)).ok);others.push(q.slug)}
 const target=(await pool.query("SELECT id FROM places WHERE slug='menemen-besiktas'")).rows[0].id;
 const otherId=(await pool.query("SELECT id FROM places WHERE slug <> 'menemen-besiktas' ORDER BY id LIMIT 1")).rows[0].id;
 await pool.query("INSERT INTO public.user(id,name,email) VALUES('cloud-synthetic-user','Bulut test hesabı','synthetic@example.invalid')");
 for(const [i,id] of [target,otherId].entries())await pool.query("INSERT INTO reviews(id,place_id,user_id,visited_on,overall,ratings,body,status) VALUES($1,$2,'cloud-synthetic-user','2026-11-01',4,'{}','Yalnız izole kabul testi; kamuya açık değildir.','pending')",['cloud-review-'+i,id]);
 const snap=async()=>{
  const tabs=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_gidenler_migrations' ORDER BY tablename")).rows.map((r:any)=>r.tablename);
  const protectedRows:any={};
  for(const tb of tabs){
   if(['places','vertical_restaurant','field_provenance','menu_items','audit_log','media_items','media_places'].includes(tb))continue;
   const ident='"'+tb.replaceAll('"','""')+'"';
   protectedRows[tb]=(await pool.query(`SELECT count(*)::int n, md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM ${ident} t`)).rows[0];
  }
  const filtered=[['places',"slug <> 'menemen-besiktas'"],['vertical_restaurant',`place_id <> '${target}'`],['field_provenance',`place_id <> '${target}'`],['menu_items',`place_id <> '${target}'`],['audit_log',`ref_id IS DISTINCT FROM '${target}'`]];
  for(const[tb,where]of filtered)protectedRows['other_'+tb]=(await pool.query(`SELECT count(*)::int n, md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM ${tb} t WHERE ${where}`)).rows[0];
  return protectedRows;
 };
 const before=await snap();assert.equal(await readProfile(db,p.slug),null);
 const first=await applyProfile(db,p);assert(first.ok);const read=await readProfile(db,p.slug);assert.equal(read?.menu?.archivedAt,'2024-01-20');assert.equal(read.menu.sections.flatMap(s=>s.items).length,45);assert.equal(read.menu.pricesPublished,false);
 assert.deepEqual(await snap(),before);const absentRollback=await rollbackProfile(db,first.auditId,'cloud-audit');assert(absentRollback.ok);assert.equal(await readProfile(db,p.slug),null);assert.deepEqual(await snap(),before);assert((await applyProfile(db,p)).ok);const counts=async()=>(await pool.query('SELECT (SELECT count(*) FROM menu_items) menu,(SELECT count(*) FROM field_provenance) fields')).rows[0];
 const c1=await counts();const repeat=await applyProfile(db,p);assert(repeat.ok&&repeat.unchanged);assert.deepEqual(await counts(),c1);
 // rollbackProfile accepts only the most recent application; verify a later profile edit restores the previous version.
 const revised=ProfileInput.parse({...raw,description:{...raw.description,checkedAt:'2026-11-13',value:raw.description.value+' (izole geri dönüş denemesi)'}});
 const changed=await applyProfile(db,revised);assert(changed.ok&&!changed.unchanged);
 const rollback=await rollbackProfile(db,changed.auditId,'cloud-audit');assert(rollback.ok);assert.deepEqual(await readProfile(db,p.slug),read);assert.deepEqual(await snap(),before);
 const o=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(videos[0].url),{signal:AbortSignal.timeout(15000)});
 assert.equal(o.status,200,'Real YouTube oEmbed is required; no fixture fallback');const oembed=await o.json();assert.match(oembed.author_name,/Ayaküstü/i);
 const v=await addPlaceVideo({slug:p.slug,...videos[0]});assert(v.ok,JSON.stringify(v));const v2=await addPlaceVideo({slug:p.slug,...videos[0]});assert(v2.ok&&!v2.created);assert.equal(v2.id,v.id);
 const listed=await listPlaceVideos(p.slug);assert.equal(listed.length,1);assert.equal(listed[0].externalId,'e6OmpzizSoo');assert.equal(listed[0].sponsored,true);
 assert.equal(Number((await pool.query('SELECT count(*) n FROM places')).rows[0].n),793);assert.deepEqual(await snap(),before);
 out.catalog=793;out.otherProfiles=others.length;out.otherRestaurants=792;out.protectedBefore=before;out.protectedAfter=await snap();out.protectedRowsUnchanged=true;out.idempotentProfile=true;out.idempotentVideo=true;out.rollback=rollback;out.absentRollback=absentRollback;out.rollbackRestoredAbsentProfile=true;out.rollbackRestoredPreviousProfile=true;out.applyAuditId=first.auditId;out.video={result:v,officialOembed:{title:oembed.title,author:oembed.author_name},sponsored:listed[0].sponsored};out.menu={sections:read.menu.sections.length,items:45,archivedAt:read.menu.archivedAt,pricesPublished:false};out.complete=true;save();console.log(JSON.stringify(out));
}
main().then(()=>process.exit(0)).catch(e=>{out.complete=false;out.error=String(e);save();console.error(e);process.exit(1)});
