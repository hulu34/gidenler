import Link from "next/link";

export const metadata = {
  title: "Gizlilik ve kişisel veriler",
  description: "Gidenler hangi kişisel verileri neden işler, ne kadar saklar ve haklarını nasıl kullanırsın.",
  alternates: { canonical: "/gizlilik/" },
};

/* GİZLİLİK · KVKK AYDINLATMA — sitenin bugün GERÇEKTEN yaptığı veri işlemeyi anlatır (kod ile birebir):
   lib/auth.ts (Google girişi, oturum), lib/community/reviews.ts ("Ad S."), lib/kampanya/server.ts (günlük özet, 120 gün),
   lib/signals.ts, lib/oneri, lib/drafts.ts, lib/kampanya/client.ts (14 gün), /kurallar#kvkk (rezervasyon).
   Kod değişirse bu metin de değişmeli. Veri sorumlusunun resmî unvanı ve adresi şirket bilgileriyle tamamlanacak. */
const UPDATED = "10 Kasım 2026";

const SECTIONS: Array<[string, string, Array<React.ReactNode>]> = [
  ["sorumlu", "Veri sorumlusu", [
    <>Bu sitedeki kişisel verilerin veri sorumlusu <b>Gidenler</b>&apos;dir. Resmî unvan ve adres bilgileri bu sayfaya eklenecektir; o zamana kadar kişisel verilerinle ilgili her başvuruyu <Link href="/hukuki-basvuru/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4">Hukuki Başvuru</Link> sayfasından iletebilirsin.</>,
  ]],
  ["hesap", "Google ile giriş", [
    <>Deneyim yayınlamak için Google hesabınla giriş yaparsın. Google bize yalnız <b>adını, e-posta adresini, profil fotoğrafını</b> ve hesabın için bir kimlik numarası iletir. Gidenler şifre almaz ve saklamaz; Google hesabındaki başka hiçbir veriye (kişiler, takvim, Drive vb.) erişmez.</>,
    <>Girişte tarayıcına bir <b>oturum çerezi</b> yazılır. Oturum kaydında güvenlik için <b>IP adresi ve tarayıcı bilgisi</b> tutulur; oturum kapandığında ya da süresi dolduğunda bu kayıt geçerliliğini yitirir.</>,
  ]],
  ["deneyim", "Yazdığın deneyimler", [
    <>Yayınladığın deneyimin metni, puanları ve ziyaret ayı <b>herkese açık</b> olarak ilgili mekân sayfasında görünür. Adın <b>&ldquo;Ad S.&rdquo;</b> biçiminde kısaltılır; e-posta adresin ve fotoğrafın deneyimde gösterilmez.</>,
    <>Deneyimini istediğin zaman düzenleyebilir ya da silebilirsin. Kurallara aykırı içerik moderasyonla gizlenebilir; moderasyon kararları denetim kaydında tutulur.</>,
    <>Yayınlamadan önce yazdıkların <b>yalnız bu cihazda</b> taslak olarak saklanır (tarayıcı depolaması). Taslak sunucuya gönderilmez; Google girişinden dönüşte formu yeniden doldurmak için kullanılır.</>,
    <>Instagram gibi bir uygulamanın kendi tarayıcısındaysan (Google orada girişe izin vermez), taslağın ayrıca sayfa adresinin <b>&ldquo;#&rdquo; ile başlayan bölümüne</b> yazılır; böylece sayfayı Safari ya da Chrome&apos;da açtığında yazdıkların seninle gelir. Bu bölüm sunucuya gönderilmez. &ldquo;Bağlantıyı kopyala&rdquo; ile kopyaladığın bağlantı da taslağını içerir; <b>bu bağlantıyı başkasıyla paylaşma</b>. Yeni tarayıcıda açılınca, giriş yapmışsan önce o mekân için yayımlanmış bir deneyimin olup olmadığına bakılır; bu sırada taslak hiçbir yere yazılmaz. Ardından taslak o cihaza kaydedilir ve &ldquo;#&rdquo; bölümü adresten silinir; o cihazda aynı mekân için başka bir taslağın varsa hangisiyle devam edeceğini sen seçersin. Tarayıcı taslağı kaydetmeye izin vermezse metin yalnız ekranda durur ve &ldquo;#&rdquo; bölümü adreste kalır. O mekân için yayımlanmış deneyimini düzenliyorsan getirdiğin taslak düzenlemene uygulanmaz; ayrı bir ziyaret olarak yazmayı ya da bırakmayı sen seçersin.</>,
  ]],
  ["oneri", "Mekân önerisi", [
    <>Listede olmayan bir mekânı önerirken yazdığın <b>mekân adı, ilçe ve konum notu</b> yönetici kuyruğuna kaydedilir. Giriş yaptıysan öneri hesabınla ilişkilendirilir. Öneriler yayımlanmaz; yalnız ekip tarafından incelenir. Konum notuna kişisel bilgi, telefon veya bağlantı yazılamaz.</>,
  ]],
  ["olcum", "Ziyaret ölçümü", [
    <>Hangi mekânların ilgi gördüğünü ve paylaşım bağlantılarının işe yarayıp yaramadığını anlamak için sayfa ziyaretlerini <b>toplu olarak</b> sayarız. Bunun için IP adresin ve tarayıcı bilgin, <b>her gün değişen bir anahtarla geri döndürülemez bir özete</b> çevrilir; ham IP adresi, adın ya da e-postan bu sayımlara yazılmaz ve iki farklı gün birbirine bağlanamaz.</>,
    <>Bir paylaşım bağlantısıyla geldiysen (ör. <code>?k=ic01</code>), bağlantının kodu <b>14 gün</b> bu tarayıcıda tutulur. Kod yalnız &ldquo;bu bağlantıdan kaç kişi geldi, kaçı deneyim yazdı&rdquo; sayımı için kullanılır; sıralamaya ve Gidenler puanına hiçbir etkisi yoktur. Bağlantı sayımları <b>120 günden</b>, genel sayfa ziyareti sayımları <b>35 günden</b> eskiyse düzenli olarak silinir.</>,
    <>Reklam veya analiz amaçlı üçüncü taraf çerezi ya da izleme kodu kullanmıyoruz.</>,
  ]],
  ["sor", "Sor Gidenler", [
    <>Sor Gidenler&apos;e yazdığın soru, cevabı oluşturmak için bir yapay zekâ hizmet sağlayıcısına iletilir. Soruna adını, telefonunu veya başka kişisel bilgi yazmamanı öneririz.</>,
  ]],
  ["rezervasyon", "Rezervasyon", [
    <>Rezervasyon talebinde verdiğin ad ve telefon yalnız o rezervasyon için ilgili işletmeye iletilir; ayrıntılar <Link href="/kurallar/#kvkk" className="font-semibold text-ink underline decoration-line-2 underline-offset-4">Kurallar · rezervasyon</Link> bölümünde.</>,
  ]],
  ["guvenlik", "Kötüye kullanımı önleme", [
    <>Spam ve otomatik istekleri sınırlamak için IP adresinin geri döndürülemez özetine bağlı <b>kısa süreli sayaçlar</b> (çoğu bir saat içinde kendiliğinden silinir) tutulur.</>,
  ]],
  ["aktarim", "Hizmet sağlayıcılar", [
    <>Site; barındırma (Vercel), veritabanı (Neon), geçici sayaçlar (Upstash), giriş (Google) ve Sor Gidenler&apos;in yapay zekâ cevabı için hizmet sağlayıcılar kullanır. Bu sağlayıcıların sunucuları yurt dışında olabilir; veriler yalnız hizmetin çalışması için gereken ölçüde işlenir. Kişisel verilerin satılmaz ve reklam için paylaşılmaz.</>,
  ]],
  ["haklar", "Hakların", [
    <>6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun 11. maddesi uyarınca; verilerinin işlenip işlenmediğini öğrenme, bilgi isteme, düzeltilmesini veya silinmesini isteme, itiraz etme ve zararın giderilmesini talep etme haklarına sahipsin.</>,
    <>Hesabının ve deneyimlerinin silinmesi dahil her talep için <Link href="/hukuki-basvuru/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4">Hukuki Başvuru</Link> sayfasını kullanabilirsin.</>,
  ]],
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <p className="label">Gizlilik</p>
        <h1 className="max-w-[18ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Az veri. Açık amaç.</h1>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">Gidenler&apos;in çalışması için gereken kadar kişisel veri işleriz. Bu sayfa neyi, neden ve ne kadar süre tuttuğumuzu sade bir dille anlatır. Bu metin aynı zamanda KVKK kapsamındaki aydınlatma metnimizdir.</p>
        <p className="text-[12px] text-ink-3">Son güncelleme: {UPDATED}</p>
      </header>

      <div className="mt-9 grid gap-x-14 gap-y-8 border-t-2 border-line-strong pt-7 lg:grid-cols-2">
        {SECTIONS.map(([id, title, items]) => (
          <section key={id} id={id} aria-labelledby={`h-${id}`} className="scroll-mt-24 border-t border-line pt-3">
            <h2 id={`h-${id}`} className="text-[17px] font-bold tracking-[-0.02em]">{title}</h2>
            <ul className="mt-2 flex flex-col gap-2 text-[14px] leading-relaxed text-ink-2">
              {items.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-[13px] font-semibold">
        <Link href="/kullanim-kosullari/" className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">Kullanım koşulları</Link>
        <Link href="/kurallar/" className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">Kurallar</Link>
        <Link href="/hukuki-basvuru/" className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">Hukuki başvuru</Link>
      </p>
    </div>
  );
}
