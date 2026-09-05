import { nf, score1 } from "@/lib/format";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import type { Perspective, SimilarUsersPerspective } from "@/lib/types";

/**
 * "KİM NE DÜŞÜNÜYOR?" — ana skorun altındaki ikinci katman.
 * Kasıtlı olarak dev kartlar DEĞİL: ana skor hâlâ Gidenler puanı.
 * V3: "Sana benzeyenler" — topluluğun içinden kişisel kohort. Ayrı bir
 * sözleşmeden gelir; Gidenler puanına karışmaz.
 */
export function Perspectives({ perspectives, similar }: { perspectives: Perspective[]; similar?: SimilarUsersPerspective | null }) {
  const shown = perspectives.filter((p) => p.score !== null && p.experienceCount > 0);
  if (shown.length < 2) return null;

  const all = [...shown.map((p) => p.score!), ...(similar?.score ? [similar.score] : [])];
  const spread = Math.max(...all) - Math.min(...all);
  const cols = similar ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3";

  return (
    <section className="flex flex-col gap-3" aria-labelledby="perspektifler">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="perspektifler" className="label">Kim ne düşünüyor</h2>
        {spread >= 0.3 && (
          <p className="text-[12px] text-ink-3">
            Segmentler arasında <span className="tnum font-semibold text-ink-2">{score1(spread)}</span> puan fark var.
          </p>
        )}
      </div>

      <ul className={`grid gap-x-10 gap-y-4 border-t border-line pt-4 ${cols}`}>
        {shown.map((p) => (
          <li key={p.segment} className="flex flex-col gap-1">
            <span className="label leading-tight">{p.label}</span>
            <span className="flex items-baseline gap-2">
              <ScoreNumber score={p.score!} size="md" />
              <span className="tnum text-[12px] font-semibold text-ink-3">
                {nf(p.experienceCount)} deneyim
              </span>
            </span>
            {p.hint && <span className="text-[11.5px] leading-snug text-ink-3">{p.hint}</span>}
          </li>
        ))}
        {similar && similar.score !== null && (
          <li className="flex flex-col gap-1 border-l-2 border-accent pl-4 sm:border-l-0 sm:pl-0">
            <span className="label leading-tight text-accent-ink">Sana benzeyenler</span>
            <span className="flex items-baseline gap-2">
              <ScoreNumber score={similar.score} size="md" />
              <span className="tnum text-[12px] font-semibold text-ink-3">
                {nf(similar.sampleSize)} benzer profil
              </span>
            </span>
            <span className="text-[11.5px] leading-snug text-ink-3">
              %{Math.round(similar.returnRate * 100)} tekrar gider ·{" "}
              {similar.confidence === "high" ? "yüksek uyum" : similar.confidence === "medium" ? "orta güven" : "az örnek"}
              {" · demo"}
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}
