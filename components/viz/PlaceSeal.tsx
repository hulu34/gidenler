import { smoothClosedPath, type Pulse } from "@/lib/pulse";

/* ──────────────────────────────────────────────────────────────────────────
   MÜHÜR — mekânın parmak izi. Aynı aylık seri bir daireye sarılır:
   yarıçap = o ayın puanı, dış çentikler = o ayın deneyim hacmi.
   Her mekân için deterministik ve tekildir; fotoğrafın yerini alır (telif yok, uydurma yok).
   ────────────────────────────────────────────────────────────────────────── */

export function PlaceSeal({ pulse, size = 120, label }: { pulse: Pulse; size?: number; label?: string }) {
  const c = size / 2, r0 = size * 0.2, amp = size * 0.17;
  const n = pulse.raw.length;
  const maxV = Math.max(...pulse.raw.map((p) => p.experienceCount), 1);
  const angle = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pts = pulse.line.map((p, i) => {
    const r = r0 + (1 - p.y) * amp + amp * 0.35;
    return { x: c + Math.cos(angle(i)) * r, y: c + Math.sin(angle(i)) * r };
  });
  const closed = smoothClosedPath(pts);
  const ticks = pulse.raw.map((p, i) => {
    const a = angle(i), rIn = size * 0.43, rOut = rIn + (p.experienceCount / maxV) * size * 0.06 + 1.5;
    return <line key={i} x1={c + Math.cos(a) * rIn} y1={c + Math.sin(a) * rIn} x2={c + Math.cos(a) * rOut} y2={c + Math.sin(a) * rOut} stroke="var(--ink)" strokeWidth={1.2} strokeLinecap="round" />;
  });
  const color = pulse.direction === "up" ? "var(--accent)" : pulse.direction === "down" ? "var(--neg)" : "var(--ink)";
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={label ?? "Mekânın deneyim mührü: son aylardaki puan ve hacim"} className="shrink-0">
      <circle cx={c} cy={c} r={size * 0.47} fill="none" stroke="var(--line-2)" strokeWidth={0.8} />
      <circle cx={c} cy={c} r={r0 + amp * 0.35} fill="none" stroke="var(--line)" strokeWidth={0.8} strokeDasharray="1.5 2.5" />
      {ticks}
      <path d={closed} fill="var(--ink)" fillOpacity={0.06} stroke={color} strokeWidth={1.6} strokeLinejoin="round" pathLength={1} className="pulse-draw" />
      <circle cx={c} cy={c} r={2.2} fill={color} />
    </svg>
  );
}
