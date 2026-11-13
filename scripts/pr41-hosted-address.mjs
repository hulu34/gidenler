import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const cfg=JSON.parse(fs.readFileSync('pr41-hosted-config.json','utf8')),origin=cfg.origin,SHA='c0af4987c19146841494242e65d1cb0bc4dbe1a8';
assert.equal(execFileSync('git',['-C','../candidate','rev-parse','HEAD'],{encoding:'utf8'}).trim(),SHA);
assert.equal(origin,'https://gidenler-bojwmk7u8-hulu34.vercel.app');assert(!process.env.DATABASE_URL);assert(process.env.VERCEL_BYPASS);
const req=createRequire(process.env.BROWSER_PACKAGE_JSON),{chromium,webkit}=req('@playwright/test');
const records=JSON.parse(fs.readFileSync('../candidate/data/real/venues.json','utf8'));
const targets=['altin-sofra-kucukcekmece','bayindir-restoran-pendik','antula-gurme-beykoz'].map(s=>records.find(v=>v.slug===s));
const folder='pr41-address-evidence';fs.mkdirSync(folder,{recursive:true});
const out={sha:SHA,origin,readOnly:true,productionWrites:0,databaseCredentials:false,api:[],browsers:[],errors:[],complete:false};
const save=()=>fs.writeFileSync(folder+'/address.json',JSON.stringify(out,null,2));
const headers={'x-vercel-protection-bypass':process.env.VERCEL_BYPASS};
async function json(p){const r=await fetch(origin+p,{headers,redirect:'error'});assert.equal(r.status,200);return r.json()}
try{
 const st=await json('/api/admin/db/');assert.equal(st.env,'preview');assert(cfg.fingerprints.includes(st.db.fingerprint));assert(st.db.writeGuard.ok);assert.equal(st.integrity.present,793);out.runtime={env:st.env,fingerprint:st.db.fingerprint};
 for(const v of targets){const j=await json('/api/admin/db/?rapor=profil&slug='+v.slug);assert.equal(j.place.address,v.address);assert.equal(j.place.neighborhood,v.neighborhood);out.api.push({slug:v.slug,address:j.place.address,neighborhood:j.place.neighborhood})}save();
 for(const[engine,width]of[['chromium',375],['chromium',390],['chromium',1440],['webkit',390]]){
  const browser=await({chromium,webkit}[engine]).launch();const context=await browser.newContext({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600,extraHTTPHeaders:headers});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const p=await context.newPage();p.on('pageerror',e=>out.errors.push(String(e)));
  const row={engine,width,addresses:[]};
  for(const v of targets){assert.equal((await p.goto(origin+'/mekan/'+v.slug+'/',{waitUntil:'networkidle'})).status(),200);assert((await p.locator('#genel').innerText()).includes(v.address),v.slug+' actual address missing');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);row.addresses.push(v.slug);if(engine==='chromium'&&width===390)await p.screenshot({path:folder+'/'+v.slug+'-390.png',fullPage:true})}
  out.browsers.push(row);save();await browser.close();
 }
 assert.deepEqual(out.errors,[]);out.complete=true;save();console.log(JSON.stringify(out));
}catch(e){out.failure=String(e);save();console.error(e);process.exit(1)}
