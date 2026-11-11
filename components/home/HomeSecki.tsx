import Link from "next/link";
import { articles, hrefOf } from "@/lib/seckisi";
import { SECKI_RESTAURANTS } from "@/content/seckisi/restoranlar";

/* Ana sayfa: doğrudan bulma (sık aranan türler ve semtler) ve Seçki'nin öne çıkan yazısı. Veri yoksa bölüm çizilmez. */
const HIZLI: Array<[string, string]> = [["Pide", "pide"], ["Kebap", "kebap"], ["Balık", "balık"], ["Meyhane", "meyhane"], ["Ocakbaşı", "ocakbaşı"], ["Esnaf lokantası", "esnaf lokantası"], ["Kadıköy", "Kadıköy"], ["Beyoğlu", "Beyoğlu"], ["Fatih", "Fatih"]];
export function QuickFind() {
  return (
    <div>
      <form action="/ara/" className="flex max-w-[560px] items-stretch border-2 border-line-strong bg-paper">
        <input name="q" type="search" required aria-label="Mekân, semt ya da yemek ara" placeholder="Mekân, semt ya da yemek" autoComplete="off" className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[16px] outline-none placeholder:text-ink-3" />
        <button className="h-12 shrink-0 bg-accent px-5 text-[15px] font-bold text-on-accent">Ara</button>
      </form>
      <ul className="mt-3 flex max-w-[640px] flex-wrap gap-2">
        {HIZLI.map(([label, q]) => (
          <li key={label}><Link href={`/ara/?q=${encodeURIComponent(q)}`} className="inline-flex h-10 items-center border border-line-2 bg-paper/80 px-3 text-[13.5px] font-semibold hover:border-ink">{label}</Link></li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-ink-3">Karar veremedin mi? <Link href="/sor/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4">Sor Gidenler</Link></p>
    </div>
  );
}

export function HomeSecki() {
  const list = articles();
  const a = list.find((x) => x.featured) ?? list[0];
  return (
    <section aria-labelledby="h-secki" className="reveal">
      <div className="kunye">
        <h2 id="h-secki">Gidenler Seçkisi</h2>
        <Link href="/seckisi/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Tümü →</Link>
      </div>
      <p className="mt-4 max-w-[680px] font-[family-name:var(--font-read)] text-[17px] leading-relaxed text-ink-2">
        Pideden menemene, MICHELIN yıldızlı masalardan çağdaş lokantaya: İstanbul'dan altı gerçek adres.
      </p>
      <RestaurantPickGrid className="mt-6" />
      {a?.cover.state === "var" && (
        <Link href={hrefOf("tr", a.slug)} className="group mt-8 grid gap-4 border-t border-line-2 pt-6 sm:grid-cols-[1fr_1.25fr] sm:items-center">
          <span className="relative block aspect-[16/10] overflow-hidden bg-sheet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.cover.src} alt={a.cover.alt.tr} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
          </span>
          <span className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">Haftanın hikâyesi</span>
            <span className="text-[clamp(1.35rem,3vw,2rem)] font-extrabold leading-[1.05] tracking-[-0.03em] group-hover:text-accent-ink">{a.title.tr}</span>
            <span className="font-[family-name:var(--font-read)] text-[16px] leading-snug text-ink-2">{a.dek.tr}</span>
          </span>
        </Link>
      )}
    </section>
  );
}

export function RestaurantPickGrid({ className = "" }: { className?: string }) {
  return (
    <ul className={`grid gap-px border border-line-2 bg-line-2 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {SECKI_RESTAURANTS.map((r, i) => (
        <li key={r.slug} className="flex min-h-[190px] flex-col bg-paper p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-accent-ink">{r.eyebrow}</span>
            <span aria-hidden className="tnum font-[family-name:var(--font-brand)] text-[22px] leading-none text-ink-3">{String(i + 1).padStart(2, "0")}</span>
          </div>
          <h3 className="mt-5 text-[22px] font-extrabold leading-none tracking-[-0.03em]">
            <Link href={`/mekan/${r.slug}/`} className="hover:text-accent-ink hover:underline">{r.name}</Link>
          </h3>
          <p className="mt-1 text-[12px] font-semibold text-ink-3">{r.district}</p>
          <p className="mt-3 text-[14px] leading-snug text-ink-2">{r.note}</p>
          {r.disclosure && <p className="mt-2 text-[11px] leading-snug text-ink-3">Şeffaflık: {r.disclosure}</p>}
          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-[12px] font-bold">
            <Link href={`/mekan/${r.slug}/`} className="underline decoration-line-2 underline-offset-2">Mekân profili</Link>
            <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-ink-3 underline decoration-line-2 underline-offset-2">{r.sourceLabel} ↗</a>
          </div>
        </li>
      ))}
    </ul>
  );
}
