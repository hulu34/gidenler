import Link from "next/link";

export const metadata = {
  title: "Kullanım koşulları",
  description: "Gidenler'i kullanırken geçerli koşullar: hesap, deneyimler, puanlar ve sorumluluk.",
  alternates: { canonical: "/kullanim-kosullari/" },
};

/* KULLANIM KOŞULLARI — sitenin gerçek işleyişiyle uyumlu, sade koşullar. Topluluk kuralları /kurallar/'da,
   kişisel veriler /gizlilik/'te. Şirket unvanı ve uyuşmazlık maddesi hukuk danışmanıyla tamamlanacak. */
const UPDATED = "10 Kasım 2026";

const TERMS: Array<[string, React.ReactNode]> = [
  ["Hizmet", <>Gidenler, İstanbul&apos;daki mekânları keşfetmeye ve gerçek deneyimleri paylaşmaya yarayan ücretsiz bir rehberdir. Site geliştirilmeye devam eder; özellikler önceden haber verilmeden değişebilir.</>],
  ["Hesap", <>Deneyim yayınlamak için Google hesabınla giriş yaparsın. Hesabını yalnız sen kullanırsın; başkası adına ya da birden çok hesapla deneyim yazamazsın.</>],
  ["Deneyimlerin", <>Yazdığın deneyim sana aittir. Yayınladığında, Gidenler&apos;e bu içeriği sitede ve Gidenler&apos;in tanıtımında göstermek için ücretsiz, münhasır olmayan bir kullanım izni vermiş olursun. Deneyimini sildiğinde sitede gösterilmesi sona erer.</>],
  ["Kurallar", <>Deneyimlerin <Link href="/kurallar/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4">topluluk kurallarına</Link> uymalıdır: yaşadığını yaz, kişilere saldırma, çıkar ilişkini açıkla. Kurallara aykırı içerik gizlenebilir, hesap kısıtlanabilir.</>],
  ["Puanlar", <>Gidenler puanı (10 üzerinden) yalnız Gidenler&apos;e yazılan deneyimlerden hesaplanır ve en az beş farklı kişi deneyim yazınca gösterilir. Mekân sayfalarında görünen Google puanı (5 üzerinden) Google&apos;a aittir ve Gidenler puanına katılmaz. Puanlar bir görüş özetidir; kesin bir kalite garantisi değildir.</>],
  ["Mekân bilgileri", <>Adres, çalışma saati, telefon ve bağlantılar açık kaynaklardan ve işletmelerden derlenir; değişmiş olabilir. Gitmeden önce işletmeyle doğrulamanı öneririz. Hatalı bir bilgiyi <Link href="/hukuki-basvuru/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4">bize bildirebilirsin</Link>.</>],
  ["İşletmeler", <>İşletmeler puan satın alamaz, deneyim sildiremez ve sıralamayı ücret karşılığı değiştiremez. Ücretli bir görünürlük olursa açıkça &ldquo;sponsorlu&rdquo; diye işaretlenir.</>],
  ["Sorumluluk", <>Deneyimler kullanıcıların kişisel görüşüdür; Gidenler bu görüşleri doğrulamış sayılmaz. Gidenler, mekânlarda yaşanan hizmetten ya da üçüncü taraf bağlantılarından (rezervasyon, harita, menü) sorumlu değildir.</>],
  ["Kişisel veriler", <>Hangi verileri neden işlediğimiz <Link href="/gizlilik/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4">Gizlilik</Link> sayfasında anlatılır.</>],
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <p className="label">Kullanım koşulları</p>
        <h1 className="max-w-[18ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Kısa ve açık koşullar.</h1>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">Gidenler&apos;i kullanarak bu koşulları kabul etmiş olursun. Uzun hukuk metni yerine sitenin gerçekte nasıl çalıştığını yazdık.</p>
        <p className="text-[12px] text-ink-3">Son güncelleme: {UPDATED}</p>
      </header>
      <ol className="mt-9 grid gap-x-14 gap-y-7 border-t-2 border-line-strong pt-7 sm:grid-cols-2">
        {TERMS.map(([t, b], i) => (
          <li key={t} className="flex flex-col gap-1.5 border-t border-line pt-3">
            <h2 className="flex items-baseline gap-3 text-[17px] font-bold tracking-[-0.02em]"><span className="tnum text-[12px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>{t}</h2>
            <p className="text-[14px] leading-relaxed text-ink-2">{b}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
