# 860 tabanında 10 restoranın bağımsız kabulü

Taban: `d4aa85545cca0b1485db84f411f2d92fae2ca751` — 860 toplam / 825 aktif / 700 aktif restoran.
Araştırma: PR #58 `1269682e04e93f3f9506bba89e74ebc09e961e52`, yalnız `ek-1.json` adayları değerlendirildi; eski araştırma dalı birleştirilmedi.

## Kapsam ve kullanıcı kararı

Madera, Roka İstanbul, Parma Sole, Novikov Istanbul, Muutto Anatolian Tapas Bar, Madhu’s, İnari Piku Etiler, Havuş Lokantası, Gina Kanyon ve Bi Nevi Deli: yalnız 10 restoran.

Maderia Sushi Bar kullanıcının açık talimatıyla bekletildi. The Townhouse bar olarak ayrı kaldı. Lokanta by Divan zaten mevcut; tekrar eklenmez. 53 belirsiz araştırma kaydı kabul edilmedi. Platform + editoryal istisnası bu pakette kullanılmaz. Eleos, Suna ve Deraliye adres sorunları bu pakete karıştırılmaz.

Hedef **870 toplam / 835 aktif / 710 aktif restoran**. 114 kafe, 11 bar ve 35 kapalı korunur. Kod adayı, Preview’a uygulanan ve Production’da yayımlanan kayıtlar ayrı aşamalardır. Bu commit hazırlanırken Production’da yeni kayıt 0; gerçek Preview kabulü bekliyor. Kesin SHA için açık kullanıcı onayı olmadan Production merge/deploy/veri işlemi yapılmaz.

## Kaynak ve şube denetimi

Kayıt başına işletmeci sayfası ile son 12 ayda yayımlanan G&M 2026 adres/tür kanıtı karşılaştırıldı; ayrıntılar `toplu-860-kabul.json` içindedir. Yalnız kimlik ve açık adres aktarılır; rehber puanı, ödül, menü, fiyat, yorum, telefon, saat ve fotoğraf alınmaz. Saha veya telefon teyidi yapıldığı iddia edilmez.

- Roka’nın otomatik HTTP403 yanıtı aşılmadı; aynı URL normal tarayıcıda açıldı. Görünen Galataport14/2E adresi ve Japon restoranı kimliği doğrulandı. Mevcut Okra İstanbul ayrı ad/adres/işletmecidir; ad benzerliğiyle birleştirilmez.
- Novikov ve mevcut Olea aynı Mandarin Oriental No:62 adresinde farklı restoranlardır. İşletmecinin ayrı yemek mekânları listesi kontrol edildi. Aynı bina ya da site alan adı tekillik kanıtı değildir.
- Madhu’s ve mevcut16Roof aynı otelde ayrı restoranlardır; Madhu’s’un özel işletmeci sayfası esas alındı.
- Muutto’nun iletişim sayfasında Galataport No:8, Fişekhane52V ve Moda57/2a ayrı görülüyor; yalnız Galataport eklenecek. Adındaki Bar kelimesi yerine kaynaklı Şef restoranı türü ve restoran kategorisi kullanıldı.
- İnari yalnız Etiler89; Kuruçeşme, Vadistanbul, Bodrum ve merkez ofis adresi dahil değil. Gina yalnız Kanyon164/A; Galataport10/1E dahil değil.
- Havuş kapı4/içkapı7 ve Bi Nevi Deli Etiler10/1 kaynakları karşılaştırıldı. Bi Nevi için telefon eşleşmesi iddia edilmez. Madera, farklı adresteki Maderia Sushi Bar ile karıştırılmaz.

Tüm 10 yeni kayıt **A-konumsuz**. Doğrulanmamış koordinat, OSM kimliği veya harita noktası üretilmez; açık adres ve konum uyarısı korunur. YorumS’a ithal veya diğer depolarda değişiklik yapılmaz.

## Koruma ve kabul kapıları

Eski 860 kayıt bütün alanlarıyla korunur. Sor/güvenlik kodu, şema, kullanıcılar, deneyimler, Menemen, Google 06.00/08.30 işleri, Excel ve şifreli yedek kaynakları değişmez. Sor ve istemci indeksi son birleşik veriden üretilir; ham araştırma metni istemciye taşınmaz.

Temiz kurulum, tip kontrolü ve derleme; yeni gerçek PGlite ekleme/tekrar/yanlıştaban/geri-alma testleri ile mevcut regresyon paketleri çalıştırılır. Eski #57 testi tarihsel alt kümesini korurken yeni 870/835 kesin sayımı ayrı testtedir.

Gerçek dağıtılmış Preview kabulünde fiziksel veritabanı kimliği ve yazma koruması doğrulanmadan veri işlemi yapılmaz. Eski verilerin önce/sonra içerik özetleri karşılaştırılır. 1440/390 px profil, adres/koordinatsız uyarısı, arama/form, sitemap, Menemen ve Sor olumlu/olumsuz/takip kontrolleri uygulanır. READY ve derleme smoke testi gerçek kabul yerine geçmez. AI yapılandırılmamışsa kurallı yanıt gerçek AI diye raporlanmaz.

## Geri dönüş

Kod geri dönüş noktası `d4aa85545cca0b1485db84f411f2d92fae2ca751`; başarılı mevcut Production dağıtımı `MquYm6hZrQUfnPjho7yfZ8nFn9d9`.
Yalnız ekleme yapan tekrarlanabilir plan hazırlanır; eski 860 kayıt güncellenmez. Veri geri alma yalnız 10 hedefte yeni kullanıcı ilişkileri denetlenerek yapılabilir; tüm veritabanı eski kopyayla değiştirilmez. Production için bu yeni kesin SHA’ya özel açık kullanıcı onayı gerekir.
