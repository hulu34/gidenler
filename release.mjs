import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const plan=JSON.parse(readFileSync('plan.json','utf8'));
const candidate='172e9392b6da07ab63f36833501a73ec953471cc';
const baseline='721b1a1a3280b2f08141af2629d322cf5c9a2e11';
assert.equal(plan.candidate,candidate);assert.equal(plan.baselineCommit,baseline);
assert.equal(plan.approvedByUser,true);assert.equal(plan.baselineCount,792);assert.equal(plan.expectedCount,793);
assert.deepEqual(plan.slugs,['menemen-besiktas']);assert.match(plan.host,/^gidenler-[a-z0-9]+-hulu34\.vercel\.app$/);
assert.ok(['preflight','append'].includes(plan.mode));
const origin='https://'+plan.host,access=process.env.VERCEL_BYPASS;assert.ok(access);
mkdirSync('evidence',{recursive:true});
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const save=(name,x)=>writeFileSync('evidence/'+name+'.json',JSON.stringify(x,null,2));
async function gh(path){const r=await fetch('https://api.github.com/repos/hulu34/gidenler/'+path,{headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,'User-Agent':'Gidenler-approved-secki-release'},redirect:'error',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);return r.json();}
const branch=await gh('branches/feature%2Finvestor-v1');assert.equal(branch.commit.sha,plan.productionCommit,'Production head changed');
const ci=await gh('actions/runs/43140053087');assert.equal(ci.head_sha,candidate);assert.equal(ci.conclusion,'success');
const source=await gh('git/commits/'+candidate),production=await gh('git/commits/'+plan.productionCommit);
if(plan.mode==='preflight') assert.equal(plan.productionCommit,baseline);
else {assert.equal(production.tree.sha,source.tree.sha,'Unreviewed Production tree');assert.ok(production.parents.some(x=>x.sha===candidate));assert.ok(production.parents.some(x=>x.sha===baseline));}
async function request(path,{body,publicSite=false,expected=200}={}){
 const base=publicSite?'https://www.gidenler.com':origin;
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'x-gidenler-test':'1',...(!publicSite?{'x-vercel-protection-bypass':access}:{}),...(body?{Origin:origin,'Content-Type':'application/json','Sec-Fetch-Site':'same-origin'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(90000)});
 assert.equal(r.status,expected,path+' HTTP status');return r;
}
async function admin(query='',body){const r=await request('/api/admin/db/'+query,{body});const j=await r.json();assert.equal(j.env,'production');return j;}
const before=await admin();assert.equal(before.db.fingerprint,plan.fingerprint);assert.equal(before.db.writeGuard.ok,true);
for(const k of ['pending','drift','unknown']) assert.deepEqual(before.migrations[k],[],k);
assert.equal(before.integrity.expected,plan.mode==='preflight'?792:793);
assert.equal(before.integrity.present,792,'Unexpected live baseline');
const menemenBefore=await admin('?rapor=profil&slug=menemen-besiktas');assert.equal(menemenBefore.place,null,'Menemen already exists; stop and reassess');
const sentinels=['japon-erdal-beyoglu','neolokal-beyoglu','nicole-beyoglu','mikla-turkey-fusion-beyoglu','yeni-lokanta-beyoglu','ciya-sofrasi-kadikoy'];
async function profiles(){const out=[];for(const slug of sentinels){const p=await admin('?rapor=profil&slug='+slug);assert.ok(p.place?.id,slug);out.push({slug,...p});}return out;}
const oldProfiles=await profiles(),googleBefore=await request('/api/admin/google-puan/?rapor=gunluk').then(r=>r.json());
const homeBefore=await request('/',{publicSite:true}).then(r=>r.text());
const topBefore=[...homeBefore.matchAll(/data-top10-satir="([^"]+)"/g)].map(m=>m[1]);assert.ok(topBefore.length);
const initial={at:new Date().toISOString(),mode:plan.mode,candidate,productionCommit:plan.productionCommit,sourceTree:source.tree.sha,host:plan.host,env:before.env,fingerprint:before.db.fingerprint,baseline:792,menemenAbsent:true,migrationsClear:true,oldProfileHash:hash(oldProfiles),users:before.rollback.migration.users,reviews:before.rollback.migration.reviews,googleShown:googleBefore.site?.shown,topHash:hash(topBefore),ci:ci.html_url};
save('preflight',initial);console.log('PASS Production fingerprint, exact source/CI, live 792 and Menemen absent');
if(plan.mode==='preflight'){assert.equal(before.integrity.ok,true);save('result',{...initial,readOnly:true,writes:0});process.exit(0);}
const appended=await admin('',{action:'seed-add-only',target:'production',confirm:'EVET',baselineCount:792,slugs:['menemen-besiktas']});
save('append',appended);assert.equal(appended.mode,'insert-only');assert.equal(appended.expected,1);assert.equal(appended.total,793);assert.equal(appended.integrity.ok,true);
const after=await admin();assert.equal(after.db.fingerprint,plan.fingerprint);assert.equal(after.integrity.present,793);assert.equal(after.integrity.ok,true);
const menemen=await admin('?rapor=profil&slug=menemen-besiktas');assert.ok(menemen.place?.id);assert.ok(menemen.place.address.includes('31/A'));
assert.deepEqual(await profiles(),oldProfiles,'Existing sentinel profile changed');
assert.equal(after.rollback.migration.users,before.rollback.migration.users);assert.equal(after.rollback.migration.reviews,before.rollback.migration.reviews);
const googleAfter=await request('/api/admin/google-puan/?rapor=gunluk').then(r=>r.json());assert.equal(googleAfter.site?.shown,googleBefore.site?.shown);
const picks=['japon-erdal-beyoglu','menemen-besiktas','neolokal-beyoglu','nicole-beyoglu','mikla-turkey-fusion-beyoglu','yeni-lokanta-beyoglu'];
const photos=['japon-erdal-dis-cephe-1246.jpg','japon-erdal-cift-yumurtali-1206.jpg'];
let publicHome;
for(const path of ['/','/seckisi/','/seckisi/en/']){
 const html=await request(path,{publicSite:true}).then(r=>r.text());
 const section=html.match(path==='/'?/<section aria-labelledby="h-secki"[\s\S]*?<\/section>/:/<section aria-labelledby="h-restoran-seckisi"[\s\S]*?<\/section>/)?.[0];
 assert.ok(section,path+' missing selection');assert.equal((section.match(/<li\b/g)??[]).length,6);
 for(const s of picks)assert.ok(section.includes('/mekan/'+s+'/'),path+' '+s);
 for(const p of photos)assert.ok(html.includes(p));
 if(path.endsWith('/en/')){assert.ok(html.includes('Six restaurants, six sides of Istanbul'));assert.equal((html.match(/>Venue profile<\/a>/g)??[]).length,6);assert.equal((html.match(/>MICHELIN-starred<\/span>/g)??[]).length,3);}
 if(path==='/')publicHome=html;
}
for(const s of picks)await request('/mekan/'+s+'/',{publicSite:true});
for(const path of ['/seckisi/japon-erdal-dort-pide-bir-efsane/','/seckisi/en/japon-erdal-dort-pide-bir-efsane/']){const html=await request(path,{publicSite:true}).then(r=>r.text());for(const p of photos)assert.ok(html.includes(p));}
for(const p of photos)await request('/media/foto/'+p,{publicSite:true});
const address=await request('/mekan/neolokal-beyoglu/',{publicSite:true}).then(r=>r.text());assert.ok(address.includes('SALT Galata, Bankalar Caddesi, Karaköy, 34420 İstanbul'));assert.ok(address.includes('Adres kaynağı:'));
const sitemap=await request('/sitemap.xml',{publicSite:true}).then(r=>r.text());assert.ok(sitemap.includes('/mekan/menemen-besiktas/'));
await request('/yaz/menemen-besiktas/',{publicSite:true});await request('/api/admin/db/',{publicSite:true,expected:404});
const topAfter=[...publicHome.matchAll(/data-top10-satir="([^"]+)"/g)].map(m=>m[1]);assert.equal(hash(topAfter),hash(topBefore));
save('result',{...initial,readOnly:false,added:1,catalog:793,onlyNewSlug:'menemen-besiktas',newPlaceId:menemen.place.id,integrity:true,oldSentinelProfilesPreserved:true,userAndReviewCountsPreserved:true,googleShown:googleAfter.site.shown,topHash:hash(topAfter),homeSix:true,trSix:true,enSix:true,pairedCover:true,officialNeolokalAddress:true,publicAdmin404:true,realOAuthTested:false,productionTestContentCreated:false});
console.log('PASS Menemen only 792→793; old sentinel profiles, users/reviews, Google, home/TR/EN and cover preserved');
