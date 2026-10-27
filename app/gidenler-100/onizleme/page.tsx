import Link from "next/link";
import { notFound } from "next/navigation";
import { gidenler100, G100 } from "@/lib/venue";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { EntityCardRow } from "@/components/experience/EntityCardRow";
import { DemoNotice } from "@/components/ui/DemoNotice";

export const metadata = { title: `Gidenler 100 önizleme (demo) · ${G100.year}`, description: "Demo verilerle üretilmiş önizleme — gerçek sıralama değildir.", robots: { index: false } };

/* GİDENLER 100 — Tabelog "Hyakumeiten"/Award'dan uyarlama. Kural: yeme-içme, İstanbul, en az 60 deneyim,
   yüksek güven; puana göre ilk 100. Abonelik, reklam, rezervasyon ücreti etkisizdir. */
/* DEMO ÖNİZLEME — geliştirme ve sunum için korunur; gerçek sıralamaya karışmaz, arama motorlarına kapalı. */
export default function G100PreviewPage() {
  if (!DEMO_VISIBLE) notFound();
  const list = gidenler100({ demo: true });
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <p className="label">Önizleme · demo veri · {G100.year}</p>
        <p role="note" className="max-w-[70ch] border-l-2 border-accent bg-sheet px-3 py-2 text-[13px] leading-snug text-ink-2">
          Bu bir <strong>önizlemedir</strong>: aşağıdaki sıralama demo deneyimlerden üretildi ve gerçek bir sıralama değildir. Gerçek Gidenler 100, yeterli sayıda doğrulanmış deneyim biriktiğinde yayımlanacak.
        </p>
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
