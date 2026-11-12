import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const require=createRequire(process.env.HOSTED_BROWSER_PACKAGE_JSON);
const {chromium,webkit,expect}=require('@playwright/test');
const origin='https://gidenler-6an65m3je-hulu34.vercel.app';
const sha='1e5670453d2897ded4466954fd872089a6487a0d';
const out='hosted-preview-evidence'; mkdirSync(out,{recursive:true});
assert.equal(execFileSync('git',['-C','../candidate','rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
assert.ok(process.env.VERCEL_BYPASS,'Existing repository automation secret is required');
assert.ok(!process.env.DATABASE_URL&&!process.env.DATABASE_URL_UNPOOLED,'Runner must not receive a database credential');
const headers={'x-vercel-protection-bypass':process.env.VERCEL_BYPASS};
const evidence={sha,preview:origin,environment:'actual-protected-vercel-preview',mockedProvider:false,productionWrites:0,physicalPhone:false,realGoogleOAuth:false,api:[],browser:[],errors:[]};
let lastSor=0;
async function pace(){const wait=6500-(Date.now()-lastSor);if(wait>0)await delay(wait);lastSor=Date.now();}
async function request(path,options={}){
 assert.ok(path.startsWith('/')&&!path.startsWith('//'));
 if(path==='/api/sor/'&&options.method==='POST')await pace();
 return fetch(origin+path,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(45000)});
}
async function json(path,options){const r=await request(path,options);assert.equal(r.status,200,`${path}: ${r.status}`);return r.json();}
const save=()=>writeFileSync(out+'/result.json',JSON.stringify(evidence,null,2));
const allCards=r=>[...r.items,...r.alternatives];
const noFish=r=>assert.ok(allCards(r).every(v=>v.kind!=='Balık restoranı'&&!/bal[iı]k/i.test(v.name)),'Fish escaped exclusion');
const actual='9. ay sevgililik ayı kutlamasına gidecem. erkek arkadasımla. balık sevmiyor kırmızı et yemiyor ve sadece viski içiyor. onu nereye goturebilirim';
function fullPreferences(r){assert.ok(r.understood.notCuisines.includes('balik'));assert.deepEqual(r.understood.notFoods,['kirmizi-et']);assert.deepEqual(r.understood.drinks,['viski']);assert.equal(r.understood.occasion,'ozel-gun');assert.deepEqual(r.understood.attrs,[]);assert.equal(allCards(r).length,0);assert.match(r.note??'',/doğrulanmış mekân bulamadım/);}
async function ask(query,previous){const r=await json('/api/sor/',{method:'POST',headers:{'Content-Type':'application/json','Sec-Fetch-Site':'same-origin',Origin:origin},body:JSON.stringify({query,context:previous?.context??null,shown:previous?.shown??[]})});evidence.api.push({query,...r});save();return r;}
try {
 const status=await json('/api/sor/');evidence.runtime=status;save();
 assert.equal(status.env,'preview');assert.equal(status.db,'yalitilmis');assert.equal(status.yalnizUcretsiz,true,'Do not run potentially paid AI');
 const db=await json('/api/admin/db/');evidence.database=db;save();
 assert.equal(db.env,'preview');assert.equal(db.db?.writeGuard?.ok,true);assert.ok(db.db.fingerprint);assert.deepEqual(db.migrations.pending,[]);assert.deepEqual(db.migrations.drift,[]);assert.deepEqual(db.migrations.unknown,[]);assert.equal(db.integrity?.ok,true);assert.equal(db.integrity.present,793);
 const first=await ask(actual);fullPreferences(first);
 fullPreferences(await ask('Balık sevmiyor dedim, neden balık önerdin?',first));
 const cases=['Balık seviyorum','Balık sevmiyorum','Balık restoranı istemiyorum','Balık yemeyen sevgilimle nereye gidelim?','Balık sevmiyor, kırmızı et yemiyor','Balık sevmiyor dedim, neden balık önerdin?','Balık seviyorum ama sevgilim sevmiyor','Romantik, viski içebileceğimiz bir yer arıyorum'];
 for(const [n,q] of cases.entries()){
  const r=await ask(q);
  if(n===0){assert.equal(r.understood.cuisine,'balik');assert.ok(r.items.length);assert.ok(!r.understood.notCuisines.includes('balik'));assert.deepEqual(r.understood.drinks,[]);}
  else if(n<7){assert.ok(r.understood.notCuisines.includes('balik'));assert.notEqual(r.understood.cuisine,'balik');noFish(r);}
  if(n===4)assert.deepEqual(r.understood.notFoods,['kirmizi-et']);
  if(n===7){assert.ok(r.understood.attrs.includes('romantik'));assert.deepEqual(r.understood.drinks,['viski']);assert.equal(allCards(r).length,0);}
  assert.ok(!r.understood.attrs.includes('gosterissiz'));
 }
 const district=await ask('Develi Samatya');assert.deepEqual(district.items.map(v=>v.slug),['develi-samatya-fatih']);assert.notEqual(district.understood.area,'Üsküdar');
 const alternative=await ask("Üsküdar'da Develi Samatya'ya alternatif kebapçı öner");assert.equal(alternative.understood.area,'Üsküdar');assert.ok(alternative.items.length);assert.ok(alternative.items.every(v=>v.district==='Üsküdar'));
 const continued=await ask("Kadıköy'de pizza olsun",first);assert.deepEqual(continued.understood.notFoods,['kirmizi-et']);assert.deepEqual(continued.understood.drinks,['viski']);noFish(continued);
 const anon=await request('/api/reviews/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(anon.status,401);
 const csrf=await request('/api/reviews/',{method:'POST',headers:{Origin:'https://untrusted.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);
 const badSor=await request('/api/sor/',{method:'POST',headers:{'Content-Type':'application/json','Sec-Fetch-Site':'cross-site'},body:JSON.stringify({query:'Balık seviyorum'})});assert.equal(badSor.status,403);
 const wrongTarget=await request('/api/admin/db/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Sec-Fetch-Site':'same-origin'},body:JSON.stringify({action:'seed-add-only',target:'production',confirm:'EVET'})});assert.equal(wrongTarget.status,400);
 evidence.security={anonymousReview:401,crossOriginReview:403,crossSiteSor:403,wrongTargetRejected:400};
 const sitemap=await request('/sitemap.xml');assert.equal(sitemap.status,200);const xml=await sitemap.text();
 const catalog=[...JSON.parse(readFileSync('../candidate/data/real/venues.json')),...JSON.parse(readFileSync('../candidate/data/real/isletme.json'))];
 assert.equal(catalog.length,793);for(const v of catalog)assert.ok(xml.includes('/mekan/'+v.slug+'/'),v.slug+' sitemap');
 evidence.sitemap={catalog:catalog.length,allPresent:true};save();
 for(const [engine,width] of [['chromium',375],['chromium',390],['chromium',1440],['webkit',390]]){
  const browser=await({chromium,webkit}[engine]).launch();const c=await browser.newContext({viewport:{width,height:width<600?844:1000},isMobile:width<600,hasTouch:width<600});
  await c.route('**/*',async route=>{const req=route.request();if(new URL(req.url()).origin!==origin)return route.abort();if(req.method()==='POST'&&new URL(req.url()).pathname==='/api/sor/')await pace();return route.continue({headers:{...req.headers(),...headers}});});
  const p=await c.newPage();p.on('pageerror',e=>evidence.errors.push({engine,width,message:e.message}));
  const fit=async()=>assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'horizontal overflow');
  async function waitTurn(n){await expect(p.locator('[data-sor-tur]')).toHaveCount(n);await expect(p.locator('[data-sor-tur]').last().locator('[data-sor-mod]')).toBeVisible({timeout:45000});}
  await p.goto(origin+'/sor/?q='+encodeURIComponent(actual),{waitUntil:'domcontentloaded'});await waitTurn(1);
  await expect(p.getByText(/Anladığım:.*balık olmasın.*kırmızı et olmasın.*viski.*özel gün/)).toBeVisible();assert.equal(await p.locator('[data-sor-kart]').count(),0);await fit();
  await p.getByRole('textbox',{name:'Sorun',exact:true}).fill('Balık sevmiyor dedim, neden balık önerdin?');await p.getByRole('button',{name:'Sor',exact:true}).click();await waitTurn(2);
  await expect(p.locator('[data-sor-tur]').last().getByText(/Anladığım:.*kırmızı et olmasın.*viski.*özel gün/)).toBeVisible();assert.equal(await p.locator('[data-sor-kart]').count(),0);assert.equal(await p.getByText(/Anladığım:.*gösterişsiz/).count(),0);await fit();
  await p.screenshot({path:`${out}/negative-${engine}-${width}.png`,fullPage:true});
  await p.reload({waitUntil:'domcontentloaded'});await waitTurn(1);assert.equal(await p.locator('[data-sor-tur]').count(),1);
  await p.goto(origin+'/sor/?q='+encodeURIComponent('Balık seviyorum'),{waitUntil:'domcontentloaded'});await waitTurn(1);assert.ok(await p.locator('[data-sor-kart]').count());assert.equal(await p.getByText(/Anladığım:.*viski/).count(),0);
  await p.goto(origin+'/mekan/sultan-kosesi-fatih/#bilgi',{waitUntil:'domcontentloaded'});await expect(p.locator('[data-location-precision="street"]').first()).toBeVisible();assert.equal(await p.locator('[data-location-precision="street"]').count(),2);assert.ok(!(await p.locator('iframe[title*="yaklaşık konum"]').getAttribute('src')).includes('marker='));await fit();
  await p.goto(origin+'/yaz/sultan-kosesi-fatih/',{waitUntil:'domcontentloaded'});const draft='Türkçe taslak kontrolü: çığ, öğün, ışık, şef, İstanbul. '.repeat(100);await p.getByRole('textbox',{name:'Deneyim metni',exact:true}).fill(draft);await p.locator('[data-otomatik-taslak]').waitFor();await p.reload({waitUntil:'domcontentloaded'});await expect(p.getByRole('textbox',{name:'Deneyim metni',exact:true})).toHaveValue(draft);await fit();
  await p.goto(origin+'/mekan/develi-samatya-fatih/',{waitUntil:'domcontentloaded'});assert.ok((await p.getByRole('link',{name:'Web sitesi ↗',exact:true}).getAttribute('href')).startsWith('https://www.develi1912.com/'));await fit();
  await p.screenshot({path:`${out}/profile-${engine}-${width}.png`,fullPage:true});
  evidence.browser.push({engine,width,negativePreferences:true,correctionPreserved:true,reloadIsolation:true,newConversationIsolation:true,positiveFish:true,b1Map:true,turkishDraftChars:draft.length,externalWebsite:true,overflow:false});save();await browser.close();
 }
 assert.deepEqual(evidence.errors,[]);
 evidence.realAiResponses=evidence.api.filter(r=>r.mode==='ai').length;evidence.actualFallbackResponses=evidence.api.filter(r=>r.mode==='veri').length;
 evidence.complete=true;save();console.log(JSON.stringify({sha,preview:origin,api:evidence.api.length,browser:evidence.browser.length,realAiResponses:evidence.realAiResponses,actualFallbackResponses:evidence.actualFallbackResponses,productionWrites:0}));
}catch(e){evidence.complete=false;evidence.failure=e instanceof Error?e.message:String(e);save();throw e;}
