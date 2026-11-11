import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const cwd = 'reviewed';
const base = 'b95d2844d9ff7641dcfaf6043870e71599d94f51';
const sha = '15296643a03746c23ad89fe82556bd425fe0c987';
const git = args => execFileSync('git', args, {cwd,encoding:'utf8'}).trim();
assert.equal(git(['rev-parse','HEAD']),sha);
const files = ['data/real/venues.json','data/real/isletme.json'];
const before = files.flatMap(p=>JSON.parse(git(['show',`${base}:${p}`])));
const after = files.flatMap(p=>JSON.parse(readFileSync(`${cwd}/${p}`)));
assert.equal(before.length,574); assert.equal(after.length,793);
const bySlug = new Map(after.map(r=>[r.slug,r])); assert.equal(bySlug.size,793);
for (const r of before) assert.deepEqual(bySlug.get(r.slug),r,`baseline changed: ${r.slug}`);
const additions = [];
for(let n=7;n<=14;n++) for(const f of ['kayitlar.json','isletme-kayitlari.json']) {
  try { additions.push(...JSON.parse(readFileSync(`${cwd}/data/paket/istanbul-${n}${n===8?'-b1':''}/${f}`))); }
  catch(e) { if(e.code!=='ENOENT'||f==='kayitlar.json') throw e; }
}
assert.equal(additions.length,218); additions.push(bySlug.get('menemen-besiktas'));
assert.equal(new Set(additions.map(r=>r.slug)).size,219);
for(const r of additions) assert.deepEqual(bySlug.get(r.slug),r);
assert.ok(!git(['ls-tree','HEAD','node_modules']));
assert.equal(git(['diff','--name-only',base,'HEAD','--','.github','package.json','package-lock.json','vercel.json','drizzle','lib/gpuan','lib/auth.ts','lib/backup','app/api/cron']), '');
const changed = git(['diff','--name-only',base,'HEAD']).split('\n');
assert.ok(!changed.some(p=>/data\/paket\/istanbul-(1[5-9]|[2-9]\d)/.test(p)));
const index = JSON.parse(readFileSync(`${cwd}/data/real/sor-index.json`)); assert.equal(index.length,793);
assert.equal(new Set(index.map(r=>r.slug)).size,793);
const evidence={sha,catalog:793,baselinePreserved:574,additions:219,package7to14:218,menemen:1,trackedNodeModules:false,protectedCodeUnchanged:true,pagesChangesExcluded:true,package15PlusExcluded:true};
writeFileSync('catalog-evidence.json',JSON.stringify(evidence,null,2));console.log(evidence);
