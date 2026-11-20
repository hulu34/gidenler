// One exact, read-only protected deployment; no database or AI credentials.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const origin='https://gidenler-r06xrmo64-hulu34.vercel.app';
const sourceSha='238995b6b08cf3e5fe0d0fcffe1b53fa90cccfc0';
const previewHost='ep-proud-mud-ba4yqh9k.c-8.eu-central-1.aws.neon.tech';
const productionHost='ep-odd-lab-bavis0d8.c-8.eu-central-1.aws.neon.tech';
const variants=h=>[h,h.replace('.', '-pooler.')];
const fp=h=>createHash('sha256').update(h).digest('hex').slice(0,16);
const previewFingerprints=variants(previewHost).map(fp), productionFingerprints=variants(productionHost).map(fp);
const token=process.env.VERCEL_BYPASS;
let passed=false;
try {
 assert(token,'existing_preview_access_required');
 const unauthorized=await fetch(origin+'/',{redirect:'manual',signal:AbortSignal.timeout(20000)});
 assert([302,401,403].includes(unauthorized.status),'preview_protection_required');
 await unauthorized.body?.cancel();
 const r=await fetch(origin+'/api/admin/db/?rapor=masamoro-preview',{method:'GET',redirect:'error',headers:{'x-vercel-protection-bypass':token},signal:AbortSignal.timeout(30000)});
 assert.equal(r.status,200,'bounded_read_endpoint_unavailable');
 const report=await r.json();
 assert.equal(report.env,'preview');assert.equal(report.sourceSha,sourceSha);
 assert(previewFingerprints.includes(report.db.fingerprint),'physical_preview_compute_mismatch');
 assert(!productionFingerprints.includes(report.db.fingerprint),'production_compute_forbidden');
 if(report.db.branchId!==null)assert.equal(report.db.branchId,'br-lucky-fog-babqtpma');
 assert.equal(report.db.counts.places,892);assert.equal(report.db.counts.pilot_rows,0);
 assert.equal(report.pilot.count,1);assert.equal(report.pilot.slug,'masamoro-lefkosa-guney-kibris');
 const run=spawnSync(process.execPath,[process.env.CANDIDATE_DRIVER],{stdio:'inherit',timeout:300000,env:{...process.env,PREVIEW_URL:origin,EXPECTED_APPLICATION_SHA:sourceSha,EXPECTED_PREVIEW_DB_FINGERPRINT:report.db.fingerprint,PRODUCTION_DB_FINGERPRINT:productionFingerprints[0],EXPECTED_NEON_BRANCH:'br-lucky-fog-babqtpma'}});
 assert.equal(run.status,0,'browser_acceptance_failed');passed=true;
} catch {console.log(JSON.stringify({accepted:false,stage:'exact_isolated_preview_or_browser_gate',applicationSha:sourceSha,writesSent:0}));process.exitCode=1;}
if(passed)console.log(JSON.stringify({accepted:true,stage:'exact_isolated_preview_and_browser',applicationSha:sourceSha,writesSent:0}));
