import Link from "next/link";
import { risers } from "@/lib/pulse";
import { nf, score1 } from "@/lib/format";
import { Pulse } from "@/components/viz/Pulse";
import { DemoTag } from "@/components/ui/DemoNotice";

/* ──────────────────────────────────────────────────────────────────────────
   YÜKSELENLER — gazetenin borsa sayfası gibi: ad · semt · nabız · 90 gün değişim · kanıt.
   Kart ızgarası değil tablo: taranır, karşılaştırılır. Her satır mekâna gider.
   ────────────────────────────────────────────────────────────────────────── */

export function Risers() {
  const rows = risers(8);
  if (!rows.length) return null;
  return (
    <section aria-labelledby="h-risers" className="reveal">
      <div className="kunye">
        <h2 id="h-risers">Yükselenler · son 90 gün<DemoTag /></h2>
        <Link href="/kesfet/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Tümü →</Link>
      </div>
      <p className="mt-2 max-w-[60ch] font-[family-name:var(--font-read)] text-[17px] leading-snug text-ink-2">
        Puanı yüksek olan değil, <em>gidenlerin deneyimi iyileşen</em> yerler. Her satırdaki çizgi, o mekânın son 12 ayı.
      </p>
      <ol className="mt-5 divide-y divide-line border-y border-line">
        {rows.map(({ card, pulse }, i) => {
          const e = card.entity;
          return (
            <li key={e.id}>
              <Link href={`/mekan/${e.slug}/`} className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 py-3 transition-colors hover:bg-sheet sm:grid-cols-[2.5rem_minmax(0,1.4fr)_10rem_5rem_6rem] sm:gap-x-5">
                <span className="tnum text-[12px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[17px] font-bold tracking-[-0.015em] group-hover:text-accent-ink">{e.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">{e.subcategory ?? card.category.label} · {e.location?.district}</span>
                </span>
                <span className="hidden sm:block"><Pulse pulse={pulse} width={160} height={30} /></span>
                <span className="tnum text-right text-[15px] font-extrabold text-accent-ink">▲ {score1(card.delta90d)}</span>
                <span className="tnum hidden text-right text-[12px] text-ink-3 sm:block">
                  <span className="block text-[15px] font-bold text-ink">{card.score !== null ? score1(card.score) : "—"}</span>
                  n={nf(card.experienceCount)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[11.5px] text-ink-3">Yalnızca en az 40 deneyimi olan kayıtlar. Değişim, son 90 günün puan farkıdır; demo veri kümesi.</p>
    </section>
  );
}
