import Link from "next/link";
import { inIstanbul, listCards } from "@/lib/api";
import { score1 } from "@/lib/format";

/* Borsa bandı: 90 günde en çok değişenler (iki yön). Hover/odakta durur; hareket azaltılmışsa sabit kalır. */
export function Ticker() {
  const movers = listCards()
    .filter((c) => inIstanbul(c) && c.category.compliance.showScores && c.experienceCount >= 40 && Math.abs(c.delta90d) > 0.3)
    .sort((a, b) => Math.abs(b.delta90d) - Math.abs(a.delta90d))
    .slice(0, 16);
  if (!movers.length) return null;
  const items = (hidden: boolean) => movers.map((c) => (
    <Link key={c.entity.id} href={`/mekan/${c.entity.slug}/`} tabIndex={hidden ? -1 : undefined} className="inline-flex items-baseline gap-2 whitespace-nowrap px-5 text-[12.5px] hover:text-accent-ink">
      <span className="font-semibold">{c.entity.name}</span>
      <span className="text-ink-3">{c.entity.location?.district}</span>
      <span className={`tnum font-bold ${c.delta90d > 0 ? "text-pos-ink" : "text-neg-ink"}`}>{c.delta90d > 0 ? "▲" : "▼"} {score1(Math.abs(c.delta90d))}</span>
    </Link>
  ));
  return (
    <div className="ticker-wrap overflow-hidden border-y border-line-strong bg-paper py-2" aria-label="Son 90 günde en çok değişen mekânlar">
      <div className="ticker">
        <div className="flex">{items(false)}</div>
        <div className="flex" aria-hidden>{items(true)}</div>
      </div>
    </div>
  );
}
