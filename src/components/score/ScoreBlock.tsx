import { pct, nf } from "@/lib/format";
import { TrendIndicator } from "./TrendIndicator";
import { ScoreNumber } from "./ScoreNumber";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { consensusLabel, freshnessOf, getScoreConfidence, getScoreSemantic } from "@/lib/semantic";
import type { TopicIntelligence } from "@/lib/types";

/**
 * KARAR KATMANI — sayfanın en güçlü elemanı.
 * Puan kaliteyi (renk + etiket), trend yönü, güven kesinliği söyler.
 * Üçü aynı satırda ama üç ayrı dil; karıştırılmaz.
 */
export function ScoreBlock({ intel, returnLabel, lastVisitedAt }: {
  intel: TopicIntelligence; returnLabel: string; lastVisitedAt?: string;
}) {
  const overall = intel.overallScore ?? 0;
  const sem = getScoreSemantic(overall);
  const conf = getScoreConfidence(intel);
  const fresh = freshnessOf(lastVisitedAt, conf.recent90);
  const cons = consensusLabel(intel.consensus?.level);
  const dir = intel.scoreTrend.direction;

  return (
    <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
      <div className="flex flex-col gap-2">
        <div className="label">Gidenler puanı</div>
        <div className="flex items-baseline gap-3">
          <ScoreNumber score={overall} size="hero" />
          <span className="flex flex-col gap-0.5">
            <span className={`text-[13px] font-bold uppercase tracking-[0.16em] ${sem.text}`}>{sem.label}</span>
            <span className="tnum text-[12px] font-semibold text-ink-3">/10</span>
          </span>
        </div>
        <ConfidenceBadge c={conf} freshness={fresh} />
      </div>

      <dl className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <dt className="label">Son 90 gün</dt>
          <dd className="flex items-center gap-1.5 text-[19px] font-bold tracking-tight">
            <TrendIndicator direction={dir} delta={intel.scoreTrend.delta} showValue />
            <span className={`text-[13px] font-semibold ${dir === "up" ? "text-pos-ink" : dir === "down" ? "text-neg-ink" : "text-ink-3"}`}>
              {dir === "up" ? "yükseliyor" : dir === "down" ? "geriliyor" : "stabil"}
            </span>
          </dd>
        </div>
        <div>
          <dt className="label">{returnLabel}</dt>
          <dd className="tnum text-[19px] font-bold tracking-tight">{pct(intel.returnRate * 100)}</dd>
        </div>
        <div>
          <dt className="label">Deneyim</dt>
          <dd className="tnum text-[19px] font-bold tracking-tight">{nf(intel.experienceCount)}</dd>
        </div>
        <div>
          <dt className="label">Doğrulanmış</dt>
          <dd className="tnum text-[19px] font-bold tracking-tight">{pct(intel.verifiedRatio * 100)}</dd>
        </div>
        {cons && (
          <div>
            <dt className="label">Görüş</dt>
            <dd className="text-[14px] font-semibold text-ink-2">{cons}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
