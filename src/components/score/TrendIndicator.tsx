import type { DimensionTrend } from "@/lib/types";

const glyph = { up: "↑", down: "↓", flat: "→" } as const;

/**
 * Trend, renkle birlikte HER ZAMAN bir ok taşır — renk körlüğünde de okunur.
 */
export function TrendIndicator({
  direction,
  delta,
  showValue = false,
  className = "",
}: {
  direction: DimensionTrend["direction"];
  delta?: number;
  showValue?: boolean;
  className?: string;
}) {
  const color =
    direction === "up" ? "text-pos-ink" : direction === "down" ? "text-neg-ink" : "text-ink-3";
  const label =
    direction === "up" ? "yükseliyor" : direction === "down" ? "düşüyor" : "yatay";
  return (
    <span className={`inline-flex items-center gap-1 tnum ${color} ${className}`}>
      <span aria-hidden>{glyph[direction]}</span>
      {showValue && delta !== undefined && delta !== 0 && (
        <span className="text-[12px] font-semibold">
          {delta > 0 ? "+" : ""}
          {delta.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}
