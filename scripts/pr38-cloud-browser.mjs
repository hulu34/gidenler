import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const req=createRequire(process.env.BROWSER_PACKAGE_JSON);const {chromium,webkit}=req('@playwright/test');
const origin='http://localhost:3178',slug='menemen-besiktas',folder='menemen-cloud-evidence';fs.mkdirSync(folder,{recursive:true});
const source=JSON.parse(fs.readFileSync('../candidate/content/profiles/'+slug+'.json','utf8'));
const photos=JSON.parse(fs.readFileSync('../candidate/data/real/izinli-fotograflar.json','utf8'))[slug];
const report={sha:'2031408276fc5e4a24223a4e45fa70f656ffb604',prSha:'3036b6a872e23306f19e49154c6b629d8a2cbc38',environment:'isolated GitHub Actions cloud build with PostgreSQL17',productionWrites:0,realVideoPlayback:false,videoVerification:'Official oEmbed + real source page independently verified; browser checks player URL and UI',profiles:[],assets:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(folder,'browser.json'),JSON.stringify(report,null,2));
let active,engineName,widthNow;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
try{
 let ready=false;for(let i=0;i<90;i++){try{if((await fetch(origin+'/mekan/'+slug+'/')).ok){ready=true;break}}catch{}await delay(1000)}assert(ready,'Built server did not start');
 const assets=new Set(photos.flatMap(p=>[p.src,p.full,...p.srcSet.split(',').map(s=>s.trim().split(' ')[0])]).filter(Boolean));
 for(const asset of assets){const r=await fetch(origin+asset);assert.equal(r.status,200,asset);assert.match(r.headers.get('content-type'),/image\/webp/);assert((await r.arrayBuffer()).byteLength>500);report.assets.push({asset,status:r.status})}
 assert.equal(assets.size,18);
 for(const [engine,width]of [['chromium',375],['chromium',390],['chromium',1440],['webkit',390]]){
  engineName=engine;widthNow=width;const browser=await({chromium,webkit}[engine]).launch();const context=await browser.newContext({viewport:{width,height:width<600?844:1000},isMobile:width<600,hasTouch:width<600});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const p=await context.newPage();active=p;p.on('pageerror',e=>report.errors.push({engine,width,message:e.message}));
  await p.goto(origin+'/mekan/'+slug+'/',{waitUntil:'networkidle'});await p.getByRole('heading',{name:'Menemen',exact:true}).waitFor();
  assert.equal(await p.locator('[data-mozaik] img').count(),6);assert((await p.locator('[data-mozaik] img').first().getAttribute('src')).includes('fc7e44fbef'));
  for(const photo of photos)assert.equal(await p.locator('[data-mozaik] img').filter({hasNotText:'not-used'}).evaluateAll((imgs,src)=>imgs.some(i=>i.getAttribute('src')===src),photo.src),true,photo.src);
  const menu=await p.locator('#menu').innerText();assert.match(menu,/20\.01\.2024 tarihli arşiv kopyasından/);assert.match(menu,/güncel menü ve fiyat olarak doğrulanmadı/);assert(!menu.includes('₺'));
  const folded=menu.toLocaleLowerCase('tr');for(const s of source.menu.sections){assert(folded.includes(s.title.toLocaleLowerCase('tr')),s.title);for(const item of s.items)assert(folded.includes(item.name.toLocaleLowerCase('tr')),item.name)}
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const og=await p.locator('meta[property="og:image"]').first().getAttribute('content');assert(og.includes('menemen-besiktas-fc7e44fbef'));
  await p.screenshot({path:path.join(folder,engine+'-'+width+'-profile.png'),fullPage:true});await p.screenshot({path:path.join(folder,engine+'-'+width+'-hero.png'),fullPage:false});
  await p.locator('#menu').screenshot({path:path.join(folder,engine+'-'+width+'-menu.png')});
  const video=p.getByRole('button',{name:/YouTube videosunu burada oynat/});assert.equal(await video.count(),1);assert.match(await p.locator('body').innerText(),/İşbirliği/);
  await video.click();const dialog=p.getByRole('dialog',{name:'Menemen videoları',exact:true});await dialog.waitFor();const iframeSrc=await dialog.locator('iframe').getAttribute('src');assert(iframeSrc.includes('e6OmpzizSoo'));assert.match(iframeSrc,/youtube(?:-nocookie)?\.com\/embed\//);assert.match(await dialog.innerText(),/Ayaküstü Lezzetler/);
  await p.screenshot({path:path.join(folder,engine+'-'+width+'-video.png')});await p.getByRole('button',{name:'Kapat ve restorana dön',exact:true}).click();await dialog.waitFor({state:'hidden'});
  await p.goto(origin+'/mekan/'+slug+'/fotograflar/',{waitUntil:'networkidle'});await p.getByRole('tab',{name:/Tümü/}).waitFor();
  const photoButtons=()=>p.getByRole('button',{name:/Fotoğrafı büyüt:/});assert.equal(await photoButtons().count(),6);
  for(const [name,n]of [['Yemekler',4],['İç mekân',1],['Dış cephe',1],['Tümü',6]]){await p.getByRole('tab',{name:new RegExp(name)}).click();assert.equal(await photoButtons().count(),n,name)}
  await photoButtons().first().click();await p.getByRole('dialog').waitFor();await p.keyboard.press('Escape');assert.equal(await p.getByRole('dialog').count(),0);
  await p.screenshot({path:path.join(folder,engine+'-'+width+'-gallery.png'),fullPage:true});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  for(const url of ['/seckisi/','/seckisi/en/']){const response=await p.goto(origin+url,{waitUntil:'networkidle'});assert.equal(response.status(),200);assert((await p.locator('body').innerText()).includes('Menemen'));const renderedImages=await p.locator('img').evaluateAll(imgs=>imgs.map(i=>[i.getAttribute('src'),i.getAttribute('srcset')].join(' ')));assert(renderedImages.every(src=>!src.includes('/media/foto/menemen-besiktas-')),'Seçki must not render Menemen photos outside the approved scope')}
  for(const other of ['japon-erdal-beyoglu','kanaat-lokantasi-uskudar','develi-samatya-fatih']){const r=await p.goto(origin+'/mekan/'+other+'/',{waitUntil:'networkidle'});assert.equal(r.status(),200);assert((await p.locator('img').evaluateAll(imgs=>imgs.map(i=>[i.getAttribute('src'),i.getAttribute('srcset')].join(' ')))).every(src=>!src.includes('/media/foto/menemen-besiktas-')));assert(!(await p.locator('body').innerText()).includes('20.01.2024 tarihli arşiv kopyasından'))}
  report.profiles.push({engine,width,gallery:6,menuItems:45,sections:6,archiveWarning:true,prices:false,sponsoredVideo:true,videoPlayerURL:iframeSrc,otherProfiles:3,overflow:false});save();await browser.close();
 }
 assert.deepEqual(report.errors,[]);report.complete=true;save();console.log(JSON.stringify(report));
}catch(e){report.complete=false;report.failure=String(e);report.failureProfile={engine:engineName,width:widthNow};if(active){await active.screenshot({path:path.join(folder,'failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(folder,'failure-visible.txt'),await active.locator('body').innerText().catch(()=>''))}save();console.error(e);process.exit(1)}
