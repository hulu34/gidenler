import { score1 } from "@/lib/format";
import { getScoreSemantic } from "@/lib/semantic";

const SIZES = {
  hero: "text-[clamp(3.75rem,13vw,6rem)] leading-[0.82] tracking-[-0.055em]",
  xl: "text-[40px] leading-none tracking-[-0.05em]",
  lg: "text-[30px] leading-none tracking-[-0.045em]",
  md: "text-[24px] leading-none tracking-[-0.04em]",
  sm: "text-[17px] leading-none tracking-[-0.02em]",
} as const;

/**
 * PUAN — her yüzeyde aynı dil. Renk kaliteyi söyler; trend rengi ayrıdır.
 * Etiket (Olağanüstü / Çok iyi / …) renge bağımlı olmayan ikinci kanal.
 */
export function ScoreNumber({ score, size = "md", label = false, trend, className = "" }: {
  score: number | null;
  size?: keyof typeof SIZES;
  label?: boolean;
  trend?: { direction: "up" | "down" | "flat"; delta?: number };
  className?: string;
}) {
  if (score === null) return <span className={`text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3 ${className}`}>puan yok</span>;
  const s = getScoreSemantic(score);
  const glyph = trend ? (trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→") : null;
  const tcolor = trend ? (trend.direction === "up" ? "text-pos-ink" : trend.direction === "down" ? "text-neg-ink" : "text-ink-3") : "";
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`} title={`${score1(score)} · ${s.label}`}>
      <span data-score={s.key} {...(size === "hero" ? { "data-score-hero": "" } : {})} className={`tnum font-extrabold ${SIZES[size]} ${s.text}`}>{score1(score)}</span>
      {label ? <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${s.text}`}>{s.label}</span> : <span className="sr-only">{s.label}</span>}
      {trend && glyph && (
        <span className={`tnum inline-flex items-center gap-1 text-[12px] font-bold ${tcolor}`}>
          <span aria-hidden>{glyph}</span>
          {trend.delta !== undefined && trend.delta !== 0 && <span>{trend.delta > 0 ? "+" : ""}{score1(trend.delta)}</span>}
          <span className="sr-only">{trend.direction === "up" ? "yükseliyor" : trend.direction === "down" ? "geriliyor" : "stabil"}</span>
        </span>
      )}
    </span>
  );
}

/** Küçük anlam noktası + etiket — listelerde sayının yanında. */
export function QualityTag({ score }: { score: number }) {
  const s = getScoreSemantic(score);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] ${s.text}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}
