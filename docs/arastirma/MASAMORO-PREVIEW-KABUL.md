# MasaMoro — sınırlı gerçek Preview kabul hazırlığı

Bu belge Preview **hazırlığıdır**. Dağıtılmış kabul veya yayın kanıtı değildir. Son kesin SHA ve kaynak/erişim kapsamı için Harun onayı alınmadan push, Preview deploy/ayar/DB işlemi yapılmaz. Production ayrıca onay ister.

## Kapsam ve kimlik

Gidenler son doğrulanan Production `9a2f2f482b65709e862397911438d99b06230e2c`: 892 kaynak / son yayımlanmış 857 aktif. Yalnız kaynaklı MasaMoro test kaydı: `researchId=kibris/masamoro`, `slug=masamoro-lefkosa-guney-kibris`, `ref=isletme/masamoro-lefkosa-guney-kibris`, bölge `kibris/lefkosa/guney`. Kesim içermeyen eski slug yalnız yayımlanmamış yerel prototipteydi; canlı yönlendirme değiştirilmez. Kaynaklı sokak adresi, tarih ve provenance korunur; telefon/koordinat yok. Bu bir açık işletme kabulü değildir. Oniro, diğer beş aday, Onar ve PR73 dışarıda.

## Preview kapısı

Gidenler hedef dalı `inceleme/masamoro-preview-kabul-v1`. Yalnız bu dalın Preview kapsamına, onay sonrasında:

- `NEXT_PUBLIC_KIBRIS_PILOT=true`
- `NEXT_PUBLIC_KIBRIS_PREVIEW_CONTRACT=masamoro-v1`

