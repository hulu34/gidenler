import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
const sha='824613eea6bb392614bd00909f8948696d7d4ba5';
const plan=JSON.parse(readFileSync('plan.json','utf8'));
assert.equal(plan.sha,sha);assert.match(plan.host,/^gidenler-[a-z0-9]+-hulu34\.vercel\.app$/);
const origin='https://'+plan.host, bypass=process.env.VERCEL_BYPASS;
assert.ok(bypass,'existing deployment access missing');
mkdirSync('evidence',{recursive:true});
const check=(p,c)=>{assert.ok(c,p);console.log('PASS '+p)};
async function request(path,{body,cookie,expected=200,headers={}}={}){
 const r=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{'x-vercel-protection-bypass':bypass,'x-gidenler-test':'1',...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json','Sec-Fetch-Site':'same-origin'}),...(cookie?{Cookie:cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(70000)});
 assert.equal(r.status,expected,path+' status');return r;
}
async function admin(path='',body){const r=await request('/api/admin/db/'+path,{body});const j=await r.json();assert.equal(j.env,'preview','must never target Production');return j;}
const status=await admin();
check('Preview database isolated',status.db?.writeGuard?.ok===true&&status.db.fingerprint&&status.db.fingerprint!=='37811a6487ca5441');
check('Exact catalog and unchanged schema',status.integrity?.expected===792&&status.migrations.pending.length===0&&status.migrations.drift.length===0&&status.migrations.unknown.length===0);
const additions=[];for(let n=7;n<=14;n++)for(const f of ['kayitlar.json','isletme-kayitlari.json'])try{additions.push(...JSON.parse(readFileSync(`reviewed/data/paket/istanbul-${n}${n===8?'-b1':''}/${f}`)))}catch(e){if(f==='kayitlar.json')throw e}
assert.equal(additions.length,218);const b1=additions.filter(r=>r.adresDuzeyi==='sokak');assert.equal(b1.length,102);
const added=new Set(additions.map(r=>r.slug));const all=[...JSON.parse(readFileSync('reviewed/data/real/venues.json')),...JSON.parse(readFileSync('reviewed/data/real/isletme.json'))];const old=all.filter(r=>!added.has(r.slug));assert.equal(old.length,574);
async function mapLimit(xs,fn){const q=xs.map((x,i)=>[x,i]),out=Array(xs.length);await Promise.all(Array.from({length:4},async()=>{while(q.length){const [x,i]=q.shift();out[i]=await fn(x)}}));return out}
async function profile(slug){const r=await admin('?rapor=profil&slug='+slug);return {slug,place:r.place,counts:r.counts};}
const beforeOld=await mapLimit(old,r=>profile(r.slug));check('Existing 574 identifiers available',beforeOld.every(r=>r.place?.id));
const beforeNew=await mapLimit(additions,r=>profile(r.slug));
check('New cohort either absent or complete',beforeNew.every(r=>r.place===null)||beforeNew.every(r=>r.place?.id));
if(beforeNew.every(r=>r.place===null)){assert.equal(status.integrity.present,574);const appended=await admin('',{action:'seed-add-only',target:'preview',confirm:'EVET',baselineCount:574,slugs:[...added]});check('Preview-only append 218',appended.mode==='insert-only'&&appended.total===792&&appended.integrity.ok);}
const seeded=await mapLimit(additions,r=>profile(r.slug));check('218 new database IDs available',seeded.every(r=>r.place?.id));
await admin('',{action:'seed-add-only',target:'preview',confirm:'EVET',baselineCount:574,slugs:[...added]});
const afterOld=await mapLimit(old,r=>profile(r.slug));const repeated=await mapLimit(additions,r=>profile(r.slug));
assert.deepEqual(afterOld,beforeOld,'Existing 574 changed');assert.deepEqual(repeated,seeded,'Append replay changed rows');check('574 preserved and append replay no-op',true);
const sitemap=await request('/sitemap.xml').then(r=>r.text());for(const r of additions)assert.ok(sitemap.includes('/mekan/'+r.slug+'/'),r.slug+' sitemap');
await mapLimit(additions,async r=>{const h=await request('/mekan/'+r.slug+'/').then(r=>r.text());assert.ok(h.includes(r.slug),r.slug+' profile');const form=await request('/yaz/'+r.slug+'/').then(r=>r.text());assert.ok(form.includes('Deneyim metni'),r.slug+' form');if(r.adresDuzeyi==='sokak'){assert.ok(h.includes('Konum yaklaşık; kapı numarası henüz doğrulanmadı.'));assert.ok(h.includes('Adres (sokak düzeyi)'));assert.ok(!h.includes('mapnik&amp;marker='));}});
check('218 profiles/forms/sitemap; 102 B1 warnings',true);
await request('/api/reviews/',{body:{},expected:401});await request('/api/reviews/',{body:{},headers:{Origin:'https://untrusted.invalid'},expected:403});
await request('/api/admin/db/',{body:{action:'seed-add-only',target:'production',confirm:'EVET',baselineCount:574,slugs:[...added]},expected:400});
check('Anonymous, cross-origin, wrong environment rejected',true);
const account=await admin('',{action:'medya-test-oturum',target:'preview',confirm:'EVET'});
assert.ok(account.cookieName&&account.cookieValue&&account.userId);
const cookie=account.cookieName+'='+account.cookieValue;
const me=await request('/api/auth/get-session/',{cookie}).then(r=>r.json());assert.equal(me.user?.id,account.userId);check('Prepared test session works; not Google OAuth',true);
const samples=[additions.find(r=>r.adresDuzeyi==='sokak'),additions.find(r=>r.ref.startsWith('isletme/')),additions.find(r=>r.adresDuzeyi!=='sokak'&&!r.ref.startsWith('isletme/'))];
for(const [i,r] of samples.entries()){
 const input={slug:r.slug,body:`Bu yalnız izole Preview yayın kontrolüdür. Gerçek ziyaret anlatımı değildir. Senaryo ${i}: ${r.name}.`,visitMonth:new Date().toISOString().slice(0,7),overall:8,ratings:{},returnIntent:'evet',disclosure:'none'};
 const response=await request('/api/reviews/',{body:input,cookie,expected:201});const saved=await response.json();const mine=await request('/api/me/reviews/?slug='+r.slug,{cookie}).then(r=>r.json());assert.ok(mine.reviews.some(x=>x.id===saved.id&&x.slug===r.slug));
}
check('Prepared-session reviews linked to A/OSM, A/business and B1',true);
const browser=await chromium.launch();
const failures=[];let screens=0;
for(const [width,height] of [[375,812],[390,844],[1440,1000]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue({headers:{...route.request().headers(),'x-vercel-protection-bypass':bypass,'x-gidenler-test':'1'}});return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>failures.push({width,message:e.message}));
 const fit=async label=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,label+' horizontal overflow');};
 await page.goto(origin+'/',{waitUntil:'networkidle'});await fit('home '+width);
 await page.getByRole('searchbox',{name:'Mekân, kategori veya semt ara',exact:true}).fill('Sultan Köşesi');await page.getByRole('searchbox',{name:'Mekân, kategori veya semt ara',exact:true}).press('Enter');
 await page.getByRole('link',{name:/^Sultan Köşesi Türk/}).click();await page.getByRole('heading',{name:'Sultan Köşesi',exact:true}).waitFor();
 assert.equal(await page.locator('[data-location-precision="street"]').count(),2);await fit('B1 '+width);
 const map=page.locator('iframe[title*="yaklaşık konum"]');assert.ok(!(await map.getAttribute('src')).includes('marker='));
 const addressLink=page.getByRole('link',{name:'Adresi haritada ara',exact:true});assert.ok((await addressLink.getAttribute('href')).includes('/maps/search/'));
 await page.goto(origin+'/mekan/sultan-kosesi-fatih/#bilgi',{waitUntil:'networkidle'});await page.screenshot({path:`evidence/b1-${width}.png`});screens++;
 await page.goto(origin+'/yaz/sultan-kosesi-fatih/',{waitUntil:'networkidle'});const draft='Türkçe taslak korunma kontrolü: çığ, öğün, ışık, şef. Bu gerçek bir ziyaret değildir. '.repeat(12);
 await page.getByRole('textbox',{name:'Deneyim metni',exact:true}).fill(draft);await page.locator('[data-otomatik-taslak]').waitFor({state:'visible'});await page.reload({waitUntil:'networkidle'});await expect(page.getByRole('textbox',{name:'Deneyim metni',exact:true})).toHaveValue(draft);await fit('draft '+width);
 await page.goto(origin+'/mekan/develi-samatya-fatih/',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Develi Samatya',exact:true}).waitFor();await fit('A '+width);
 assert.ok((await page.getByRole('link',{name:'Web sitesi ↗',exact:true}).getAttribute('href')).startsWith('https://www.develi1912.com/'));await page.screenshot({path:`evidence/a-${width}.png`});screens++;
 check('Browser '+width+' search/profile/map/form draft/reservation',true);await context.close();
}
const ctx=await browser.newContext({viewport:{width:390,height:844}});
await ctx.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue({headers:{...route.request().headers(),'x-vercel-protection-bypass':bypass,'x-gidenler-test':'1'}}):route.abort());
await ctx.addCookies([{name:account.cookieName,value:account.cookieValue,domain:plan.host,path:'/',httpOnly:true,secure:true,sameSite:'Lax'}]);
const p=await ctx.newPage();await p.goto(origin+'/benim/',{waitUntil:'networkidle'});await p.screenshot({path:'evidence/account-prepared-session.png'});screens++;
await p.goto(origin+'/sor/?q=Develi%20Samatya',{waitUntil:'networkidle'});await p.locator('[data-sor-kart="develi-samatya-fatih"]').waitFor({timeout:35000});await p.screenshot({path:'evidence/sor-develi.png'});screens++;
await ctx.close();await browser.close();assert.deepEqual(failures,[],'browser page errors');
const final=await admin();assert.equal(final.integrity.ok,true);assert.equal(final.integrity.present,792);
const evidence={sha,host:plan.host,env:final.env,dbFingerprint:final.db.fingerprint,productionFingerprint:'37811a6487ca5441',isolated:true,oldPreserved:574,added:218,catalog:792,b1:102,httpProfiles:218,httpForms:218,sitemapNew:218,appendReplay:true,preparedSessionReviews:3,realGoogleOAuth:false,widths:[375,390,1440],screenshots:screens,pageErrors:failures.length};
writeFileSync('evidence/result.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
