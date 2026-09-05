import type { DecisionReason, DecisionWarning } from "@/lib/types";

/**
 * WHY THIS RESULT — açıklanabilirlik katmanı.
 * Her neden bir kaynak gösterir: kaç deneyim, kaç benzer profil, hangi dönem.
 * Kara kutu değil; kullanıcı "neden %92" sorusunun cevabını görür.
 */
export function WhyThisResult({
  reasons, warnings = [], compact = false, title,
}: {
  reasons: DecisionReason[];
  warnings?: DecisionWarning[];
  compact?: boolean;
  title?: string;
}) {
  if (!reasons.length && !warnings.length) return null;
  const size = compact ? "text-[14px]" : "text-[15px]";
  return (
    <div className="flex flex-col gap-2.5">
      {title && <span className="label">{title}</span>}
      <ul className="flex flex-col gap-1.5">
        {reasons.map((r, i) => (
          <li key={i} className={`flex gap-2.5 leading-snug ${size}`}>
            <span aria-hidden className="mt-px shrink-0 font-bold text-pos-ink">✓</span>
            <span className="min-w-0">
              <span className="text-ink">{r.text}</span>
              {r.source && <span className="ml-2 text-[11.5px] text-ink-3">{r.source}</span>}
            </span>
          </li>
        ))}
        {warnings.map((w, i) => (
          <li key={`w${i}`} className={`flex gap-2.5 leading-snug ${size}`}>
            <span aria-hidden className={`mt-px shrink-0 font-bold ${w.severity === "high" ? "text-neg-ink" : "text-warn"}`}>△</span>
            <span className="min-w-0">
              <span className="text-ink-2">{w.text}</span>
              {w.source && <span className="ml-2 text-[11.5px] text-ink-3">{w.source}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
