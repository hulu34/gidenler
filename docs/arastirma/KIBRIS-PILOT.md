# Kıbrıs araştırması — güncel Production üzerinde yerel inceleme

Durum: **Şu nedenle bekliyor: bölge ve normal veri yolu kabulü tamamlanmadı.**

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

## MasaMoro normal-yol teşhisi

`data/arastirma/kibris/masamoro-fixture.json`: `alan=kibris`, `bolge=lefkosa`, `kesim=guney`. Manifest id `kibris/masamoro` korunur. Test slug/ref'i geçicidir; kalıcı kimlik/slug kararı değildir. Bilinmeyen koordinat ve telefon boş; sahte OSM kimliği veya İstanbul ilçesi yoktur.

`scripts/arastirma-kibris-normal-yol.mjs` kaynak fixture'ını yalnız bellekte ham katalog girişine ekler; değişmemiş gerçek `scripts/client-catalog.ts` üreticisini geçici boş klasörde çalıştırır ve çıktıyı gerçek arama/detail yükleyicisine verir. Arama indeksine sonradan satır enjekte etmez. Kalıcı katalog veya veritabanına yazmaz; geçici dosyaları sonunda kaldırır.

Mevcut normal yolun kabulü **başarısızdır**:

1. JSON null koordinat `quality` hatası; bilinmeyen null'lar kaldırılınca boş İstanbul ilçesi `district` hatası verir.
2. Entity dönüşümünde bölge kaybolur. Sunucu, UI üreticisi ve UI yükleyicisinde İstanbul varsayımları bulunur.
3. Arama ve detail modeli Production/pilot kapalı durumda fixture'ı görünür kılar; gerçek bir pilot kapısı yoktur. Bu yalnız geçici test girdisidir, canlı sızıntı değildir.
4. Kaynak birleştiricisi aynı işletme kimliği iki kez verilince iki satır tutar. Bu DB tekrar uygulama testi değildir; gerçek importer/DB tekrarı ayrıca doğrulanmalıdır.
5. SEO İstanbul/TR üretir. Adres/ülke modeli kararlaştırılmadan yayınlanamaz.

Geçen korumalar: eski 892 entity aynen kalır; dört İstanbul arama sorgusunun tam sonuçları aynıdır; bilinmeyen geometri pin üretmez; işletme ref ve ham kanıt listesi korunur; mevcut Google/Excel listesi değişmez. Son filtre işletme/koordinat kuralından gelir; açık bir Kıbrıs bölge filtresi henüz yoktur.

## En küçük güvenli geliştirme ve Preview planı

1. Gidenler normal katalog/seed/export sözleşmesinde bölge kimliği, null geometri normalleştirmesi, kalıcı ref/slug ve tekrarlanabilir işletme tekilliği açıkça tanımlanmalı. İstanbul validator gevşetilmemeli; Kıbrıs'a özel açık kapsam eklenmeli.
2. Aynı bölge sunucu entity, istemci üreticisi, arama/detail ve SEO boyunca korunmalı. Pilot varsayılan kapalı olmalı; Production'da bayrak açık olsa bile ayrı yayın kararı olmadan kayıt görünmemeli. Kaynak kanıtı ham kayıtta korunmalı, gereksiz ayrıntı istemciye taşınmamalı.
3. Google 06.00/08.30, Excel ve yedek kapsamı İstanbul olarak korunmalı. Koordinat eklenmesi veya işletme filtresinin ileride açılması Kıbrıs'ı otomatik kapsamına almamalı. Mevcut workflow'lar bu işte değişmez.
4. YorumS importer bölge/null geometri/ilçe analizi mevcut sorumludadır; burada aynı adapter yazılmadı. Normal aktarım → RY → YY arama/detail ve tekrarlama kanıtı ayrı, projeler ve DB'ler ayrıdır.
5. Oniro aktif paket dışında kalmalı. Diğer beşin güncel kaynak/faaliyet kabulü ve ürün kararları tamamlanmalı. Bu yerel araştırma commit'i yayın adayı değildir.
6. Uygulama düzeltmelerinin son kesin SHA'sı oluşunca yalnız o kapsam için kullanıcıdan Preview izni istenmeli. Mevcut Neon dalı silinmemeli/sıfırlanmamalı; fiziksel Production ayrımı ve başlangıç sayıları doğrulanmalı. Mevcut kullanıcı/deneyimler korunmalı; yalnız onaylı fixture uygulanmalı, tekrar ve hedefli geri alma sınanmalı.
7. Korumalı gerçek dağıtılmış Preview'da masaüstü/mobil arama → detail, bölge/ülke, haritasız görünüm, bayrak kapalı/Production gizliliği, Sor bölge izolasyonu, İstanbul regresyonu ve Google dışlama kabulü yapılmalı. READY/derleme smoke'u kabul sayılmaz. Gerekli bulut testi ve geçici erişimler son SHA için ayrıca onaylanmalı ve iş sonunda temizlenmeli.
8. Bütün kabul kapıları geçtikten sonra Production için ayrı işleme özel açık onay alınmalı. Bu çalışma Preview veya Production yetkisi vermez.

## Testler ve tekrar çalıştırma

Eski PR52 araştırma testi güncel Production tabanı üzerinde **306/306** geçti. Kaynak düzeltmeleri sonrası araştırma testi **310/310**. Bunlar araştırma bütünlüğüdür, entegrasyon kabulü değildir.

- `TABAN=9a2f2f482b65709e862397911438d99b06230e2c node --import tsx scripts/arastirmakibristest.ts`
- `node scripts/arastirma-kibris-normal-yol.mjs --report /private/tmp/pr52-normal-yol.json`

İkinci komut teknik kabul başarısız olduğu için **1** çıkış kodu verir; hata gizlenmez. Rapor her kapıyı ayrı gösterir. Gerçek e-posta, hesap, DB, RY/YY importer, canlı AI ve tarayıcı/Preview kabulü bu testin kapsamında değildir. Yeni bağımlılık kurulmadı; mevcut kilitli bağımlılıklar kullanıldı.
