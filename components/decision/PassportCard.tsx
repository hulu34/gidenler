import type { PassportPeriod } from "@/lib/types";
import { nf } from "@/lib/format";

/**
 * PASSPORT SHARE CARD — 9:16, hikâye formatı.
 * Rozet değil, gerçek deneyim geçmişinin estetik özeti. Görsel üretim
 * backend'i yok; bu bir bileşen. Paylaşım opt-in'dir.
 */
export function PassportCard({ handle, period, size = "md" }: { handle: string; period: PassportPeriod; size?: "sm" | "md" }) {
  const w = size === "sm" ? "w-[200px]" : "w-[270px]";
  return (
    <div className={`${w} aspect-[9/16] shrink-0 border-2 border-line-strong bg-sheet p-5 flex flex-col justify-between`} aria-label={`${period.label} paylaşım kartı`}>
      <div className="flex flex-col gap-3">
        <span className="font-[family-name:var(--font-brand)] text-[22px] leading-none">gidenler<span className="text-accent-ink">.</span></span>
        <span className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3">{period.label}</span>
        <span className="text-[15px] font-bold tracking-[-0.01em]">@{handle}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="tnum text-[64px] font-extrabold leading-[0.9] tracking-[-0.06em] text-accent-ink">{nf(period.entityCount)}</span>
        <span className="label">mekân</span>
        <div className="mt-3 grid grid-cols-2 gap-y-2 text-[12.5px]">
          <span className="flex flex-col"><b className="tnum text-[18px] leading-none">{period.districtCount}</b><span className="text-ink-3">semt</span></span>
          <span className="flex flex-col"><b className="tnum text-[18px] leading-none">{period.cuisineCount}</b><span className="text-ink-3">mutfak</span></span>
          <span className="flex flex-col"><b className="tnum text-[18px] leading-none">%{Math.round(period.returnRate * 100)}</b><span className="text-ink-3">tekrar gider</span></span>
          <span className="flex flex-col"><b className="tnum text-[18px] leading-none">{nf(period.verifiedVisits)}</b><span className="text-ink-3">doğrulanmış</span></span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line pt-3">
        <span className="label">En çok</span>
        {period.topFacets.slice(0, 3).map((f) => (
          <span key={f.label} className="flex items-baseline justify-between text-[12.5px]">
            <span className="font-semibold">{f.label}</span>
            <span className="tnum text-ink-3">{f.count}</span>
          </span>
        ))}
        <span className="mt-1 text-[11px] text-ink-3">En çok gittiği semt: <span className="font-semibold text-ink-2">{period.topDistrict}</span></span>
      </div>
    </div>
  );
}
