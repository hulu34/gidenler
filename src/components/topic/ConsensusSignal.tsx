import type { Consensus, ConfidenceLevel } from "@/lib/types";
import { nf } from "@/lib/format";

const CONF_LABEL: Record<ConfidenceLevel, string> = {
  high: "Yüksek veri güveni",
  medium: "Orta veri güveni",
  low: "Az veri",
};

/**
 * Ortalama aynı olsa bile dağılım farklı olabilir.
 * Histogram sakin ve küçük; finans terminali değil.
 */
export function ConsensusSignal({
  consensus,
  confidence,
  experienceCount,
}: {
  consensus: Consensus | null;
  confidence: ConfidenceLevel;
  experienceCount: number;
}) {
  if (!consensus) return null;
  const max = Math.max(...consensus.distribution);
  const tone =
    consensus.level === "birlik" ? "text-pos-ink"
    : consensus.level === "bölünmüş" ? "text-neg-ink"
    : "text-ink-2";

  return (
    <section className="flex flex-col gap-3" aria-labelledby="gorus">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="gorus" className="label">Görüş dağılımı</h2>
        <p className="text-[12px] text-ink-3">
          {CONF_LABEL[confidence]} · <span className="tnum">{nf(experienceCount)}</span> deneyim
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-t border-line pt-4">
        <p className={`max-w-[40ch] text-[15px] font-semibold leading-snug ${tone}`}>
          {consensus.level === "birlik" ? "Görüş birliği yüksek"
            : consensus.level === "bölünmüş" ? "Deneyimler bölünmüş"
            : "Görüşler kısmen ayrışıyor"}
        </p>

        <div className="flex flex-col gap-1.5">
          <div className="flex h-12 items-end gap-[3px]" aria-hidden>
            {consensus.distribution.map((v, i) => (
              <span
                key={i}
                className={`block w-[9px] ${i >= 7 ? "bg-pos" : i <= 3 ? "bg-neg" : "bg-line-2"}`}
                style={{ height: `${Math.max(3, (v / max) * 100)}%` }}
                title={`${i + 1} puan: ${v} deneyim`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            <span>1</span><span>10</span>
          </div>
        </div>
      </div>

      <p className="max-w-[62ch] text-[12.5px] leading-relaxed text-ink-3">{consensus.note}</p>
    </section>
  );
}
