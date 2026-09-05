import Link from "next/link";
import { TasteEditor } from "@/components/decision/TasteEditor";
import { DemoNotice } from "@/components/ui/DemoNotice";

export const metadata = { title: "Zevkim · Gidenler" };

export default function TastePage() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <nav className="flex flex-wrap items-center gap-x-2.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <Link href="/benim/" className="hover:text-ink">Benim Gidenler&apos;im</Link><span aria-hidden>/</span><span className="text-accent-ink">Zevkim</span>
        </nav>
        <h1 className="max-w-[14ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Zevkini tanıyalım.</h1>
        <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">Gidenler neyi sevdiğini deneyimlerinden öğrenir; ama son söz senin. Düzelttiğin her şey "Sana göre" uyumunu anında değiştirir.</p>
      </header>
      <div className="mt-8 border-t-2 border-line-strong pt-7"><TasteEditor /></div>
      <div className="mt-12"><DemoNotice>Zevk profili demo kişiye aittir; düzenlemelerin yalnızca bu tarayıcıda saklanır.</DemoNotice></div>
    </div>
  );
}
