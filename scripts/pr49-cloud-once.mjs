import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const plan=JSON.parse(readFileSync('scripts/pr49-cloud-target.json','utf8'));
const url=new URL(plan.origin);
assert.match(url.hostname,/^gidenler-[a-z0-9]+-hulu34\.vercel\.app$/);
assert.equal(url.origin,plan.origin);assert.equal(plan.expectedSha,'174a1c9c33f10774aace7f62ab884584dbaba0dd');
assert.ok(['probe','acceptance'].includes(plan.mode));
mkdirSync('pr49-cloud-evidence',{recursive:true});
const evidence={plan,at:new Date().toISOString(),queries:[],productionWrites:0};
const save=()=>writeFileSync('pr49-cloud-evidence/result.json',JSON.stringify(evidence,null,2));
async function request(path,body){
 const headers={'x-vercel-protection-bypass':process.env.VERCEL_BYPASS??'',Origin:plan.origin,'sec-fetch-site':'same-origin'};
 if(body)headers['content-type']='application/json';
 const r=await fetch(plan.origin+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});
 assert.equal(r.status,200,`${path}: HTTP ${r.status}`);return await r.json();
}
try{
 evidence.status=await request('/api/sor/');
 evidence.health=await request('/api/health/');assert.equal(evidence.health.db,'ok');assert.equal(evidence.status.db,'yalitilmis');
 const admin=await request('/api/admin/db/');assert.equal(admin.env,'preview');assert.equal(admin.db.fingerprint,plan.allowedDbFingerprint);assert.equal(admin.integrity.present,801);assert.equal(admin.integrity.ok,true);
 evidence.integrity={fingerprint:admin.db.fingerprint,...admin.integrity};save();
 if(plan.mode==='acceptance'){
  assert.equal(evidence.status.ai,true,'Actual AI must be configured before any query');
  let context;
  for(const query of ["En yüksek puanlı restoran hangisi?","Balık sevmiyor, kırmızı et yemiyor ve sadece viski içiyor. Sevgililik ay dönümü için nereye gidelim?","Balık sevmiyor dedim, neden balık önerdin?"]){
   const result=await request('/api/sor/',{query,...(context?{context}:{})});
   evidence.queries.push({query,result});context=result.context;save();
  }
  assert.ok(!/yuksel-balik/.test(JSON.stringify(evidence.queries[0].result)),'ranking must not become Yuksel Balik');
  for(const item of evidence.queries.slice(1)){assert.equal(item.result.items.length,0,'unverified whisky must not produce recommendations');assert.ok(item.result.understood.drinks.includes('viski'));assert.ok(item.result.understood.notFoods.includes('kirmizi-et'));assert.ok(item.result.understood.notCuisines.includes('balik'));}
  evidence.actualModelReported=evidence.queries.every(x=>x.result.mode==='ai'&&!!x.result.model);assert.equal(evidence.actualModelReported,true,'Every query must report actual model success');
  evidence.safetyPassed=true;
 }
 evidence.completed=true;save();console.log(JSON.stringify({mode:plan.mode,completed:true,queryCount:evidence.queries.length,actualModelReported:evidence.actualModelReported??false,db:'isolated801'}));
}catch(e){evidence.completed=false;evidence.error=e.message;save();console.error(e.message);process.exitCode=1;}
