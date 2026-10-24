import { getTopicIntelligence, listCards, inIstanbul, type EntityCard } from "@/lib/api";
import type { TimelinePoint } from "@/lib/types";

/* ──────────────────────────────────────────────────────────────────────────
   NABIZ — Gidenler'in imza görseli için veri katmanı.
   Bir mekân tek bir puan değildir; aylık deneyim serisidir. Buradaki her şekil
   gerçek zaman serisinden türetilir: süs değil, veri.
     · pulseOf(entityId)   → normalize nokta dizisi (puan, hacim) + yön
     · smoothPath(points)  → catmull-rom → kübik bezier SVG path (d3'süz)
     · cityRidges()        → semt başına toplam deneyim hacmi serisi (hero sismografı)
   ────────────────────────────────────────────────────────────────────────── */

export interface PulsePoint { x: number; y: number }
export interface Pulse {
  /** 0–1 aralığında normalize puan eğrisi (y: 0 üst, 1 alt). */
  line: PulsePoint[];
  /** Uzlaşı bandı yarı kalınlığı (0–1, y biriminde). */
  band: number;
  /** Ham seri (etiketler, erişilebilir metin). */
  raw: TimelinePoint[];
  direction: "up" | "down" | "flat";
  delta: number;
  /** Toplam deneyim (seri boyunca). */
  volume: number;
}

/** Catmull-Rom → kübik bezier. Noktalar zaten piksel uzayında. */
export function smoothPath(pts: PulsePoint[], tension = 0.5): string {
  if (pts.length < 2) return "";
  const p = pts;
  let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const t = tension / 3;
    const c1x = p1.x + (p2.x - p0.x) * t, c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t, c2y = p2.y - (p3.y - p1.y) * t;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Kapalı Catmull-Rom (mühür için): son nokta ilk noktaya yumuşakça bağlanır. */
export function smoothClosedPath(p: PulsePoint[], tension = 0.5): string {
  const n = p.length; if (n < 3) return "";
  const at = (i: number) => p[(i + n) % n];
  const t = tension / 3;
  let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += ` C${(p1.x + (p2.x - p0.x) * t).toFixed(1)},${(p1.y + (p2.y - p0.y) * t).toFixed(1)} ${(p2.x - (p3.x - p1.x) * t).toFixed(1)},${(p2.y - (p3.y - p1.y) * t).toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d + " Z";
}

/** Bir mekânın nabzı. Seri yoksa null (uydurma eğri çizilmez). */
export function pulseOf(entityId: string, months = 12): Pulse | null {
  const it = getTopicIntelligence(entityId);
  const raw = (it?.timeline ?? []).slice(-months);
  if (raw.length < 4) return null;
  const scores = raw.map((r) => r.score);
  const lo = Math.min(...scores) - 0.3, hi = Math.max(...scores) + 0.3;
  const span = Math.max(0.8, hi - lo);
  const line = raw.map((r, i) => ({ x: i / (raw.length - 1), y: 1 - (r.score - lo) / span }));
  const pol = it?.consensus?.polarization ?? 0.3;
  const delta = raw[raw.length - 1].score - raw[0].score;
  return {
    line, band: 0.06 + pol * 0.22, raw,
    direction: delta > 0.2 ? "up" : delta < -0.2 ? "down" : "flat",
    delta: Math.round(delta * 10) / 10,
    volume: raw.reduce((a, r) => a + r.experienceCount, 0),
  };
}

/** Pulse'ı verilen kutuya ölçekler. */
export function fit(line: PulsePoint[], w: number, h: number, pad = 2): PulsePoint[] {
  return line.map((p) => ({ x: pad + p.x * (w - pad * 2), y: pad + p.y * (h - pad * 2) }));
}

/* ───── hero sismografı: semt × ay deneyim hacmi ───── */
export interface Ridge { district: string; values: number[]; total: number }
let ridgeCache: { periods: string[]; ridges: Ridge[] } | null = null;  // tüm semtler; limit çağrıda uygulanır

export function cityRidges(limit = 9): { periods: string[]; ridges: Ridge[] } {
  if (ridgeCache) return { periods: ridgeCache.periods, ridges: ridgeCache.ridges.slice(0, limit) };
  const byDistrict = new Map<string, Map<string, number>>();
  const periods = new Set<string>();
  for (const c of listCards().filter(inIstanbul)) {
    const d = c.entity.location?.district; if (!d) continue;
    const tl = getTopicIntelligence(c.entity.id)?.timeline ?? [];
    const m = byDistrict.get(d) ?? new Map<string, number>();
    for (const p of tl) { m.set(p.period, (m.get(p.period) ?? 0) + p.experienceCount); periods.add(p.period); }
    byDistrict.set(d, m);
  }
  const ps = [...periods].sort().slice(-14);
  const ridges = [...byDistrict].map(([district, m]) => {
    const values = ps.map((p) => m.get(p) ?? 0);
    return { district, values, total: values.reduce((a, b) => a + b, 0) };
  }).sort((a, b) => b.total - a.total);
  ridgeCache = { periods: ps, ridges };
  return { periods: ps, ridges: ridges.slice(0, limit) };
}

/** Son 30 günde (son dönem) kaydedilen deneyim — hero satırı için; demo verisi olarak etiketlenir. */
export function lastPeriodVolume(): { period: string; count: number } {
  const { periods, ridges } = cityRidges(50);
  const i = periods.length - 1;
  return { period: periods[i] ?? "", count: ridges.reduce((a, r) => a + (r.values[i] ?? 0), 0) };
}

/** Yükselenler: yeterli kanıtı olan, 90 günde en çok yükselen İstanbul kayıtları. */
export function risers(n = 8): Array<{ card: EntityCard; pulse: Pulse }> {
  return listCards()
    .filter((c) => inIstanbul(c) && c.category.compliance.showScores && c.score !== null && c.experienceCount >= 40 && c.delta90d > 0.2)
    .sort((a, b) => b.delta90d - a.delta90d || b.experienceCount - a.experienceCount)
    .map((card) => ({ card, pulse: pulseOf(card.entity.id) }))
    .filter((x): x is { card: EntityCard; pulse: Pulse } => !!x.pulse)
    .slice(0, n);
}
