import { nf, score1 } from "@/lib/format";
import type { ExternalSource } from "@/lib/types";

/**
 * DIŞ SİNYALLER — kasıtlı olarak kompakt.
 * Gidenler puanı tezdir; bunlar karşılaştırma sinyalidir ve
 * Gidenler puanına matematiksel olarak KARIŞMAZ.
 */
export function ExternalScores({ sources }: { sources: ExternalSource[] }) {
  if (!sources.length) return null;
  return (
    <section aria-labelledby="dis-kaynaklar" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="dis-kaynaklar" className="label">
          Dış kaynaklar
        </h2>
        <p className="text-[12px] text-ink-3">
          Karşılaştırma sinyali. Gidenler puanına dahil edilmez.
        </p>
      </div>

      <ul className="flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-3">
        {sources.map((s) => (
          <li key={s.id} className="flex min-w-[92px] flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-2">
              {s.label}
              {s.isDemo && (
                <span
                  className="border border-dashed border-line-2 px-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-3"
                  title="Prototip verisi"
                >
                  demo
                </span>
              )}
            </span>
            {s.kind === "score" ? (
              <>
                <span className="tnum text-[21px] font-bold leading-none tracking-tight">
                  {score1(s.score ?? 0)}
                  <span className="text-[13px] font-semibold text-ink-3">/{s.scoreScale}</span>
                </span>
                <span className="tnum text-[11.5px] text-ink-3">{nf(s.reviewCount ?? 0)} yorum</span>
              </>
            ) : (
              <>
                <span className="tnum text-[21px] font-bold leading-none tracking-tight text-neg-ink">
                  {nf(s.complaintCount ?? 0)}
                </span>
                <span className="text-[11.5px] text-ink-3">açık şikayet</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
