import Link from "next/link";
import { gidenler100, G100 } from "@/lib/venue";
import { EntityCardRow } from "@/components/experience/EntityCardRow";
import { DemoNotice } from "@/components/ui/DemoNotice";

export const metadata = { title: `Gidenler 100 · ${G100.year}`, description: "İstanbul'da gidenlerin en iyi deneyimi yaşadığı 100 yer — satın alınamaz, kanıta dayalı." };

/* GİDENLER 100 — Tabelog "Hyakumeiten"/Award'dan uyarlama. Kural: yeme-içme, İstanbul, en az 60 deneyim,
   yüksek güven; puana göre ilk 100. Abonelik, reklam, rezervasyon ücreti etkisizdir. */
export default function G100Page() {
  const list = gidenler100();
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <p className="label">Yılın seçkisi · {G100.year}</p>
        <h1 className="text-[clamp(2.5rem,8vw,5rem)] font-extrabold leading-[0.92] tracking-[-0.05em]">Gidenler <span className="font-[family-name:var(--font-brand)] font-normal italic text-accent-ink">100</span></h1>
        <p className="max-w-[60ch] font-[family-name:var(--font-read)] text-[18px] leading-snug text-ink-2">
          İstanbul&apos;da gidenlerin en iyi deneyimi yaşadığı yerler. Jüri yok, para yok: yalnızca en az {G100.minExperiences} deneyimi ve yüksek güveni olan yerler, son puana göre.
        </p>
        <p className="text-[12.5px] text-ink-3">Seçkiye girmek satın alınamaz; işletme aboneliği ve rezervasyon ücreti sıralamayı etkilemez. <Link href="/nasil-calisir/" className="underline underline-offset-2">Yöntem</Link></p>
      </header>
      <ol className="mt-8 border-t-2 border-line-strong">
        {list.map((c, i) => <EntityCardRow key={c.entity.id} card={c} rank={i + 1} dense />)}
      </ol>
      {list.length < G100.size && <p className="mt-4 text-[13px] text-ink-3">Koşulları karşılayan {list.length} yer var; liste deneyimler arttıkça dolar.</p>}
      <div className="mt-12"><DemoNotice /></div>
    </div>
  );
}
