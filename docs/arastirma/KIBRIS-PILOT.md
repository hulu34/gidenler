# Kıbrıs araştırması — güncel Production üzerinde yerel inceleme

Durum: **Yerel normal veri yolu kabulü geçti; sınırlı gerçek Preview hazırlığı yeni görevle genişletildi. Uzak Preview, DB aktarımı veya yayın kabulü yok. Güncel kapsam MASAMORO-PREVIEW-KABUL.md belgesindedir; aşağıdaki yerel-only sınırı önceki c0f0045 aşamasının tarihsel kaydıdır.**

19 Kasım 2026. Production tabanı `9a2f2f482b65709e862397911438d99b06230e2c`; araştırma kaynağı PR #52 `29b9c9b74a32e5c320e9e1a507c2e2291c1563e4`. Bu çalışma ayrı yerel kopyadadır. Uzak dala gönderim, PR birleştirme, deploy, DB işlemi veya hesap/ortam ayarı yapılmadı.

## Sayılar ve kabul sınırı

- Production: **892 toplam / 857 aktif**; bütün kayıtlar değişmeden korunur.
- PR52: altı güney araştırma adayı, dört koşullu kuzey, 14 incelemede, iki kapsam dışı. Kuzey PR73 ayrı kalır.
- Altı teslim kimlik/adres araştırmasıdır; altı açık restoran veya teknik kabul değildir. Aktif aktarım ve Production ekleme **0**.
- Oniro kış için kapalı; en fazla beş diğer aday güncel kabul bekler. Diğer beşin bugün açık olduğu topluca doğrulanmış sayılmaz.
- Onar ayrı planlanan işletme; bu paket dışındadır. Maderia ve İstanbul bekleyenleri de kapsam dışıdır.

## Kaynak düzeltmeleri

