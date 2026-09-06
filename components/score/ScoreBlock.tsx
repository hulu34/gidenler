import { TrendIndicator } from "./TrendIndicator";
import { ScoreNumber } from "./ScoreNumber";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { getScoreConfidence, getScoreSemantic } from "@/lib/semantic";
import type { TopicIntelligence } from "@/lib/types";

/**
 * KARAR KATMANI — tek satırda üç dil:
 * puan (renk + etiket = kalite) · trend (ok = yön) · güven (nötr = ne kadar eminiz).
 * Kanıt sayıları (tekrar gider, deneyim, doğrulanmış, görüş birliği, tazelik)
 * burada değil; "Neye dayanıyor?" katmanında.
 */
export function ScoreBlock({ intel }: { intel: TopicIntelligence }) {
  const overall = intel.overallScore ?? 0;
  const sem = getScoreSemantic(overall);
  const conf = getScoreConfidence(intel);
  const dir = intel.scoreTrend.direction;

  return (
    <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
      <div className="flex flex-col gap-1.5">
        <div className="label">Gidenler puanı</div>
        <div className="flex items-baseline gap-3">
          <ScoreNumber score={overall} size="hero" />
          <span className="flex flex-col gap-0.5">
            <span className={`text-[13px] font-bold uppercase tracking-[0.16em] ${sem.text}`}>{sem.label}</span>
            <span className="tnum text-[12px] font-semibold text-ink-3">/10</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-3 pb-1">
        <div>
          <div className="label">Son 90 gün</div>
          <div className="flex items-center gap-1.5 text-[19px] font-bold tracking-tight">
            <TrendIndicator direction={dir} delta={intel.scoreTrend.delta} showValue />
            <span className={`text-[13px] font-semibold ${dir === "up" ? "text-pos-ink" : dir === "down" ? "text-neg-ink" : "text-ink-3"}`}>
              {dir === "up" ? "yükseliyor" : dir === "down" ? "geriliyor" : "stabil"}
            </span>
          </div>
        </div>
        <div>
          <div className="label">Güven</div>
          <div className="mt-1"><ConfidenceBadge c={conf} /></div>
        </div>
      </div>
    </div>
  );
}
