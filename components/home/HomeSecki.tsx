import Link from "next/link";
import { articles, hrefOf } from "@/lib/seckisi";

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
  if (!a || a.cover.state !== "var") return null;
  return (
    <section aria-labelledby="h-secki" className="reveal">
      <div className="kunye">
        <h2 id="h-secki">Gidenler Seçkisi</h2>
        <Link href="/seckisi/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Tümü →</Link>
      </div>
      <Link href={hrefOf("tr", a.slug)} className="group mt-4 grid gap-4 sm:grid-cols-[1.2fr_1fr] sm:items-center">
        <span className="relative block aspect-[16/10] overflow-hidden bg-sheet">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.cover.src} alt={a.cover.alt.tr} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
        </span>
        <span className="flex flex-col gap-2">
          <span className="text-[clamp(1.5rem,4vw,2.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em] group-hover:text-accent-ink">{a.title.tr}</span>
          <span className="font-[family-name:var(--font-read)] text-[16.5px] leading-snug text-ink-2">{a.dek.tr}</span>
        </span>
      </Link>
    </section>
  );
}
