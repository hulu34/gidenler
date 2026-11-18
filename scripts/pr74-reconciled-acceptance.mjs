import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const plan=JSON.parse(readFileSync('scripts/pr74-reconciled-target.json','utf8'));
const records=JSON.parse(readFileSync('scripts/pr74-reconciled-records.json','utf8'));
assert.equal(plan.origin,'https://gidenler-2pmtsehif-hulu34.vercel.app');
assert.equal(plan.expectedSha,'9a2f2f482b65709e862397911438d99b06230e2c');
assert.equal(plan.deploymentId,'FrjcEjxLspDwZf5Zf9uN5bn9hTkA');
assert.equal(records.length,8);assert.equal(new Set(records.map(x=>x.slug)).size,8);
assert.ok(records.every(x=>x.categoryId==='cat.restaurant'&&x.kaliteSinifi==='A-konumsuz'));
const secret=process.env.VERCEL_BYPASS;assert.ok(secret,'Existing Preview access must be available');
const expectedHosts=['ep-proud-mud-ba4yqh9k.c-8.eu-central-1.aws.neon.tech','ep-proud-mud-ba4yqh9k-pooler.c-8.eu-central-1.aws.neon.tech'];
const fingerprints=expectedHosts.map(x=>createHash('sha256').update(x).digest('hex').slice(0,16));
const evidence={plan,at:new Date().toISOString(),seedRequests:0,sorRequests:0,productionWrites:0,stage:"preflight",browser:[],queries:[]};
mkdirSync('pr74-reconciled-evidence',{recursive:true});
const save=()=>{writeFileSync('pr74-reconciled-evidence/public-summary.json',JSON.stringify({plan,stage:evidence.stage,preflight:evidence.preflight??null,lastRequest:evidence.lastRequest??null,failureLine:evidence.failureLine??null,at:evidence.at,initialCount:evidence.initialCount??null,seedRequests:evidence.seedRequests,sorRequests:evidence.sorRequests,productionWrites:0,append:evidence.append?{baseline:884,total:evidence.append.total,integrity:evidence.append.integrity?.ok===true}:null,firstRepeatIdentical:evidence.firstRepeatIdentical??false,repeat:evidence.repeat?{total:evidence.repeat.response.total,identical:evidence.repeat.identical}:null,final:evidence.final?{expected:evidence.final.integrity.expected,present:evidence.final.integrity.present,integrity:evidence.final.integrity.ok,rollbackSafe:evidence.final.rollback.waves['25'].safe}:null,health:evidence.health?{db:evidence.health.db}:null,sitemap:evidence.sitemap??null,browser:evidence.browser,queries:evidence.queries.map(q=>({mode:q.result.mode,reason:q.result.reason,model:q.result.model,items:q.result.items.map(v=>v.slug),name:q.result.understood.name,notCuisines:q.result.understood.notCuisines,notFoods:q.result.understood.notFoods,drinks:q.result.understood.drinks})),completed:evidence.completed??false,error:evidence.completed===false?'acceptance_failed':null},null,2));};
async function request(path,body){
 assert.ok(path==='/api/health/'||path==='/api/sor/'||path==='/api/admin/db/'||records.map(r=>'/api/admin/db/?rapor=profil&slug='+r.slug).concat('/api/admin/db/?rapor=profil&slug=menemen-besiktas').includes(path));
 if(body&&path==='/api/admin/db/'){assert.equal(body.action,'seed-add-only');assert.equal(body.target,'preview');assert.equal(body.baselineCount,884);assert.deepEqual(body.slugs,records.map(x=>x.slug));assert.ok(++evidence.seedRequests<=2);}
 if(body&&path==='/api/sor/')assert.ok(++evidence.sorRequests<=3);
 const headers={'x-vercel-protection-bypass':secret,Origin:plan.origin,'sec-fetch-site':'same-origin',...(body?{'content-type':'application/json'}:{})};
 const r=await fetch(plan.origin+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});
 evidence.lastRequest={endpoint:path==='/api/sor/'?'sor':path==='/api/health/'?'health':path==='/api/admin/db/'?'admin':'known-profile',method:body?'POST':'GET',http:r.status};assert.equal(r.status,200,path+': HTTP '+r.status);return r.json();
}

