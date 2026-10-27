import { getRedis, redisNs } from "./redis";
import { reserve, periodKeys, budgetFor } from "./counter";
import { strictHit } from "./rate";

/* ──────────────────────────────────────────────────────────────────────────
   REDIS ÖZ TESTİ — gerçek Redis'te kota koruması, diğer ortamlara dokunmadan.
   · Yalnız bu ortamın ad alanında, 2099 tarihli test anahtarları; sonunda hepsi silinir.
   · Diğer ortamların (ör. prod:) anahtar + değerleri test öncesi ve sonrası karşılaştırılır.
   · Google'a çağrı yapılmaz. Değer döndürülmez, yalnız sayılar ve geçti/kaldı.
   ────────────────────────────────────────────────────────────────────────── */
export async function redisSelfTest() {
  const r = getRedis();
  if (!r) return { ok: false, skipped: "no_redis" as const, checks: [] as Array<{ name: string; ok: boolean }> };
  const checks: Array<{ name: string; ok: boolean; info?: unknown }> = [];
  const ns = redisNs();
  const at = new Date(Date.UTC(2099, 0, 1, 12));
  const key = "google:details_atmosphere" as const;
  const k = periodKeys(key, at);
  const rlKey = `itest-${Date.now()}`;
  const SNAP = `local out = {} for _, k in ipairs(redis.call('KEYS', '*')) do
    if string.sub(k, 1, ${ns.length + 1}) ~= '${ns}:' then
      local t = redis.call('TYPE', k)['ok'] local v = '' if t == 'string' then v = redis.call('GET', k) end
      table.insert(out, k .. '=' .. v) end end table.sort(out) return out`;
  const before = (await r.eval(SNAP, [], [])) as string[];
  try {
    const day = budgetFor(key).daily;
    let granted = 0;
    for (let i = 0; i < day + 3; i++) if ((await reserve(key, 1, at)).ok) granted++;
    checks.push({ name: `günlük sınır tutuyor (${day})`, ok: granted === day, info: granted });
    const [m, d] = await r.mget<(string | null)[]>(k.month, k.day);
    checks.push({ name: "reddedilen istek sayaca yazılmadı", ok: Number(d) === day && Number(m) === day });
    checks.push({ name: "anahtar ortam önekli", ok: k.day.startsWith(`${ns}:usage:`) });
    let allowed = 0;
    for (let i = 0; i < 5; i++) if (await strictHit(rlKey, 3, 60)) allowed++;
    checks.push({ name: "hız sınırı tutuyor (3/5)", ok: allowed === 3, info: allowed });
  } finally {
    await r.eval("for _, k in ipairs(KEYS) do redis.call('DEL', k) end return 1", [k.month, k.day, `${ns}:rl:${rlKey}`], []);
  }
  const left = Number(await r.eval(`local n = 0 for _ in ipairs(redis.call('KEYS', '${ns}:*2099*')) do n = n + 1 end
    return n + redis.call('EXISTS', KEYS[1])`, [`${ns}:rl:${rlKey}`], []));
  checks.push({ name: "test anahtarlarının tamamı silindi", ok: left === 0, info: left });
  const after = (await r.eval(SNAP, [], [])) as string[];
  checks.push({ name: "diğer ortam anahtarları değişmedi", ok: JSON.stringify(before) === JSON.stringify(after), info: { before: before.length, after: after.length } });
  return { ok: checks.every((c) => c.ok), ns, otherEnvKeys: before.length, checks };
}
