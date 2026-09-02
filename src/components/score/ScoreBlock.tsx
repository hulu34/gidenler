import { score1, pct, nf } from "@/lib/format";
import { TrendIndicator } from "./TrendIndicator";
import type { TopicIntelligence } from "@/lib/types";

/**
 * KARAR KATMANI — sayfanın en güçlü elemanı.
 * Gidenler puanı büyük; dış kaynaklar bunun altında ve kompakt kalır.
 */
export function ScoreBlock({
  intel,
  returnLabel,
}: {
  intel: TopicIntelligence;
  returnLabel: string;
}) {
  const score = {
    overall: intel.overallScore ?? 0,
    delta90d: intel.scoreTrend.delta,
    returnRate: intel.returnRate,
    experienceCount: intel.experienceCount,
    verifiedRatio: intel.verifiedRatio,
  };
  const dir = intel.scoreTrend.direction;
  return (
    <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
      <div className="flex items-start gap-3">
        <div>
          <div className="label mb-1">Gidenler puanı</div>
          <div className="flex items-baseline gap-2">
            <span className="tnum font-[family-name:var(--font-ui)] text-[clamp(3.75rem,13vw,6rem)] font-extrabold leading-[0.82] tracking-[-0.055em] text-accent-ink">
              {score1(score.overall)}
            </span>
            <span className="tnum text-lg font-semibold text-ink-3">/10</span>
          </div>
        </div>
      </div>

      <dl className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <dt className="label">Son 90 gün</dt>
          <dd className="flex items-center gap-1.5 text-[19px] font-bold tracking-tight">
            <TrendIndicator direction={dir} delta={score.delta90d} showValue />
            {dir === "flat" && <span className="text-ink-3 text-[15px] font-semibold">değişim yok</span>}
          </dd>
        </div>
        <div>
          <dt className="label">{returnLabel}</dt>
          <dd className="tnum text-[19px] font-bold tracking-tight">{pct(score.returnRate * 100)}</dd>
        </div>
        <div>
          <dt className="label">Deneyim</dt>
          <dd className="tnum text-[19px] font-bold tracking-tight">{nf(score.experienceCount)}</dd>
        </div>
        <div>
          <dt className="label">Doğrulanmış</dt>
          <dd className="tnum text-[19px] font-bold tracking-tight">{pct(score.verifiedRatio * 100)}</dd>
        </div>
      </dl>
    </div>
  );
}
