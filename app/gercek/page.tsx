import Link from "next/link";
import { realEntities } from "@/data/real";

export const metadata = { title: "Gerçek mekânlar", description: "Gidenler'e eklenen gerçek İstanbul mekânları — ilk deneyimlerini bekliyorlar." };

export default function RealPage() {
  const byD = new Map<string, typeof realEntities>();
  for (const e of realEntities) { const d = e.location?.district ?? "Diğer"; (byD.get(d) ?? byD.set(d, []).get(d)!).push(e); }
  const groups = [...byD.entries()].sort((a, b) => b[1].length - a[1].length);
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <p className="label">Gerçek İstanbul</p>
        <h1 className="max-w-[16ch] text-[clamp(2.2rem,7vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">{realEntities.length} gerçek mekân, ilk deneyimlerini bekliyor</h1>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">Ad, adres, saat ve iletişim bilgileri açık kaynaktan (OpenStreetMap) gelir. Gidenler puanı, yorum ya da sıralama uydurmaz: bunları gidenler oluşturur.</p>
      </header>
      {groups.map(([d, arr]) => (
        <section key={d} className="mt-10" aria-labelledby={`h-${d}`}>
          <div className="kunye"><h2 id={`h-${d}`}>{d}</h2><span className="tnum text-[11.5px] text-ink-3">{arr.length} mekân</span></div>
          <ul className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {arr.map((e) => (
              <li key={e.id} className="border-b border-line">
                <Link href={`/mekan/${e.slug}/`} className="group flex items-baseline justify-between gap-3 py-3">
                  <span className="truncate text-[15.5px] font-bold group-hover:text-accent-ink">{e.name}</span>
                  <span className="shrink-0 text-[12px] text-ink-3">{e.subcategory}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!realEntities.length && <p className="mt-10 text-ink-2">Gerçek mekân verisi henüz içe aktarılmadı.</p>}
      <p className="mt-12 text-[12px] text-ink-3">© OpenStreetMap katkıcıları · ODbL. Yanlış ya da kapanmış bir mekân görürsen mekân sayfasındaki &ldquo;kaynakta düzelt&rdquo; bağlantısını kullan.</p>
    </div>
  );
}
