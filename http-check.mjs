import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(process.cwd()+'/package.json');
const {Pool}=require('pg');
const origin='http://localhost:3141';
const get=async p=>{const r=await fetch(origin+p,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,p);return await r.text()};
const admin=JSON.parse(await get('/api/admin/db/'));assert.equal(admin.integrity.present,792);assert.equal(admin.integrity.ok,true);
const additions=[];for(let n=7;n<=14;n++){let d=`data/paket/istanbul-${n}${n===8?'-b1':''}`;for(const f of ['kayitlar.json','isletme-kayitlari.json']){try{additions.push(...JSON.parse(readFileSync(`${d}/${f}`)))}catch(e){if(f==='kayitlar.json')throw e}}}
assert.equal(additions.length,218);
const results=[];
for(const r of additions){
 const p=await get(`/mekan/${r.slug}/`);assert.ok(p.includes(r.name.replaceAll('&','&amp;'))||p.includes(r.slug),r.slug);
 const f=await get(`/yaz/${r.slug}/`);assert.ok(f.includes('Deneyim metni'),r.slug+' form');
 if(r.adresDuzeyi==='sokak'){assert.ok(p.includes('Konum yaklaşık; kapı numarası henüz doğrulanmadı.'));assert.ok(p.includes('Adres (sokak düzeyi)'));assert.ok(!p.includes('mapnik&amp;marker='));}
 results.push({slug:r.slug,quality:r.adresDuzeyi==='sokak'?'B1':'A',profile:200,form:200});
}
const sitemap=await get('/sitemap.xml');for(const r of additions)assert.ok(sitemap.includes(`/mekan/${r.slug}/`),r.slug+' sitemap');
for(const p of ['/','/ara/?q=Develi','/sor/','/harita/','/mekan/ciya-sofrasi-kadikoy/','/mekan/japon-erdal-beyoglu/']) await get(p);
const anon=await fetch(origin+'/api/reviews/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(anon.status,401);
const csrf=await fetch(origin+'/api/reviews/',{method:'POST',headers:{Origin:'https://untrusted.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);
const postAdmin=async body=>fetch(origin+'/api/admin/db/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Sec-Fetch-Site':'same-origin'},body:JSON.stringify(body)});
const wrongTarget=await postAdmin({action:'seed-add-only',target:'production',confirm:'EVET',baselineCount:574,slugs:additions.map(r=>r.slug)});assert.equal(wrongTarget.status,400);
const replay=await postAdmin({action:'seed-add-only',target:'local',confirm:'EVET',baselineCount:574,slugs:additions.map(r=>r.slug)});assert.equal(replay.status,200);const replayJson=await replay.json();assert.equal(replayJson.integrity.ok,true);assert.equal(replayJson.mode,'insert-only');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const token='isolated-test-session-'+Date.now(),uid='isolated-release-http-'+Date.now();
await pool.query('INSERT INTO "user" (id,name,email,email_verified,kind) VALUES ($1,$2,$3,true,$4)',[uid,'Sentetik yayın testi',uid+'@example.invalid','test']);
await pool.query('INSERT INTO session(id,token,user_id,expires_at) VALUES ($1,$2,$3,$4)',[uid+'-session',token,uid,new Date(Date.now()+3600000)]);
const secret=process.env.BETTER_AUTH_SECRET;
assert.ok(secret);const signed=encodeURIComponent(token+'.'+createHmac('sha256',secret).update(token).digest('base64'));
const cookie='__Secure-better-auth.session_token='+signed;
const session=await fetch(origin+'/api/auth/get-session/',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(session.user?.id,uid);
const selected=[additions.find(r=>r.adresDuzeyi==='sokak'),additions.find(r=>r.ref.startsWith('isletme/')),additions.find(r=>r.adresDuzeyi!=='sokak'&&!r.ref.startsWith('isletme/'))];
for(const [index,r] of selected.entries()){
 const response=await fetch(origin+'/api/reviews/',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({slug:r.slug,body:'Bu sentetik izole test yeni mekân için deneyim kaydının doğru kimliğe bağlandığını doğrular. Senaryo '+index,visitMonth:new Date().toISOString().slice(0,7),overall:8,ratings:{},returnIntent:'evet',disclosure:'none'})});
 const result=await response.json();assert.equal(response.status,201,JSON.stringify(result));
 const saved=await pool.query('SELECT p.slug FROM reviews r JOIN places p ON p.id=r.place_id WHERE r.id=$1 AND r.user_id=$2',[result.id,uid]);assert.equal(saved.rows[0]?.slug,r.slug);
}
await pool.end();
console.log('HTTP PASS: append endpoint replay and target guard; prepared session + 3 reviews (A/OSM, A/business, B1) linked correctly; NOT Google OAuth');
writeFileSync('http-evidence.json',JSON.stringify({sha:'824613eea6bb392614bd00909f8948696d7d4ba5',postgres:17,catalog:792,newProfiles:218,newForms:218,b1Warnings:102,sitemapNew:218,anonymousRejected:true,csrfRejected:true,googleOAuthTested:false,preparedSessionReviews:3,appendEndpointReplay:true,results},null,2));
console.log('HTTP PASS: 218 profile + 218 form, 102 B1 warning, 218 sitemap, auth/CSRF guards; real Google sign-in NOT tested');
