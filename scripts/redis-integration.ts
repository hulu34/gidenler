/* REDIS ENTEGRASYON TESTİ — yerelde: KV_REST_API_URL=… KV_REST_API_TOKEN=… npx tsx scripts/redis-integration.ts
   Dağıtımda: korumalı /api/admin/db ucu, { action: "redis-selftest", confirm: "EVET", target: <ortam> }.
   Ayrıntı: lib/usage/selftest.ts */
import { redisSelfTest } from "../lib/usage/selftest";

redisSelfTest().then((r) => {
  if ("skipped" in r) { console.log("KV_REST_API_URL / KV_REST_API_TOKEN yok — test atlandı."); process.exit(2); }
  for (const c of r.checks) console.log(`  ${c.ok ? "✓" : "✗"} ${c.name}`);
  console.log(`\nSonuç: ${r.ok ? "geçti" : "kaldı"} (ad alanı ${r.ns}, diğer ortam anahtarı ${r.otherEnvKeys})`);
  process.exit(r.ok ? 0 : 1);
});
