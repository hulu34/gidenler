import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const plan=JSON.parse(readFileSync('scripts/pr51-cloud-target.json','utf8'));
const records=JSON.parse(readFileSync('scripts/pr51-cloud-records.json','utf8'));
assert.equal(plan.origin,'https://gidenler-3a1n8wekp-hulu34.vercel.app');
assert.equal(plan.expectedSha,'f8131ddce3d691a6300e5d9b669e82f53980d73c');
assert.equal(plan.deploymentId,'76hLydwRmYCEQgZv4WhAyFRAFwYK');
assert.equal(records.length,17);assert.equal(new Set(records.map(x=>x.slug)).size,17);
assert.ok(records.every(x=>x.categoryId==='cat.restaurant'&&x.kaliteSinifi==='A-konumsuz'));
const secret=process.env.VERCEL_BYPASS;assert.ok(secret,'Existing Preview access must be available');
const expectedHosts=['ep-shy-king-bawtrgis.c-8.eu-central-1.aws.neon.tech','ep-shy-king-bawtrgis-pooler.c-8.eu-central-1.aws.neon.tech'];
const fingerprints=expectedHosts.map(x=>createHash('sha256').update(x).digest('hex').slice(0,16));
const evidence={plan,at:new Date().toISOString(),seedRequests:0,sorRequests:0,productionWrites:0,browser:[],queries:[]};
mkdirSync('pr51-cloud-evidence',{recursive:true});
const save=()=>writeFileSync('pr51-cloud-evidence/result.json',JSON.stringify(evidence,null,2));
async function request(path,body){
 assert.ok(path==='/api/health/'||path==='/api/sor/'||path==='/api/admin/db/'||path.startsWith('/api/admin/db/?rapor=profil&slug='));
 if(body&&path==='/api/admin/db/'){assert.equal(body.action,'seed-add-only');assert.equal(body.target,'preview');assert.equal(body.baselineCount,801);assert.deepEqual(body.slugs,records.map(x=>x.slug));assert.ok(++evidence.seedRequests<=2);}
 if(body&&path==='/api/sor/')assert.ok(++evidence.sorRequests<=2);
 const headers={'x-vercel-protection-bypass':secret,Origin:plan.origin,'sec-fetch-site':'same-origin',...(body?{'content-type':'application/json'}:{})};
 const r=await fetch(plan.origin+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});
 assert.equal(r.status,200,path+': HTTP '+r.status);return r.json();
}
let browser;
try{
 const status=await request('/api/sor/');const initial=await request('/api/admin/db/');
 assert.equal(status.env,'preview');assert.equal(status.db,'yalitilmis');assert.equal(initial.env,'preview');assert.equal(initial.db.writeGuard.ok,true);
 assert.ok(fingerprints.includes(initial.db.fingerprint),'Physical Preview compute fingerprint must match');assert.notEqual(initial.db.fingerprint,'37811a6487ca5441');
 assert.ok([801,818].includes(initial.integrity.present));assert.deepEqual(initial.migrations.pending,[]);assert.deepEqual(initial.migrations.drift,[]);assert.deepEqual(initial.migrations.unknown,[]);
 evidence.initial={status,admin:initial};evidence.health=await request('/api/health/');assert.equal(evidence.health.db,'ok');save();
 const menemenBefore=await request('/api/admin/db/?rapor=profil&slug=menemen-besiktas');
 const body={action:'seed-add-only',confirm:'EVET',target:'preview',baselineCount:801,slugs:records.map(x=>x.slug)};
 const added=await request('/api/admin/db/',body);assert.equal(added.total,818);assert.equal(added.integrity.ok,true);evidence.append=added;save();
 const targetRead=async()=>{const out=[];for(const r of records)out.push(await request('/api/admin/db/?rapor=profil&slug='+r.slug));return out;};
 const first=await targetRead();const again=await request('/api/admin/db/',body);const second=await targetRead();
 assert.deepEqual(second,first,'Repeat must preserve new ids, fields, provenance counts and metadata');assert.equal(again.total,818);evidence.repeat={response:again,identical:true};
 assert.deepEqual(await request('/api/admin/db/?rapor=profil&slug=menemen-besiktas'),menemenBefore);
 const final=await request('/api/admin/db/');assert.equal(final.integrity.expected,818);assert.equal(final.integrity.present,818);assert.equal(final.integrity.ok,true);
 for(const k of ['users','reviews'])assert.equal(final.rollback.migration[k],initial.rollback.migration[k]);evidence.final=final;save();
 const require=createRequire(process.env.BROWSER_PACKAGE_JSON);const {chromium}=require('@playwright/test');browser=await chromium.launch({headless:true});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:960}});
  await context.route('**/*',async route=>{const headers={...route.request().headers()};delete headers['x-vercel-protection-bypass'];if(new URL(route.request().url()).origin===plan.origin)headers['x-vercel-protection-bypass']=secret;await route.continue({headers});});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const r of records){
   const response=await page.goto(plan.origin+'/mekan/'+r.slug+'/',{waitUntil:'networkidle'});assert.equal(response.status(),200);await page.getByRole('heading',{name:r.name,exact:true,level:1}).waitFor();
   await page.getByText('Bu mekânın harita noktası açık bir kaynakta henüz doğrulanmadı; yerini adresle ara.',{exact:true}).waitFor();
   assert.equal(await page.locator('iframe').count(),0);assert.ok(await page.getByText(r.address,{exact:true}).first().isVisible());
   const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width);
   evidence.browser.push({width,slug:r.slug,status:200,coordinateWarning:true,noOverflow:true});
  }
  await page.screenshot({path:`pr51-cloud-evidence/last-profile-${width}.png`,fullPage:false});
  await page.goto(plan.origin+'/',{waitUntil:'networkidle'});await page.getByText('783 gerçek mekân',{exact:true}).waitFor();
  await page.getByRole('searchbox',{name:'Mekân, kategori veya semt ara'}).fill('Beca');await page.getByRole('button',{name:'Beca Restoran · Beşiktaş',exact:true}).waitFor();
  await page.getByRole('button',{name:'Beca Restoran · Beşiktaş',exact:true}).click();await page.waitForURL(plan.origin+'/mekan/beca-besiktas/');
  await page.goto(plan.origin+'/yaz/beca-besiktas/',{waitUntil:'networkidle'});assert.ok((await page.locator('body').innerText()).includes('Beca'));
  await page.goto(plan.origin+'/mekan/menemen-besiktas/',{waitUntil:'networkidle'});await page.getByRole('region',{name:'Menü',exact:true}).waitFor();
  assert.equal(await page.locator('#menu li').count(),45);assert.equal(await page.getByRole('link',{name:'Tüm fotoğraflar (6)',exact:true}).count(),1);assert.equal(await page.getByRole('heading',{name:'Videolar 1',exact:true}).count(),1);
  assert.deepEqual(errors,[]);await page.screenshot({path:`pr51-cloud-evidence/menemen-${width}.png`,fullPage:false});await context.close();save();
 }
 for(const query of ['En yüksek puanlı restoran hangisi?','Balık sevmiyor, kırmızı et yemiyor ve sadece viski içiyor. Sevgililik ay dönümü için nereye gidelim?'])evidence.queries.push({query,result:await request('/api/sor/',{query})});
 assert.equal(evidence.queries[0].result.understood.name,null);const negative=evidence.queries[1].result;assert.equal(negative.items.length,0);assert.ok(negative.understood.notCuisines.includes('balik'));assert.ok(negative.understood.notFoods.includes('kirmizi-et'));assert.ok(negative.understood.drinks.includes('viski'));
 evidence.completed=true;save();console.log(JSON.stringify({completed:true,profiles:evidence.browser.length,seedRequests:evidence.seedRequests,sorRequests:evidence.sorRequests,db:'isolated818',productionWrites:0}));
}catch(e){evidence.completed=false;evidence.error=e.message;save();console.error(e.message);process.exitCode=1;}finally{await browser?.close();}
