import Link from "next/link";
import type { Decision } from "@/lib/types";
import { WhyThisResult } from "@/components/decision/WhyThisResult";

const VERDICT_TONE: Record<Decision["verdict"], string> = {
  "Kesinlikle gidilir": "text-pos-ink",
  "Gidilir": "text-pos-ink",
  "Sana bağlı": "text-ink",
  "Biraz bekle": "text-warn",
  "Şimdilik pas geç": "text-neg-ink",
};

/**
 * DECISION CARD — Topic, Compare, Sor Gidenler ve Now yüzeylerinde aynı nesne.
 * Bir karar, birkaç neden, birkaç risk. Sayı ikincil; cümle birincil.
 * Personal Match ≠ Gidenler Score: ikisi yan yana durur, toplanmaz.
 */
export function DecisionCard({
  decision, entityName, entitySlug, compact = false, showWhy = true,
}: {
  decision: Decision;
  entityName?: string;
  entitySlug?: string;
  compact?: boolean;
  showWhy?: boolean;
}) {
  const d = decision;
  const tone = VERDICT_TONE[d.verdict];

  return (
    <section aria-label="Sana göre karar" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="flex flex-col gap-1">
          <span className="label">Sana göre</span>
          <span className="flex items-baseline gap-3">
            {d.personalMatch !== null && (
              <span className={`font-extrabold leading-none tracking-[-0.05em] text-accent-ink ${compact ? "text-[36px]" : "text-[clamp(3rem,9vw,4.5rem)]"}`}>
                %{d.personalMatch}
              </span>
            )}
            <span className={`text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3`}>uyum</span>
          </span>
        </div>
        <div className="flex flex-col gap-1 pb-1">
          {entityName && entitySlug ? (
            <Link href={`/mekan/${entitySlug}/`} className="text-[15px] font-bold tracking-[-0.01em] hover:text-accent-ink">{entityName}</Link>
          ) : null}
          <span className={`font-extrabold leading-none tracking-[-0.035em] ${tone} ${compact ? "text-[22px]" : "text-[clamp(1.5rem,4vw,2.25rem)]"}`}>
            {d.verdict}
          </span>
          {d.timeContext && <span className="text-[11.5px] text-ink-3">{d.timeContext}</span>}
        </div>
      </div>

      {showWhy && <WhyThisResult reasons={d.reasons} warnings={d.warnings} compact={compact} />}

      {!compact && (d.bestFor.length > 0 || d.avoidIf.length > 0) && (
        <p className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-[12px] text-ink-3">
          {d.bestFor.length > 0 && (
            <span>En iyi: <span className="font-semibold text-ink-2">{d.bestFor.join(", ")}</span></span>
          )}
          {d.avoidIf.length > 0 && (
            <span>Zorlayıcı: <span className="font-semibold text-ink-2">{d.avoidIf.join(", ")}</span></span>
          )}
          <span className="tnum">güven: {d.confidence === "high" ? "yüksek" : d.confidence === "medium" ? "orta" : "düşük"}</span>
        </p>
      )}
    </section>
  );
}
