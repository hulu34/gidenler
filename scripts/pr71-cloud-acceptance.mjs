import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const plan=JSON.parse(readFileSync('scripts/pr71-cloud-target.json','utf8'));
const records=JSON.parse(readFileSync('scripts/pr71-cloud-records.json','utf8'));
assert.equal(plan.origin,'https://gidenler-qfg2kddui-hulu34.vercel.app');
assert.equal(plan.expectedSha,'153281398e5f40b8de6c360087089213d6d01aac');
assert.equal(plan.deploymentId,'AVHpd6iV7upXiFsLUj3iL7uWyG6W');
assert.equal(records.length,3);assert.equal(new Set(records.map(x=>x.slug)).size,3);
assert.ok(records.every(x=>x.categoryId==='cat.restaurant'&&x.kaliteSinifi==='A-konumsuz'));
const secret=process.env.VERCEL_BYPASS;assert.ok(secret,'Existing Preview access must be available');
const expectedHosts=['ep-proud-mud-ba4yqh9k.c-8.eu-central-1.aws.neon.tech','ep-proud-mud-ba4yqh9k-pooler.c-8.eu-central-1.aws.neon.tech'];
const fingerprints=expectedHosts.map(x=>createHash('sha256').update(x).digest('hex').slice(0,16));
const evidence={plan,at:new Date().toISOString(),seedRequests:0,sorRequests:0,productionWrites:0,stage:"preflight",browser:[],queries:[]};
mkdirSync('pr71-cloud-evidence',{recursive:true});
const save=()=>{writeFileSync('pr71-cloud-evidence/result.json',JSON.stringify(evidence,null,2));writeFileSync('pr71-cloud-evidence/public-summary.json',JSON.stringify({plan,stage:evidence.stage,preflight:evidence.preflight??null,lastRequest:evidence.lastRequest??null,failureLine:evidence.failureLine??null,at:evidence.at,seedRequests:evidence.seedRequests,sorRequests:evidence.sorRequests,productionWrites:0,browser:evidence.browser,queries:evidence.queries.map(q=>({mode:q.result.mode,reason:q.result.reason,model:q.result.model,items:q.result.items.map(v=>v.slug),notCuisines:q.result.understood.notCuisines,notFoods:q.result.understood.notFoods,drinks:q.result.understood.drinks})),completed:evidence.completed??false,error:evidence.completed===false?'acceptance_failed':null},null,2));};
async function request(path,body){
 assert.ok(path==='/api/health/'||path==='/api/sor/'||path==='/api/admin/db/'||path.startsWith('/api/admin/db/?rapor=profil&slug='));
 if(body&&path==='/api/admin/db/'){assert.equal(body.action,'seed-add-only');assert.equal(body.target,'preview');assert.equal(body.baselineCount,876);assert.deepEqual(body.slugs,records.map(x=>x.slug));assert.ok(++evidence.seedRequests<=2);}
 if(body&&path==='/api/sor/')assert.ok(++evidence.sorRequests<=3);
 const headers={'x-vercel-protection-bypass':secret,Origin:plan.origin,'sec-fetch-site':'same-origin',...(body?{'content-type':'application/json'}:{})};
 const r=await fetch(plan.origin+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});
 evidence.lastRequest={endpoint:path==='/api/sor/'?'sor':path==='/api/health/'?'health':path==='/api/admin/db/'?'admin':'known-profile',method:body?'POST':'GET',http:r.status};assert.equal(r.status,200,path+': HTTP '+r.status);return r.json();
}
let browser;
try{
 const status=await request('/api/sor/');const initial=await request('/api/admin/db/');
 evidence.preflight={sorPreview:status.env==='preview',aiConfigured:status.ai===true,dbIsolated:status.db==='yalitilmis',adminPreview:initial.env==='preview',writeGuard:initial.db?.writeGuard?.ok===true,expectedCompute:fingerprints.includes(initial.db?.fingerprint),knownCount:[876,879].includes(initial.integrity?.present),migrationsClean:['pending','drift','unknown'].every(k=>initial.migrations?.[k]?.length===0)};save();
 assert.equal(status.env,'preview');assert.equal(status.ai,true,'Real AI configuration required');assert.equal(status.db,'yalitilmis');assert.equal(initial.env,'preview');assert.equal(initial.db.writeGuard.ok,true);
 assert.ok(fingerprints.includes(initial.db.fingerprint),'Physical Preview compute fingerprint must match');assert.notEqual(initial.db.fingerprint,'37811a6487ca5441');
 assert.ok([876,879].includes(initial.integrity.present));assert.deepEqual(initial.migrations.pending,[]);assert.deepEqual(initial.migrations.drift,[]);assert.deepEqual(initial.migrations.unknown,[]);
 evidence.initial={status,admin:initial};evidence.health=await request('/api/health/');assert.equal(evidence.health.db,'ok');save();
 evidence.stage='append';save();
 const menemenBefore=await request('/api/admin/db/?rapor=profil&slug=menemen-besiktas');
 const body={action:'seed-add-only',confirm:'EVET',target:'preview',baselineCount:876,slugs:records.map(x=>x.slug)};
 const added=await request('/api/admin/db/',body);assert.equal(added.total,879);assert.equal(added.integrity.ok,true);evidence.append=added;save();
 const targetRead=async()=>{const out=[];for(const r of records)out.push(await request('/api/admin/db/?rapor=profil&slug='+r.slug));return out;};
 const first=await targetRead();const again=await request('/api/admin/db/',body);const second=await targetRead();
 assert.deepEqual(second,first,'Repeat must preserve new ids, fields, provenance counts and metadata');assert.equal(again.total,879);evidence.repeat={response:again,identical:true};
 assert.deepEqual(await request('/api/admin/db/?rapor=profil&slug=menemen-besiktas'),menemenBefore);
 const final=await request('/api/admin/db/');assert.equal(final.integrity.expected,879);assert.equal(final.integrity.present,879);assert.equal(final.integrity.ok,true);
 assert.equal(final.rollback.waves['23'].safe,true,'Target-only rollback must have no new user relations');
 for(const k of ['users','reviews'])assert.equal(final.rollback.migration[k],initial.rollback.migration[k]);evidence.final=final;save();
 evidence.stage='sitemap';save();
 const sitemapResponse=await fetch(plan.origin+'/sitemap.xml',{headers:{'x-vercel-protection-bypass':secret},redirect:'manual',signal:AbortSignal.timeout(30000)});assert.equal(sitemapResponse.status,200);const sitemap=await sitemapResponse.text();assert.ok(records.every(r=>sitemap.includes('/mekan/'+r.slug+'/')));evidence.sitemap={newThreeAll:true,urls:(sitemap.match(/<loc>/g)||[]).length};
 const require=createRequire(process.env.BROWSER_PACKAGE_JSON);const {chromium}=require('@playwright/test');browser=await chromium.launch({headless:true});
 for(const width of [1440,390]){evidence.stage='browser-'+width;save();
  const context=await browser.newContext({viewport:{width,height:960}});
  await context.route('**/*',async route=>{const headers={...route.request().headers()};delete headers['x-vercel-protection-bypass'];if(new URL(route.request().url()).origin===plan.origin)headers['x-vercel-protection-bypass']=secret;await route.continue({headers});});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const r of records){
   const response=await page.goto(plan.origin+'/mekan/'+r.slug+'/',{waitUntil:'networkidle'});assert.equal(response.status(),200);await page.getByRole('heading',{name:r.name,exact:true,level:1}).waitFor();
   await page.getByText('Bu mekânın harita noktası açık bir kaynakta henüz doğrulanmadı; yerini adresle ara.',{exact:true}).waitFor();
   assert.equal(await page.locator('iframe').count(),0);assert.ok(await page.getByText(r.address,{exact:true}).first().isVisible());
   const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width);
   evidence.browser.push({width,slug:r.slug,status:200,coordinateWarning:true,noOverflow:true});save();
  }
  await page.screenshot({path:`pr71-cloud-evidence/last-profile-${width}.png`,fullPage:false});
  await page.goto(plan.origin+'/',{waitUntil:'networkidle'});await page.getByText('844 gerçek mekân',{exact:true}).waitFor();
  await page.getByRole('searchbox',{name:'Mekân, kategori veya semt ara'}).fill('Monteverdi Ristorante');await page.getByRole('button',{name:'Monteverdi Ristorante Restoran · Beşiktaş',exact:true}).waitFor();
  await page.getByRole('button',{name:'Monteverdi Ristorante Restoran · Beşiktaş',exact:true}).click();await page.waitForURL(plan.origin+'/mekan/monteverdi-ristorante-besiktas/');
  await page.goto(plan.origin+'/yaz/monteverdi-ristorante-besiktas/',{waitUntil:'networkidle'});assert.ok((await page.locator('body').innerText()).includes('Monteverdi Ristorante'));
  await page.goto(plan.origin+'/mekan/menemen-besiktas/',{waitUntil:'networkidle'});await page.getByRole('region',{name:'Menü',exact:true}).waitFor();
  assert.equal(await page.locator('#menu li').count(),45,'Menemen must retain 45 archive items');
  const gallery=page.getByRole('region',{name:'Menemen fotoğrafları',exact:true});
  await gallery.getByRole('link',{name:/Tüm fotoğraflar/}).waitFor();
  const galleryLink=gallery.getByRole('link',{name:/Tüm fotoğraflar/});
  await galleryLink.waitFor();assert.equal(await galleryLink.getAttribute('href'),'/mekan/menemen-besiktas/fotograflar/');
  await page.getByRole('heading',{name:'Videolar 1',exact:true}).waitFor(); await galleryLink.click(); await page.getByRole('tab',{name:'Tümü 6',exact:true}).waitFor(); assert.equal(await page.getByRole('main').locator('img').count(),6);
  evidence.browser.push({width,menemen:{archiveItems:45,sourcePhotos:6,videos:1},search:'Monteverdi Ristorante',formTarget:'Monteverdi Ristorante'});
  assert.deepEqual(errors,[]);await page.screenshot({path:`pr71-cloud-evidence/menemen-${width}.png`,fullPage:false});await context.close();save();
 }
 evidence.stage='real-ai';save();
 for(const query of ['En yüksek puanlı restoran hangisi?','Balık sevmiyor, kırmızı et yemiyor ve sadece viski içiyor. Sevgililik ay dönümü için nereye gidelim?'])evidence.queries.push({query,result:await request('/api/sor/',{query})});
 assert.equal(evidence.queries[0].result.understood.name,null);const negative=evidence.queries[1].result;assert.equal(negative.items.length,0);assert.ok(negative.understood.notCuisines.includes('balik'));assert.ok(negative.understood.notFoods.includes('kirmizi-et'));assert.ok(negative.understood.drinks.includes('viski'));
 const previous=evidence.queries[1].result; const followup=await request('/api/sor/',{query:'Balık sevmiyor dedim, neden balık önerdin?',context:previous.context}); evidence.queries.push({query:'Balık sevmiyor dedim, neden balık önerdin?',result:followup}); assert.equal(followup.items.length,0); assert.ok(followup.understood.notCuisines.includes('balik')); assert.ok(followup.understood.notFoods.includes('kirmizi-et')); assert.ok(followup.understood.drinks.includes('viski'));
 assert.ok(evidence.queries.some(q=>q.result.mode==='ai'&&q.result.model),'At least one real model response required; fallback is not AI acceptance'); evidence.completed=true;save();console.log(JSON.stringify({completed:true,profiles:evidence.browser.length,seedRequests:evidence.seedRequests,sorRequests:evidence.sorRequests,db:'isolated879',productionWrites:0}));
}catch(e){evidence.completed=false;evidence.failureLine=e.stack?.match(/pr71-cloud-acceptance\.mjs:(\d+)/)?.[1]??null;evidence.error=e.message;save();console.error(JSON.stringify({error:'acceptance_failed',stage:evidence.stage}));process.exitCode=1;}finally{await browser?.close();}
