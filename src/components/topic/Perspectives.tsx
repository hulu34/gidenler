import { nf, score1 } from "@/lib/format";
import type { Perspective } from "@/lib/types";

/**
 * "KİM NE DÜŞÜNÜYOR?" — ana skorun altındaki ikinci katman.
 * Kasıtlı olarak üç dev kart DEĞİL: ana skor hâlâ Gidenler puanı.
 */
export function Perspectives({ perspectives }: { perspectives: Perspective[] }) {
  const shown = perspectives.filter((p) => p.score !== null && p.experienceCount > 0);
  if (shown.length < 2) return null;

  const spread = Math.max(...shown.map((p) => p.score!)) - Math.min(...shown.map((p) => p.score!));

  return (
    <section className="flex flex-col gap-3" aria-labelledby="perspektifler">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="perspektifler" className="label">Kim ne düşünüyor</h2>
        {spread >= 0.3 && (
          <p className="text-[12px] text-ink-3">
            Segmentler arasında <span className="tnum font-semibold text-ink-2">{score1(spread)}</span> puan fark var.
          </p>
        )}
      </div>

      <ul className="grid gap-x-10 gap-y-4 border-t border-line pt-4 sm:grid-cols-3">
        {shown.map((p) => (
          <li key={p.segment} className="flex flex-col gap-1">
            <span className="label leading-tight">{p.label}</span>
            <span className="flex items-baseline gap-2">
              <span className="tnum text-[28px] font-extrabold leading-none tracking-[-0.045em]">
                {score1(p.score!)}
              </span>
              <span className="tnum text-[12px] font-semibold text-ink-3">
                {nf(p.experienceCount)} deneyim
              </span>
            </span>
            {p.hint && <span className="text-[11.5px] leading-snug text-ink-3">{p.hint}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
