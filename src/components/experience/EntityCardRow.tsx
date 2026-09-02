import Link from "next/link";
import { nf, score1 } from "@/lib/format";
import { TrendIndicator } from "@/components/score/TrendIndicator";
import type { EntityCard } from "@/lib/api";

/** Listelerde kullanılan tek satır. Kart kutusu yok; çizgi + tipografi. */
export function EntityCardRow({ card, rank }: { card: EntityCard; rank?: number }) {
  const { entity, category, score, delta90d, experienceCount, topComplaint, external } = card;
  const dir = delta90d > 0.15 ? "up" : delta90d < -0.15 ? "down" : "flat";
  const ext = external.filter((s) => s.kind === "score").slice(0, 2);

  return (
    <li className="border-t border-line">
      <Link
        href={`/mekan/${entity.slug}/`}
        className="group grid grid-cols-[1fr_auto] items-start gap-x-6 gap-y-2 py-5 transition-colors hover:bg-sheet"
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="flex items-baseline gap-2.5">
            {rank !== undefined && (
              <span className="tnum text-[13px] font-bold text-ink-3">
                {String(rank).padStart(2, "0")}
              </span>
            )}
            <span className="text-[19px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink sm:text-[21px]">
              {entity.name}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            <span className="text-accent-ink">{category.label}</span>
            {entity.location?.district && <span>{entity.location?.district}</span>}
            <span className="tnum">{nf(experienceCount)} deneyim</span>
            {ext.length > 0 && (
              <span className="tnum hidden sm:inline">
                {ext.map((s) => `${s.label} ${score1(s.score ?? 0)}`).join(" · ")}
              </span>
            )}
          </span>
          {topComplaint && (
            <span className="text-[13px] text-ink-2">
              En sık konu: <span className="font-semibold">{topComplaint}</span>
            </span>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {score !== null ? (
            <>
              <span className="tnum text-[30px] font-extrabold leading-none tracking-[-0.045em] group-hover:text-accent-ink">
                {score1(score)}
              </span>
              <span className="flex items-center gap-1 text-[12px] font-semibold">
                <TrendIndicator direction={dir} delta={delta90d} showValue />
              </span>
            </>
          ) : (
            <span className="max-w-[9rem] text-right text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">
              puan gösterilmiyor
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