| Kayıt | Yerel araştırma kararı |
|---|---|
| Oniro by the Sea | [Resmî site](https://oniro.cy/) kış kapanışını ve yalnız planlanan 2027 ilkbaharı dönüşünü bildiriyor. Araştırmada tutulur; aktif aktarım bekler. Mevcut kalıcı kapanma enum'u kullanılmaz, yeni enum uydurulmaz. Yerel 70077272 ile yurt dışı +35726723333 ayrı; eski +35770077272 aktif telefon olarak taşınmaz. |
| LPM | [Restoran iletişimi](https://lpmrestaurants.com/limassol/contact/) ve [Parklane belgesi](https://www.marriott.com/content/dam/marriott-digital/lc/emea/hws/p/pfomd/en_us/document/assets/lc-pfomd-privacy-statement-32336.pdf): fiziksel posta kodu **4534**, PO Box **56560**, posta gönderim kodu **3308**. Eski posta kodu belirsizliği çözüldü. Belge güncel faaliyet kanıtı değildir. |
| Novél | [Restoran](https://www.theagorahotel.com/novel-and-the-bar), [rezervasyon](https://www.theagorahotel.com/book-a-table), [menüler](https://www.theagorahotel.com/menus): doğrudan **+35724422240**, Akdeniz bistrosu ve gün boyu servis. +35724726000 otel santrali, restoran numarası değildir. |
| Gourmet Taverna | [İşletme](https://www.gourmettaverna.com/contact-us/) 8041, [turizm listesi](https://www.visitcyprus.com/wp-content/uploads/2026/04/GASTRONOMY_PAFOS_8.4.2026_EN.pdf) 8042. Sokak/işletme/telefon kimliği korunur; posta kodu ve çelişkili saatler aktarılmaz. |
| MasaMoro | Önceki manifestin Stasandrou 2 / güney Lefkoşa kimliği fixture kaynağıdır. Telefon doğrulanmadığı için boş, koordinatlar bilinmiyor. Resmî sayfanın bu turdaki metin çıkarımı adresi göstermedi; 15 Kasım adres kanıtı 19 Kasım yeniden doğrulaması gibi sunulmaz. |
| Stavri Kitchen | Önceki kaynak kaydı korunur; bu yerel tur güncel açık işletme kabulü vermez. |

## Yerel normal-yol düzeltmesi

İlk incelemenin sekiz başarısız kapısı bu yerel geliştirmede giderildi. `scripts/kibris-pilot-test.mjs`, aynı kaynak fixture'ını normal ham katalog girişinde kullanır; gerçek `client-catalog.ts` ve `sor-index.ts` üreticilerini boş geçici klasörde çalıştırır; gerçek istemci yükleyicisi, arama, `getTopic` detail/route veri modeli ve gerçek VenueInfo bileşeni üzerinden kabul yapar. Sonradan indeks satırı eklenmez. Gerçek HTTP/tarayıcı testi değildir.

- `RealVenueInput` bölgesel girişte null telefon/koordinatı bilinmiyor sayar ve normalleştirir. İstanbul validator'ının eski null/konum/ilçe kuralları korunur. Kıbrıs pilotu yalnız kaynaklı `A-konumsuz` işletme kaydı kabul eder; sayısal koordinat, 0,0, tek eksen, OSM kimliği ve sahte İstanbul ilçesi reddedilir.
- YorumS `MekanBolgesi` alanları ve bölge kimlikleri temel alındı. Bu yerel sözleşmede kesim her zaman açıkça zorunlu: `alan=kibris`, `bolge=lefkosa`, `kesim=guney`. Bilinmeyen bölge, çelişen kesim ve ek özel alanlar reddedilir.
- Ham kayıt → entity → gerçek istemci üreticisi → arama/detail boyunca bölge korunur. Şehir `Lefkoşa`; profil bilgi satırı ve başlık `Lefkoşa (güney) · Kıbrıs` gösterir. Bilinmeyen geometri pin/OSM atfı üretmez, pilot için yanlış İstanbul harita arama bağlantısı üretilmez.
- Varsayılan pilot kapalıdır. Açmak için yalnız yerel `NODE_ENV=development` veya `test` ve `NEXT_PUBLIC_KIBRIS_PILOT=true` gerekir. `NODE_ENV=production` ya da `VERCEL_ENV=production` her durumda kapatır. Standard Vercel Preview üretim derlemesi de kapalıdır; bu sınır gevşetilmedi.
- Açık yerel pilotta üretilmiş eski istemci artifact'ı Production'a verilse bile istemci yükleyicisi bölgesel kaydı filtreler. Pilot kapalıyken veya Production'da `getEntity`/`getTopic` yok; arama ve statik parametre kaynağına girmez.
- Kimlik tekilliği normal kaynak birleştiricisinde sağlanır: aynı ref/slug ve aynı normalize içerik tek kayıt; çelişen içerik, başka ref/slug veya eski İstanbul kaydıyla çakışma hata verir, veri ezilmez. Bu gerçek DB replay testi değildir.
- Pilot noindex'tir; kamu JSON-LD ve sitemap'e girmez. İstanbul/TR damgası basmak yerine pilotta yapılandırılmış veri hiç üretilmez. Ülke/para/saat dilimi alanı tahmin edilmez.
- Google/Excel ve Sor üreticisi bölgesel kayıtları açıkça dışlar. Kaynak fixture yerelde açıkken bile Sor çıktısı byte düzeyinde aynı kalır. Günlük workflow/Excel geçmişi/yedek dosyaları değiştirilmedi.
- Mevcut seed/append kodu bölgesel girdiyi DB yürütücüsüne dokunmadan reddeder (`regional_database_import_not_enabled`). Bu bir veri tabanı bölge migrasyonu değildir; hiçbir DB durumu değiştirilmedi.

## Kabul ve sınırlar

- Normal yol: **52/52** yerel kontrol geçti, DB çağrısı **0**. Kaynakların, İstanbul 892 entity içeriğinin, 857 aktif sayısının ve dört İstanbul arama sorgusunun tam sonuçlarının korunması sınandı.
- Araştırma bütünlüğü **310/310**; bu altı açık restoran kabulü değildir.
- Arama **49/49**: 892/892 kendi ad/ascii, 770/770 tek harf eksik. SEO **51/51**, ana sayfa **31/31**, Sor **322/322**; kategori ve dört zararlı host regresyonları geçti. AI sağlayıcıları bu paketlerde taklittir.
- Güncel dosyaların typecheck/derleme sonucu teslim QA raporundadır. Mevcut kilitli bağımlılıklar kullanılır, temiz yeni kurulum iddiası yoktur.
- HTTP, gerçek tarayıcı/mobil, gerçek AI, e-posta, RY/YY normal importer ve gerçek DB replay/rollback kabulü yapılmadı. Genel DB/medya/Google PGlite paketleri, herhangi bir DB durumu değiştirmeme sınırı nedeniyle çalıştırılmadı; eski hata sayıları yeni kabul diye sunulmaz.

Çalıştırma: `node scripts/kibris-pilot-test.mjs --report /private/tmp/pr52-yerel-kabul.json`. Araştırma: `TABAN=9a2f2f482b65709e862397911438d99b06230e2c node --import tsx scripts/arastirmakibristest.ts`. Katalog üreticileri `--check` ile mevcut 892 satırlık artifact'ları aynı bulmalıdır.

## Sonraki kapılar

[YorumS için kısa sözleşme](KIBRIS-VERI-SOZLESMESI.md) bu yerel modelin aktarım sınırlarını tanımlar. RY/YY depoları ve importer'ları değiştirilmedi. İlk kapsam yalnız MasaMoro fixture'ıdır; diğer beş için güncel faaliyet kabulü verilmez. Oniro mevsimsel beklemede, Onar ve PR73 dışarıda kalır.

Bu yerel commit yayına veya açık Preview pilotuna hazır sürüm olarak sunulmaz. Gerçek Preview için uygulama ortamı/pilot kapısı ve gerekirse bölgesel DB sözleşmesi ayrı sınırlandırılmalı; son kesin SHA ve veri/erişim kapsamı üzerinden izin alınmalıdır. Mevcut kapalı model, Production güvenliğini korur ve standart Preview'da kendiliğinden açılmaz. Production için ayrıca işleme özel açık onay gerekir.
