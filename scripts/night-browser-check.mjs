import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(process.env.NIGHT_BROWSER_PACKAGE_JSON);
const {chromium,webkit,expect}=require('@playwright/test');
const origin='http://localhost:3150';
const db=new URL(process.env.DATABASE_URL??'');assert.ok(['localhost','127.0.0.1'].includes(db.hostname)&&db.pathname==='/gidenler_night'&&process.env.GIDENLER_ISOLATED_TEST_DB==='night-25'&&process.env.VERCEL_ENV!=='production');
mkdirSync('night-evidence',{recursive:true});const errors=[],rows=[];
const profiles=[['chromium',375],['chromium',390],['chromium',1440],['webkit',390]];
for(const [profileIndex,[engine,width]] of profiles.entries()){
  const browser=await({chromium,webkit}[engine]).launch();const context=await browser.newContext({viewport:{width,height:width<600?844:1000},isMobile:width<600,hasTouch:width<600,extraHTTPHeaders:{"x-forwarded-for":`192.0.2.${profileIndex+1}`}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const p=await context.newPage();p.on('pageerror',e=>errors.push({engine,width,message:e.message}));p.on('response',r=>{if(r.url().includes('/api/sor/')&&r.status()!==200)console.error('Sor response',engine,width,r.status());});
  const fit=async()=>assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'horizontal overflow');
  await p.goto(origin+'/sor/?q=Develi%20Samatya',{waitUntil:'networkidle'});
  await p.locator('[data-sor-kart="develi-samatya-fatih"]').waitFor();await p.locator('[data-sor-mod="ai"]').waitFor();
  assert.equal(await p.locator('[data-sor-kart]').count(),1);assert.equal(await p.getByText('Anladığım: Üsküdar',{exact:true}).count(),0);await fit();
  await p.screenshot({path:`night-evidence/sor-${engine}-${width}.png`});
  await p.reload({waitUntil:'networkidle'});await p.locator('[data-sor-kart="develi-samatya-fatih"]').waitFor();assert.equal(await p.getByText('Anladığım: Üsküdar',{exact:true}).count(),0);
  await p.goto(origin+'/sor/?q='+encodeURIComponent("Üsküdar'da Develi Samatya'ya alternatif kebapçı öner"),{waitUntil:'networkidle'});
  await p.locator('[data-sor-kart]').first().waitFor();assert.equal(await p.locator('[data-sor-kart="develi-samatya-fatih"]').count(),0);await expect(p.getByText('Anladığım: Üsküdar · kebap',{exact:true})).toBeVisible();
  const actual="9. ay sevgililik ayı kutlamasına gidecem. erkek arkadasımla. balık sevmiyor kırmızı et yemiyor ve sadece viski içiyor. onu nereye goturebilirim";
  await p.goto(origin+'/sor/?q='+encodeURIComponent(actual),{waitUntil:'networkidle'});
  await expect(p.getByText('Bu kriterlerin tamamına uyan doğrulanmış mekân bulamadım.',{exact:false})).toBeVisible();
  assert.equal(await p.locator('[data-sor-kart]').count(),0);
  await expect(p.getByText(/Anladığım:.*balık olmasın.*kırmızı et olmasın.*viski.*özel gün/)).toBeVisible();
  assert.equal(await p.getByText(/Anladığım:.*gösterişsiz/).count(),0);await fit();
  await p.getByRole('textbox',{name:'Sorun',exact:true}).fill('Balık sevmiyor dedim, neden balık önerdin?');
  await p.getByRole('button',{name:'Sor',exact:true}).click();
  await expect(p.locator('[data-sor-tur]').last().getByText(/Anladığım:.*kırmızı et olmasın.*viski.*özel gün/)).toBeVisible();
  assert.equal(await p.locator('[data-sor-kart]').count(),0);await fit();
  await p.screenshot({path:`night-evidence/preferences-${engine}-${width}.png`});
  await p.reload({waitUntil:'networkidle'});await expect(p.getByText(/Anladığım:.*viski/)).toBeVisible();
  // Reload replays only the URL question, never the prior tab's history.
  assert.equal(await p.locator('[data-sor-tur]').count(),1);
  await p.goto(origin+'/mekan/sultan-kosesi-fatih/#bilgi',{waitUntil:'networkidle'});assert.equal(await p.locator('[data-location-precision="street"]').count(),2);assert.ok(!(await p.locator('iframe[title*="yaklaşık konum"]').getAttribute('src')).includes('marker='));await fit();
  await p.goto(origin+'/yaz/sultan-kosesi-fatih/',{waitUntil:'networkidle'});const draft='Türkçe taslak kontrolü: çığ, öğün, ışık, şef, İstanbul. '.repeat(100);
  await p.getByRole('textbox',{name:'Deneyim metni',exact:true}).fill(draft);await p.locator('[data-otomatik-taslak]').waitFor();await p.reload({waitUntil:'networkidle'});await expect(p.getByRole('textbox',{name:'Deneyim metni',exact:true})).toHaveValue(draft);await fit();
  await p.goto(origin+'/mekan/develi-samatya-fatih/',{waitUntil:'networkidle'});assert.ok((await p.getByRole('link',{name:'Web sitesi ↗',exact:true}).getAttribute('href')).startsWith('https://www.develi1912.com/'));await fit();
  rows.push({engine,width,controlledAi:true,wrongDistrictRejected:true,explicitAlternativeDistrict:true,negativePreferences:true,correctionPreserved:true,whiskyUnverifiedNoCards:true,conversationReloadIsolation:true,reload:true,turkishDraftChars:draft.length,b1Map:true,externalWebsiteLink:true});await browser.close();console.log('PASS browser',engine,width);
}
// Reserved documentation IPs isolate simulated clients; application limits are unchanged.
// Explicitly prove the thirteenth request is still rejected, while a separate client remains usable.
const limitBrowser=await chromium.launch();
const limitClient=await limitBrowser.newContext({extraHTTPHeaders:{'x-forwarded-for':'198.51.100.55'}});
const rateStatuses=[];
const minuteOffset=Date.now()%60000;if(minuteOffset>50000)await new Promise(resolve=>setTimeout(resolve,60100-minuteOffset));
for(let n=0;n<13;n++){const r=await limitClient.request.post(origin+'/api/sor/',{data:{query:'Develi Samatya'}});rateStatuses.push(r.status());}
assert.ok(rateStatuses.slice(0,12).every(s=>s===200));assert.equal(rateStatuses[12],429);
const separateClient=await limitBrowser.newContext({extraHTTPHeaders:{'x-forwarded-for':'198.51.100.56'}});
assert.equal((await separateClient.request.post(origin+'/api/sor/',{data:{query:'Develi Samatya'}})).status(),200);
rows.push({rateLimitUnchanged:true,rateStatuses,separateClientUnaffected:true});await limitBrowser.close();

// Instagram UA is simulated Chromium; it is not a physical Instagram browser.
const browser=await chromium.launch();const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 390.0'});
await c.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());const p=await c.newPage();p.on('pageerror',e=>errors.push({engine:'instagram-ua',message:e.message}));
await p.goto(origin+'/yaz/ciya-sofrasi-kadikoy/',{waitUntil:'networkidle'});await p.getByRole('textbox',{name:'Deneyim metni',exact:true}).fill('Instagram simülasyonunda Türkçe deneyim taslağı korunuyor; gerçek ziyaret değildir.');await p.locator('[data-otomatik-taslak]').waitFor();assert.ok(new URL(p.url()).hash.length>20);await p.screenshot({path:'night-evidence/instagram-simulation.png'});await browser.close();
assert.deepEqual(errors,[]);writeFileSync('night-evidence/result.json',JSON.stringify({sha:process.env.GITHUB_SHA??'local-uncommitted',environment:'isolated-local-postgres',controlledAi:true,realModelCalls:0,productionWrites:0,physicalPhone:false,realGoogleOAuth:false,rows,instagramUaSimulation:true,errors},null,2));
