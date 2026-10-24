import { cityRidges, smoothPath } from "@/lib/pulse";
import { periodShort } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────────────────
   İSTANBUL SİSMOGRAFI — hero arka planı. Her çizgi bir semt; yükseklik o ayki toplam deneyim.
   Süs gibi görünür ama gerçek veridir (demo veri kümesi). Sunucuda çizilir.
   ────────────────────────────────────────────────────────────────────────── */

export function CityRidgeline({ width = 1180, height = 420, labels = true }: { width?: number; height?: number; labels?: boolean }) {
  const { periods, ridges } = cityRidges(9);
  if (!ridges.length || periods.length < 4) return null;
  const rows = ridges.length;
  const step = height / (rows + 1.6);
  const amp = step * 2.4;
  const left = labels ? 96 : 0;
  const xw = width - left - 8;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img"
      aria-label={`İstanbul'da semt semt aylık deneyim hacmi, ${periodShort(periods[0])}–${periodShort(periods[periods.length - 1])}`}>
      {ridges.map((r, ri) => {
        const base = step * (ri + 1.6);
        /* her semt kendi aralığında ölçeklenir: biçim (mevsimsellik, yükseliş) görünür; mutlak hacim etiketi aria'da */
        const lo = Math.min(...r.values), hi = Math.max(...r.values), span = Math.max(1, hi - lo);
        const pts = r.values.map((v, i) => ({ x: left + (i / (r.values.length - 1)) * xw, y: base - (0.12 + (0.88 * (v - lo)) / span) * amp }));
        const line = smoothPath(pts);
        const area = `${line} L${(left + xw).toFixed(1)},${base} L${left},${base} Z`;
        return (
          <g key={r.district} className="ridge" style={{ animationDelay: `${ri * 90}ms` }}>
            <path d={area} fill="var(--paper)" />
            <path d={line} fill="none" stroke="var(--ink)" strokeOpacity={ri === 0 ? 0.55 : 0.2} strokeWidth={ri === 0 ? 1.4 : 1} pathLength={1} className="pulse-draw" />
            {labels && <text x={0} y={base - 2} className="fill-[var(--ink-3)] text-[11px] font-semibold uppercase tracking-[0.12em]">{r.district}</text>}
          </g>
        );
      })}
    </svg>
  );
}
