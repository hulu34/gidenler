import Link from "next/link";

export const metadata = { title: "Kurallar · Gidenler" };

const RULES: Array<[string, string]> = [
  ["Gerçek deneyim", "Yaşamadığın bir deneyimi yaşamış gibi yazma. \"Gittim\" demek bile bir sinyaldir; doğrulanmış ziyaret daha ağır sayılır."],
  ["Spesifik ol", "\"Berbat.\" bir deneyim değildir. Ne sipariş ettin, ne oldu, ne zaman? Somut ayrıntı hem okuyana hem puana yarar."],
  ["Kişiye saldırma", "Hakaret, tehdit, taciz, nefret söylemi ve kişisel bilgi ifşası yasaktır. Mekânı eleştir; garsonun adını yazma."],
  ["Çıkar ilişkini açıkla", "Ücretsiz ürün, davet, sponsorluk ya da ticari ilişki varsa deneyimin başında beyan et. Beyan etmek deneyimi silmez; ağırlığını düşürür. Beyan etmemek hesap kısıtına yol açar."],
  ["Sahte değerlendirme yok", "İşletmelerin kendi ya da rakip sayfalarını manipüle etmesi — toplu deneyim, ödül karşılığı yazı, silme baskısı — yasaktır ve sayfada görünür şekilde işaretlenir."],
  ["Spam yok", "Tekrarlanan, otomatik ya da reklam amaçlı içerik kaldırılır."],
  ["Mahremiyet", "Telefon, adres, kimlik, özel yazışma gibi kişisel bilgileri paylaşma — kendininkini de."],
  ["Regüle kategoriler", "Hekim, avukat gibi meslek mevzuatı kısıtlı kategorilerde Gidenler puan üretmez, özet cümlesi kurmaz, reklam göstermez; yalnızca nötr konu sayımı gösterir. Bu alanlarda yazdığın deneyim tıbbi ya da hukuki tavsiye içermemelidir."],
];

/**
 * KURALLAR — jenerik kullanım şartları değil; topluluğun anlayacağı sade kurallar.
 * Kesin hukuki taahhüt vermez; hukuki talepler ayrı sayfaya gider.
 */
export default function RulesPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <p className="label">Kurallar</p>
        <h1 className="max-w-[16ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Deneyimini anlat. İnsana saldırma.</h1>
        <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">Gidenler&apos;in değeri gerçek deneyimlerden gelir. Kurallar bu yüzden kısa: yaşadığını yaz, somut ol, kişileri hedef alma, çıkarını açıkla.</p>
      </header>

      <ol className="mt-9 grid gap-x-14 gap-y-7 border-t-2 border-line-strong pt-7 sm:grid-cols-2">
        {RULES.map(([t, b], i) => (
          <li key={t} className="flex flex-col gap-1.5 border-t border-line pt-3">
            <h2 className="flex items-baseline gap-3 text-[17px] font-bold tracking-[-0.02em]"><span className="tnum text-[12px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>{t}</h2>
            <p className="text-[14px] leading-relaxed text-ink-2">{b}</p>
          </li>
        ))}
      </ol>

      <section className="mt-12 grid gap-x-14 gap-y-8 border-t-2 border-line-strong pt-7 lg:grid-cols-2" aria-label="Moderasyon ve itiraz">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Moderasyon</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">Kural ihlali bildirilen içerik incelenir. Sonuç, içeriğin kalması, sınırlanması (ağırlığının düşürülmesi ya da işaretlenmesi), kaldırılması veya hesabın kısıtlanması olabilir. Bildirimler, deneyim kartındaki &ldquo;bildir&rdquo; ile yapılır; inceleme sırası ve süresi için kesin bir taahhüt verilmez.</p>
        </div>
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">İtiraz</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">Bir moderasyon kararına itiraz edebilirsin; itirazda kararın hangi kurala dayandığını ve neden hatalı olduğunu düşündüğünü yaz. Kişilik hakkı, mahremiyet, fikri mülkiyet gibi hukuki talepler için <Link href="/hukuki-basvuru/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4">Hukuki Başvuru</Link> sayfasını kullan.</p>
        </div>
      </section>

      <p className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-[13px] font-semibold">
        <Link href="/nasil-calisir/" className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">Puan nasıl oluşur?</Link>
        <Link href="/isletmeler/" className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">İşletmeler için</Link>
        <Link href="/hukuki-basvuru/" className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">Hukuki başvuru</Link>
      </p>
    </div>
  );
}
