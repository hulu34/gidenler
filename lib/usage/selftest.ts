import { getRedis, redisNs } from "./redis";
import { reserve, periodKeys, budgetFor } from "./counter";
import { strictHit } from "./rate";

/* ──────────────────────────────────────────────────────────────────────────
   REDIS ÖZ TESTİ — gerçek Redis'te kota koruması, diğer ortamlara dokunmadan.
   · Yalnız bu ortamın ad alanında, 2099 tarihli test anahtarları; sonunda hepsi silinir.
   · Yazılan anahtarlar yalnız üç tanedir (aylık/günlük test sayacı + test hız anahtarı). Bu üçü DIŞINDAKİ
     tüm anahtarlar (bu ortamın gerçek sayaçları dahil) test öncesi ve sonrası karşılaştırılır; canlı trafik
     bir sayacı değiştirirse test "kaldı" der (güvenli tarafta hata).
   · KEYS yalnız küçük sayaç veritabanı için uygundur; anahtar sayısı 10.000'i aşarsa test çalışmaz.
   · Google'a çağrı yapılmaz. Değer döndürülmez, yalnız sayılar ve geçti/kaldı.
   ────────────────────────────────────────────────────────────────────────── */
export async function redisSelfTest() {
  const r = getRedis();
  if (!r) return { ok: false, skipped: "no_redis" as const, checks: [] as Array<{ name: string; ok: boolean }> };
  const checks: Array<{ name: string; ok: boolean; info?: unknown }> = [];
  const ns = redisNs();
  const at = new Date(Date.UTC(2099, 0, 1, 12));
  const key = "google:details_essentials" as const;    // zamanlanmamış kalem: günlük sınır sabit
  const k = periodKeys(key, at);
  const rlKey = `itest-${Date.now()}`;
  const testKeys = [k.month, k.day, `${ns}:rl:${rlKey}`];
  /* Test anahtarları dışındaki her anahtarın adı + değeri (değerler yanıtta döndürülmez, yalnız karşılaştırılır). */
  const SNAP = `local skip = {} for _, k in ipairs(KEYS) do skip[k] = true end
    local all = redis.call('KEYS', '*') if #all > 10000 then return {'__too_many__'} end
    local out = {} for _, k in ipairs(all) do if not skip[k] then
      local t = redis.call('TYPE', k)['ok'] local v = '' if t == 'string' then v = redis.call('GET', k) end
      table.insert(out, k .. '=' .. v) end end table.sort(out) return out`;
  const before = (await r.eval(SNAP, testKeys, [])) as string[];
  if (before[0] === "__too_many__") return { ok: false, ns, otherEnvKeys: -1, checks: [{ name: "anahtar sayısı çok yüksek — test çalıştırılmadı", ok: false }] };
  const pre = Number(await r.eval("local n = 0 for _, k in ipairs(KEYS) do n = n + redis.call('EXISTS', k) end return n", testKeys, []));
  if (pre !== 0) return { ok: false, ns, otherEnvKeys: before.length, checks: [{ name: "test anahtarı önceden var — çakışma riski, test çalıştırılmadı", ok: false }] };
  try {
    const day = budgetFor(key).daily;
    let granted = 0;
    for (let i = 0; i < day + 3; i++) if ((await reserve(key, 1, at, { durable: false })).ok) granted++;
    checks.push({ name: `günlük sınır tutuyor (${day})`, ok: granted === day, info: granted });
    const [m, d] = await r.mget<(string | null)[]>(k.month, k.day);
    checks.push({ name: "reddedilen istek sayaca yazılmadı", ok: Number(d) === day && Number(m) === day });
    checks.push({ name: "anahtar ortam önekli", ok: k.day.startsWith(`${ns}:usage:`) });
    let allowed = 0;
    for (let i = 0; i < 5; i++) if (await strictHit(rlKey, 3, 60)) allowed++;
    checks.push({ name: "hız sınırı tutuyor (3/5)", ok: allowed === 3, info: allowed });
  } finally {
    await r.eval("for _, k in ipairs(KEYS) do redis.call('DEL', k) end return 1", testKeys, []);
  }
  const left = Number(await r.eval(`local n = 0 for _ in ipairs(redis.call('KEYS', '*2099*')) do n = n + 1 end
    for _, k in ipairs(KEYS) do n = n + redis.call('EXISTS', k) end return n`, testKeys, []));
  checks.push({ name: "test anahtarlarının tamamı silindi", ok: left === 0, info: left });
  const after = (await r.eval(SNAP, testKeys, [])) as string[];
  checks.push({ name: "test dışındaki tüm anahtarlar (gerçek sayaçlar dahil) değişmedi", ok: JSON.stringify(before) === JSON.stringify(after), info: { before: before.length, after: after.length } });
  return { ok: checks.every((c) => c.ok), ns, otherEnvKeys: before.length, checks };
}
