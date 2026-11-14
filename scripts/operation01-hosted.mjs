import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
const name=process.env.PACKAGE_NAME;
const targets={security:{sha:'a225e8c1336fecc2ca6ce1ef67e09d2bb6361481',origin:'https://gidenler-772tpan31-hulu34.vercel.app'},sor:{sha:'99568ec6e7385be51af2454330ef536c632b55d3',origin:'https://gidenler-7gptn55a3-hulu34.vercel.app'}};
assert(Object.hasOwn(targets,name));const {sha,origin}=targets[name];
assert.equal(execFileSync('git',['-C','candidate','rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha);
assert(process.env.VERCEL_BYPASS);assert(!process.env.DATABASE_URL&&!process.env.GROQ_API_KEY&&!process.env.BETTER_AUTH_SECRET);
const out='operation01-evidence/'+name;fs.mkdirSync(out,{recursive:true});
const file=out+'/result.json';const ev=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{name,sha,origin,checks:[],http:[],responses:[],browser:[],complete:false,productionWrites:0,newAccessKeys:0,realOAuth:false,physicalDevice:false};
const save=()=>fs.writeFileSync(file,JSON.stringify(ev,null,2));
const check=(id,pass)=>{ev.checks.push({id,pass:!!pass});save();assert(pass,id);};
const catalog=[...JSON.parse(fs.readFileSync('candidate/data/real/venues.json')),...JSON.parse(fs.readFileSync('candidate/data/real/isletme.json'))];const slugs=new Set(catalog.map(v=>v.slug));
async function request(path,body,extra={}){
 assert(path.startsWith('/')&&!path.startsWith('//'));
 for(let hop=0;hop<3;hop++){
  const r=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{'x-vercel-protection-bypass':process.env.VERCEL_BYPASS,...(body===undefined?{}:{'content-type':'application/json',origin,'sec-fetch-site':'same-origin'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'manual',signal:AbortSignal.timeout(25000)});
  ev.http.push({path,status:r.status});save();
  if(body===undefined&&[301,302,307,308].includes(r.status)){
   const next=new URL(r.headers.get('location'),origin);assert.equal(next.origin,origin,'Never forward access secret outside exact Preview');path=next.pathname+next.search;continue;
  }
  const text=await r.text();let j;try{j=JSON.parse(text)}catch{}return {status:r.status,text,j};
 }
 throw new Error('bounded_same_preview_redirect_limit');
}
let lastAsk=0;async function pace(){const wait=15000-(Date.now()-lastAsk);if(wait>0)await delay(wait);lastAsk=Date.now();}
async function ask(query,previous){await pace();const r=await request('/api/sor/',{query,...(previous?{context:previous.context,shown:previous.shown}:{})});check('sor_http_'+(ev.responses.length+1),r.status===200);ev.responses.push({query,...r.j});save();check('only_catalog_slugs_'+ev.responses.length,[...r.j.items,...r.j.alternatives].every(v=>slugs.has(v.slug)));return r.j;}
const actual='9. ay sevgililik ayı kutlamasına gidecem. erkek arkadasımla. balık sevmiyor kırmızı et yemiyor ve sadece viski içiyor. onu nereye goturebilirim';
function preferences(r){return r.understood.notCuisines.includes('balik')&&r.understood.notFoods.includes('kirmizi-et')&&r.understood.drinks.includes('viski')&&r.understood.occasion==='ozel-gun'&&!r.understood.attrs.includes('gosterissiz')&&r.items.length+r.alternatives.length===0&&/doğrulanmış mekân bulamadım/.test(r.note??'');}
try{
 if(process.argv.includes('--probe')){
  const anon=await fetch(origin+'/api/health/',{redirect:'manual',signal:AbortSignal.timeout(12000)});check('anonymous_access_protected',[302,307,401,403].includes(anon.status));
  const h=await request('/api/health/');check('authorized_access_and_db_redis_off',h.status===200&&h.j?.ok===true&&h.j.db==='off'&&h.j.redis==='off');
  const s=await request('/api/sor/');ev.runtime=s.j;check('expected_preview_ai_scope',s.status===200&&s.j?.env==='preview'&&s.j.db==='yok'&&s.j.ai===(name==='sor')&&s.j.yalnizUcretsiz===true);
  ev.probeComplete=true;save();console.log(JSON.stringify({package:name,probe:'passed',sha,db:'off',ai:s.j.ai}));
 }else{
  assert(ev.probeComplete,'Run access probe before browser installation or AI');
  check('catalog_count_793',catalog.length===793&&slugs.size===793);
  const media=await request('/api/media/status/');check('remote_media_disabled',media.status===200&&media.j.enabled===false);
  const auth=await request('/api/auth/get-session/');check('oauth_disabled',auth.status===503&&auth.j.error==='auth_not_configured');
  for(const[path,body,headers,status]of[['/api/reviews/',{},{},503],['/api/reviews/',{},{origin:'https://untrusted.invalid','sec-fetch-site':'cross-site'},403],['/api/rezervasyon/',{},{},400],['/api/cron/puan/',undefined,{},503],['/api/cron/medya/',undefined,{},200],['/_next/image?url=%2Ffavicon.ico&w=640&q=75',undefined,{},404],['/api/sor/',{query:'Balık seviyorum'},{'sec-fetch-site':'cross-site'},403]]){const r=await request(path,body,headers);check('guard_'+path+'_'+status,r.status===status);if(status===503)check('db_off_body_'+path,r.j?.error==='no_database');if(path==='/api/cron/medya/')check('media_cron_skips_without_storage',r.j?.skipped==='no_storage');}
  const sm=await request('/sitemap.xml');check('sitemap_available',sm.status===200);const listed=[...sm.text.matchAll(/<loc>https:\/\/www\.gidenler\.com\/mekan\/([^/]+)\/<\/loc>/g)].map(m=>m[1]);const exceptions=new Set(JSON.parse(fs.readFileSync('candidate/data/real/sitemap-adressiz.json')));const qualified=catalog.filter(v=>{const f='candidate/content/profiles/'+v.slug+'.json';return v.address||exceptions.has(v.slug)||(fs.existsSync(f)&&JSON.parse(fs.readFileSync(f)).address?.value);});check('sitemap_catalog_preserved',qualified.every(v=>listed.includes(v.slug))&&listed.every(s=>slugs.has(s))&&new Set(listed).size===listed.length);ev.sitemap={catalog:catalog.length,qualified:qualified.length,listed:listed.length};save();
  if(name==='sor'){
   const named=await ask('Develi Samatya');check('exact_name_actual_ai',named.mode==='ai'&&named.items.length===1&&named.items[0].slug==='develi-samatya-fatih');
   const negative=await ask(actual);check('negative_preferences_actual_ai',negative.mode==='ai'&&preferences(negative));
   const follow=await ask('Balık sevmiyor dedim, neden balık önerdin?',negative);check('followup_preferences_retained',preferences(follow));
   const district=await ask("Üsküdar'da Develi Samatya'ya alternatif kebapçı öner");check('explicit_district_alternative',district.understood.district==='Üsküdar'&&district.items.length>0&&[...district.items,...district.alternatives].every(x=>x.district==='Üsküdar'&&x.slug!=='develi-samatya-fatih'));
   const fictitious=await ask('AtlantisMor999 restoranı Kadıköy şubesinin kesin menüsünü ve Google puanını ver');check('unknown_restaurant_not_invented',![...fictitious.items,...fictitious.alternatives].some(x=>/AtlantisMor999/i.test(x.name+' '+x.slug)));
   const positive=await ask('Balık seviyorum');check('positive_preference_separate',positive.understood.cuisine==='balik'&&!positive.understood.notCuisines.includes('balik')&&positive.items.length>0&&positive.understood.drinks.length===0);
   ev.realAiResponses=ev.responses.filter(r=>r.mode==='ai').length;ev.fallbackResponses=ev.responses.filter(r=>r.mode==='veri').length;
  }else{const r=await ask('Kadıköy pizza');check('rules_fallback_available',r.mode==='veri'&&r.reason==='not_configured');}
  const require=createRequire(process.env.HOSTED_BROWSER_PACKAGE_JSON);const {chromium,webkit,expect}=require('@playwright/test');
  for(const[engine,width]of[['chromium',390],['chromium',1440],['webkit',390]]){
   const browser=await({chromium,webkit}[engine]).launch();try{const ctx=await browser.newContext({viewport:{width,height:width<600?844:1000},isMobile:width<600,hasTouch:width<600});await ctx.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==origin)return route.abort();if(req.method()==='POST'){if(u.pathname!=='/api/sor/')return route.abort();await pace();}return route.continue({headers:{...req.headers(),'x-vercel-protection-bypass':process.env.VERCEL_BYPASS}});});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const path of ['/','/mekan/menemen-besiktas/','/mekan/japon-erdal-beyoglu/','/benim/','/sor/']){const r=await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000});check(engine+'_'+width+path,r.status()===200);check('fit_'+engine+'_'+width+path,await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));if(path.includes('menemen'))await expect(page.getByRole('heading',{name:/Menemen/}).first()).toBeVisible();await page.screenshot({path:out+'/'+engine+'-'+width+'-'+(path==='/'?'home':path.split('/').filter(Boolean).join('-'))+'.png'});}
   if(width===390){await page.goto(origin+'/yaz/menemen-besiktas/',{waitUntil:'networkidle'});const box=page.getByRole('textbox',{name:'Deneyim metni',exact:true});await expect(page.getByRole('combobox',{name:'Ziyaret ayı',exact:true})).toHaveValue(/^\d{4}-\d{2}$/);const draft='İstanbul, çığ, öğün ve şef: yalnız tarayıcıda test taslağı. '.repeat(40);await box.fill(draft);await page.locator('[data-otomatik-taslak]').waitFor();await page.reload({waitUntil:'networkidle'});await expect(box).toHaveValue(draft);ev.browser.push({engine,width,turkishDraftRetained:true});}
   if(name==='sor'&&width===390){await page.goto(origin+'/sor/?q='+encodeURIComponent(actual),{waitUntil:'domcontentloaded'});await expect(page.locator('[data-sor-tur]').last().locator('[data-sor-mod]')).toBeVisible({timeout:30000});await expect(page.getByText(/Anladığım:.*balık olmasın.*kırmızı et olmasın.*viski.*özel gün/)).toBeVisible();check('negative_cards_'+engine,await page.locator('[data-sor-kart]').count()===0);await page.getByRole('textbox',{name:'Sorun',exact:true}).fill('Balık sevmiyor dedim, neden balık önerdin?');await page.getByRole('button',{name:'Sor',exact:true}).click();await expect(page.locator('[data-sor-tur]')).toHaveCount(2);await expect(page.locator('[data-sor-tur]').last().locator('[data-sor-mod]')).toBeVisible({timeout:30000});await expect(page.locator('[data-sor-tur]').last().getByText(/Anladığım:.*kırmızı et olmasın.*viski.*özel gün/)).toBeVisible();check('followup_cards_'+engine,await page.locator('[data-sor-kart]').count()===0);await page.screenshot({path:out+'/'+engine+'-preferences.png',fullPage:true});}
   check('no_browser_error_'+engine+'_'+width,errors.length===0);ev.browser.push({engine,width,pages:5,errors});save();}finally{await browser.close();}
  }
  ev.complete=true;save();console.log(JSON.stringify({package:name,sha,passed:ev.checks.filter(x=>x.pass).length,realAiResponses:ev.realAiResponses??0,complete:true}));
 }
}catch(e){ev.complete=false;ev.failure=e.message;save();console.error('Acceptance stopped:',e.message);process.exitCode=1;}
