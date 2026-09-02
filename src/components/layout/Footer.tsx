import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t-2 border-line-strong">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-10 sm:px-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
          <span className="font-[family-name:var(--font-brand)] text-[26px] leading-none">
            gidenler<span className="text-accent-ink">.</span>
          </span>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            <Link href="/" className="hover:text-ink">Keşfet</Link>
            <Link href="/ara/" className="hover:text-ink">Ara</Link>
            <span>Nasıl çalışır</span>
            <span>İşletmeler</span>
            <span>Kurallar</span>
            <span>Hukuki başvuru</span>
          </nav>
        </div>

        <p className="max-w-[74ch] text-[12px] leading-relaxed text-ink-3">
          Prototip. Bu sitedeki işletmeler, deneyimler ve dış kaynak puanları demo verilerdir;
          gerçek hiçbir işletmeye veya kişiye ait değildir. Gidenler puanı yalnızca Gidenler&apos;e
          yazılan deneyimlerden hesaplanır — dış kaynak puanlarının ortalaması değildir.
          Hekim ve avukat gibi meslek mevzuatı kısıtlı kategorilerde platform puan üretmez,
          özet cümlesi kurmaz ve reklam göstermez.
        </p>
      </div>
    </footer>
  );
}
