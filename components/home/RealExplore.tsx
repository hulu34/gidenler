import Link from "next/link";
import { activeEntities } from "@/data/real";

/* KATEGORİ VE SEMT (ana sayfa V8) — puan yok; yalnız gerçek kayıt sayıları: hangi semtte, hangi türde kaç açık mekân var.
   Kompakt seçenekler: tıklanınca aramaya (semt / tür süzgeci) gider. Kesin kapalılar sayılmaz. */
export function RealExplore() {
  if (!activeEntities.length) return null;
  const count = <K extends string>(xs: K[]) => [...xs.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<K, number>())].sort((a, b) => b[1] - a[1]);
  const districts = count(activeEntities.map((e) => e.location?.district ?? "")).filter(([d]) => d).slice(0, 18);
  const kinds = count(activeEntities.map((e) => e.subcategory ?? "")).filter(([k]) => k && k !== "Restoran").slice(0, 14);
  const Chip = ({ href, label, n }: { href: string; label: string; n: number }) => (
    <li><Link href={href} className="inline-flex h-9 items-center gap-2 rounded-full border border-line-2 px-3.5 text-[13px] font-semibold hover:border-ink">{label}<span className="tnum text-[12px] text-ink-3">{n}</span></Link></li>
  );
  return (
    <section aria-labelledby="h-explore" data-ana-kesfet-secim>
      <div className="kunye">
        <h2 id="h-explore">Kategori ve semt</h2>
        <Link href="/harita/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Haritada gör →</Link>
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-10">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">Ne yemek istersin?</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">{kinds.map(([k, n]) => <Chip key={k} href={`/ara/?q=${encodeURIComponent(k.split(/[ /]/)[0].toLocaleLowerCase("tr"))}`} label={k} n={n} />)}</ul>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">Hangi semtte?</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">{districts.map(([d, n]) => <Chip key={d} href={`/ara/?semt=${encodeURIComponent(d)}`} label={d} n={n} />)}</ul>
        </div>
      </div>
      <p className="mt-3 text-[11.5px] text-ink-3">{activeEntities.length} açık gerçek mekân · kimlik bilgileri © OpenStreetMap katkıcıları (ODbL).</p>
    </section>
  );
}
