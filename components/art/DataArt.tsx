import { cityRidges, smoothClosedPath, smoothPath, type Pulse } from "@/lib/pulse";

/* ──────────────────────────────────────────────────────────────────────────
   VERİ SANATI — arka plan katmanı. Ödüllü veri-sanatı geleneğinden (Joy Division "Unknown Pleasures"
   sırt çizgileri, Bauhaus daire–çizgi kompozisyonu, Refik Anadol'un veriden resim fikri) ilham alır;
   kopyalamaz. Her çizgi Gidenler verisinden üretilir: süs değil, veri. Fotoğraf/telif yok.
   Tamamı sunucuda çizilen SVG; hareket yalnızca yavaş transform (hareket azaltılınca durur).
   ────────────────────────────────────────────────────────────────────────── */

/** İSTANBUL KOMPOZİSYONU — ana sayfa arka planı: semtlerin aylık deneyim sırtları + vurgu güneşi + eğik cetvel. */
export function CityArt({ width = 1440, height = 620 }: { width?: number; height?: number }) {
  const { ridges } = cityRidges(14);
  if (!ridges.length) return null;
  const rows = ridges.length;
  const top = height * 0.18, step = (height * 0.78) / rows, amp = step * 3.2;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="art-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
          <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.07" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="art-drift">
        <circle cx={width * 0.78} cy={height * 0.34} r={height * 0.36} fill="url(#art-sun)" />
        <circle cx={width * 0.78} cy={height * 0.34} r={height * 0.24} fill="none" stroke="var(--accent)" strokeOpacity={0.35} strokeWidth={1} />
      </g>
      <line x1={width * 0.52} y1={0} x2={width * 0.98} y2={height} stroke="var(--ink)" strokeOpacity={0.08} strokeWidth={1} />
      {ridges.map((r, ri) => {
        const base = top + step * (ri + 1);
        const lo = Math.min(...r.values), hi = Math.max(...r.values), span = Math.max(1, hi - lo);
        /* sırtı ortada yoğunlaştır (Unknown Pleasures biçimi): kenarlarda düz, ortada veri */
        const n = r.values.length, x0 = width * 0.04, xw = width * 0.92;
        const pts = [{ x: x0, y: base }, ...r.values.map((v, i) => {
          const t = i / (n - 1), env = Math.sin(Math.PI * (0.15 + t * 0.7)) ** 2;
          return { x: x0 + xw * (0.15 + t * 0.7), y: base - env * (0.1 + (0.9 * (v - lo)) / span) * amp };
        }), { x: x0 + xw, y: base }];
        const line = smoothPath(pts, 0.6);
        return (
          <g key={r.district}>
            <path d={`${line} L${x0 + xw},${height} L${x0},${height} Z`} fill="var(--paper)" />
            <path d={line} fill="none" stroke="var(--ink)" strokeOpacity={ri % 4 === 0 ? 0.42 : 0.16} strokeWidth={ri % 4 === 0 ? 1.3 : 0.9} pathLength={1} className="pulse-draw" style={{ animationDelay: `${ri * 60}ms` }} />
          </g>
        );
      })}
    </svg>
  );
}

/** MEKÂN TABLOSU — mekânın kendi serisinden halkalar: her halka bir ay, biçim puanı, kalınlık hacmi taşır. */
export function VenueArt({ pulse, size = 560 }: { pulse: Pulse; size?: number }) {
  const c = size / 2, n = pulse.raw.length;
  const maxV = Math.max(...pulse.raw.map((p) => p.experienceCount), 1);
  const rings = pulse.raw.map((p, k) => {
    const rBase = size * (0.12 + (0.34 * (k + 1)) / n);
    const pts = Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2;
      /* deterministik dalga: ayın puanı (pulse.line[k].y) ve sırası halkayı büker */
      const wob = Math.sin(a * 3 + k * 0.9) * (1 - pulse.line[k].y) * size * 0.022 + Math.cos(a * 5 - k) * size * 0.006;
      return { x: c + Math.cos(a) * (rBase + wob), y: c + Math.sin(a) * (rBase + wob) };
    });
    const last = k === n - 1;
    return <path key={p.period} d={smoothClosedPath(pts)} fill="none"
      stroke={last ? (pulse.direction === "down" ? "var(--neg)" : "var(--accent)") : "var(--ink)"}
      strokeOpacity={last ? 0.55 : 0.1 + (0.18 * p.experienceCount) / maxV} strokeWidth={last ? 1.6 : 0.6 + (1.6 * p.experienceCount) / maxV} />;
  });
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden className="art-spin">
      <circle cx={c} cy={c} r={size * 0.1} fill="var(--accent)" fillOpacity={0.08} />
      {rings}
    </svg>
  );
}
