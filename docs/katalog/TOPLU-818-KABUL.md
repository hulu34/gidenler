# 818 kayıt sonrası restoran paketi — bağımsız kabul

**15 restoranlık sabit kapsam; Production yayını yapılmadı. Dağıtılmış Preview kabulü bekleniyor.**

Taban: `feature/investor-v1` @ `f8131ddce3d691a6300e5d9b669e82f53980d73c`. PR #48 araştırması `ac9aee93727c2e9c4c02830623385bbcc0df2969`, PR #50 araştırması `77bc434e1c7908f1de7a7824366f4f1d624de2d1`. Claude'un araştırma dalları değiştirilmedi.

| Kapsam | Toplam | Aktif | Aktif restoran | Aktif kafe | Aktif bar | Kapalı |
|---|---:|---:|---:|---:|---:|---:|
| Canlı taban | 818 | 783 | 658 | 114 | 11 | 35 |
| Bu paket kabul edilip yayımlanırsa | 833 | 798 | 673 | 114 | 11 | 35 |
| Bu çalışma sırasında Production'a eklenen | 0 | 0 | 0 | 0 | 0 | 0 |

## Kaynak kabulü

`data/paket/toplu-818-kabul/kayitlar.json` yalnız şu 15 restoranı içerir:

Aila, Herise İstanbul, Kıyı, Ruby, Spago Istanbul by Wolfgang Puck, St. Regis Brasserie, The BARN, The Red Balloon, Neni Brasserie, Bâtard, Bronco Vadistanbul, Buselik Tünel, Josephine İstanbul, Riva's Club ve House of Fellas.

Her kaydın resmî işletmeci ve bağımsız şube/adres kaynağı `toplu-818-kabul.json` içinde ayrı. Ürün adları araştırmadaki adlarıyla korunur; Bronco için Vadistanbul, Buselik için Tünel adresi belirleyicidir. Rehber puanı, ödül, rehber açıklaması, fotoğraf, fiyat ve menü kopyalanmaz. Telefon farklılıkları olduğundan bu alanlar aktarılmaz. Tamamı **A-konumsuz**; OSM konumu doğrulanmış gibi sunulmaz.

Spago ile St. Regis Brasserie aynı oteldeki farklı konseptlerdir: işletmeci birini çatı, diğerini zemin/teras restoranı olarak ayrı ad ve servisle tanımlar. Ortak adres tek başına mükerrer değildir. Buselik Tünel, mevcut Anadolu Hisarı şubesinden farklı ilçe/adrestedir. Neni ile Gizia'nın benzer “Brasserie” sözcüğü farklı adres ve işletme kimliğini birleştirme nedeni değildir.

Riva's Club konaklama/davet tesisi içindeki yemek hizmetidir; dışarıdan kahvaltı için ziyaret günü hizmet uygunluğunun işletmeye sorulması gerekir. The Red Balloon'un Yeniköy kuruluş öyküsü güncel şube adresi sayılmadı; hem resmî iletişim hem rehber Beyoğlu İstiklal No:153/Mr Cas Hotel kaydını gösterir. Neni'nin `www` alanında sertifika eşleşme sorunu görüldü; sertifika denetimi gevşetilmedi, geçerli çıplak alan adı kullanıldı.

Bazı Gault&Millau adresleri bu tur web okuyucuda zaman aşımına uğradı. Aynı günün önceki bağımsız HTTP 200 kayıtları tekrar incelendi; güncel işletmeci kaynaklarıyla tamamlandı. Bu durum işletmenin kapalı olduğu anlamına gelmez. Kabul saha ziyareti veya doğrudan telefon teyidi değildir.

## Havuzların uzlaştırılması

PR #48'deki 596 kaydın 8'i daha önce yayımlanmıştı; kalan **588** kayıt içinden bu pakete 8 restoran alındı, 443 restoranın ek şube/faaliyet kabulü sürüyor, 137 kafe/pastane restoran paketinin dışında.

PR #50'nin “56 hazır” bildirimi yeniden ayrıldı: **17 canlıda**, bu paket için **7 aday**, **21 ek inceleme**, **9 kafe/pastane**, **2 faaliyet kanıtı politikası teyidi**. Bu yedi adayın beşi G&M araştırmasından, ikisi seyrek ilçe araştırmasından gelir. PR #48'deki sekizle birleşince **15 farklı yeni restoran** eder. Eski yedi araştırma kaydına ek kanıt otomatik kabul veya artış sayılmaz. Kıbrıs PR #52 İstanbul paketine alınmadı.

Tam tarama 596 PR48, 244 G&M araştırma satırı, 74 seyrek ilçe satırı ve eski 906 havuzunun 419 ham bekleyen satırını mevcut 818 kayda karşı karşılaştırdı. **1.333 kaynak satırı benzersiz işletme sayısı değildir**; havuzlar arasında örtüşmeler var. Eski rapordaki 400'lü alt liste ile 419 ham liste birbirine karıştırılmamalı. Otomatik ad/kimlik eşleşmesi gerçek şube kabulünün yerine geçmez.

Bekletilenlerde örnekler: Sankai kaynak bütünlüğü; Araf kaynak erişimi; MykOrini ve Sushi Barba kapı/şube çelişkileri; Filo D'olio adres/faaliyet geçişi; Efendy için marka/faaliyet değişimi işareti. Açılmayan web sitesi tek başına kapanış kanıtı değildir. Sipariş platformu + editoryal istisnası yalnız PR açıklamasındaki sahip kararı iddiasıyla genişletilmedi; ilgili iki restoran bu paketi bloke etmeden ayrı tutuldu. Kafe politikası ayrıca karara bağlıdır.

## Teknik sınır ve kabul kapısı

Mevcut 818 kaydın bütün alanları korunur. Yalnız 15 yeni kayıt eklenir; Sor ve istemci görünümü son katalogdan üretilir. Sor/güvenlik uygulama kodu, şema, hesap, OAuth, Menemen, Google puanları, 06.00/08.30 işleri, Excel ve şifreli yedek değiştirilmez. Eski PR51 testinin tarihsel alt küme koruması korunur; bu paket için kesin 833/798 sayımı ayrı testtedir.

`test:toplu818`: gerçek bellek içi PostgreSQL üzerinde 818→833 ekleme, tekrarın değişiklik yapmaması, yanlış tabanın durması, kullanıcı deneyimi varsa geri almanın reddi ve güvenli hedefli geri almanın eski kullanıcı/deneyim/menü/Google verilerini koruması. Katalog/Sor/arama/SEO/Seçki/medya/rezervasyon/Google regresyonları, temiz kurulum, tip denetimi ve derleme ayrıca çalıştırılır.

Vercel READY veya yerel test dağıtılmış Preview kabulü değildir. Gerçek Preview'da ayrı Neon dalı ve çalışma anı veritabanı kimliği doğrulanmadan yazma testi yapılmaz. Yalnız 15 eklemenin gerçek yönetim yoluyla uygulanması ve tekrarı, masaüstü/mobil profiller, arama, deneyim formuna doğru hedefle yönlendirme, Menemen, olumsuz tercihler ve takip mesajları denetlenmelidir. Gerçek AI yoksa kurallı sonuç açıkça ayrı raporlanmalıdır.

Production için kesin SHA üzerinde ayrıca doğrudan kullanıcı onayı gerekir. Geri dönüş noktası f8131dd; veri geri alımı yalnız hedef 15 kayıt üzerinde ve sonradan oluşmuş kullanıcı ilişkileri korunarak yapılabilir. Bütün veritabanını eski kopyayla değiştirmek veya toplu silme uygun değildir.
