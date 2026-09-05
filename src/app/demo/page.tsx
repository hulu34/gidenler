import Link from "next/link";
import { DemoControls } from "@/app/demo/DemoControls";

export const metadata = { title: "Yatırımcı demosu · Gidenler" };

/**
 * /demo — sunum için kontrol paneli.
 * Tek tıkla "yaşanmış" hesap: flywheel'in her aşamasında bir örnek.
 * Sunum akışı buradan başlar; her adım için doğrudan bağlantı var.
 */
export default function DemoPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <nav className="flex flex-wrap items-center gap-x-2.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <Link href="/" className="hover:text-ink">Gidenler</Link><span aria-hidden>/</span><span className="text-accent-ink">Demo</span>
        </nav>
        <h1 className="max-w-[16ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Sunum modu.</h1>
        <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
          Boş bir hesap ürünü anlatmaz. Bu mod, karar → ziyaret → deneyim döngüsünün her aşamasında bir örnek bulunan yaşanmış bir hesap kurar. Sinyaller sahtedir, sözleşmeler gerçektir.
        </p>
      </header>
      <div className="mt-8 border-t-2 border-line-strong pt-7"><DemoControls /></div>
    </div>
  );
}
