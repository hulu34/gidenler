import { aiConfig } from "./config";

/* ──────────────────────────────────────────────────────────────────────────
   YANIT ÖNBELLEĞİ — benzer sorgular tekrar modele gitmez.
   · Anahtar: normalize sorgu + yapısal alanlar + takip + profil özeti karması (kimlik yok).
   · Zaman duyarlı sorgular ("şu an açık mı", "bu akşam", "bugün", saat) → kısa TTL.
   · Bellek içi (tek örnek). Çok örnekli üretimde `CacheStore` arayüzünü KV ile uygulayın.
   ────────────────────────────────────────────────────────────────────────── */

export interface CacheStore<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlSec: number): Promise<void>;
  clear(): Promise<void>;
}

class MemoryCache<T> implements CacheStore<T> {
  private m = new Map<string, { v: T; exp: number }>();
  async get(key: string) { const e = this.m.get(key); if (!e) return null; if (e.exp < Date.now()) { this.m.delete(key); return null; } return e.v; }
  async set(key: string, v: T, ttlSec: number) { if (this.m.size > 2000) this.m.delete(this.m.keys().next().value as string); this.m.set(key, { v, exp: Date.now() + ttlSec * 1000 }); }
  async clear() { this.m.clear(); }
}

let store: CacheStore<unknown> | null = null;
export function cache<T>(): CacheStore<T> { return (store ??= new MemoryCache<unknown>()) as CacheStore<T>; }
export function setCache(s: CacheStore<unknown>) { store = s; }

const TIME_SENSITIVE = /\b(şu an|su an|şimdi|simdi|hemen|bu ak[şs]am|bug[üu]n|bu gece|az sonra|a[çc][ıi]k m[ıi]|hala a[çc][ıi]k|ka[çc]ta kapan|yar[ıi]n)\b|\b([01]?\d|2[0-3])[.:][0-5]\d\b/i;

/** Sorgu zaman duyarlı mı → kısa TTL. */
export const isTimeSensitive = (q: string) => TIME_SENSITIVE.test(q);

export function ttlFor(q: string): number {
  const c = aiConfig();
  return isTimeSensitive(q) ? c.cacheTtlTimeSensitiveSec : c.cacheTtlSec;
}

/** Normalize anahtar: küçük harf, boşluk sadeleştirme, noktalama temizliği. */
export function cacheKey(parts: Record<string, unknown>): string {
  const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const flat = JSON.stringify(parts, (_k, v) => (typeof v === "string" ? norm(v) : v));
  let h = 5381;
  for (let i = 0; i < flat.length; i++) h = ((h << 5) + h + flat.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ":" + flat.length;
}
