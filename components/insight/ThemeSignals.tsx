import { nf } from "@/lib/format";
import { TrendIndicator } from "@/components/score/TrendIndicator";
import type { ThemeSignal } from "@/lib/types";

/**
 * Övülen / şikayet edilen konular. "Kaç negatif yorum var" değil,
 * "hangi konu, ne kadar, hangi yöne gidiyor".
 */
export function ThemeSignals({
  title,
  hint,
  items,
  tone,
}: {
  title: string;
  hint?: string;
  items: ThemeSignal[];
  tone: "pos" | "neg" | "neutral";
}) {
  if (!items.length) return null;
  const max = Math.max(...items.map((i) => i.count));
  const barPos = tone === "neg" ? "bg-neg" : tone === "pos" ? "bg-pos" : "bg-ink-2";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="label">{title}</h2>
        {hint && <p className="max-w-[46ch] text-[12px] text-ink-3">{hint}</p>}
      </div>

      <ol className="flex flex-col gap-3.5 border-t border-line pt-3">
        {items.map((t) => (
          <li key={t.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[14.5px] font-semibold">{t.label}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="tnum text-[12.5px] font-semibold text-ink-3">
                  {nf(t.count)} deneyim
                </span>
                <TrendIndicator direction={t.direction} />
              </span>
            </div>
            <span
              className="block h-[8px] max-w-[440px] bg-sunk"
              style={{ width: `${Math.max(8, (t.count / max) * 100)}%` }}
              aria-hidden
            >
              <span className={`block h-full ${barPos}`} style={{ width: "100%" }} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Regüle kategoriler için: hüküm yok, yalnızca sayım.
 * Olumlu/olumsuz ayrı gösterilir; platform cümle kurmaz.
 */
export function NeutralThemeCounts({ items }: { items: ThemeSignal[] }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ol className="flex flex-col gap-4 border-t border-line pt-4">
      {items.map((t) => {
        const pos = t.count - t.negativeCount;
        return (
          <li key={t.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-4 sm:max-w-[520px]">
              <span className="text-[14.5px] font-semibold">{t.label}</span>
              <span className="tnum label-sm text-ink-3">{nf(t.count)} deneyim</span>
            </div>
            <span
              className="flex h-[11px] gap-[2px] sm:max-w-[520px]"
              style={{ width: `${Math.max(14, (t.count / max) * 100)}%` }}
              aria-hidden
            >
              <span className="block bg-pos" style={{ flex: pos || 0.001 }} />
              <span className="block bg-neg" style={{ flex: t.negativeCount || 0.001 }} />
            </span>
            <span className="flex gap-4 text-[11px] font-bold uppercase tracking-[0.1em]">
              <span className="text-pos-ink">{nf(pos)} olumlu</span>
              <span className="text-neg-ink">{nf(t.negativeCount)} olumsuz</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
