import Link from "next/link";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { getScoreSemantic } from "@/lib/semantic";

export const metadata = { title: "Nasıl çalışır · Gidenler" };

const SCALE = [[9.4, "9,0 – 10"], [8.5, "8,0 – 8,9"], [7.5, "7,0 – 7,9"], [6.4, "6,0 – 6,9"], [5.4, "5,0 – 5,9"], [4.2, "0 – 4,9"]] as const;

/**
 * NASIL ÇALIŞIR — kurumsal "hakkımızda" değil; sistemin kendisi.
 * Score → Trend → Sana göre → Güven → Neden → Döngü. 60 saniyede anlaşılmalı.
 * Buradaki örnek sayılar ürünün gerçek demo verisiyle aynıdır (Sakura 9,4 / %96 / Date %99 / Aile %63).
 */
export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <p className="label">Nasıl çalışır</p>
        <h1 className="max-w-[16ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Gidenler bir puandan fazlasıdır.</h1>
        <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">Her mekân için aynı beş soruyu cevaplarız: Ne kadar iyi? Nereye gidiyor? Sana uygun mu? Ne kadar eminiz? Neden? Cevaplar, yıldız tıklayan kimseden değil, yazılan deneyimlerden çıkar.</p>
      </header>

      {/* 1 SCORE */}
      <section className="mt-10 border-t-2 border-line-strong pt-7" aria-labelledby="s1">
        <div className="grid gap-x-14 gap-y-6 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="label">01 · Puan</p>
            <h2 id="s1" className="mt-2 text-[clamp(1.5rem,4vw,2.2rem)] font-extrabold leading-tight tracking-[-0.035em]">Ne kadar iyi?</h2>
            <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-ink-2">Gidenler puanı, insanların yazdığı deneyimlerden üretilir. Doğrulanmış ziyaretler, yakın tarihli deneyimler ve yazarın konusundaki uzmanlığı daha ağır sayılır; beyan edilmiş ticari ilişki daha hafif. Puan bir girdi değil, bir çıktıdır — satın alınacak düğme yok.</p>
          </div>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-line pt-4 sm:grid-cols-3">
            {SCALE.map(([v, range]) => { const s = getScoreSemantic(v); return (
              <li key={range} className="flex flex-col gap-0.5">
                <ScoreNumber score={v} size="md" />
                <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${s.text}`}>{s.label}</span>
                <span className="tnum text-[12px] text-ink-3">{range}</span>
              </li>
            ); })}
          </ul>
        </div>
        <p className="mt-4 text-[12.5px] text-ink-3">Renk her yerde aynı anlama gelir: yeşil iyi, amber iyi ama olağanüstü değil, turuncu ve kırmızı dikkat. 7 kötü bir puan değildir.</p>
      </section>

      {/* 2 TREND */}
      <section className="mt-10 border-t-2 border-line-strong pt-7" aria-labelledby="s2">
        <div className="grid gap-x-14 gap-y-6 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="label">02 · Yön</p>
            <h2 id="s2" className="mt-2 text-[clamp(1.5rem,4vw,2.2rem)] font-extrabold leading-tight tracking-[-0.035em]">Nereye gidiyor?</h2>
            <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-ink-2">Bir mekân bugünkü puanı değil, bir eğridir. Gidenler son 90 günün yönünü ayrı gösterir; bozulan bir yeri puanı hâlâ yüksekken, toparlanan bir yeri puanı hâlâ düşükken fark edersin.</p>
          </div>
          <ul className="grid gap-6 border-t border-line pt-4 sm:grid-cols-2">
            <li className="flex flex-col gap-1"><ScoreNumber score={9.2} size="lg" label trend={{ direction: "down", delta: -0.3 }} /><span className="text-[13px] text-ink-2">Olağanüstü ama geriliyor. Puan rengi yeşil, ok kırmızı — iki ayrı bilgi.</span></li>
            <li className="flex flex-col gap-1"><ScoreNumber score={6.4} size="lg" label trend={{ direction: "up", delta: 0.5 }} /><span className="text-[13px] text-ink-2">Ortalama ama toparlıyor. Belki şef değişti; <em>Ne oldu?</em> bunu gösterir.</span></li>
          </ul>
        </div>
      </section>

      {/* 3 SANA GÖRE */}
      <section className="mt-10 border-t-2 border-line-strong pt-7" aria-labelledby="s3">
        <div className="grid gap-x-14 gap-y-6 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="label">03 · Sana göre</p>
            <h2 id="s3" className="mt-2 text-[clamp(1.5rem,4vw,2.2rem)] font-extrabold leading-tight tracking-[-0.035em]">Sana uygun mu?</h2>
            <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-ink-2">Aynı mekân herkes için aynı değildir. Zevk profilin (deneyimlerinden öğrenilir, sen düzeltebilirsin), gittiğin bağlam (date, aile, iş) ve sana benzeyen kullanıcıların ne yaşadığı birleşir. Uyum, puandan ayrı bir sayıdır ve ayrı renkte gösterilir.</p>
          </div>
          <div className="border-t border-line pt-4">
            <p className="text-[15px] font-bold">Sakura Omakase</p>
            <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-3">
              <div><dt className="label">Gidenler puanı</dt><dd><ScoreNumber score={9.4} size="lg" /></dd></div>
              <div><dt className="label">Sana göre</dt><dd className="tnum text-[30px] font-extrabold leading-none tracking-[-0.045em] text-accent-ink">%96</dd></div>
              <div><dt className="label">Date</dt><dd className="tnum text-[30px] font-extrabold leading-none tracking-[-0.045em] text-accent-ink">%99</dd></div>
              <div><dt className="label">Aile</dt><dd className="tnum text-[30px] font-extrabold leading-none tracking-[-0.045em] text-accent-ink">%63</dd></div>
            </dl>
            <p className="mt-3 text-[12.5px] text-ink-3">Aynı 9,4; üç farklı cevap. Uyum puanı değiştirmez, sana ne yapacağını söyler. <Link href="/mekan/sakura-omakase/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4">Canlı örneğe bak</Link>.</p>
          </div>
        </div>
      </section>

      {/* 4 GÜVEN */}
      <section className="mt-10 border-t-2 border-line-strong pt-7" aria-labelledby="s4">
        <div className="grid gap-x-14 gap-y-6 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="label">04 · Güven</p>
            <h2 id="s4" className="mt-2 text-[clamp(1.5rem,4vw,2.2rem)] font-extrabold leading-tight tracking-[-0.035em]">Ne kadar eminiz?</h2>
            <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-ink-2">12 deneyimle 9,4 ile 2.400 deneyimle 9,1 aynı şey değildir. Güven, puanın yanında ayrı ve sakin bir dille durur: kaç deneyim, kaçı doğrulanmış, ne kadar yeni, görüşler ne kadar örtüşüyor. Az veri puanı düşürmez; yalnızca daha temkinli okunmasını söyler.</p>
          </div>
          <ul className="grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
            {[["Yüksek güven", "Çok deneyim, çoğu doğrulanmış, yakın tarihli ve tutarlı."], ["Orta güven", "Yeterli deneyim var; doğrulama ya da tazelik sınırlı."], ["Sınırlı veri", "Az deneyim ya da eski. Puan gösterilir, temkinle okunur."]].map(([k, v]) => (
              <li key={k} className="flex flex-col gap-1"><span className="inline-flex w-fit items-center gap-2 border border-line-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-2"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" />{k}</span><span className="text-[13px] leading-relaxed text-ink-2">{v}</span></li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5 NEDEN */}
      <section className="mt-10 border-t-2 border-line-strong pt-7" aria-labelledby="s5">
        <div className="grid gap-x-14 gap-y-6 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="label">05 · Neden</p>
            <h2 id="s5" className="mt-2 text-[clamp(1.5rem,4vw,2.2rem)] font-extrabold leading-tight tracking-[-0.035em]">Puan nereden çıktı?</h2>
            <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-ink-2">Puan tek başına oluşmaz. Her mekân sayfasında &ldquo;Neye dayanıyor?&rdquo; katmanı kanıtı gösterir; her &ldquo;Sana göre&rdquo; sonucunun altında &ldquo;Neden %96?&rdquo; açılır. Kara kutu yok.</p>
          </div>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-3 border-t border-line pt-4 text-[13.5px] sm:grid-cols-3">
            {["Yazılı deneyimler", "Doğrulanmış ziyaretler", "Konu bazlı uzmanlık", "Sana benzeyen kullanıcılar", "Yakın tarih ağırlığı", "Boyutlar: lezzet, servis, F/P…"].map((x) => <li key={x} className="flex gap-2"><span aria-hidden className="font-bold text-pos-ink">✓</span>{x}</li>)}
          </ul>
        </div>
      </section>

      {/* 6 DÖNGÜ */}
      <section className="mt-10 border-t-2 border-line-strong pt-7" aria-labelledby="s6">
        <p className="label">06 · Döngü</p>
        <h2 id="s6" className="mt-2 text-[clamp(1.5rem,4vw,2.2rem)] font-extrabold leading-tight tracking-[-0.035em]">Her deneyim, bir sonraki kararı daha iyi hale getirir.</h2>
        <ol className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] font-bold">
          {["Karar ver", "Git", "Yaşa", "Paylaş", "Sonraki karar daha iyi"].map((x, i, a) => (
            <li key={x} className="flex items-center gap-3"><span className={i === a.length - 1 ? "text-accent-ink" : ""}>{x}</span>{i < a.length - 1 && <span aria-hidden className="text-ink-3">→</span>}</li>
          ))}
        </ol>
        <p className="mt-3 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-2">&ldquo;Gitmek istiyorum&rdquo; dersin, gidersin, iki dokunuşla nasıl geçtiğini söylersin, istersen yazarsın. Yazdığın deneyim hem senin profilini hem de sana benzeyenlerin kararını besler. <Link href="/benim/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4">Benim Gidenler&apos;im</Link> bu döngünün evidir.</p>
      </section>

      {/* 7–8 DIŞ KAYNAK + SPONSOR */}
      <section className="mt-10 grid gap-x-14 gap-y-8 border-t-2 border-line-strong pt-7 lg:grid-cols-2" aria-label="Dış kaynaklar ve sponsorlu içerik">
        <div>
          <p className="label">07 · Dış kaynaklar</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">Google, Tripadvisor, Yandex gibi platformların puanları mekân sayfasında <em>karşılaştırma sinyali</em> olarak, kendi ölçekleriyle ve daha küçük gösterilir. Gidenler puanına karışmazlar; Gidenler puanı onların ortalaması değildir.</p>
        </div>
        <div>
          <p className="label">08 · Sponsorlu içerik</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">Sponsorlu alternatifler açıkça etiketlenir ve ayrı bir alanda durur. Sponsorluk puanı, uyumu ve organik sıralamayı değiştiremez; sıralama satın alınamaz. Hekim ve avukat gibi kategorilerde puan, özet ve reklam hiç yoktur.</p>
        </div>
      </section>

      <p className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-[13px] font-semibold">
        <Link href="/mekan/sakura-omakase/" className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">Bir mekân sayfasında gör</Link>
        <Link href="/sor/" className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">Sor Gidenler&apos;i dene</Link>
        <Link href="/isletmeler/" className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">İşletmeler için</Link>
        <Link href="/kurallar/" className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">Kurallar</Link>
      </p>
    </div>
  );
}
