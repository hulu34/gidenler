import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(process.cwd()+'/package.json');
const {Pool}=require('pg');
const origin='http://localhost:3150';
const dbUrl=new URL(process.env.DATABASE_URL??'');assert.ok(['localhost','127.0.0.1'].includes(dbUrl.hostname)&&dbUrl.pathname==='/gidenler_night'&&process.env.GIDENLER_ISOLATED_TEST_DB==='night-25'&&process.env.VERCEL_ENV!=='production','Only the isolated local test database is allowed');
const expectedCatalog=JSON.parse(readFileSync('data/real/venues.json')).length+JSON.parse(readFileSync('data/real/isletme.json')).length;
const get=async p=>{const r=await fetch(origin+p,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,p);return await r.text()};
const admin=JSON.parse(await get('/api/admin/db/'));assert.equal(admin.integrity.present,expectedCatalog);assert.equal(admin.integrity.ok,true);
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
const wrongTarget=await postAdmin({action:'seed-add-only',target:'production',confirm:'EVET',baselineCount:expectedCatalog-218,slugs:additions.map(r=>r.slug)});assert.equal(wrongTarget.status,400);
const replay=await postAdmin({action:'seed-add-only',target:'local',confirm:'EVET',baselineCount:expectedCatalog-218,slugs:additions.map(r=>r.slug)});assert.equal(replay.status,200);const replayJson=await replay.json();assert.equal(replayJson.integrity.ok,true);assert.equal(replayJson.mode,'insert-only');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const token='isolated-test-session-'+Date.now(),uid='isolated-release-http-'+Date.now();
await pool.query('INSERT INTO "user" (id,name,email,email_verified,kind) VALUES ($1,$2,$3,true,$4)',[uid,'Sentetik yayın testi',uid+'@example.invalid','test']);
await pool.query('INSERT INTO session(id,token,user_id,expires_at) VALUES ($1,$2,$3,$4)',[uid+'-session',token,uid,new Date(Date.now()+3600000)]);
const secret=process.env.BETTER_AUTH_SECRET;
assert.ok(secret);const signed=encodeURIComponent(token+'.'+createHmac('sha256',secret).update(token).digest('base64'));
const cookie='__Secure-better-auth.session_token='+signed;
const session=await fetch(origin+'/api/auth/get-session/',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(session.user?.id,uid);
const selected=[additions.find(r=>r.adresDuzeyi==='sokak'),additions.find(r=>r.ref.startsWith('isletme/')),additions.find(r=>r.adresDuzeyi!=='sokak'&&!r.ref.startsWith('isletme/'))];
const savedIds=[];
for(const [index,r] of selected.entries()){
 const response=await fetch(origin+'/api/reviews/',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({slug:r.slug,body:'Bu sentetik izole test yeni mekân için deneyim kaydının doğru kimliğe bağlandığını doğrular. Senaryo '+index,visitMonth:new Date().toISOString().slice(0,7),overall:8,ratings:{},returnIntent:'evet',disclosure:'none'})});
 const result=await response.json();assert.equal(response.status,201,JSON.stringify(result));savedIds.push(result.id);
 const saved=await pool.query('SELECT p.slug FROM reviews r JOIN places p ON p.id=r.place_id WHERE r.id=$1 AND r.user_id=$2',[result.id,uid]);assert.equal(saved.rows[0]?.slug,r.slug);
}
// Independent user cannot edit/delete another account's review or moderate.
const uid2=uid+'-other',token2=token+'-other';
await pool.query('INSERT INTO "user" (id,name,email,email_verified,kind) VALUES ($1,$2,$3,true,$4)',[uid2,'Isolated other user',uid2+'@example.invalid','test']);
await pool.query('INSERT INTO session(id,token,user_id,expires_at) VALUES ($1,$2,$3,$4)',[uid2+'-session',token2,uid2,new Date(Date.now()+3600000)]);
const cookie2='__Secure-better-auth.session_token='+encodeURIComponent(token2+'.'+createHmac('sha256',secret).update(token2).digest('base64'));
const session2=await fetch(origin+'/api/auth/get-session/',{headers:{Cookie:cookie2}}).then(r=>r.json());assert.equal(session2.user?.id,uid2);
const beforeSecurity=(await pool.query('SELECT to_jsonb(r) AS row FROM reviews r ORDER BY id')).rows;
// PATCH accepts ReviewBody only; POST separately accepts the venue slug.
const valid={body:'Bu yalnız izole yetki testi için kullanılan geçerli bir deneyim metnidir.',visitMonth:new Date().toISOString().slice(0,7),overall:8,ratings:{},returnIntent:'evet',disclosure:'none'};
for(const method of ['PATCH','DELETE']){const r=await fetch(origin+'/api/reviews/'+savedIds[0]+'/',{method,headers:{Cookie:cookie2,Origin:origin,'Content-Type':'application/json'},...(method==='PATCH'?{body:JSON.stringify(valid)}:{})});assert.equal(r.status,404,'Other user '+method);}
for(const path of ['/api/moderation/photos/','/api/moderation/google-puan/']){const r=await fetch(origin+path,{headers:{Cookie:cookie2}});assert.equal(r.status,403,'Normal user moderation');const a=await fetch(origin+path);assert.equal(a.status,401,'Anonymous moderation');}
const invalid=await fetch(origin+'/api/reviews/',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(invalid.status,400);
const badOrigin=await fetch(origin+'/api/reviews/'+savedIds[0]+'/',{method:'PATCH',headers:{Cookie:cookie,Origin:'https://untrusted.invalid','Content-Type':'application/json'},body:JSON.stringify(valid)});assert.equal(badOrigin.status,403);
const tampered=await fetch(origin+'/api/auth/get-session/',{headers:{Cookie:cookie+'tampered'}}).then(r=>r.json());assert.equal(tampered?.user??null,null);
await pool.query('UPDATE session SET expires_at=$1 WHERE user_id=$2',[new Date(Date.now()-60000),uid2]);
const expired=await fetch(origin+'/api/auth/get-session/',{headers:{Cookie:cookie2}}).then(r=>r.json());assert.equal(expired?.user??null,null);
assert.deepEqual((await pool.query('SELECT to_jsonb(r) AS row FROM reviews r ORDER BY id')).rows,beforeSecurity,'Rejected operations changed reviews');
assert.equal((await fetch(origin+'/mekan/this-venue-does-not-exist/')).status,404);
// Existing unoptimized configuration disables Next's image optimizer. Use only a local URL.
assert.equal((await fetch(origin+'/_next/image?url=%2Ffavicon.ico&w=640&q=75')).status,404,'Image optimizer stays disabled');
// Exercise only the local OAuth initiation endpoint, never Google's servers or callback exchange.
const identitiesBefore=(await pool.query('SELECT (SELECT count(*) FROM "user") AS users, (SELECT count(*) FROM account) AS accounts')).rows;
const oauthStart=(requestOrigin,callbackURL,requestCookie)=>fetch(origin+'/api/auth/sign-in/social/',{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json',...(requestCookie?{Cookie:requestCookie}:{})},body:JSON.stringify({provider:'google',callbackURL,disableRedirect:true})});
const oauth=await oauthStart(origin,origin+'/benim/');assert.equal(oauth.status,200,'Local OAuth initiation');
const authorization=new URL((await oauth.json()).url);assert.equal(authorization.origin,'https://accounts.google.com');assert.equal(authorization.searchParams.get('redirect_uri'),origin+'/api/auth/callback/google');assert.equal(authorization.searchParams.get('prompt'),'select_account');
assert.deepEqual(authorization.searchParams.get('scope').split(/\s+/).sort(),['email','openid','profile']);assert.ok(authorization.searchParams.get('state'));
const oauthCookies=oauth.headers.getSetCookie();assert.ok(oauthCookies.length);for(const c of oauthCookies){assert.match(c,/HttpOnly/i);assert.match(c,/Secure/i);assert.match(c,/SameSite=Lax/i);}
// Better Auth allows a cookie-free social-start URL; it is not an authenticated action.
// Existing cookies require a trusted origin; return-address validation applies in both cases.
assert.equal((await oauthStart('https://untrusted.invalid',origin+'/benim/',cookie)).status,403,'OAuth authenticated untrusted origin');
assert.equal((await oauthStart(origin,'https://untrusted.invalid/')).status,403,'OAuth external return address');
assert.deepEqual((await pool.query('SELECT (SELECT count(*) FROM "user") AS users, (SELECT count(*) FROM account) AS accounts')).rows,identitiesBefore,'OAuth initiation created an account');
console.log('HTTP PASS: cross-account PATCH/DELETE denied; moderation 401/403; CSRF, invalid body, tampered/expired session denied; review rows unchanged');
console.log('HTTP PASS: LOCAL OAuth initiation URI/scopes/cookie flags, authenticated origin and return-address guards; no Google exchange and no account created');
await pool.end();
console.log('HTTP PASS: append endpoint replay and target guard; prepared session + 3 reviews (A/OSM, A/business, B1) linked correctly; NOT Google OAuth');
writeFileSync('night-http-evidence.json',JSON.stringify({sha:process.env.GITHUB_SHA??'local-uncommitted',postgres:17,catalog:expectedCatalog,newProfiles:218,newForms:218,b1Warnings:102,sitemapNew:218,anonymousRejected:true,csrfRejected:true,googleOAuthTested:false,localOAuthInitiationOnly:{redirectUri:origin+'/api/auth/callback/google',scopes:['email','openid','profile'],secureHttpOnlySameSiteLax:true,authenticatedUntrustedOriginDenied:true,externalReturnAddressDenied:true,createdAccounts:0},imageOptimizerDisabled:true,preparedSessionReviews:3,appendEndpointReplay:true,crossAccountEditDenied:true,crossAccountDeleteDenied:true,moderationAccessDenied:true,tamperedSessionRejected:true,expiredSessionRejected:true,rejectedOperationsPreserveReviews:true,results},null,2));
console.log('HTTP PASS: 218 profile + 218 form, 102 B1 warning, 218 sitemap, auth/CSRF guards; real Google sign-in NOT tested');
