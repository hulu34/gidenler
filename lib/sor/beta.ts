import { createHmac } from "node:crypto";
import { getRedis, redisNs } from "@/lib/usage/redis";

/* SOR GİDENLER BETA · GÜNLÜK AI HAKKI VE ÖLÇÜM
   · Günde en çok 40 AI yanıtı (site geneli) ve kullanıcı başına 5. Sınırlar kodda; ortam değişkeniyle yalnız DÜŞÜRÜLEBİLİR.
   · Kullanıcı = IP adresinin o güne ait tuzlu özeti (HMAC). Düz IP, sorgu metni ya da çerez tutulmaz; anahtar 26 saatte silinir.
   · Hak, model çağrılmadan önce ayrılır; AI yanıtı üretilemezse geri verilir.
   · Ölçüm yalnız sayaçtır (gün × sonuç türü): kişisel veri, sorgu metni, mekân seçimi yazılmaz. 35 gün tutulur. */
export const GUNLUK_AI = 40, KULLANICI_AI = 5;
const lower = (v: string | undefined, max: number) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n < max ? Math.floor(n) : max; };
export const gunlukSinir = () => lower(process.env.SOR_GUNLUK_AI, GUNLUK_AI);
export const kullaniciSinir = () => lower(process.env.SOR_KULLANICI_AI, KULLANICI_AI);

const gun = (d = new Date()) => d.toISOString().slice(0, 10);
/** Tuz yoksa kullanıcı anahtarı üretilmez (kullanıcı sınırı yerine yalnız site sınırı uygulanır). */
export function kullaniciAnahtari(ip: string | null): string | null {
  const tuz = process.env.SOR_OLCUM_TUZ;
  if (!ip || !tuz) return null;
  return createHmac("sha256", tuz).update(`${gun()}|${ip}`).digest("base64url").slice(0, 22);
}

const LUA = `
local g = tonumber(redis.call('GET', KEYS[1]) or '0')
if g >= tonumber(ARGV[1]) then return 1 end
if KEYS[2] ~= '' then
  local u = tonumber(redis.call('GET', KEYS[2]) or '0')
  if u >= tonumber(ARGV[2]) then return 2 end
  redis.call('INCR', KEYS[2]); redis.call('EXPIRE', KEYS[2], 93600)
end
redis.call('INCR', KEYS[1]); redis.call('EXPIRE', KEYS[1], 172800)
return 0`;
const mem = new Map<string, number>();
export type Hak = { ok: true; keys: [string, string] } | { ok: false; why: "gunluk" | "kullanici" | "store" };

/** Bir AI yanıtı hakkı ayırır. ok:false → model çağrılmaz, kurallı öneri gösterilir. */
export async function hakAyir(kullanici: string | null): Promise<Hak> {
  const base = `${redisNs()}:sor:beta:${gun()}`, g = `${base}:toplam`, u = kullanici ? `${base}:k:${kullanici}` : "";
  const redis = getRedis();
  if (redis) {
    try {
      const r = Number(await redis.eval(LUA, [g, u], [String(gunlukSinir()), String(kullaniciSinir())]));
      return r === 0 ? { ok: true, keys: [g, u] } : { ok: false, why: r === 1 ? "gunluk" : "kullanici" };
    } catch { return { ok: false, why: "store" }; }
  }
  if (process.env.VERCEL_ENV === "production") return { ok: false, why: "store" };
  if ((mem.get(g) ?? 0) >= gunlukSinir()) return { ok: false, why: "gunluk" };
  if (u && (mem.get(u) ?? 0) >= kullaniciSinir()) return { ok: false, why: "kullanici" };
  mem.set(g, (mem.get(g) ?? 0) + 1); if (u) mem.set(u, (mem.get(u) ?? 0) + 1);
  return { ok: true, keys: [g, u] };
}
/** AI yanıtı üretilemediyse hak geri verilir. */
export async function hakIade(h: Hak) {
  if (!h.ok) return;
  const redis = getRedis(), ks = h.keys.filter(Boolean);
  if (redis) { try { await redis.eval("for i = 1, #KEYS do local v = tonumber(redis.call('GET', KEYS[i]) or '0'); if v > 0 then redis.call('DECR', KEYS[i]) end end return 1", ks, []); } catch { /* güvenli yön: hak harcanmış sayılır */ } return; }
  for (const k of ks) mem.set(k, Math.max(0, (mem.get(k) ?? 0) - 1));
}

/* ölçüm: yalnız bu türler sayılır */
export const OLAYLAR = ["istek", "ai", "veri_not_configured", "veri_budget", "veri_quota", "veri_timeout", "veri_provider_error", "veri_invalid_output", "veri_ai_no_pick", "veri_gunluk", "veri_kullanici",
  "kapsam_disi", "kart_yok", "kapi_dusurdu", "hata", "sure_2s", "sure_5s", "sure_uzun"] as const;
export type Olay = (typeof OLAYLAR)[number];
const omem = new Map<string, number>();
export async function olay(...tur: Olay[]) {
  const redis = getRedis(), base = `${redisNs()}:sor:olcum:${gun()}`;
  for (const t of tur) {
    if (redis) { try { await redis.eval("redis.call('INCR', KEYS[1]); redis.call('EXPIRE', KEYS[1], 3024000); return 1", [`${base}:${t}`], []); continue; } catch { /* ölçüm yanıtı bozmaz */ } }
    omem.set(`${base}:${t}`, (omem.get(`${base}:${t}`) ?? 0) + 1);
  }
}
export async function olcumOku(gunSayisi = 7) {
  const redis = getRedis(), out: Record<string, Record<string, number>> = {};
  for (let i = 0; i < Math.min(gunSayisi, 35); i++) {
    const d = gun(new Date(Date.now() - i * 864e5)), base = `${redisNs()}:sor:olcum:${d}`, row: Record<string, number> = {};
    for (const t of OLAYLAR) {
      let v = omem.get(`${base}:${t}`) ?? 0;
      if (redis) { try { v = Number((await redis.get(`${base}:${t}`)) ?? 0); } catch { /* boş */ } }
      if (v) row[t] = v;
    }
    let hak = 0; if (redis) { try { hak = Number((await redis.get(`${redisNs()}:sor:beta:${d}:toplam`)) ?? 0); } catch { /* boş */ } }
    out[d] = { ...row, ai_hakki_kullanilan: hak, ai_hakki_sinir: gunlukSinir() };
  }
  return out;
}
/** Yalnız testler için. */
export const resetBetaForTests = () => { mem.clear(); omem.clear(); };
