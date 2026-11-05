import Link from "next/link";
import { Column } from "@/components/home/HomeRankings";
import { RealForYou } from "@/components/home/RealForYou";
import { realBoard } from "@/lib/homeBoard";
import { TopRated } from "@/components/home/TopRated";

/* GERÇEK PANO — demodaki kompakt board (aynı kolon, satır ve ızgara), gerçek veriyle. "demo" etiketi yok.
   Veri yetmeyen kolon boş liste uydurmaz: nedenini yazar; Popülerler kolonunda yerine kaynaklı profil önerir. */
export async function RealBoard() {
  const b = await realBoard();
  return (
    <section aria-label="Keşif ve sıralamalar" className="flex flex-col gap-6" data-ana-pano>
      <div className="home-board">
        {b.sections.map((s) => s.key === "top" ? <TopRated key="top" section={s} note={s.note} themes={b.googleThemes} /> : (
          <Column key={s.key} section={s} demo={false}
            empty={
              <div key={`bos-${s.key}`} className="flex flex-col gap-3 pt-4" data-pano-bos={s.key}>
                <p className="text-[12.5px] leading-snug text-ink-3"><span aria-hidden className="mr-1">◌</span>{s.note}</p>
                {s.fallback && s.fallback.items.length > 0 && (
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Bu arada · {s.fallback.title} <span className="font-semibold normal-case tracking-normal">(sıralama değil)</span></p>
                    <ul className="mt-1 divide-y divide-line">
                      {s.fallback.items.map((it) => (
                        <li key={it.slug}><Link href={`/mekan/${it.slug}/`} className="group flex flex-col py-2"><span className="text-[15px] font-semibold leading-tight group-hover:text-accent-ink">{it.name}</span><span className="text-[11px] text-ink-3">{it.place}</span></Link></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            } />
        ))}
        <RealForYou />
      </div>
      <p className="max-w-[92ch] text-[11.5px] leading-relaxed text-ink-3">
        <b className="font-semibold text-ink-2">İki ayrı puan:</b> Gidenler puanı yalnız gerçek Gidenler deneyimlerinden, yayın eşiği geçilince 10 üzerinden gösterilir.
        Google puanı 5 üzerinden, Google Maps kaynağıyla ve yalnız mekân profilinde canlı gelir; Gidenler puanına katılmaz, saklanmaz.
        Popülerlik ve yükseliş puan değildir; yalnız Gidenler&apos;deki gerçek etkileşimden hesaplanır{b.measuredDays ? ` (ölçüm ${b.measuredDays} gündür sürüyor)` : ""}.
      </p>
    </section>
  );
}
