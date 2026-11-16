# 876 tabanında sınırlı restoran kabulü

Production tabanı: `2b437577f4a02197482fb90e46b5f75a3f0b96df` — 876 toplam / 841 aktif / 716 aktif restoran. Yalnız **Monteverdi Ristorante (Beşiktaş)** kod adayıdır; hedef 877 toplam / 842 aktif / 717 aktif restoran. Kafe 114, bar 11, kapalı 35 değişmez.

## Kaynak ve kimlik

Araştırma sahibi Claude'un PR #56 `4fbd8824cf64c4676b590e80831d3a6fefaefb13` manifestindeki `monteverdi ristorante|besiktas` kaydı ve PR #58 `1269682e04e93f3f9506bba89e74ebc09e961e52` eki kullanıldı. Genel araştırma tekrarlanmadı. Eksik olan işletmeci kimliği Hilton'un güncel restoran ve otel sayfası normal tarayıcıda açılarak tamamlandı. Restoran adı, İtalyan mutfağı ve otelin Saray Caddesi No:5 adresi açık. MICHELIN sayfasındaki restoran/adres aynı; G&M 23.12.2025 kanıtı önceki teslimden korunur, bu tur zaman aşımı nedeniyle yeni erişim iddia edilmez.

Conrad binasındaki Manzara, Monet ve Summit ayrı konseptlerdir; aynı adres veya alan adı otomatik mükerrer gerekçesi değildir. Monteverdi adı ve slug'ı mevcut 876 kayıtta bulunmuyor. Tam izlenebilir kayıt: `docs/katalog/toplu-876-kabul.json`.

## Sınırlar ve bekleyenler

Koordinat, OSM kimliği, telefon, saat, fiyat, ödül, puan, fotoğraf ve menü eklenmez. A-konumsuz uyarısı korunur. Araştırma dalı birleştirilmez; yalnız bu alt küme aktarılır. Eski bütün kayıtlar tüm alanlarıyla korunur.

Maderia sahip talimatıyla bekler. Chalet faaliyet çelişkisi, Morini/Parlé adresi, Maromi ilçesi, MYK iç kapısı çözülmeden kabul edilmez. Bu tur Balıkçı Kahraman'ın işletmeci sitesi HTTP500, Fasuli'nin birincil adresi eksik ve Ahmet Ustam'ın 8/8-1 ayrıntısı açık kaldı. Tere, işletmecinin Topaz'ın yerinde açıldığı açıklaması nedeniyle mevcut kimlik dönüşümünün ayrı incelemesi olmadan yeni restoran sayılmadı. Bar/kafe/Kıbrıs ve mevcut canlı adres düzeltmeleri kapsam dışında.

## Kabul kapıları

`npm run test:toplu876`: kesin 877/842/717 sayımı, eski 876 kayıt, yalnız 1 ekleme, tekrar/no-op, yanlış tabanda ret, kullanıcı deneyimi ilişkisinde geri almayı reddetme, güvenli hedefli geri alma. Tarihsel PR #62 testi kendi alt kümesini doğrular; kesin güncel sayım yeni pakettedir. Temiz bağımlılık kurulumu, tip denetimi, derleme ve ilgili regresyon paketleri ayrıca raporlanır.

Gerçek Preview kabulü henüz tamamlanmadı. Eski PR #62 dal/iş izni yeni pakete varsayılmaz. Preview izni ve kesin sürüm için Production onayı ayrı kapılardır. Production'a kayıt eklenmez; Google 06.00/08.30, Excel, şifreli yedek, kullanıcı/deneyim, Menemen ve Sor güvenliği korunur.

## Geri dönüş

Kod geri dönüş noktası `2b437577f4a02197482fb90e46b5f75a3f0b96df`, mevcut başarılı Production dağıtımı `EJc72savwurvQqAv5LAqYch7pcJq`. Veri geri alma yalnız yeni Monteverdi hedefinde kullanıcı ilişkileri yeniden kontrol edilerek yapılır; tüm veritabanı geri sarılmaz.
