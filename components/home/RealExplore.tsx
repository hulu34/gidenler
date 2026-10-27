import Link from "next/link";
import { realEntities } from "@/data/real";

/* GERÇEK KEŞİF — puan yok; yalnız kaynağı OSM olan sayılar: hangi semtte, hangi türde kaç gerçek mekân var.
   Demo kapalıyken ana sayfadaki sıralamaların yerini alır; uydurma sinyal yok. */
export function RealExplore() {
  if (!realEntities.length) return null;
  const rest = realEntities.filter((e) => e.categoryId === "cat.restaurant");
  const count = <K extends string>(xs: K[]) => [...xs.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<K, number>())].sort((a, b) => b[1] - a[1]);
  const districts = count(realEntities.map((e) => e.location?.district ?? "")).filter(([d]) => d).slice(0, 12);
  const kinds = count(rest.map((e) => e.subcategory ?? "Restoran")).filter(([k]) => k !== "Restoran").slice(0, 12);
  const kindsIn = (d: string) => count(realEntities.filter((e) => e.location?.district === d).map((e) => e.subcategory ?? "")).slice(0, 3).map(([k]) => k);
  return (
    <section aria-labelledby="h-explore" className="reveal">
      <div className="kunye">
        <h2 id="h-explore">Keşfet · semte ve türe göre</h2>
        <Link href="/harita/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Haritada gör →</Link>
      </div>
      <p className="mt-2 max-w-[62ch] font-[family-name:var(--font-read)] text-[17px] leading-snug text-ink-2">
        İstanbul&apos;un {realEntities.length} gerçek mekânı. Sıralama yok — puanı deneyimler belirleyecek; şimdilik nerede ne olduğunu gör.
      </p>
      <ul className="mt-5 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
        {districts.map(([d, n]) => (
          <li key={d} className="border-b border-r border-line">
            <Link href={`/ara/?semt=${encodeURIComponent(d)}`} className="group flex h-full flex-col gap-1 p-4 transition-colors hover:bg-sheet">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-[family-name:var(--font-brand)] text-[26px] leading-none group-hover:text-accent-ink">{d}</span>
                <span className="tnum text-[13px] font-bold text-ink-2">{n}</span>
              </span>
              <span className="mt-1 text-[12px] text-ink-3">{kindsIn(d).join(" · ")}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        {kinds.map(([k, n]) => (
          <Link key={k} href={`/ara/?q=${encodeURIComponent(k.split(/[ /]/)[0].toLocaleLowerCase("tr"))}`}
            className="inline-flex h-8 items-center gap-2 border border-line-2 px-3 text-[13px] font-semibold hover:border-ink">
            {k} <span className="tnum text-ink-3">{n}</span>
          </Link>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] text-ink-3">Sayılar gerçek kayıtlardır · kimlik bilgileri © OpenStreetMap katkıcıları (ODbL).</p>
    </section>
  );
}
