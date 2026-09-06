import Link from "next/link";

/** 404 — Gidenler dilinde; dört gerçek çıkış. Statik dışa aktarımda out/404.html olur (GitHub Pages bunu sunar). */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col items-start gap-5 px-5 py-24 sm:px-7">
      <span className="label">404</span>
      <h1 className="text-[clamp(2rem,6vw,3.25rem)] font-extrabold leading-none tracking-[-0.045em]">Burada bir şey bulamadık.</h1>
      <p className="prose-exp max-w-[46ch] text-ink-2">
        Adres yanlış olabilir ya da aradığın yer henüz Gidenler&apos;de olmayabilir. İlk deneyimi yazan kişi başlığı açar.
      </p>
      <nav className="flex flex-wrap gap-2" aria-label="Çıkışlar">
        <Link href="/" className="inline-flex h-10 items-center rounded-[3px] bg-accent px-4 text-[14px] font-semibold text-on-accent">Ana sayfa</Link>
        <Link href="/ara/" className="inline-flex h-10 items-center rounded-[3px] border border-line-2 px-4 text-[14px] font-semibold hover:border-ink">Ara</Link>
        <Link href="/kesfet/" className="inline-flex h-10 items-center rounded-[3px] border border-line-2 px-4 text-[14px] font-semibold hover:border-ink">Keşfet</Link>
        <Link href="/sor/" className="inline-flex h-10 items-center rounded-[3px] border border-line-2 px-4 text-[14px] font-semibold hover:border-ink">Sor Gidenler</Link>
      </nav>
    </div>
  );
}
