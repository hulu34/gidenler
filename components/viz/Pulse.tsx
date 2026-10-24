import { fit, smoothPath, type Pulse as PulseData } from "@/lib/pulse";

/* ──────────────────────────────────────────────────────────────────────────
   NABIZ ŞERİDİ — Gidenler'in imzası. Son 12 ayın puan eğrisi.
     · çizgi  = aylık puan (gerçek seri, yumuşatılmış)
     · bant   = uzlaşı: dar bant = gidenler aynı şeyi söylüyor, geniş = görüşler dağınık
     · nokta  = "şimdi"; yükselişteyse vurgu rengi
   Her yerde aynı bileşen: hero, tablo, mekân, arama. Sunucuda çizilir, JS yok.
   ────────────────────────────────────────────────────────────────────────── */

export function Pulse({ pulse, width = 120, height = 28, band = true, draw = false, label, className = "" }: {
  pulse: PulseData; width?: number; height?: number; band?: boolean; draw?: boolean; label?: string; className?: string;
}) {
  const pts = fit(pulse.line, width, height, 3);
  const d = smoothPath(pts);
  const bh = pulse.band * (height - 6);
  const top = smoothPath(pts.map((p) => ({ x: p.x, y: Math.max(1, p.y - bh) })));
  const bot = smoothPath([...pts].reverse().map((p) => ({ x: p.x, y: Math.min(height - 1, p.y + bh) }))).replace(/^M/, "L");
  const last = pts[pts.length - 1];
  const color = pulse.direction === "up" ? "var(--accent)" : pulse.direction === "down" ? "var(--neg)" : "var(--ink-2)";
  const first = pulse.raw[0], end = pulse.raw[pulse.raw.length - 1];
  const aria = label ?? `Son ${pulse.raw.length} ayda puan ${first.score.toFixed(1)} → ${end.score.toFixed(1)}; ${pulse.volume} deneyim`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={aria} className={`overflow-visible ${className}`}>
      {band && <path d={`${top} ${bot} Z`} fill="var(--ink)" opacity={0.07} />}
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} className={draw ? "pulse-draw" : undefined} />
      <circle cx={last.x} cy={last.y} r={2.6} fill={color} className={draw ? "pulse-dot" : undefined} />
      {pulse.direction === "up" && <circle cx={last.x} cy={last.y} r={2.6} fill="none" stroke={color} className="pulse-ping" />}
    </svg>
  );
}
