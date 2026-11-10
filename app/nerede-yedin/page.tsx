import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { SonYemekArama } from "@/components/deneyim/SonYemek";
import { activeEntities } from "@/data/real";
import { nf } from "@/lib/format";

/* KAMPANYA AÇILIŞ SAYFASI — içerik üreticisi bağlantıları (?k=ic01…) buraya gelir. Ana sayfada kaybolmadan doğrudan
   "restoranı bul → deneyimini yaz" akışı. Kaynak kodu yalnız toplu ölçüm içindir; sıralamaya ve puana girmez. */
export const metadata: Metadata = {
  title: "İstanbul'da en son nerede yemek yedin?",
  description: "Gittiğin restoranı bul, deneyimini paylaş. Gidenler puanı yalnız gerçek deneyimlerden oluşur.",
  alternates: { canonical: "/nerede-yedin/" },
  openGraph: { title: "İstanbul'da en son nerede yemek yedin?", description: "Gidenler'de deneyimini paylaş.", siteName: "Gidenler", locale: "tr_TR", type: "website", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Gidenler — İstanbul'da en son nerede yemek yedin?" }] },
};

export default function NeredeYedinPage() {
  if (DEMO_VISIBLE) notFound();
  return (
    <div className="mx-auto max-w-[920px] px-5 pb-24 sm:px-7" data-kampanya-sayfa>
      <section className="pt-7 sm:pt-14">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
          <i aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          Gidenler <span className="font-[family-name:var(--font-brand)] text-[13px] font-normal normal-case italic tracking-normal text-accent-ink">bilir.</span>
        </p>
        <h1 className="mt-3 text-[clamp(2.15rem,7vw,4.1rem)] font-extrabold leading-[0.95] tracking-[-0.055em]">
          İstanbul&apos;da <span className="font-[family-name:var(--font-brand)] font-normal italic tracking-[-0.02em] text-accent-ink">en son</span> nerede yemek yedin?
        </h1>
        <p className="mt-4 max-w-[44ch] font-[family-name:var(--font-read)] text-[clamp(1.05rem,2.2vw,1.3rem)] leading-[1.42] text-ink-2">
          Gittiğin yeri bul. Deneyimini paylaş. Başkalarının doğru mekânı seçmesine yardımcı ol.
        </p>
        <div className="mt-6">
          <SonYemekArama variant="landing" autoFocus />
        </div>
        <p className="tnum mt-3 text-[12px] text-ink-3">{nf(activeEntities.length)} İstanbul restoranı arasında arıyorsun. Aradığın yer yoksa önerebilirsin.</p>
      </section>

      <ol className="mt-10 grid gap-5 border-t-2 border-ink pt-5 sm:grid-cols-3" aria-label="Nasıl çalışır">
        {[
          ["Bul", "Restoranın adını yaz, listeden seç. Aynı adlı şubeler semtiyle ayrılır."],
          ["Değerlendir", "Ne zaman gittiğini seç, 1–10 genel puanını ver, ne yaşadığını anlat."],
          ["Paylaş", "Google hesabınla giriş yap ve yayınla. Girişte yazdıkların kaybolmaz."],
        ].map(([t, d], i) => (
          <li key={t}>
            <span className="tnum text-[11px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            <span className="block text-[16px] font-bold">{t}</span>
            <span className="block text-[13px] leading-snug text-ink-2">{d}</span>
          </li>
        ))}
      </ol>

      <section className="mt-10 grid gap-4 text-[13px] leading-relaxed text-ink-2 sm:grid-cols-2" aria-label="Kurallar">
        <p className="border-l-2 border-accent pl-3"><strong className="font-semibold text-ink">Gidenler puanı 10 üzerinden</strong> ve yalnız gerçek deneyimlerden hesaplanır. Google puanı (5 üzerinden) ayrı gösterilir, birbirine karıştırılmaz.</p>
        <p className="border-l-2 border-line-strong pl-3">Deneyimin &ldquo;doğrulanmamış ziyaret&rdquo; olarak etiketlenir; ziyaret doğrulama henüz açık değil. Davetli ya da sponsorlu gittiysen formda belirtirsin.</p>
      </section>

      <p className="mt-10 text-[13px]"><Link href="/" className="font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">Önce restoranlara göz at →</Link></p>
    </div>
  );
}
