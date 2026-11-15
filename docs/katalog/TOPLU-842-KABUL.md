# 842 kayıt sonrası güvenli restoran paketi

**Production'a yazılmadı. Altı restoran kod adayına alındı; gerçek Preview kabulü bekleniyor.**

Taban: `feature/investor-v1` @ `259a5307fcd51bbd078ca7beae850b55bb382d1c`. PR #48 ve #50 araştırma dalları korunur; aynı işi yapan yeni bir ajan veya araştırma görevi açılmaz.

| Durum | Toplam | Aktif | Aktif restoran | Aktif kafe | Aktif bar | Kapalı |
|---|---:|---:|---:|---:|---:|---:|
| Güncel Production | 842 | 807 | 682 | 114 | 11 | 35 |
| Bu aday yayımlanırsa | 848 | 813 | 688 | 114 | 11 | 35 |
| Bu çalışma sırasında Production'a eklenen | 0 | 0 | 0 | 0 | 0 | 0 |

## Altı kayıt

Villa Bosphorus; White Burger Koru Florya, Nişantaşı, Hilltown Küçükyalı, Florentia Village ve Meydan İstanbul. Aynı markanın ayrı ve kaynakla doğrulanmış şubeleri ayrı işletme kayıtlarıdır; aynı ilçe veya marka adı tek başına mükerrerlik sayılmaz.

Tam adresler `data/paket/toplu-842-kabul/kayitlar.json`, satır bazında işletmeci ve bağımsız kaynaklar `docs/katalog/toplu-842-kabul.json` içindedir. Yeni kayıtların tamamı A-konumsuzdur. Koordinat, OSM kimliği/atıf, Google puanı, ödül, fiyat, telefon, saat, menü veya görsel eklenmez. Saha/telefon teyidi yapılmış gibi yazılmaz.

- Villa Bosphorus'un resmî sitesi düz HTML okuyucuda boş görünmesine rağmen gerçek tarayıcıda açıldı; İletişim bölümündeki 18A/Beylerbeyi/Üsküdar adresi bağımsız güncel yazıyla karşılaştırıldı.
- Nişantaşı için eski marka PDF'indeki 162 sayısı kullanılmadı. Markanın güncel şube sayfası ve City’s'in güncel iletişim sayfası 12'de birleşir. İç kapı 115 marka kaynağından; AVM'nin kiracı kaydı ayrı kimlik teyididir.
- Hilltown, İzmir şubesiyle karıştırılmaz: Küçükyalı/Maltepe ve AVM'nin kendi mağaza kaydı aynı işletme telefonunu gösterir. Telefon aktarılmaz.
- Florentia'nın Arnavutköy'e yakınlığı ilçe kabulü değildir; marka ve 04.11.2026 tarihli bağımsız yerel haber İhsaniye/Eyüpsultan ve No:13'te birleşir. İç kapı doğrulanmadığı için eklenmez.
- Meydan İstanbul şubesi, Ümraniye'de henüz açılmamış Finans Merkezi şubesinden farklıdır.
- Koru Florya'nın kendi marka şube ayrıntısı ve 01.09.2026 tarihli bağımsız sektör haberi eşleştirilmiştir. Haber tüm AVM'yi anlatır; ayrıntılı şube adresi marka kaynağındandır.

## Ayrı tutulanlar

1.333 kaynak satırı 842 kayıtla yeniden karşılaştırıldı. Bunlar benzersiz restoran veya kabul toplamı değildir. Önceki #49/#51/#53/#54 yayınları yeniden sayılmaz. İsim değişen Nappo Kanyon için önceki kabuldeki kaynak kimliği–yayımlanmış slug bağı da kullanılır.

White Burger Galataport, Finans Merkezi ve Marmara Park resmî listede “yakında” işaretlidir; aktif kabul yok. Pendik MRF'nin farklı giriş/adres kayıtları çözülmedi. Sankai'nin önceki kaynak bütünlüğü engeli korunur; ilgili sitedeki alakasız bahis bağlantıları izlenmez veya yayımlanmaz. Beymen Brasserie'nin bulunan resmî bağlantısı gerçek tarayıcıda bulunamadı; eski dönemli şirket raporu tek başına güncel şube teyidi sayılmaz. Taste by Aliée'nin dönüşümlü şef anlatımı, eski Thomas Bühner adını otomatik güncel kabul etmeye yetmez. Bunların hiçbiri hakkında kanıtsız kapanış hükmü verilmez.

Diğer adres/faaliyet engelleri, kafeler ve Kıbrıs #52 bu paketin dışındadır. Bekleyen liste sessizce kabul edilmiş sayılmaz.

## Teknik kabul ve yayın kapısı

Mevcut 842 kayıt alan alan korunur. Sor indeksi ve istemci sunumu son katalogdan üretilir. Sor/güvenlik kodu, şema, kullanıcı verileri, Menemen, Google 06.00/08.30, Excel ve şifreli yedek sistemine dokunulmaz.

`test:toplu842`, gerçek PostgreSQL uyumlu izole PGlite ile 6 ekleme, ikinci uygulamanın değişiklik yapmaması, yanlış tabanda durma, kullanıcı ilişkisi varken geri almayı reddetme ve eski veriyi koruyarak hedefli geri dönüşü sınar. Önceki paket testi tarihsel alt küme kontrolü olarak korunur; kesin 848/813 sayımı yeni testtedir.

Gerçek Preview için tamamlanmış kendi geliştirme dalının mevcut korumalı Vercel/Neon eşlemesi yeniden kullanılabilir. Yeni DB dalı, sıfırlama, gizli değer taşıma veya güvenlik gevşetme yapılmaz. Önce fiziksel Preview dalı ve runtime kimliği doğrulanır; yalnız 842→848 ekleme ve tekrar sınanır. Önce/sonra eski veri özetleri eşit kalmalıdır. Mobil/masaüstü altı profil, doğru arama–deneyim formu hedefi, Menemen ve Sor bağlamı dağıtılmış sürümde kontrol edilir. READY veya derleme içi smoke kabul değildir. Kurallı yanıt gerçek AI testi sayılmaz.

Kesin SHA ve gerçek kabul sonucu raporlandıktan sonra Production için doğrudan kullanıcı onayı gerekir. Bu dosya commit hazırlığındaki durumdur; son test ve yayın kararı PR açıklamasında izlenir. Kod geri dönüş noktası `259a5307fcd51bbd078ca7beae850b55bb382d1c`; veri geri dönüşü yalnız altı hedefle ve yeni kullanıcı ilişkileri kontrol edilerek yapılabilir. Bütün veritabanı eski kopyayla değiştirilmez.
