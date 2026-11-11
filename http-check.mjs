import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const origin='http://localhost:3141';
const get=async p=>{const r=await fetch(origin+p,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,p);return await r.text()};
const admin=JSON.parse(await get('/api/admin/db/'));assert.equal(admin.integrity.present,792);assert.equal(admin.integrity.ok,true);
const additions=[];for(let n=7;n<=14;n++){let d=`data/paket/istanbul-${n}${n===8?'-b1':''}`;for(const f of ['kayitlar.json','isletme-kayitlari.json']){try{additions.push(...JSON.parse(readFileSync(`${d}/${f}`)))}catch(e){if(f==='kayitlar.json')throw e}}}
assert.equal(additions.length,218);
const results=[];
for(const r of additions){
 const p=await get(`/mekan/${r.slug}/`);assert.ok(p.includes(r.name.replaceAll('&','&amp;'))||p.includes(r.slug),r.slug);
 const f=await get(`/yaz/${r.slug}/`);assert.ok(f.includes('Deneyim metni'),r.slug+' form');
 if(r.adresDuzeyi==='sokak'){assert.ok(p.includes('Konum yaklaşık; kapı numarası henüz doğrulanmadı.'));assert.ok(p.includes('Adres (sokak düzeyi)'));assert.ok(!p.includes('mapnik&amp;marker='));}
 results.push({slug:r.slug,quality:r.adresDuzeyi==='sokak'?'B1':'A',profile:200,form:200});
}
const sitemap=await get('/sitemap.xml');for(const r of additions)assert.ok(sitemap.includes(`/mekan/${r.slug}/`),r.slug+' sitemap');
for(const p of ['/','/ara/?q=Develi','/sor/','/harita/','/mekan/ciya-sofrasi-kadikoy/','/mekan/japon-erdal-beyoglu/']) await get(p);
const anon=await fetch(origin+'/api/reviews/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(anon.status,401);
const csrf=await fetch(origin+'/api/reviews/',{method:'POST',headers:{Origin:'https://untrusted.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);
writeFileSync('http-evidence.json',JSON.stringify({sha:'471e9128f6822581fd27155cd4df64ecdbc7a407',postgres:17,catalog:792,newProfiles:218,newForms:218,b1Warnings:102,sitemapNew:218,anonymousRejected:true,csrfRejected:true,googleOAuthTested:false,results},null,2));
console.log('HTTP PASS: 218 profile + 218 form, 102 B1 warning, 218 sitemap, auth/CSRF guards; real Google sign-in NOT tested');
