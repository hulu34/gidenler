/* ==========================================================================
   REDIS ENTEGRASYON TESTİ — gerçek Upstash'e karşı kota koruması.
   Kullanım: KV_REST_API_URL=… KV_REST_API_TOKEN=… npx tsx scripts/redis-integration.ts
   · Yalnız 2099 tarihli, teste özgü anahtarlar kullanılır (gerçek gün/ay sayaçlarına dokunmaz)
     ve sonunda silinir. Google'a hiçbir çağrı yapılmaz.
   ========================================================================== */
import { getRedis, redisNs } from "../lib/usage/redis";
import { reserve, periodKeys, budgetFor } from "../lib/usage/counter";
import { strictHit } from "../lib/usage/rate";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, info?: unknown) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name}`, info ?? ""); }
};

async function main() {
  const r = getRedis();
  if (!r) { console.log("KV_REST_API_URL / KV_REST_API_TOKEN yok — test atlandı."); process.exit(2); }
  const at = new Date(Date.UTC(2099, 0, 1, 12));
  const key = "google:details_atmosphere" as const;
  const k = periodKeys(key, at);
  const rlKey = `itest-${Date.now()}`;
  console.log(`ortam ad alanı: ${redisNs()} · anahtar: ${k.day}`);
  try {
    const day = budgetFor(key).daily;
    let granted = 0;
    for (let i = 0; i < day + 3; i++) if ((await reserve(key, 1, at)).ok) granted++;
    ok(`günlük sınır gerçek Redis'te tutuyor (${day})`, granted === day, granted);
    const [m, d] = await r.mget<(string | null)[]>(k.month, k.day);
    ok("reddedilen istek sayaca yazılmadı", Number(d) === day && Number(m) === day, { m, d });
    ok("anahtar ortam önekli", k.day.startsWith(`${redisNs()}:usage:`));
    let allowed = 0;
    for (let i = 0; i < 5; i++) if (await strictHit(rlKey, 3, 60)) allowed++;
    ok("hız sınırı gerçek Redis'te tutuyor (3/5)", allowed === 3, allowed);
  } finally {
    await r.eval("for _, k in ipairs(KEYS) do redis.call('DEL', k) end return 1", [k.month, k.day, `${redisNs()}:rl:${rlKey}`], []);
  }
  const [m2] = await r.mget<(string | null)[]>(k.month);
  ok("test anahtarları temizlendi", m2 === null, m2);
  console.log(`\nSonuç: ${pass} geçti, ${fail} kaldı`);
  process.exit(fail ? 1 : 0);
}
main();
