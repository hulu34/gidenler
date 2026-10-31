import Link from "next/link";
import { realEntities } from "@/data/real";
import { getEntity } from "@/data/entities";
import { articles, hrefOf } from "@/lib/seckisi";
import { coverOf } from "@/lib/media/cover";
import { liveCovers, publishedScores, recentlyReviewed } from "@/lib/live";
import { fmtPublished } from "@/lib/score/publishedCards";
import { VenueCover } from "@/components/venue/VenueCover";
import { RealExplore } from "@/components/home/RealExplore";
import { WantList } from "@/components/home/WantList";
import type { Entity } from "@/lib/types";

/* KEŞFET · gerçek veri. Her bölüm yalnız kendi gerçek verisinden oluşur; yoksa bölüm yerine dürüst bir cümle.
   Popülerlik, sosyal kanıt ya da Google puanı kullanılmaz. Puanı olmayan mekân puanlı gibi sıralanmaz. */
function Card({ e, line }: { e: Entity; line?: string }) {
  return (
    <li className="w-[72%] shrink-0 snap-start sm:w-auto">
      <Link href={`/mekan/${e.slug}/`} className="group flex flex-col gap-1">
        <VenueCover entity={e} sizes="(max-width: 640px) 72vw, 280px" className="mb-1" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{e.subcategory} · {e.location?.district}</span>
        <span className="text-[17px] font-bold leading-tight tracking-[-0.015em] group-hover:text-accent-ink">{e.name}</span>
        {line && <span className="text-[13px] text-ink-2">{line}</span>}
      </Link>
    </li>
  );
}
const Rail = ({ children }: { children: React.ReactNode }) => <ul className="-mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">{children}</ul>;

export async function RealDiscover() {
  const [published, covers, recent] = await Promise.all([publishedScores(), liveCovers(), recentlyReviewed()]);
  const secki = articles().flatMap((a) => a.venues.map((v) => ({ e: getEntity(v.slug), a }))).filter((x) => x.e?.isReal);
  const seen = new Set<string>(); const seckiU = secki.filter((x) => (seen.has(x.e!.slug) ? false : (seen.add(x.e!.slug), true)));
  const scored = realEntities.filter((e) => published[e.slug]?.score != null).sort((a, b) => published[b.slug].score! - published[a.slug].score!);
  const withCover = realEntities.filter((e) => coverOf(e, covers[e.slug]));
  const recentE = recent.map((s) => getEntity(s)).filter((e): e is Entity => !!e?.isReal);
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-14 px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-8 sm:pt-14">
        <p className="label">Keşfet</p>
        <h1 className="max-w-[18ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">İstanbul&apos;da nereye gidelim?</h1>
        <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">{realEntities.length} gerçek mekân. Puan yalnız gidenlerin deneyimlerinden oluşur; henüz çoğunda puan yok, bu yüzden burada sıralama değil, başlangıç noktaları var.</p>
      </header>
      {seckiU.length > 0 && (
        <section aria-labelledby="k-secki">
          <div className="kunye"><h2 id="k-secki">Gidenler Seçkisi&apos;nde</h2><Link href="/seckisi/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4">Yazılar →</Link></div>
          <Rail>{seckiU.map(({ e, a }) => <Card key={e!.slug} e={e!} line={a.title.tr} />)}</Rail>
          <p className="sr-only"><Link href={hrefOf("tr")}>Seçki</Link></p>
        </section>
      )}
      <section aria-labelledby="k-puan">
        <div className="kunye"><h2 id="k-puan">Gidenler puanı oluşanlar</h2></div>
        {scored.length ? <Rail>{scored.slice(0, 8).map((e) => <Card key={e.slug} e={e} line={`Gidenler puanı ${fmtPublished(published[e.slug].score!)}/10 · ${published[e.slug].reviewCount} deneyim`} />)}</Rail>
          : <p className="mt-3 max-w-[58ch] text-[14.5px] text-ink-2">Henüz yayımlanmış Gidenler puanı yok. Puan, yeterli deneyim birikince burada görünür. <Link href="/ara/?yaz=1" className="font-semibold underline decoration-line-2 underline-offset-4">Gittiğin bir yeri yaz</Link></p>}
      </section>
      {recentE.length > 0 && (
        <section aria-labelledby="k-yeni">
          <div className="kunye"><h2 id="k-yeni">Yeni deneyim yazılanlar</h2></div>
          <Rail>{recentE.map((e) => <Card key={e.slug} e={e} />)}</Rail>
        </section>
      )}
      <WantList />
      {withCover.length > 0 && (
        <section aria-labelledby="k-foto">
          <div className="kunye"><h2 id="k-foto">Fotoğraflı mekânlar</h2></div>
          <Rail>{withCover.map((e) => <Card key={e.slug} e={e} />)}</Rail>
        </section>
      )}
      <RealExplore />
    </div>
  );
}