Platformun gerçek `VERCEL_ENV=preview`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_URL`, `VERCEL_GIT_COMMIT_SHA` değerleri de kontrol edilir; bunlar Production gibi gösterilmez veya güvenlik kuralı aşmak için değiştirilmez. Doğru dal/bayrak/sözleşme yoksa kaynak yüklenmez. Production hiçbir bayrakla sunucu kaynağını açamaz.

Sunucu, yalnız değişmez deployment host'una verdiği başlangıç bağlamını istemci indeksinden önce hazırlar. Kullanılan `next/script beforeInteractive` sıralaması [resmî Next.js belgesindeki](https://nextjs.org/docs/app/api-reference/components/script#beforeinteractive) sözleşmeye dayanır. Yerel testler tarayıcı başlangıç bağlamını taklit eder; gerçek sıralama/hydration dağıtılmış tarayıcı kabulünde ayrıca sınanmalıdır. Bağlam yok, ret veya host farklı ise istemci kapalıdır. Pilot profil statik parametrelere girmez; gerçek route ve metadata ayrıca request host'unu kontrol eder. Kamu JSON-LD/sitemap yok, noindex korunur. Preview artifact'ı Production'a terfi ettirilmez; gelecekteki olası Production ayrı ayarlarla yeniden derlenmelidir.

Yalnız açık Preview için root layout request-rendered olabilir. Normal Production bayrak kapalı çıktısının statikliği, kaynak/istemci katalogları ve İstanbul davranışı yerel derleme karşılaştırmasıyla kontrol edilir. Preview kaynak görünümü 892 İstanbul + 1 test fixture olabilir; bu 893 yayımlanmış veya 858 kabul edilmiş aktif mekân değildir. `activeEntities`, Google/Excel ve Sor İstanbul kapsamında 857/892 sınırlarını korur.

## Gerçek kaynak ve YorumS aktarımı

`data/real/index.ts` doğru kapı açıkken yalnız sabit MasaMoro fixture dosyasını normal birleştiriciye verir; altı aday manifestini otomatik içe almaz. Client catalog ve Sor üreticileri normal yoldan çalışır. `scripts/kibris-pilot-export.ts` aynı normal yükleyiciden tek normalize pilot kaydını, repo ve kaynak commit SHA'sını JSON stdout olarak verir; yerel kirli çalışma ağacını reddeder. Örnek yerel komut, temiz commit sonrasında `NODE_ENV=test NEXT_PUBLIC_KIBRIS_PILOT=true node --import tsx scripts/kibris-pilot-export.ts`. Çıktı yeni geçici kaynak kopyasına verilir; gerçek `data/real/*.json` değiştirilmez.

Claude iki ayrı depoda normal importer → profile sync → index → arama/detail hazırlığından sorumludur. Gidenler ve YorumS aynı dosyaları paralel değiştirmez. RY ve YY'nin kendi final SHA'ları, hedef dalları, güvenli build hazırlık komutları ve testleri bağımsız incelenmeden üç site için birleşik kabul istenmez. Tekrar kabulü geçici JSON katmanındadır; DB replay iddiası değildir. Hesap/DB/marka rolleri ayrı kalır.

## DB ayrımı ve yazmasız kabul

Gidenler mevcut bölgesel DB seed/append yasağı korunur. MasaMoro DB'ye eklenmez; mevcut izole Preview DB, kayıtlar/hesaplar/deneyimler korunarak yalnız okunur. Yeni DB/dal, reset/silme, ücretli kaynak veya Production bağlantısı gerekmez. Onaydan önce gerçek ortam ayarı yapılmaz. App'in `DATABASE_URL` bağlantısının Production'dan fiziksel ayrımı doğrulanmalı; varsa `DATABASE_URL_UNPOOLED` gibi diğer bağlantı kapsamları da ayrı kalmalıdır.

Genel `/api/admin/db` GET yolundaki `migrationStatus` CREATE TABLE içerdiğinden bu yazmasız kabulde **kullanılmaz**. Yeni dar `?rapor=masamoro-preview` yolu mevcut korumalı yönetim adresinde, yalnız doğru Preview dal/host'unda çalışır. Mevcut Production fingerprint/pool-host koruması eksik veya aynı DB gösteriyorsa sorgu bile çalışmaz. Tek SELECT yalnız hash/branch ve toplam sayıları döndürür; migration/seed/DDL, kişisel satır veya bağlantı sırrı yoktur. Kaynak SHA'sı ve tek pilot scope'u da döner. Neon branch setting boşsa runtime host hash'i önceden salt okunur Neon/Vercel fiziksel eşlemesiyle doğrulanır; belirsizlikte kabul geçmez.

## Hazırlanan gerçek kabul

`scripts/masamoro-preview-kabul.mjs` onaydan sonra yalnız kesin SHA'nın değişmez korumalı Preview'ına sabit çalıştırılmak üzere hazırlandı. Çalıştırılmadı. Kaynak SHA / Preview app DB hash / fiziksel Neon eşlemesi önce doğrulanır; Production/missing fingerprint durur. Browser'da 1440/390 genişlikte normal arama → MasaMoro linki → gerçek profil, adres/bölge, haritasız/telefonsuz görünüm, noindex/JSON-LD, taşma ve Menemen kontrol edilir. Sitemap pilot içermez. Önce/sonra yalnız aggregate DB sayıları aynı kalmalıdır.

Bütün üçüncü taraf istekleri ve tarayıcı API/POST yazmaları engellenir; hesap/session/e-posta testi bu kabul değildir. Bypass başlığı yalnız tek onaylı origin'e gider. Trace/ham yönetim yanıtı/log/kişisel veri çıktısı yok; yalnız kısa sonuç ve MasaMoro ekranları. Ağ engeli devam ederse mevcut GitHub bulut yöntemi yalnız yeni kesin SHA/Preview izniyle kullanılabilir. Gidenler deposunun public olduğu açıkça belirtilir; RY/YY kendi ayrı depolarında kalır. Mevcut workflow'lar bu hazırlıkta değiştirilmez; izin verilirse tek geçici test işi sonunda kapatılır. Yeni bypass/DB/AI anahtarı oluşturulmaz veya DB/AI sırları GitHub'a aktarılmaz.

## Yerel kanıt ve kalan kapılar

Güncel test sayıları, Production/Preview yerel derlemeleri, doğrulanan değişmezler ve exact SHA teslim QA raporundadır. Yerel simülasyon, Vercel READY, build smoke veya taklit AI gerçek dağıtılmış kabul sayılmaz. Şimdi gerçek HTTP/Vercel/Neon kabulü, RY/YY final importer bağımsız kabulü ve yayın yapılmış değildir. Google 06.00/08.30, Excel/yedek, Menemen ve kullanıcı verileri korunur; Google API kullanılmaz.

Onay isteği son üç SHA'yı, yalnız geliştirme dalı gönderimini, üç korumalı Preview kapsamını, mevcut ayrı DB bağlantılarının yalnız hedef Preview dallarında kullanımını ve gerekirse dar bulut testlerini tek somut listede belirtmelidir. Kabul tamamlanınca Production için ayrıca işleme özel açık onay alınır.
