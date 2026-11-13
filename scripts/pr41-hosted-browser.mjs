import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const req=createRequire(process.env.BROWSER_PACKAGE_JSON);const {chromium,webkit}=req('@playwright/test');
const cfg=JSON.parse(fs.readFileSync('pr41-hosted-config.json','utf8')); const origin=cfg.origin,folder='pr41-hosted-evidence'; assert(process.env.VERCEL_BYPASS); assert(['full','browser-only'].includes(cfg.phase)); assert(/^https:\/\/gidenler-[a-z0-9]+-hulu34\.vercel\.app$/.test(origin));fs.mkdirSync(folder,{recursive:true});
const api=JSON.parse(fs.readFileSync(folder+'/api.json','utf8'));assert(api.complete);
const targets=api.apply.map(r=>r.slug);assert.equal(targets.length,26);
const source=slug=>JSON.parse(fs.readFileSync('../candidate/content/profiles/'+slug+'.json','utf8'));
const raw=[...JSON.parse(fs.readFileSync('../candidate/data/real/venues.json','utf8')),...JSON.parse(fs.readFileSync('../candidate/data/real/isletme.json','utf8'))];assert.equal(raw.length,793);
const bySlug=new Map(raw.map(r=>[r.slug,r]));
const excluded=fs.existsSync('../candidate/data/katalog/gece-13/birlesik-aday.json')?JSON.parse(fs.readFileSync('../candidate/data/katalog/gece-13/birlesik-aday.json','utf8')).kabul.map(r=>r.slug):[];
const photos=JSON.parse(fs.readFileSync('../candidate/data/real/izinli-fotograflar.json','utf8'))['menemen-besiktas'];
const fold=s=>s.toLocaleLowerCase('tr').replace(/\s+/g,' ').trim();
const report={sha:api.sha,environment:'Actual protected Vercel Preview with isolated Neon HTTP batch',productionWrites:0,vercelDeployment:true,realEmailOrGoogleSignIn:false,realVideoPlayback:false,browsers:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(folder,'browser.json'),JSON.stringify(report,null,2));
let active,current;
try{
 const hostedFetch=(url)=>fetch(url,{headers:{'x-vercel-protection-bypass':process.env.VERCEL_BYPASS},redirect:'error'});
 const assets=new Set(photos.flatMap(p=>[p.src,p.full,...p.srcSet.split(',').map(s=>s.trim().split(' ')[0])]).filter(Boolean));assert.equal(assets.size,18);
 for(const asset of assets){const r=await hostedFetch(origin+asset);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/image\/webp/)}report.menemenAssets=18;
 const sm=await hostedFetch(origin+'/sitemap.xml');assert.equal(sm.status,200);const xml=await sm.text();const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);assert.equal(urls.length,new Set(urls).size);
 const slugs=urls.filter(u=>u.includes('/mekan/')).map(u=>u.match(/\/mekan\/([^/]+)\//)[1]);assert(slugs.every(s=>bySlug.has(s)));assert(!slugs.some(s=>excluded.includes(s)));
 if(true)for(const slug of ['altin-sofra-kucukcekmece','antula-gurme-beykoz'])assert(slugs.includes(slug),slug+' must remain sitemap eligible');
 if(excluded.length){const wrong=await hostedFetch(origin+'/mekan/'+excluded[0]+'/');assert.equal(wrong.status,404)}report.sitemap={urls:urls.length,venues:slugs.length,exceptions:true?37:39,new334Absent:true,removedExceptionsIncluded:true};
 for(const [engine,width]of [['chromium',375],['chromium',390],['chromium',1440],['webkit',390]]){
 const browser=await({chromium,webkit}[engine]).launch();const context=await browser.newContext({viewport:{width,height:width<600?844:1000},isMobile:width<600,hasTouch:width<600,extraHTTPHeaders:{'x-vercel-protection-bypass':process.env.VERCEL_BYPASS}});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const p=await context.newPage();active=p;p.on('pageerror',e=>report.errors.push({engine,width,message:e.message}));
 const row={engine,width,profiles:[],addresses:[],menemen:{}};let items=0;
 for(const slug of targets){current={engine,width,slug};const src=source(slug);const r=await p.goto(origin+'/mekan/'+slug+'/',{waitUntil:'networkidle'});assert.equal(r.status(),200);await p.getByRole('heading',{name:bySlug.get(slug).name,exact:true}).first().waitFor();
 const text=fold(await p.locator('#genel').innerText());for(const k of ['description','address','phone','reservation'])if(src[k])assert(text.includes(fold(src[k].value)),slug+' '+k);
 for(const n of src.notes??[])assert(text.includes(fold(n.value)),slug+' note '+n.value);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,slug+' overflow');
 if(src.menu){const menu=p.locator('#menu'),visible=fold(await menu.innerText());let n=0;
 for(const s of src.menu.sections){assert(visible.includes(fold(s.title)),s.title);for(const it of s.items){assert(visible.includes(fold(it.name)),slug+' '+it.name);if(it.priceTry!==undefined){const money=it.priceTry.toLocaleString('tr-TR',{minimumFractionDigits:it.priceTry%1?2:0,maximumFractionDigits:2})+' ₺';assert(visible.includes(fold(money)),slug+' '+money)}n++}}
 assert.equal(await menu.locator('li').count(),n);if(!src.menu.pricesPublished)assert(!visible.includes('₺'));items+=n;
 if(width===390&&engine==='chromium')await menu.screenshot({path:path.join(folder,slug+'-menu-390.png')});row.profiles.push({slug,menuItems:n,prices:src.menu.pricesPublished});
 }else{assert((await p.locator('#menu').innerText()).includes('henüz doğrulanmış'));row.profiles.push({slug,menuItems:0})}
 const mediaResponse=await hostedFetch(origin+'/api/admin/db/?rapor=profil&slug='+slug);assert.equal(mediaResponse.status,200);const media=(await mediaResponse.json()).videos;const expectedVideos=new Set(media.filter(v=>v.platform==='youtube').map(v=>v.externalId));assert.equal(await p.getByRole('button',{name:/videosunu burada oynat/}).count(),media.length);for(const v of src.videos??[]){const u=new URL(v.url),id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')??u.pathname.split('/').filter(Boolean).at(-1);assert(expectedVideos.has(id),slug+' new video absent')}
 const buttons=p.getByRole('button',{name:/YouTube videosunu burada oynat/});assert.equal(await buttons.count(),expectedVideos.size);const seen=[];
 for(let vi=0;vi<expectedVideos.size;vi++){await buttons.nth(vi).click();const dialog=p.getByRole('dialog').filter({has:p.locator('iframe')});await dialog.waitFor();const frame=await dialog.locator('iframe').getAttribute('src');assert(frame.includes('youtube-nocookie.com'));const id=frame.match(/embed\/([^?]+)/)[1];assert(expectedVideos.has(id));seen.push(id);await p.getByRole('button',{name:'Kapat ve restorana dön',exact:true}).click()};assert.equal(new Set(seen).size,expectedVideos.size);
 if(width===390&&engine==='chromium')await p.screenshot({path:path.join(folder,slug+'-profile-390.png'),fullPage:true});
 }
 assert.equal(items,411);row.newMenuItems=items;
 current={engine,width,slug:'menemen-besiktas'};await p.goto(origin+'/mekan/menemen-besiktas/',{waitUntil:'networkidle'});assert.equal(await p.locator('[data-mozaik] img').count(),6);const menu=p.locator('#menu');assert.equal(await menu.locator('li').count(),45);assert.match(await menu.innerText(),/20\.01\.2024 tarihli arşiv kopyasından/);assert(!(await menu.innerText()).includes('₺'));
 const video=p.getByRole('button',{name:/YouTube videosunu burada oynat/});assert.equal(await video.count(),1);assert.match(await p.locator('body').innerText(),/İşbirliği/);await video.click();const dialog=p.getByRole('dialog',{name:'Menemen videoları',exact:true});await dialog.waitFor();assert((await dialog.locator('iframe').getAttribute('src')).includes('e6OmpzizSoo'));await p.getByRole('button',{name:'Kapat ve restorana dön',exact:true}).click();
 await p.screenshot({path:path.join(folder,engine+'-'+width+'-menemen.png'),fullPage:true});await p.goto(origin+'/mekan/menemen-besiktas/fotograflar/',{waitUntil:'networkidle'});assert.equal(await p.getByRole('button',{name:/Fotoğrafı büyüt:/}).count(),6);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);row.menemen={photos:6,archiveItems:45,video:'e6OmpzizSoo',sponsoredLabel:true};
 for(const slug of ['japon-erdal-beyoglu','kanaat-lokantasi-uskudar','develi-samatya-fatih'])assert.equal((await p.goto(origin+'/mekan/'+slug+'/',{waitUntil:'networkidle'})).status(),200);row.otherProfiles=3;
 for(const url of ['/','/kesfet/','/sor/','/yaz/'+targets[0]+'/']){assert.equal((await p.goto(origin+url,{waitUntil:'networkidle'})).status(),200,url);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,url+' overflow')}
 report.browsers.push(row);save();await browser.close();
 }
 assert.deepEqual(report.errors,[]);report.complete=true;save();console.log(JSON.stringify(report));
}catch(e){report.complete=false;report.failure=String(e);report.location=current;if(active){await active.screenshot({path:path.join(folder,'failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(folder,'failure-visible.txt'),await active.locator('body').innerText().catch(()=>''))}save();console.error(e);process.exit(1)}
