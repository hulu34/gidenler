import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
const plan=JSON.parse(readFileSync('scripts/pr71-cloud-target.json','utf8'));
assert.equal(plan.expectedSha,'153281398e5f40b8de6c360087089213d6d01aac');
assert.equal(plan.origin,'https://gidenler-qfg2kddui-hulu34.vercel.app');
assert.equal(plan.deploymentId,'AVHpd6iV7upXiFsLUj3iL7uWyG6W');
const secret=process.env.VERCEL_BYPASS;assert.ok(secret);
mkdirSync('pr71-cloud-evidence',{recursive:true});
const summary={plan,purpose:'read-only desktop image-load confirmation',completed:false,seedRequests:0,sorRequests:0,productionWrites:0};
const save=()=>writeFileSync('pr71-cloud-evidence/public-summary.json',JSON.stringify(summary,null,2));
const require=createRequire(process.env.BROWSER_PACKAGE_JSON);const {chromium}=require('@playwright/test');let browser;
try{
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:960}});
 await context.route('**/*',async route=>{const req=route.request();assert.equal(req.method(),'GET','Read-only check must not send mutations');const headers={...req.headers()};delete headers['x-vercel-protection-bypass'];if(new URL(req.url()).origin===plan.origin)headers['x-vercel-protection-bypass']=secret;await route.continue({headers});});
 const page=await context.newPage();const response=await page.goto(plan.origin+'/mekan/menemen-besiktas/fotograflar/',{waitUntil:'networkidle'});assert.equal(response.status(),200);
 await page.getByRole('tab',{name:'Tümü 6',exact:true}).waitFor();assert.equal(await page.getByRole('main').locator('img').count(),6);
 await page.waitForFunction(()=>{const imgs=[...document.querySelectorAll('main img')];return imgs.length===6&&imgs.every(i=>i.complete&&i.naturalWidth>0);},{timeout:20000});
 const imageStates=await page.getByRole('main').locator('img').evaluateAll(imgs=>imgs.map(i=>({complete:i.complete,loaded:i.naturalWidth>0})));
 assert.equal(imageStates.filter(i=>i.complete&&i.loaded).length,6);summary.desktopPhotos=6;summary.loaded=6;
 await page.screenshot({path:'pr71-cloud-evidence/menemen-desktop-loaded.png',fullPage:false});summary.completed=true;save();console.log(JSON.stringify({completed:true,loaded:6,seedRequests:0,sorRequests:0,productionWrites:0}));
}catch(e){summary.error='desktop_media_load_failed';save();console.error('desktop_media_load_failed');process.exitCode=1;}finally{await browser?.close();}
