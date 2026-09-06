import Link from "next/link";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { CategoryGlyph } from "@/components/experience/CategoryGlyph";
import { nf } from "@/lib/format";
import { CONFIDENCE_LABEL } from "@/lib/semantic";
import type { EntityCard } from "@/lib/api";

export function placeLine(card: EntityCard) {
  const { entity, category } = card;
  const loc = entity.location;
  const where = loc?.district
    ? `${loc.city && loc.city !== "İstanbul" ? `${loc.city} · ` : ""}${loc.district}${loc.neighborhood && loc.neighborhood !== loc.district ? ` · ${loc.neighborhood}` : ""}`
    : loc?.city && loc.city !== "İstanbul" ? loc.city : "";
  return { kind: entity.subcategory ?? category.label, where };
}

/** "214 deneyim · Yüksek güven" — kartın kanıt satırı. */
export function evidenceLine(card: EntityCard) {
  const parts = [`${nf(card.experienceCount)} deneyim`];
  if (card.confidence && card.score !== null) parts.push(CONFIDENCE_LABEL[card.confidence]);
  return parts.join(" · ");
}

/**
 * Liste satırı — Gidenler grameri, fotoğrafsız:
 * ad / tür · konum / puan · etiket · trend / tek editoryal cümle / deneyim · güven.
 * Kartın çekiciliği bilginin sunumundan gelir; avatar, baş harf, görsel yok.
 */
export function EntityCardRow({ card, rank, match, href, insight, dense = false }: {
  card: EntityCard; rank?: number; match?: number | null; href?: string;
  /** Bir cümle: neden konuşuluyor / ne değişti. Verilmezse en sık konu. */
  insight?: string | null;
  /** Sıkı liste (arama): cümle yok, kanıt satırı meta içinde. */
  dense?: boolean;
}) {
  const { entity, score, delta90d, topComplaint } = card;
  const dir = delta90d > 0.15 ? "up" : delta90d < -0.15 ? "down" : "flat";
  const { kind, where } = placeLine(card);
  const line = insight === null ? null : insight ?? (topComplaint ? `En sık konuşulan: ${topComplaint}.` : null);

  return (
    <li className="border-t border-line">
      <Link
        href={href ?? `/mekan/${entity.slug}/`}
        className={`group grid grid-cols-[1fr_auto] items-start gap-x-6 ${dense ? "gap-y-1 py-3.5" : "gap-y-1.5 py-5"} transition-colors hover:bg-sheet`}
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="flex items-baseline gap-2.5">
            {rank !== undefined && <span className="tnum text-[12px] font-bold text-ink-3">{String(rank).padStart(2, "0")}</span>}
            <span className={`font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink ${dense ? "text-[17px]" : "text-[19px] sm:text-[21px]"}`}>{entity.name}</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            <CategoryGlyph entity={entity} className="text-ink-3" />
            <span className="text-ink-2">{kind}</span>
            {where && <><span aria-hidden>·</span><span>{where}</span></>}
            {dense && <><span aria-hidden>·</span><span className="tnum normal-case tracking-normal">{evidenceLine(card)}</span></>}
          </span>
          {!dense && line && <span className="prose-exp line-clamp-2 text-[15px] leading-snug text-ink-2 sm:line-clamp-1">{line}</span>}
          {!dense && <span className="tnum text-[12px] text-ink-3">{evidenceLine(card)}</span>}
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
