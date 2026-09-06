import Link from "next/link";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { EntityVisual } from "@/components/experience/EntityVisual";
import { nf } from "@/lib/format";
import type { EntityCard } from "@/lib/api";

export function placeLine(card: EntityCard) {
  const { entity, category } = card;
  const loc = entity.location;
  const where = loc?.district
    ? `${loc.city && loc.city !== "İstanbul" ? `${loc.city} · ` : ""}${loc.district}${loc.neighborhood && loc.neighborhood !== loc.district ? ` · ${loc.neighborhood}` : ""}`
    : loc?.city && loc.city !== "İstanbul" ? loc.city : "";
  return { kind: entity.subcategory ?? category.label, where };
}

/**
 * Liste satırı — tek hiyerarşi:
 * görsel · ad / tür · konum / bir editoryal cümle · puan + etiket + trend.
 * Deneyim sayısı, dış kaynak puanları gibi ikincil veriler mekân sayfasında.
 */
export function EntityCardRow({ card, rank, match, href, insight, dense = false }: {
  card: EntityCard; rank?: number; match?: number | null; href?: string;
  /** Bir cümle: neden konuşuluyor / ne değişti. Verilmezse en sık konu ya da deneyim hacmi. */
  insight?: string | null;
  /** Sıkı liste (arama, kategori): görsel küçük, cümle yok. */
  dense?: boolean;
}) {
  const { entity, score, delta90d, experienceCount, topComplaint } = card;
  const dir = delta90d > 0.15 ? "up" : delta90d < -0.15 ? "down" : "flat";
  const { kind, where } = placeLine(card);
  const line = insight === null ? null : insight ?? (topComplaint ? `En sık konuşulan: ${topComplaint}.` : `${nf(experienceCount)} deneyim üzerinden.`);

  return (
    <li className="border-t border-line">
      <Link
        href={href ?? `/mekan/${entity.slug}/`}
        className={`group grid items-center gap-x-4 sm:gap-x-5 ${dense ? "grid-cols-[48px_1fr_auto] py-3.5" : "grid-cols-[56px_1fr_auto] py-4 sm:grid-cols-[88px_1fr_auto] sm:py-5"} transition-colors hover:bg-sheet`}
      >
        <EntityVisual entity={entity} variant="thumb" className={dense ? "w-12" : "w-14 sm:w-[88px]"} />

        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-baseline gap-2.5">
            {rank !== undefined && <span className="tnum text-[12px] font-bold text-ink-3">{String(rank).padStart(2, "0")}</span>}
            <span className={`line-clamp-2 font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink ${dense ? "text-[17px]" : "text-[19px] sm:text-[21px]"}`}>{entity.name}</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            <span className="text-accent-ink">{kind}</span>
            {where && <span>{where}</span>}
          </span>
          {!dense && line && <span className="prose-exp line-clamp-2 text-[14px] leading-snug text-ink-2 sm:line-clamp-1">{line}</span>}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {score !== null ? (
            <>
              <ScoreNumber score={score} size={dense ? "md" : "lg"} label stack trend={{ direction: dir, delta: dir === "flat" ? undefined : delta90d }} />
              {typeof match === "number" && <span className="tnum text-[12px] font-bold text-accent-ink">%{match} sana göre</span>}
            </>
          ) : (
            <span className="max-w-[9rem] text-right text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">puan gösterilmiyor</span>
          )}
        </div>
      </Link>
    </li>
  );
}
