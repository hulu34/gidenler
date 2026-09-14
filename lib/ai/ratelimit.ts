import { aiConfig } from "./config";
import { hashKey } from "./privacy";

/* ──────────────────────────────────────────────────────────────────────────
   RATE LIMIT — IP ve oturum başına dakika + gün penceresi (sabit pencere sayaçları).
   Anahtarlar karma yapılır; düz IP tutulmaz. Bellek içi; çok örnekte KV ile değiştirilebilir (`RateStore`).
   ────────────────────────────────────────────────────────────────────────── */

export interface RateStore {
  /** Sayaç artır ve yeni değeri döndür; pencere anahtarı zaten dahil. */
  incr(key: string, ttlSec: number): Promise<number>;
  reset(): Promise<void>;
}

class MemoryRate implements RateStore {
  private m = new Map<string, { n: number; exp: number }>();
  async incr(key: string, ttlSec: number) {
    const now = Date.now(); const e = this.m.get(key);
    if (!e || e.exp < now) { this.m.set(key, { n: 1, exp: now + ttlSec * 1000 }); if (this.m.size > 50000) this.sweep(now); return 1; }
    e.n++; return e.n;
  }
  private sweep(now: number) { for (const [k, v] of this.m) if (v.exp < now) this.m.delete(k); }
  async reset() { this.m.clear(); }
}

let store: RateStore | null = null;
export const rateStore = () => (store ??= new MemoryRate());
export function setRateStore(s: RateStore) { store = s; }

export interface RateResult { allowed: boolean; scope?: "ip" | "session"; window?: "minute" | "day"; retryAfterSec?: number }

/** İstek sayılır ve karar verilir. Oturum yoksa yalnızca IP. */
export async function checkRate(ip: string | null, sessionId: string | null): Promise<RateResult> {
  const cfg = aiConfig(); const s = rateStore();
  const minute = Math.floor(Date.now() / 60000), day = Math.floor(Date.now() / 86400000);
  const subjects: Array<["ip" | "session", string]> = [];
  if (ip) subjects.push(["ip", hashKey("ip:" + ip)]);
  if (sessionId) subjects.push(["session", hashKey("s:" + sessionId)]);
  if (!subjects.length) subjects.push(["ip", "anon"]);
  for (const [scope, k] of subjects) {
    const m = await s.incr(`${k}:m${minute}`, 65);
    if (m > cfg.rateLimitPerMinute) return { allowed: false, scope, window: "minute", retryAfterSec: 60 - (Math.floor(Date.now() / 1000) % 60) };
    const d = await s.incr(`${k}:d${day}`, 86400);
    if (d > cfg.rateLimitPerDay) return { allowed: false, scope, window: "day", retryAfterSec: 86400 - (Math.floor(Date.now() / 1000) % 86400) };
  }
  return { allowed: true };
}
