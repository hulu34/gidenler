import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
const folder='pr39-cloud-evidence';mkdirSync(folder,{recursive:true});const out=[];
for(const test of ['anasayfatest.ts','medyatest.ts','restoranpakettest.ts']){
 const runs={};for(const set of ['baseline','candidate']){
 const r=spawnSync('./node_modules/.bin/tsx',['scripts/'+test],{cwd:'../'+set,encoding:'utf8',timeout:180000});
 const log=r.stdout+r.stderr;writeFileSync(folder+'/'+set+'-'+test+'.log',log);
 const failures=log.split('\n').filter(l=>l.includes('✗')).map(l=>l.trim());
 const summary=log.split('\n').filter(l=>/geçti.*kaldı/.test(l));
 runs[set]={exit:r.status,failures,summary};assert.equal(r.status,1,set+' '+test+' must disclose known failure');assert(failures.length>0);
 }
 assert.deepEqual(runs.candidate.failures,runs.baseline.failures,test+' NEW FAILURE');assert.deepEqual(runs.candidate.summary,runs.baseline.summary,test+' changed count');out.push({test,...runs,knownFailureUnchanged:true});
}
writeFileSync(folder+'/known-baseline-failures.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));
