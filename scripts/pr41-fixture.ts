import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {realVenueRecords} from '../../candidate/data/real';
import {seedRealVenues} from '../../candidate/lib/db/seed';
import {applyMigrations,type Executor} from '../../candidate/lib/db/migrate';
import {getDb} from '../../candidate/lib/db/client';
import {ProfileInput,applyProfile} from '../../candidate/lib/profile';
export const BASE='2031408276fc5e4a24223a4e45fa70f656ffb604';
export const SHA=process.env.CANDIDATE_SHA!;
assert(/^[a-f0-9]{40}$/.test(SHA));
export const PR40_TARGETS=JSON.parse(readFileSync('../candidate/data/katalog/zengin-30/envanter.json','utf8')).restoranlar.filter((r:any)=>r.profil==='yapildi').map((r:any)=>r.slug) as string[];
export const PR39_TARGETS=['turk-fatih-tutak-sisli','nicole-beyoglu','mutfakkoz-kadikoy','cuma-beyoglu','fauna-atasehir','aida-vino-e-cucina-kadikoy','mikla-turkey-fusion-beyoglu','aseka-beyoglu','calipso-fish-maltepe','rumelihisari-iskele-sariyer','sade-bes-denizler-mutfagi-sisli','deraliye-fatih','tavaci-recep-usta-bostanci-maltepe','ali-ocakbasi-karakoy-beyoglu'];
export const TARGETS=[...PR40_TARGETS,...PR39_TARGETS];
assert.equal(PR40_TARGETS.length,12);assert.equal(TARGETS.length,26);
export const folder='pr41-cloud-evidence';mkdirSync(folder,{recursive:true});
const req=createRequire(resolve('../candidate/package.json'));const {Pool}=req('pg');
const url=new URL(process.env.DATABASE_URL!);
assert(['127.0.0.1','localhost'].includes(url.hostname));assert.equal(url.pathname,'/gidenler_pr41_audit');assert.equal(process.env.GIDENLER_TEST_ONLY,'pr41-20261113');assert.equal(process.env.DB_DRIVER,'pg');assert.equal(process.env.VERCEL_ENV,'preview');assert(!process.env.VERCEL);assert.equal(process.env.GOOGLE_PLACES_ENABLED,'0');assert(!process.env.GROQ_API_KEY&&!process.env.OPENAI_API_KEY);
export const pool=new Pool({connectionString:url.href});
export const source=(slug:string)=>JSON.parse(readFileSync('../candidate/content/profiles/'+slug+'.json','utf8'));
export const save=(name:string,v:unknown)=>writeFileSync(folder+'/'+name+'.json',JSON.stringify(v,null,2));
export const gitJson=(ref:string,p:string)=>JSON.parse(execFileSync('git',['-C','../candidate','show',ref+':'+p],{encoding:'utf8'}));
export async function snapshot(){
 const ids=(await pool.query('SELECT id FROM places WHERE slug=ANY($1::text[])',[TARGETS])).rows.map((r:any)=>r.id);
 const names=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map((r:any)=>r.tablename);
 const mutable=new Set(['places','vertical_restaurant','field_provenance','menu_items','audit_log','ops_counters','signal_events','media_items','media_places']);const out:any={};
 const hash=async(sql:string,args:unknown[]=[])=> (await pool.query(sql,args)).rows[0];
 for(const name of names){if(mutable.has(name))continue;const q='"'+name.replaceAll('"','""')+'"';out[name]=await hash(`SELECT count(*)::int n,md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM ${q} t`)}
 for(const[name,col]of [['places','id'],['vertical_restaurant','place_id'],['field_provenance','place_id'],['menu_items','place_id']])out['untargeted_'+name]=await hash(`SELECT count(*)::int n,md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM ${name} t WHERE NOT(${col}=ANY($1::text[]))`,[ids]);
 out.existingMedia=await hash("SELECT count(*)::int n,md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM media_items t WHERE id='baseline-menemen-video'");
 out.untargetedMediaLinks=await hash("SELECT count(*)::int n,md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM media_places t WHERE NOT(place_id=ANY($1::text[]))",[ids]);
 const old=JSON.parse(readFileSync(folder+'/baseline-audit-ids.json','utf8'));
 out.existingAudit=await hash("SELECT count(*)::int n,md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) hash FROM audit_log t WHERE id=ANY($1::text[])",[old]);return out;
}
export async function prepare(){
 const x:Executor={async query(s){return(await pool.query(s)).rows},async transaction(st){const c=await pool.connect();try{await c.query('BEGIN');for(const s of st)await c.query(s);await c.query('COMMIT')}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}};await applyMigrations(x);
 assert.equal(execFileSync('git',['-C','../candidate','rev-parse','HEAD'],{encoding:'utf8'}).trim(),SHA);
 const beforeRaw=[...gitJson(BASE,'data/real/venues.json'),...gitJson(BASE,'data/real/isletme.json')];assert.equal(beforeRaw.length,793);assert.equal(realVenueRecords.length,793);assert.deepEqual(new Set(beforeRaw.map((r:any)=>r.slug)),new Set(realVenueRecords.map(r=>r.slug)));
 const db=getDb()!;assert(db);await seedRealVenues(db,realVenueRecords);
 const baselineRef=BASE;
 const paths=execFileSync('git',['-C','../candidate','ls-tree','-r','--name-only',baselineRef,'content/profiles'],{encoding:'utf8'}).trim().split('\n');assert.equal(paths.length,44);
 for(const p of paths){const{videos,_kaynak_notu,...raw}=gitJson(baselineRef,p);assert(!TARGETS.includes(raw.slug));assert((await applyProfile(db,ProfileInput.parse(raw))).ok)}
 const rows=(await pool.query('SELECT id,slug FROM places')).rows;const bySlug=new Map(rows.map((r:any)=>[r.slug,r.id]));assert.equal(rows.length,793);
 await pool.query("INSERT INTO public.user(id,name,email) VALUES('synthetic-profile-user','Sentetik kabul hesabı','fixture@example.invalid')");
 await pool.query("INSERT INTO session(id,expires_at,token,user_id) VALUES('synthetic-session',now()+interval '1 day','synthetic-token-only','synthetic-profile-user')");
 for(const [i,slug]of ['japon-erdal-beyoglu',TARGETS[0],'menemen-besiktas'].entries())await pool.query("INSERT INTO reviews(id,place_id,user_id,visited_on,overall,ratings,body,status) VALUES($1,$2,'synthetic-profile-user','2026-11-01',4,'{}','Yalnız izole kabul ortamında sentetik korunacak kayıt.',$3)",['synthetic-review-'+i,bySlug.get(slug),i===0?'published':'pending']);
 await pool.query("INSERT INTO google_ratings(slug,place_id,rating,checked_at,source,confidence,import_id,hidden_reason) VALUES('__ci_only_not_a_venue__','synthetic-only',4.4,now(),'synthetic-fixture','test-only','cloud-only','Synthetic, never displayed as real Google data')");
 const mv=source('menemen-besiktas').videos[0];await pool.query("INSERT INTO media_items(id,type,platform,url,external_id,storage_class,category,credit,source,status,sponsored) VALUES('baseline-menemen-video','embed','youtube',$1,'e6OmpzizSoo','id_only','influencer',$2,'editor','approved',true)",[mv.url,mv.credit]);await pool.query("INSERT INTO media_places(media_id,place_id) VALUES('baseline-menemen-video',$1)",[bySlug.get('menemen-besiktas')]);
 save('baseline-audit-ids',(await pool.query('SELECT id FROM audit_log')).rows.map((r:any)=>r.id));save('protected-before',await snapshot());save('all-place-ids',rows.sort((a:any,b:any)=>a.slug.localeCompare(b.slug)));
 save('fixture',{candidateSha:SHA,baselineSha:BASE,baselineProfiles:paths.length,catalog:793,targetProfiles:26,targetVideos:16,productionCredentials:false,environment:'Isolated PostgreSQL17 on GitHub Actions localhost; Preview guard enabled',syntheticUsers:true,menemenExistingVideo:true});
 console.log('Prepared isolated fixture',SHA,paths.length,793);
}
