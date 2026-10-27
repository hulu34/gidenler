import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bu sayfa artık yok",
  description: "Gidenler'in prototip döneminde kullanılan demo kayıt kaldırıldı.",
  robots: { index: false, follow: true },
};

/* Eski demo adreslerinin (mekân, liste, kişi) kalıcı yönlendirme hedefi — middleware.ts. */
export default function DemoRecordGone() {
  return (
    <div className="mx-auto max-w-[760px] px-5 pb-24 pt-14 sm:px-7">
      <p className="label">Demo kayıt kaldırıldı</p>
      <h1 className="mt-2 text-[clamp(2rem,6vw,3rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Aradığın sayfa bir demo kayda aitti.</h1>
      <p className="mt-4 max-w-[60ch] font-[family-name:var(--font-read)] text-[18px] leading-snug text-ink-2">
        Gidenler&apos;in prototip döneminde ürünü göstermek için üretilmiş örnek mekânlar, listeler ve kişiler vardı;
        puanları ve deneyimleri gerçek değildi. Artık yalnızca gerçek mekânları gösteriyoruz — bu adres de o örneklerden biriydi.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/ara/" className="inline-flex h-11 items-center rounded-[3px] bg-ink px-4 text-[14px] font-semibold text-paper hover:bg-accent">Gerçek mekânlarda ara</Link>
        <Link href="/harita/" className="inline-flex h-11 items-center border border-line-2 px-4 text-[14px] font-semibold hover:border-ink">Haritada gör</Link>
        <Link href="/" className="inline-flex h-11 items-center px-2 text-[14px] font-semibold text-ink-3 underline underline-offset-4 hover:text-ink">Ana sayfa</Link>
      </div>
    </div>
  );
}
