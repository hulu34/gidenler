"use client";

import { useSyncExternalStore } from "react";
import { clampThreshold, processEvent, type ScoreEvent, type ThresholdNotice, type ThresholdPref, type ThresholdState } from "@/lib/threshold";

/* ==========================================================================
   DENEME EŞİĞİ · DEMO CİHAZ KAYDI
   Yalnız yatırımcı demosuna ait AYRI bir localStorage anahtarı: normal kullanıcı kaydına (gidenler.v4),
   sunum kaydına (gidenler.demo) ya da hesaba bağlanmaz; sunucuya hiçbir şey gönderilmez.
   Sunum sıfırlanınca / sunum modundan çıkınca temizlenir (lib/store çağırır).
   ========================================================================== */

const KEY = "gidenler.demo.esik.v1";

export interface ScenarioResult { from: number; to: number; eventId: string; state: ThresholdState; message: string; at: string; created: boolean }
export interface ThresholdData {
  prefs: Record<string, ThresholdPref>;
  notices: ThresholdNotice[];
  /** /demo'dan canlandırılan son senaryo — gerçek puanı değiştirmez, kartta "sunum senaryosu" olarak görünür */
  scenarios: Record<string, ScenarioResult>;
}

const empty = (): ThresholdData => ({ prefs: {}, notices: [], scenarios: {} });
let cache: ThresholdData | null = null;
const listeners = new Set<() => void>();
const today = () => new Date().toISOString().slice(0, 10);

function read(): ThresholdData {
  if (cache) return cache;
  if (typeof window === "undefined") return empty();
  try {
    const p = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<ThresholdData> | null;
    cache = {
      prefs: p && typeof p.prefs === "object" && p.prefs ? Object.fromEntries(Object.entries(p.prefs).filter(([, t]) => t && typeof t.threshold === "number")) : {},
      notices: Array.isArray(p?.notices) ? p!.notices.filter((n) => n && typeof n.eventId === "string") : [],
      scenarios: p && typeof p.scenarios === "object" && p.scenarios ? p.scenarios : {},
    };
  } catch { cache = empty(); }
  return cache;
}
function write(next: ThresholdData) {
  cache = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* özel pencere vb. */ }
  listeners.forEach((l) => l());
}
/* başka sekmede değişirse */
if (typeof window !== "undefined") window.addEventListener("storage", (e) => { if (e.key === KEY) { cache = null; listeners.forEach((l) => l()); } });

const SERVER = empty();
export function useThresholds(): ThresholdData {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, read, () => SERVER);
}

export function setThreshold(entityId: string, threshold: number) {
  const d = read();
  write({ ...d, prefs: { ...d.prefs, [entityId]: { entityId, threshold: clampThreshold(threshold), notify: true, updatedAt: today() } } });
}
export function setThresholdNotify(entityId: string, notify: boolean) {
  const d = read(); const t = d.prefs[entityId];
  if (t) write({ ...d, prefs: { ...d.prefs, [entityId]: { ...t, notify, updatedAt: today() } } });
}
/** Sunum senaryosunu işler; aynı eşik için ikinci bildirim üretilmez (lib/threshold). */
export function runScoreEvent(ev: ScoreEvent, venue: { slug: string; name: string; menu: boolean; reservation: boolean }) {
  const d = read();
  const r = processEvent(d.notices, d.prefs[ev.entityId], ev, venue, new Date().toISOString());
  write({ ...d, notices: r.notices, scenarios: { ...d.scenarios, [ev.entityId]: { from: ev.from, to: ev.to, eventId: ev.id, state: r.state, message: r.message, at: new Date().toISOString(), created: r.created } } });
  return r;
}
export function markNoticeRead(id: string) {
  const d = read();
  write({ ...d, notices: d.notices.map((n) => (n.id === id ? { ...n, read: true } : n)) });
}
/** Sunum başlangıç durumu: eşikler, senaryolar ve bildirimler temizlenir. */
export function resetThresholdDemo() {
  try { window.localStorage.removeItem(KEY); } catch { /* yoksay */ }
  cache = empty();
  listeners.forEach((l) => l());
}
