import { RealForYou } from "@/components/home/RealForYou";
import { realBoard } from "@/lib/homeBoard";
import { HomeTop10 } from "@/components/home/HomeTop10";
import { BoardColumn } from "@/components/home/BoardV8";

/* GERÇEK PANO (ana sayfa V8) — sıralamalar ürünün merkezinde.
   1) En İyiler · Top 10: doğrulanmış Google puanı, gerçek kategoriler (sunucuda hazır).
   2) Etkileşim panosu: Haftanın popülerleri · En hype · En çok konuşulanlar / Yükselenler · Düşenler · Sana göre — her biri Top 10,
      yalnız kendi gerçek kaynağından; veri yoksa dürüst not + etiketli keşif listesi. */
export async function RealBoard() {
  const b = await realBoard();
  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <HomeTop10 cats={b.top} total={b.googleTotal} newest={b.newest} />
      <section aria-label="Etkileşim ve değişim sıralamaları" className="flex flex-col gap-5" data-ana-pano>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink-3">Şu an Gidenler&apos;de</p>
            <h2 className="mt-1 text-[clamp(1.35rem,2.6vw,1.85rem)] font-extrabold leading-tight tracking-[-0.035em]">Popüler, hype, konuşulan — ve değişenler</h2>
          </div>
          <p className="max-w-[60ch] text-[12px] leading-snug text-ink-3">Popülerlik ve hype puan değildir: yalnız Gidenler&apos;deki gerçek etkileşimden{b.measuredDays ? ` (ölçüm ${b.measuredDays} gündür sürüyor)` : ""}.{b.googleTotal > 0 ? " Yükselen/düşen, Google puanındaki gerçek değişimdir." : " Yükselenler de Gidenler etkileşimindeki değişimdir."}</p>
        </div>
        <div className="home-board">
          {b.sections.map((s) => <BoardColumn key={s.key} s={s} />)}
          <RealForYou />
        </div>
        <p className="max-w-[100ch] text-[11.5px] leading-relaxed text-ink-3">
          <b className="font-semibold text-ink-2">{b.googleTotal > 0 ? "İki ayrı puan:" : "Puan:"}</b> Gidenler puanı yalnız gerçek Gidenler deneyimlerinden, yayın eşiği geçilince 10 üzerinden gösterilir.
          {b.googleTotal > 0 ? "Google puanı 5 üzerindendir, Google Maps kaynaklıdır ve her gün doğrulanarak güncellenir; Gidenler puanına katılmaz." : "Gidenler puanı Google verisi kullanmaz."}
        </p>
      </section>
    </div>
  );
}
