import Link from "next/link";
import { expertExperiences, featuredLists, listCards, listCategories, rising, trending } from "@/lib/api";
import { nf } from "@/lib/format";
import { EntityCardRow } from "@/components/experience/EntityCardRow";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { ForYouBlock } from "@/app/kesfet/ForYouBlock";
import { DemoNotice } from "@/components/ui/DemoNotice";

export const metadata = { title: "Keşfet" };

/**
 * KEŞFET — "Ne aradığımı bilmiyorum" kullanıcısının başlangıç noktası.
 * Bağlantı listesi değil: puan + yön + uyum ile karar vermeye başlanan yüzey.
 * Yakınlık: gerçek konum yok → sahte mesafe üretmiyoruz; semte göre gösteriyoruz.
 */
export default function ExplorePage() {
  const cards = listCards().filter((c) => c.score !== null && c.category.compliance.showScores);
  /* Öne çıkanlar: tam kanıtlı (A) kayıtlar, farklı dünyalardan — restoran Gidenler'in başlangıcı, sınırı değil. */
  const families = [["cat.restaurant"], ["cat.cafe", "cat.bar"], ["cat.hotel", "cat.travel"], ["cat.culture", "cat.show", "cat.venue", "cat.film"], ["cat.place", "cat.service"]];
  const top: typeof cards = [];
  for (const fam of families) { const best = cards.filter((c) => c.entity.tier === "A" && c.experienceCount >= 50 && fam.includes(c.category.id)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.experienceCount - a.experienceCount)[0]; if (best) top.push(best); }
  const up = rising().filter((c) => c.category.compliance.showScores && c.experienceCount >= 80 && c.entity.location?.city === "İstanbul").slice(0, 5);
  const talked = trending().filter((c) => c.score !== null && c.category.compliance.showScores).slice(0, 5);
  const expert = expertExperiences(3);
  const lists = featuredLists(6);
  const cats = listCategories();
  const countBy = (f: (c: (typeof cards)[number]) => string | undefined) => { const m = new Map<string, number>(); for (const c of listCards()) { const k = f(c); if (k) m.set(k, (m.get(k) ?? 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const districts = countBy((c) => (c.entity.location?.city === "İstanbul" ? c.entity.location.district : undefined)).slice(0, 12);
  const cities = countBy((c) => (c.entity.location?.city !== "İstanbul" ? c.entity.location?.city : undefined));
  const catCounts = new Map(countBy((c) => c.category.id));
  const total = listCards().length;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <p className="label">Keşfet</p>
        <h1 className="max-w-[16ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Neye bakacağını bilmiyorsan buradan başla.</h1>
        <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
          <span className="tnum font-bold text-ink">{nf(total)}</span> kayıt: restoran, kahve, otel, sahne, müze, sahil, gezi, hizmet. Her satırda üç ayrı bilgi: puan (ne kadar iyi), yön (nereye gidiyor), uyum (sana uygun mu). Ne aradığını biliyorsan <Link href="/ara/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Ara</Link>; karar vermek istiyorsan <Link href="/sor/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Sor Gidenler</Link>.
        </p>
      </header>

      {/* öne çıkanlar + sana göre */}
      <div className="mt-9 grid gap-x-14 gap-y-10 border-t-2 border-line-strong pt-7 lg:grid-cols-[1.35fr_1fr]">
        <section className="flex flex-col gap-3" aria-labelledby="one-cikan">
          <h2 id="one-cikan" className="label">Bugün öne çıkanlar</h2>
          <ul>{top.map((c) => <EntityCardRow key={c.entity.id} card={c} />)}</ul>
        </section>
        <ForYouBlock />
      </div>

      {/* yükselenler + en çok konuşulanlar */}
      <div className="mt-12 grid gap-x-14 gap-y-10 border-t-2 border-line-strong pt-7 lg:grid-cols-2">
        <section className="flex flex-col gap-3" aria-labelledby="yukselen">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"><h2 id="yukselen" className="label">Yükselenler</h2><span className="text-[12px] text-ink-3">Son 90 günde anlamlı yükseliş. Puan ve yön ayrı.</span></div>
          <ul className="flex flex-col divide-y divide-line border-t border-line">
            {up.map((c) => (
              <li key={c.entity.id}>
                <Link href={`/mekan/${c.entity.slug}/`} className="group flex items-baseline justify-between gap-4 py-3">
                  <span className="flex flex-col gap-0.5"><span className="text-[16px] font-bold group-hover:text-accent-ink">{c.entity.name}</span><span className="text-[12px] text-ink-3">{c.category.label} · {c.entity.location?.district}</span></span>
                  <ScoreNumber score={c.score} size="md" label trend={{ direction: "up", delta: c.delta90d }} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-3" aria-labelledby="konusulan">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"><h2 id="konusulan" className="label">En çok konuşulanlar</h2><span className="text-[12px] text-ink-3">Deneyim hacmine göre.</span></div>
          <ul className="flex flex-col divide-y divide-line border-t border-line">
            {talked.map((c) => (
              <li key={c.entity.id}>
                <Link href={`/mekan/${c.entity.slug}/`} className="group flex items-baseline justify-between gap-4 py-3">
                  <span className="flex flex-col gap-0.5"><span className="text-[16px] font-bold group-hover:text-accent-ink">{c.entity.name}</span><span className="tnum text-[12px] text-ink-3">{nf(c.experienceCount)} deneyim · {c.entity.location?.district}</span></span>
                  <ScoreNumber score={c.score} size="md" trend={{ direction: c.delta90d > 0.15 ? "up" : c.delta90d < -0.15 ? "down" : "flat", delta: c.delta90d }} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* uzmanların radarında */}
      <section className="mt-12 border-t-2 border-line-strong pt-7" aria-labelledby="radar">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"><h2 id="radar" className="label">Uzmanların radarında</h2><span className="text-[12px] text-ink-3">Konusunda uzman sayılan kişilerin son deneyimleri.</span></div>
        <ul className="mt-3 grid gap-x-10 gap-y-4 border-t border-line pt-4 sm:grid-cols-3">
          {expert.map(({ experience: e, card }) => (
            <li key={e.id} className="flex flex-col gap-1.5">
              <Link href={`/mekan/${card.entity.slug}/`} className="flex items-baseline justify-between gap-3 hover:text-accent-ink"><span className="text-[16px] font-bold">{card.entity.name}</span><ScoreNumber score={card.score} size="sm" /></Link>
              <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-2">{e.body}</p>
              <Link href={`/@${e.author.handle}/`} className="text-[12px] font-semibold text-ink-3 hover:text-ink">@{e.author.handle} · {e.author.expertise[0]?.label}</Link>
            </li>
          ))}
        </ul>
      </section>

      {/* listeler + kategoriler + semtler */}
      <div className="mt-12 grid gap-x-14 gap-y-10 border-t-2 border-line-strong pt-7 lg:grid-cols-[1.35fr_1fr]">
        <section className="flex flex-col gap-3" aria-labelledby="listeler">
          <h2 id="listeler" className="label">Listeler</h2>
          <ul className="grid gap-x-10 gap-y-4 border-t border-line pt-4 sm:grid-cols-2">
            {lists.map((l) => (
              <li key={l.id}>
                <Link href={`/liste/${l.slug}/`} className="group flex flex-col gap-1">
                  <span className="text-[17px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink">{l.title}</span>
                  <span className="text-[12px] text-ink-3">@{l.author.handle} · {l.entityIds.length} mekân</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-2" aria-labelledby="kategoriler">
            <h2 id="kategoriler" className="label">Kategoriler</h2>
            <ul className="flex flex-wrap gap-2 border-t border-line pt-3">
              {cats.map((c) => (
                <li key={c.id}><Link href={`/kategori/${c.slug}/`} className="inline-flex h-9 items-center border border-line-2 px-3 text-[13px] font-semibold hover:border-ink">{c.label} <span className="tnum ml-1.5 text-[11px] text-ink-3">{catCounts.get(c.id) ?? 0}</span>{c.compliance.mode === "regulated" ? <span className="ml-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-3">puansız</span> : null}</Link></li>
              ))}
            </ul>
            <p className="text-[11.5px] text-ink-3">Hekim ve avukat gibi kategorilerde puan, özet ve reklam yoktur; yalnızca nötr konu sayımı.</p>
          </section>
          <section className="flex flex-col gap-2" aria-labelledby="semtler">
            <h2 id="semtler" className="label">İstanbul · semte göre</h2>
            <ul className="flex flex-wrap gap-2 border-t border-line pt-3">
              {districts.map(([d, n]) => <li key={d}><Link href={`/ara/?sehir=${encodeURIComponent("İstanbul")}&semt=${encodeURIComponent(d)}`} className="inline-flex h-9 items-center border border-line-2 px-3 text-[13px] font-semibold hover:border-ink">{d} <span className="tnum ml-1.5 text-[11px] text-ink-3">{n}</span></Link></li>)}
              <li><Link href="/harita/" className="inline-flex h-9 items-center px-2 text-[13px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Haritada gör</Link></li>
            </ul>
            <h2 className="label mt-3">Diğer şehirler</h2>
            <ul className="flex flex-wrap gap-2 border-t border-line pt-3">
              {cities.map(([c, n]) => <li key={c}><Link href={`/ara/?sehir=${encodeURIComponent(c)}`} className="inline-flex h-9 items-center border border-line-2 px-3 text-[13px] font-semibold hover:border-ink">{c} <span className="tnum ml-1.5 text-[11px] text-ink-3">{n}</span></Link></li>)}
            </ul>
            <p className="text-[11.5px] text-ink-3">Konum izni istemiyoruz; mesafe uydurmuyoruz. İstanbul en yoğun; diğer şehirler seçilmiş örnekler.</p>
          </section>
        </div>
      </div>

      <div className="mt-12"><DemoNotice /></div>
    </div>
  );
}
