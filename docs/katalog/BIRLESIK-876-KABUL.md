# Birleşik 876 tabanı — yerel kabul adayı

Taban Production `2b437577f4a02197482fb90e46b5f75a3f0b96df`: 876 toplam / 841 aktif / 716 aktif restoran. Kanıtı tamam alt küme **3 restoran**: Monteverdi Ristorante (Beşiktaş), Sahan Ataşehir (Kardelen No:4), Az Çok Thai (Beyoğlu No:12/A). Hedef **879 toplam / 844 aktif / 719 aktif restoran**. Kafe114, bar11, kapalı35 korunur. Bu yerel çalışma bir yayın veya gerçek Preview kabulü değildir.

## Güncel araştırma girişi

PR70 `73a07d5c06371414ced3254be277de732186d8e0` (PR69 üzerine yalnız ek-6), `data/arastirma/toplu-teslim/guncel-durum.json` sabitlendi. 883 araştırma satırının 152'si yayımlanmış bağıyla, 709'u kanıt bekler; bunlar canlı876 sayımı değildir. Kör Agop Fatih yanlış canlı bağından ayrılmış, Liman yalnız Galataport slug'ına bağlı, Grandma araştırma içi eşleşmiş ama kanıtı eksiktir. Bu düzeltmeler araştırma dalı merge edilerek veya tarihî test fixtureları yeniden yazılarak uygulanmadı. Güncel giriş bir karar/kanıt kaynağıdır, katalog ithalatı değildir.

## Teslim ve karar

Claude PR65 `886200a6281fcb97e78403dfb7ce2624cc410e3a` 20 kaydı sınırlı kanıt turuyla teslim etti: 3 tamamlanma iddiasından yalnız Sahan Ataşehir bu birleşik alt kümeye kabul edildi. Diğer17 bekletme aynen korunur. Sahan Kadıköy ayrıca bekler. PR64 `40239d6fb6d6cd9434153ab54373095eba9f7e19` korunur; başı değiştirilmedi. Monteverdi kaydı oradaki kanıttan bu ayrı dala taşındı. Araştırma dalları merge edilmedi, geniş araştırma açılmadı.

## Şube ve kategori sınırları

- Sahan: ana sayfa `https://sahan.com/` Kardelen No:4 / 0216 315 37 37; G&M 23.12.2025 Ataşehir kaydı aynı. İşletmecinin `https://sahan.com/subelerimiz/` listesinde Ataşehir Vega No:18 / 315 36 36 ve Suadiye Bağdat No:461 / 771 47 47 farklıdır. Bu adres/telefonlar birleştirilmedi; yalnız No:4 adayı. Tür kebap/Türk mutfağı işletmecinin yemek servisi ve restoran öz tanımından; menü/yemek eşleşmesi eklenmedi.
- Az Çok Thai: PR70 `73a07d5c06371414ced3254be277de732186d8e0` kategori önerisi bağımsız doğrulandı. Resmî Türkçe sayfa restoran öz tanımını ve öğle/akşam yemek servisini açıklar; kafe ifadesi ortamdır. G&M 25.12.2025 sayfası No:12/A ve restoran türüyle gerçek tarayıcıda açıldı. Koordinat/menü/yemek eşleşmesi üretilmedi; CokCok Thai ayrı korunur.
- Hamdi Eminönü: güncel resmî site ve G&M No11'i destekler; PR70 ile Time Out No17 (10.04.2024) ve Falstaff No17 (adres alanı tarihsiz; sayfa güncellemesi 21.10.2026) karşılaştırıldı. Numara değişikliği/ikinci giriş/yazım hatası kanıtlanmadı; çelişki açık. Telefonlar farklıdır; hiçbir telefon aktarılmaz. Beklemede.
- Maderia ve Suna'nın Yeri bekler. Liman farklı adres/kimlikleri birleştirilmez. Kör Agop Fatih, Beyoğlu/Pera kaydıyla yayımlanmış sayılmaz. Kafe/bar/Kıbrıs ve canlı adres düzeltmeleri kapsam dışında.

Her yeni kayıtta A-konumsuz uyarısı; koordinat/OSM kimliği yok. Puan, fotoğraf, menü, fiyat, ödül, telefon ve saat aktarılmaz. Detaylar `docs/katalog/birlesik-876-kabul.json`.

## Yerel kabul ve sonraki tek kapı

`test:birlesik876`: eski876 tüm alanlarıyla koruma; kesin879/844/719; üç kayıt ekleme; tekrar/no-op; yanlış tabanda ret; kullanıcı deneyimi ilişkisi varken geri almayı reddetme; güvenli hedefli geri alma; Sahan şube ayrımı; karantinadaki kayıtların eklenmemesi. Temiz bağımlılık kurulumu, tip denetimi, derleme ve ilgili regresyon paketleri ayrıca raporlanır. Sor indeksi son birleşik veriden yeniden üretilir. Google06.00/08.30, Excel/yedek, Menemen ve izin kayıtları, kullanıcı/deneyim ve Sor güvenlik kodu korunur.

Tekil PR64 Preview sorusu tekrarlanmaz. Bu ayrı dal yerelde kalır. Nihai ortak alt küme kesinleştiğinde tek değişmez sürüme sabit gerçek Preview kabulü planlanır: fiziksel DB izolasyonu, eski veri özetleri, yalnız kabul hedeflerini ekleme/tekrar, hedefli geri dönüş, mobil/masaüstü profiller ve arama/form/sitemap/Menemen/Sor regresyonu. READY veya build smoke gerçek kabul sayılmaz. Yeni Preview/DB/erişim/tek seferlik iş için gereken somut izinler alınmadan uygulanmaz. Production için ayrıca bu son SHA'ya özel doğrudan kullanıcı onayı gerekir.

## Geri dönüş

Mevcut doğrulanmış kod noktası `2b437577f4a02197482fb90e46b5f75a3f0b96df`; Production dağıtımı `EJc72savwurvQqAv5LAqYch7pcJq`. Yayın öncesinde güncelliği tekrar kontrol edilir. Veri geri alma yalnız üç yeni hedefte kullanıcı ilişkileri yeniden denetlenerek yapılır; tüm veritabanı geri sarılmaz. Bu çalışma uzak veritabanına yazmaz.

## Son üçlü üzerinde tamamlanan yerel doğrulama

16.11.2026: tip denetimi, derleme, 18 test paketi / 985 kontrol geçti. Yeni paket 15/15: üç kayıt ekleme, ikinci uygulamada sıfır değişiklik, yanlış tabanda ret, deneyim bağlıyken geri almayı reddetme ve güvenli hedefli geri alma. Hazırlanan SQL yalnız yerel PGlite üzerinde 3 ekleme / 0 tekrar ve korunan eski verilerle sınandı; uzakta çalıştırılmadı. Ana sayfa ilk JS gzip 326.587 bayt, Production tabanına göre +160 bayt (%0,049). Gerçek dağıtılmış Preview ve gerçek AI kabulü henüz yapılmadı; bu son SHA için tek Preview onayı beklenir.
