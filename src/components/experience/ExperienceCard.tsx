import Link from "next/link";
import { monthOf, nf, relative, score1 } from "@/lib/format";
import { ReputationChip } from "@/components/creator/ReputationChip";
import { DisclosureNote } from "./DisclosureNote";
import type { ExperienceWithAuthor, RatingSchema } from "@/lib/types";

const compact = (n: number) =>
  n >= 1000 ? `${Math.round(n / 1000)}B` : String(n);

/**
 * DENEYİM ("yorum" değil).
 *
 * ROZET DİSİPLİNİ — hepsi aynı satırda gösterilmez, öncelik sırası var:
 *   1. Ticari ilişki (varsa her şeyin önünde, ayrı satırda)
 *   2. Ziyaret doğrulaması
 *   3. Uzmanlık / üretici kimliği
 *   4. Dış otorite (en zayıf sinyal, tek satır, sessiz)
 */
export function ExperienceCard({
  experience: e,
  schema,
  showScores,
  showEntity,
}: {
  experience: ExperienceWithAuthor;
  schema: RatingSchema;
  showScores: boolean;
  showEntity?: { name: string; slug: string; category: string };
}) {
  const a = e.author;
  const topSocial = a.social
    .filter((s) => s.verifiedByGidenler)
    .sort((x, y) => (y.followerCount ?? 0) - (x.followerCount ?? 0))[0];

  return (
    <article className="flex flex-col gap-4 border-t border-line py-7 first:border-t-0 first:pt-0">
      {showEntity && (
        <Link
          href={`/mekan/${showEntity.slug}/`}
          className="group flex flex-wrap items-baseline gap-x-3 gap-y-1"
        >
          <span className="text-[17px] font-bold tracking-[-0.02em] group-hover:text-accent-ink">
            {showEntity.name}
          </span>
          <span className="label">{showEntity.category}</span>
        </Link>
      )}

      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {showScores && (
          <span
            className="tnum flex h-11 w-11 shrink-0 items-center justify-center border border-line-2 text-[17px] font-extrabold tracking-tight"
            aria-label={`Bu deneyimin puanı ${score1(e.overall)}`}
          >
            {score1(e.overall)}
          </span>
        )}

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <Link href={`/@${a.handle}/`} className="text-[14px] font-bold hover:text-accent-ink">
              {a.handle}
            </Link>
            <ReputationChip reputation={a.reputation} kind={a.kind} />
          </span>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-ink-3">
            <span className="font-semibold text-ink-2">{monthOf(e.visitedAt)}&apos;da gitti</span>
            <span aria-hidden>·</span>
            <span>{relative(e.createdAt)} yazdı</span>
            {topSocial?.followerCount && (
              <>
                <span aria-hidden>·</span>
                <span>
                  {topSocial.provider === "x" ? "X" : topSocial.provider}{" "}
                  <span className="tnum">{compact(topSocial.followerCount)}</span>
                </span>
              </>
            )}
          </span>
        </div>

        {e.verification.verified && (
          <span className="ml-auto shrink-0 border border-accent px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.11em] text-accent-ink">
            Gittiği doğrulandı · {e.verification.method}
          </span>
        )}
      </header>

      <DisclosureNote disclosure={e.disclosure} />

      <p className="prose-exp">{e.body}</p>

      {showScores && (
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {schema.dimensions.map((d) =>
            e.ratings[d.key] != null ? (
              <li key={d.key} className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                  {d.label}
                </span>
                <span className="tnum text-[14px] font-bold">{score1(e.ratings[d.key])}</span>
              </li>
            ) : null,
          )}
          <li className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              {schema.returnLabel}
            </span>
            <span
              className={`text-[13px] font-bold ${
                e.returnIntent === "evet" ? "text-pos-ink"
                : e.returnIntent === "hayır" ? "text-neg-ink" : "text-ink-2"
              }`}
            >
              {e.returnIntent}
            </span>
          </li>
        </ul>
      )}

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">
        <button className="hover:text-ink" type="button">
          <span className="tnum">{nf(e.helpfulVotes)}</span> faydalı
        </button>
        <button className="hover:text-ink" type="button">yanıtla</button>
        <button className="hover:text-neg-ink" type="button">bildir</button>
      </footer>

      {e.response && (
        <aside className="ml-0 border-l-2 border-warn bg-warn-soft/40 py-4 pl-5 sm:ml-8">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[13px] font-bold">{e.response.authorLabel}</span>
            {e.response.verifiedBusiness && (
              <span className="border border-warn px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.11em] text-warn">
                Doğrulanmış işletme · resmî yanıt
              </span>
            )}
          </div>
          <p className="prose-exp text-[16px]">{e.response.body}</p>
          <p className="mt-2 text-[11.5px] text-ink-3">
            İşletme yanıtı deneyimi silmez, gizlemez ve puanı değiştirmez.
          </p>
        </aside>
      )}
    </article>
  );
}
