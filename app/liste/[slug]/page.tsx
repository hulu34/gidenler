import Link from "next/link";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { lists } from "@/data/lists";
import { getCuratedList } from "@/lib/api";
import { score1 } from "@/lib/format";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { ReputationChip } from "@/components/creator/ReputationChip";

export function generateStaticParams() {
  return lists.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const l = getCuratedList(slug);
  if (!l) return { title: "Bulunamadı" };
  return { title: `${l.list.title} — @${l.author.handle}`, description: l.list.subtitle };
}

export default async function ListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getCuratedList(slug);
  if (!data) notFound();
  const { list, author, items } = data;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-5 pt-9 sm:pt-14">
        <Link href={`/@${author.handle}/`} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[13px] font-bold hover:text-accent-ink">@{author.handle}</span>
          <ReputationChip reputation={author.reputation} kind={author.kind} />
        </Link>

        <h1 className="max-w-[18ch] text-[clamp(2rem,7vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.05em]">
          {list.title}
        </h1>
        {list.subtitle && <p className="prose-exp max-w-[50ch] text-[18px] text-ink-2">{list.subtitle}</p>}
        {list.note && (
          <p className="max-w-[62ch] border-l-2 border-ink pl-4 text-[14px] leading-relaxed text-ink-2">
            {list.note}
          </p>
        )}
      </header>

      <ol className="mt-10 border-t-2 border-line-strong">
        {items.map((x, i) => (
          <li key={x.entity.id} className="border-b border-line">
            <Link href={`/mekan/${x.entity.slug}/`} className="group grid grid-cols-[auto_1fr_auto] items-start gap-x-5 gap-y-2 py-6 hover:bg-sheet">
              <span className="tnum pt-1 text-[15px] font-bold text-ink-3">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[21px] font-bold leading-tight tracking-[-0.025em] group-hover:text-accent-ink">
                  {x.entity.name}
                </span>
                <span className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                  <span className="text-accent-ink">{x.category.label}</span>
                  {x.entity.location?.district && <span>{x.entity.location.district}</span>}
                  {x.authorScore !== null && (
                    <span className="tnum">@{author.handle} verdi: {score1(x.authorScore)}</span>
                  )}
                </span>
                {x.authorNote && (
                  <span className="prose-exp mt-1 line-clamp-3 text-[15px] text-ink-2">{x.authorNote}</span>
                )}
              </span>
              {x.score !== null && (
                <span className="tnum text-[26px] font-extrabold leading-none tracking-[-0.045em]">
                  <ScoreNumber score={x.score} size="md" />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>

      {/* Paylaşım kartı — ileride sunucuda görsel üretilecek; bugün bileşen. */}
      <section className="mt-14" aria-labelledby="paylas">
        <h2 id="paylas" className="label mb-4">Paylaşım kartı</h2>
        <div className="max-w-[420px] border-2 border-line-strong bg-sheet p-7">
          <p className="label mb-4">gidenler.com/@{author.handle}</p>
          <p className="text-[26px] font-extrabold leading-[1.05] tracking-[-0.04em]">
            {list.title}
          </p>
          <ol className="mt-5 flex flex-col gap-1.5">
            {items.slice(0, 5).map((x, i) => (
              <li key={x.entity.id} className="flex items-baseline gap-3 text-[15px]">
                <span className="tnum text-[12px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-semibold">{x.entity.name}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-line pt-3 font-[family-name:var(--font-brand)] text-[22px] leading-none">
            gidenler<span className="text-accent-ink">.</span>
          </p>
        </div>
        <p className="mt-3 max-w-[52ch] text-[12px] text-ink-3">
          Instagram Story ve X için. Bu kart ileride sunucuda görsel olarak üretilecek;
          şimdilik tasarım bileşeni olarak duruyor.
        </p>
      </section>

      <div className="mt-12"><DemoNotice /></div>
    </div>
  );
}
