import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const plan=JSON.parse(readFileSync('scripts/pr71-cloud-target.json','utf8'));
const records=JSON.parse(readFileSync('scripts/pr71-cloud-records.json','utf8'));
assert.equal(plan.expectedSha,'f4ebf2fe6304f1d83a959493cbca3668b65d5fe4');
assert.equal(plan.origin,'https://gidenler-b9o5idk2d-hulu34.vercel.app');
assert.equal(plan.deploymentId,'AL31opmRB4hfNStmBFuH67UiyWtr');
assert.equal(plan.branchId,'br-lucky-fog-babqtpma');
assert.equal(records.length,3);assert.equal(new Set(records.map(x=>x.slug)).size,3);
const bypass=process.env.VERCEL_BYPASS;assert.ok(bypass);
const expected=['ep-proud-mud-ba4yqh9k.c-8.eu-central-1.aws.neon.tech','ep-proud-mud-ba4yqh9k-pooler.c-8.eu-central-1.aws.neon.tech'].map(x=>createHash('sha256').update(x).digest('hex').slice(0,16));
const summary={sha:plan.expectedSha,origin:plan.origin,completed:false,preflight:false,profiles:[],seedRequests:0,sorRequests:0,productionWrites:0};
mkdirSync('pr71-cloud-evidence',{recursive:true});
const save=()=>writeFileSync('pr71-cloud-evidence/public-summary.json',JSON.stringify(summary,null,2));
async function admin(){const r=await fetch(plan.origin+'/api/admin/db/',{headers:{'x-vercel-protection-bypass':bypass},redirect:'manual',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);const a=await r.json();assert.equal(a.env,'preview');assert.equal(a.db.writeGuard.ok,true);assert.ok(expected.includes(a.db.fingerprint));assert.notEqual(a.db.fingerprint,'37811a6487ca5441');assert.equal(a.integrity.present,879);assert.equal(a.integrity.expected,879);assert.equal(a.integrity.ok,true);for(const k of ['pending','drift','unknown'])assert.deepEqual(a.migrations[k],[]);return {users:a.rollback.migration.users,reviews:a.rollback.migration.reviews};}
let browser;
try{
 const before=await admin();summary.preflight=true;save();
 const require=createRequire(process.env.BROWSER_PACKAGE_JSON);const {chromium}=require('@playwright/test');browser=await chromium.launch({headless:true});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:960}});
  const denied=[];await context.route('**/*',async route=>{const request=route.request();if(!['GET','HEAD'].includes(request.method())){denied.push(request.method());return route.abort();}const headers={...request.headers()};delete headers['x-vercel-protection-bypass'];if(new URL(request.url()).origin===plan.origin)headers['x-vercel-protection-bypass']=bypass;await route.continue({headers});});
  const page=await context.newPage();const errors=[];page.on('pageerror',()=>errors.push('pageerror'));
  for(const record of records){const response=await page.goto(plan.origin+'/mekan/'+record.slug+'/',{waitUntil:'networkidle'});assert.equal(response.status(),200);await page.getByRole('heading',{name:record.name,exact:true,level:1}).waitFor();assert.ok(await page.getByText(record.address,{exact:true}).first().isVisible());await page.getByText('Bu mekânın harita noktası açık bir kaynakta henüz doğrulanmadı; yerini adresle ara.',{exact:true}).waitFor();assert.equal(await page.locator('iframe').count(),0);const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width);summary.profiles.push({width,slug:record.slug,status:200,address:true,coordinateWarning:true,noMap:true,noOverflow:true});if(record.slug==='sahan-atasehir')await page.screenshot({path:`pr71-cloud-evidence/sahan-${width}.png`,fullPage:false});save();}
  assert.deepEqual(errors,[]);assert.deepEqual(denied,[]);await context.close();
 }
 assert.deepEqual(await admin(),before);summary.completed=true;save();console.log(JSON.stringify({completed:true,profiles:summary.profiles.length,readOnly:true,seedRequests:0,sorRequests:0,productionWrites:0}));
}catch{save();console.error('readonly_acceptance_failed');process.exitCode=1;}finally{await browser?.close();}
