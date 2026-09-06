import { nf, pct } from "@/lib/format";
import { consensusLabel, freshnessOf, getScoreConfidence } from "@/lib/semantic";
import type { TopicIntelligence } from "@/lib/types";

/**
 * KANIT ŞERİDİ — "Neye dayanıyor?" katmanının üst satırı.
 * Tazelik, hacim, doğrulanma, tekrar gitme, görüş birliği: kompakt, nötr.
 * Güven ≠ görüş birliği: güven "ne kadar veri var", görüş birliği "insanlar ne kadar benzer düşünüyor".
 */
export function EvidenceStrip({ intel, returnLabel, lastVisitedAt }: { intel: TopicIntelligence; returnLabel: string; lastVisitedAt?: string }) {
  const conf = getScoreConfidence(intel);
  const fresh = freshnessOf(lastVisitedAt, conf.recent90);
  const cons = consensusLabel(intel.consensus?.level);
  const items: Array<[string, string, string?]> = [
    [returnLabel, pct(intel.returnRate * 100)],
    ["Deneyim", nf(intel.experienceCount)],
    ["Doğrulanmış", pct(intel.verifiedRatio * 100)],
    ["Son 90 gün", `${nf(conf.recent90)} deneyim`],
  ];
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        {items.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="label">{k}</dt>
            <dd className="tnum text-[17px] font-bold tracking-tight">{v}</dd>
          </div>
        ))}
        {cons && (
          <div className="flex flex-col">
            <dt className="label">Görüş</dt>
            <dd className="text-[14px] font-semibold text-ink-2">{cons}</dd>
          </div>
        )}
      </dl>
      <p className={`text-[12px] ${fresh.stale ? "font-semibold text-warn" : "text-ink-3"}`}>{fresh.text}</p>
    </div>
  );
}