const categories=[{slug:'my-home-doner-fatih',name:'My Home Döner',kind:'Dönerci'},{slug:'massa-bistro-turkish-kitchen-fatih',name:'Massa Bistro Turkish Kitchen',kind:'Türk mutfağı'},{slug:'isil-garden-rooftop-restaurant-ve-turkish-cuisine-fatih',name:'Işıl Garden Rooftop Restaurant & Turkish Cuisine',kind:'Türk mutfağı'}];
const blockedProfiles=[{slug:'nezih-kebap-yuvalama-sariyer',name:'Nezih Kebap-Yuvalama'},{slug:'takanik-balik-park-sariyer',name:'Takanik Balık Park'},{slug:'gelik-et-atakoy-istanbul-bakirkoy',name:'Gelik ET Ataköy Istanbul'},{slug:'kucuk-ev-sariyer',name:'Küçük Ev'}];
const blockedHosts=['nezihkebap.com','takanik.com.tr','gelik.com.tr','kucukev.com'];
const isBlocked=value=>{try{const h=new URL(value).hostname.toLowerCase().replace(/\.$/,'');return blockedHosts.some(x=>h===x||h.endsWith('.'+x));}catch{return false;}};

let browser;
try{
 const status=await request('/api/sor/');const initial=await request('/api/admin/db/');
 evidence.preflight={sorPreview:status.env==='preview',aiConfigured:status.ai===true,dbIsolated:status.db==='yalitilmis',adminPreview:initial.env==='preview',writeGuard:initial.db?.writeGuard?.ok===true,expectedCompute:fingerprints.includes(initial.db?.fingerprint),knownCount:initial.integrity?.present===892,migrationsClean:['pending','drift','unknown'].every(k=>initial.migrations?.[k]?.length===0)};save();
 assert.equal(status.env,'preview');assert.equal(status.ai,true,'Real AI configuration required');assert.equal(status.db,'yalitilmis');assert.equal(initial.env,'preview');assert.equal(initial.db.writeGuard.ok,true);
 assert.ok(fingerprints.includes(initial.db.fingerprint),'Physical Preview compute fingerprint must match');assert.notEqual(initial.db.fingerprint,'37811a6487ca5441');
 assert.equal(initial.integrity.present,892,'Existing892records must be preserved');assert.deepEqual(initial.migrations.pending,[]);assert.deepEqual(initial.migrations.drift,[]);assert.deepEqual(initial.migrations.unknown,[]);
 evidence.initialCount=initial.integrity.present;evidence.initial={status,admin:initial};evidence.health=await request('/api/health/');assert.equal(evidence.health.db,'ok');save();
 evidence.stage='append';save();
 const menemenBefore=await request('/api/admin/db/?rapor=profil&slug=menemen-besiktas');
 const body={action:'seed-add-only',confirm:'EVET',target:'preview',baselineCount:884,slugs:records.map(x=>x.slug)};
 const targetBefore=[];for(const r of records)targetBefore.push(await request('/api/admin/db/?rapor=profil&slug='+r.slug));
 const added=await request('/api/admin/db/',body);assert.equal(added.total,892);assert.equal(added.integrity.ok,true);evidence.append=added;save();
 const targetRead=async()=>{const out=[];for(const r of records)out.push(await request('/api/admin/db/?rapor=profil&slug='+r.slug));return out;};
 const first=await targetRead();assert.deepEqual(first,targetBefore,'First reapplication must be a complete no-op');evidence.firstRepeatIdentical=true;const again=await request('/api/admin/db/',body);const second=await targetRead();
 assert.deepEqual(second,first,'Repeat must preserve new ids, fields, provenance counts and metadata');assert.equal(again.total,892);evidence.repeat={response:again,identical:true};
 assert.deepEqual(await request('/api/admin/db/?rapor=profil&slug=menemen-besiktas'),menemenBefore);
 const final=await request('/api/admin/db/');assert.equal(final.integrity.expected,892);assert.equal(final.integrity.present,892);assert.equal(final.integrity.ok,true);
 assert.equal(final.rollback.waves['25'].safe,true,'Target-only rollback must have no new user relations');
 for(const k of ['users','reviews'])assert.equal(final.rollback.migration[k],initial.rollback.migration[k]);evidence.final=final;save();
 evidence.stage='sitemap';save();
 const sitemapResponse=await fetch(plan.origin+'/sitemap.xml',{headers:{'x-vercel-protection-bypass':secret},redirect:'manual',signal:AbortSignal.timeout(30000)});assert.equal(sitemapResponse.status,200);const sitemap=await sitemapResponse.text();assert.ok(records.every(r=>sitemap.includes('/mekan/'+r.slug+'/')));evidence.sitemap={newEightAll:true,urls:(sitemap.match(/<loc>/g)||[]).length};
 const require=createRequire(process.env.BROWSER_PACKAGE_JSON);const {chromium}=require('@playwright/test');browser=await chromium.launch({headless:true});
 for(const width of [1440,390]){evidence.stage='browser-'+width;save();
  const context=await browser.newContext({viewport:{width,height:960}});
  await context.route('**/*',async route=>{const headers={...route.request().headers()};delete headers['x-vercel-protection-bypass'];if(isBlocked(route.request().url()))return route.abort();if(new URL(route.request().url()).origin===plan.origin)headers['x-vercel-protection-bypass']=secret;await route.continue({headers});});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const r of records){
   const response=await page.goto(plan.origin+'/mekan/'+r.slug+'/',{waitUntil:'networkidle'});assert.equal(response.status(),200);await page.getByRole('heading',{name:r.name,exact:true,level:1}).waitFor();
   await page.getByText('Bu mekânın harita noktası açık bir kaynakta henüz doğrulanmadı; yerini adresle ara.',{exact:true}).waitFor();
   assert.equal(await page.locator('iframe').count(),0);assert.ok(await page.getByText(r.address,{exact:true}).first().isVisible());
   const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width);
   await page.screenshot({path:`pr74-reconciled-evidence/${r.slug}-${width}.png`,fullPage:false}); evidence.browser.push({width,slug:r.slug,status:200,coordinateWarning:true,noOverflow:true});save();
  }
  await page.screenshot({path:`pr74-reconciled-evidence/last-profile-${width}.png`,fullPage:false});
  for(const r of categories){const response=await page.goto(plan.origin+'/mekan/'+r.slug+'/',{waitUntil:'networkidle'});assert.equal(response.status(),200);await page.getByRole('heading',{name:r.name,exact:true,level:1}).waitFor();const types=await page.locator('dl > div').filter({has:page.locator('dt').filter({hasText:/^Tür$/})}).locator('dd').allTextContents();assert.ok(types.length>0&&types.every(x=>x.trim()===r.kind),'Exact approved category must render');assert.ok((await page.getByRole('main').innerText()).includes(r.name));evidence.browser.push({width,category:r.slug,kind:r.kind,status:200});await page.screenshot({path:`pr74-reconciled-evidence/category-${r.slug}-${width}.png`,fullPage:false});save();}
  for(const r of blockedProfiles){const response=await page.goto(plan.origin+'/mekan/'+r.slug+'/',{waitUntil:'networkidle'});assert.equal(response.status(),200);await page.getByRole('heading',{name:r.name,exact:true,level:1}).waitFor();const hrefs=await page.locator('a[href]').evaluateAll(a=>a.map(x=>x.href));assert.ok(hrefs.every(x=>!isBlocked(x)),'No compromised host may be linked');if(r.slug==='kucuk-ev-sariyer')assert.ok(hrefs.some(x=>x==='tel:+902123411500'),'Existing phone remains');evidence.browser.push({width,blockedProfile:r.slug,blockedHostsAbsent:true,status:200});await page.screenshot({path:`pr74-reconciled-evidence/safe-${r.slug}-${width}.png`,fullPage:false});save();}

  await page.goto(plan.origin+'/',{waitUntil:'networkidle'});await page.getByText('857 gerçek mekân',{exact:true}).waitFor();
  await page.getByRole('searchbox',{name:'Mekân, kategori veya semt ara'}).fill('Bcante');await page.getByRole('button',{name:'Bcante Restoran · Beşiktaş',exact:true}).waitFor();
  await page.getByRole('button',{name:'Bcante Restoran · Beşiktaş',exact:true}).click();await page.waitForURL(plan.origin+'/mekan/bcante-besiktas/');
  await page.goto(plan.origin+'/yaz/bcante-besiktas/',{waitUntil:'networkidle'});assert.ok((await page.locator('body').innerText()).includes('Bcante'));
  await page.goto(plan.origin+'/mekan/menemen-besiktas/',{waitUntil:'networkidle'});await page.getByRole('region',{name:'Menü',exact:true}).waitFor();
  assert.equal(await page.locator('#menu li').count(),45,'Menemen must retain 45 archive items');
  const gallery=page.getByRole('region',{name:'Menemen fotoğrafları',exact:true});
  await gallery.getByRole('link',{name:/Tüm fotoğraflar/}).waitFor();
  const galleryLink=gallery.getByRole('link',{name:/Tüm fotoğraflar/});
  await galleryLink.waitFor();assert.equal(await galleryLink.getAttribute('href'),'/mekan/menemen-besiktas/fotograflar/');
  await page.getByRole('heading',{name:'Videolar 1',exact:true}).waitFor(); await galleryLink.click(); await page.getByRole('tab',{name:'Tümü 6',exact:true}).waitFor(); assert.equal(await page.getByRole('main').locator('img').count(),6); await page.waitForFunction(()=>Array.from(document.querySelector('main').querySelectorAll('img')).every(img=>img.complete&&img.naturalWidth>0));
  evidence.browser.push({width,menemen:{archiveItems:45,sourcePhotos:6,videos:1},search:'Bcante',formTarget:'Bcante'});
  assert.deepEqual(errors,[]);await page.screenshot({path:`pr74-reconciled-evidence/menemen-${width}.png`,fullPage:false});await context.close();save();
 }
 evidence.stage='real-ai';save();
 for(const query of ['En yüksek puanlı restoran hangisi?','Deniz ürünleri istemiyorum, kırmızı et yemiyorum ve sadece viski içiyorum. Sevgililik ay dönümü için nereye gidelim?'])evidence.queries.push({query,result:await request('/api/sor/',{query})});
 assert.equal(evidence.queries[0].result.understood.name,null);const negative=evidence.queries[1].result;assert.equal(negative.understood.name,null,'Seafood category is not Deniz Park');assert.equal(negative.items.length,0);assert.ok(negative.understood.notCuisines.includes('balik'));assert.ok(negative.understood.notFoods.includes('kirmizi-et'));assert.ok(negative.understood.drinks.includes('viski'));
 const previous=evidence.queries[1].result; const followup=await request('/api/sor/',{query:'Deniz ürünleri istemiyorum dedim, neden balık önerdin?',context:previous.context}); evidence.queries.push({query:'Deniz ürünleri istemiyorum dedim, neden balık önerdin?',result:followup}); assert.equal(followup.understood.name,null);assert.equal(followup.items.length,0); assert.ok(followup.understood.notCuisines.includes('balik')); assert.ok(followup.understood.notFoods.includes('kirmizi-et')); assert.ok(followup.understood.drinks.includes('viski'));
 assert.ok(evidence.queries.length===3&&evidence.queries.every(q=>q.result.mode==='ai'&&q.result.model),'All three real-model responses required; fallback is not AI acceptance'); evidence.completed=true;save();console.log(JSON.stringify({completed:true,profiles:evidence.browser.length,initialCount:evidence.initialCount??null,seedRequests:evidence.seedRequests,sorRequests:evidence.sorRequests,db:'isolated892',productionWrites:0}));
}catch(e){evidence.completed=false;evidence.failureLine=e.stack?.match(/pr74-reconciled-acceptance\.mjs:(\d+)/)?.[1]??null;evidence.error=e.message;save();console.error(JSON.stringify({error:'acceptance_failed',stage:evidence.stage}));process.exitCode=1;}finally{await browser?.close();}
