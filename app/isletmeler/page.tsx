import Link from "next/link";
import { getBusinessDashboard } from "@/lib/api";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { nf } from "@/lib/format";

export const metadata = { title: "İşletmeler" };

/**
 * İŞLETMELER — sahibine değer önerisi. Tüketiciyle aynı sözlük, aynı puan:
 * tek doğruluk kaynağı. Sahte kayıt akışı yok; CTA canlı demo paneline gider.
 */
export default function BusinessesPage() {
  const demo = getBusinessDashboard("moda-lokantasi");
  const I = demo?.intelligence;
  const cannot = [
    "Gidenler puanı satın alınamaz.",
    "Organik sıralama satın alınamaz.",
    "Kişisel uyum (\"Sana göre\") satın alınamaz.",
    "Olumsuz deneyimler ödeme ile kaldırılamaz.",
    "Sponsorlu görünürlük her zaman açıkça etiketlenir.",
  ];
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <p className="label">İşletmeler için</p>
        <h1 className="max-w-[18ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">İnsanların ne söylediğini değil, neden değiştiğini görün.</h1>
        <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">Müşterilerinizin gördüğü puan, yön ve boyutlar aynı. Fark şu: panel size &ldquo;servis puanı neden düştü, hangi hafta, hangi konuda, kime göre&rdquo; sorusunu cevaplar.</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/isletme/moda-lokantasi/" className="inline-flex h-10 items-center rounded-[3px] bg-accent px-4 text-[14px] font-semibold text-on-accent">İşletme panelini gör · Moda Lokantası</Link>
          <Link href="/isletme/sakura-omakase/" className="inline-flex h-10 items-center rounded-[3px] border border-line-2 px-4 text-[14px] font-semibold hover:border-ink">Sakura paneli</Link>
        </div>
      </header>

      {I && (
        <section className="mt-10 border-t-2 border-line-strong pt-6" aria-label="Örnek panel özeti">
          <p className="label">Canlı demo · {demo!.entity.name}</p>
          <div className="mt-3 flex flex-wrap items-end gap-x-10 gap-y-4">
            <ScoreNumber score={I.overallScore} size="xl" label trend={{ direction: I.scoreTrend.direction, delta: I.scoreTrend.delta }} />
            <dl className="flex flex-wrap gap-x-8 gap-y-2">
              <div><dt className="label">Deneyim</dt><dd className="tnum text-[19px] font-bold">{nf(I.experienceCount)}</dd></div>
              <div><dt className="label">Doğrulanmış</dt><dd className="tnum text-[19px] font-bold">%{Math.round(I.verifiedRatio * 100)}</dd></div>
              <div><dt className="label">Tekrar gider</dt><dd className="tnum text-[19px] font-bold">%{Math.round(I.returnRate * 100)}</dd></div>
              {I.negativeThemes[0] && <div><dt className="label">Yükselen şikâyet</dt><dd className="text-[15px] font-bold">{I.negativeThemes[0].label}</dd></div>}
            </dl>
          </div>
        </section>
      )}

      <section className="mt-12 grid gap-x-14 gap-y-8 border-t-2 border-line-strong pt-7 sm:grid-cols-2 lg:grid-cols-3" aria-label="Panel neler gösterir">
        {[
          ["İşletmeniz Gidenler'de", "Sayfanız deneyimlerle zaten oluşur. Sahiplenen işletme, deneyimlere resmî yanıt verir ve paneli görür. Sahiplenmek puanı değiştirmez."],
          ["Performans", "Gidenler puanı, son 90 gün yönü, boyutlar (lezzet, servis, F/P, atmosfer, temizlik), deneyim hacmi ve doğrulanma oranı — tüketicinin gördüğüyle aynı sayılar."],
          ["Neden değişti?", "Kök neden: hangi boyut, hangi tema, hangi dönem. Şef değişimi, fiyat artışı gibi olaylarla deneyimlerin ilişkisi — nedensellik iddiası değil, zamanlama."],
          ["Kıyas", "Kategori ve semt içinde nerede durduğunuz: servis puanınız Kadıköy lokantalarının ortalamasının ne kadar üstünde ya da altında."],
          ["İnsanlar ne yaşıyor?", "En çok övülen ve en sık şikâyet edilen konular, sayı değil yön olarak. Uzmanların ve doğrulanmış ziyaretçilerin ayrı perspektifi."],
          ["İşletme yanıtı", "Deneyimlere yanıt verebilirsiniz; yanıt deneyimin altında, işletme etiketiyle görünür. Deneyimi silmez, ağırlığını değiştirmez."],
        ].map(([t, b]) => (
          <div key={t} className="flex flex-col gap-1.5 border-t border-line pt-3">
            <h2 className="text-[17px] font-bold tracking-[-0.02em]">{t}</h2>
            <p className="text-[13.5px] leading-relaxed text-ink-2">{b}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 border-t-2 border-line-strong pt-7" aria-labelledby="satin">
        <h2 id="satin" className="text-[13px] font-bold uppercase tracking-[0.2em]">Satın alınamayanlar</h2>
        <ul className="mt-4 grid gap-x-10 gap-y-2 sm:grid-cols-2">
          {cannot.map((x) => <li key={x} className="flex gap-2.5 border-t border-line py-2.5 text-[14.5px] font-semibold"><span aria-hidden className="text-neg-ink">✕</span>{x}</li>)}
        </ul>
        <p className="mt-3 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-3">Cevap kullanıcı için ücretsizdir; panel işletme için ücretlidir. &ldquo;Para verirsen konuşabilirsin&rdquo; izlenimi tarafsızlığı yıkar; bu yüzden yanıt hakkı sahiplenmeyle gelir, ödemeyle değil. Hekim, avukat gibi kategorilerde panel ve reklam yoktur.</p>
      </section>

      <section className="mt-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-line pt-5">
        <p className="text-[14.5px] text-ink-2">Prototipte sahiplenme akışı yoktur; paneli demo işletmeler üzerinden inceleyebilirsiniz.</p>
        <Link href="/isletme/moda-lokantasi/" className="inline-flex h-10 items-center rounded-[3px] bg-accent px-4 text-[14px] font-semibold text-on-accent">Paneli aç</Link>
      </section>
    </div>
  );
}
