# PR50 — bağımsız dar kapsamlı yayın adayı

Taban Production `174a1c9c33f10774aace7f62ab884584dbaba0dd`, 801 toplam/766 aktif. Claude'un araştırma PR #50'si `f94d102c7febad61e90d4800e3dee59ae5dbc62c` değiştirilmedi veya birleştirilmedi. Bu dal yalnız onun hazır bildirdiği 50 kaydın bağımsız incelemesinden türetilen 17 restoranı içerir.

**Katalog adayı: 818 toplam / 783 aktif / 35 kapalı; 658 aktif restoran / 114 kafe / 11 bar. Production'a eklenmiş sayılmaz.**

Kanıt ve 50 ayrı karar: `pr50-kabul-kaniti.json`. 17 restoran resmî işletme/otel/kompleks kaynağı ve G&M kimlik/adres kaydıyla değerlendirilmiştir. Araştırma puanları, telifli metin ve fotoğraflar, menü ve fiyatlar aktarılmaz. Telefonlar kaynaklar arasında değiştiği için bu pakette yazılmamıştır. Bütün yeni kayıtlar A-konumsuzdur; TAS için araştırmadaki OSM koordinatı yeniden doğrulanmadığı için taşınmamıştır. Harita noktası üretilmez. Kaynak kontrolü fiziksel faaliyet ziyareti veya doğrudan telefonla teyit iddiası değildir.

25 restoran bekler: MykOrini adres farkı, Aliée isim/adres değişikliği, Sushi Barba dış kapı/iç birim farkı, Filo D'olio yeni adres duyurusu, Yeniköy Balıkçısı alan adı/iletişim tutarsızlığı ve kalanlarda doğrudan işletme/faaliyet teyidinin tamamlanmaması. Bekleme kapanış veya sahte işletme kararı değildir. 8 kafe/pastane ayrı kategori ve ürün kararı olarak tutulur; bu paketin restoran KPI'sına girmez.

Yedi eski araştırma/ret kaydının yeni kanıtı bu tur uygulanmaz ve yeni aday sayısına katılmaz. Bunların mevcut Production'da yayımlandığı iddia edilmez. Sonradan gerçekten kabul edilip katalog/DB'ye eklenen kayıtlar ayrı bir yayında gerçek artış olarak sayılmalıdır.

## Test ve veri kapısı

`test:pr50`: yeni tam sayı, eski 801 kaydın alan alan korunması, kaynak/koordinatsızlık, Google ve Menemen dosyalarının korunması; gerçek PGlite üzerinde mevcut append yordamı, tekrar/no-op, yanlış taban ve kullanıcı ilişkili geri dönüş reddi. `test:pr48` artık tarihsel sekiz kaydın ve eski 793'ün korunmasını doğrular; yeni tam sayımın yerine geçmez. Tam 818/783 sınırı `test:pr50` içindedir. Mevcut eski testte sabit 801'i körü körüne korumak yeni eklemeleri hata sayardı.

Sor indeksi ve UI görünümü son gerçek katalogdan yeniden üretilir. Sor uygulama/güvenlik kodu değiştirilmez. Güvenlik, Google 06.00/08.30 işi, Excel/yedekler, OAuth, medya, mevcut profil dosyaları ve şema değişmez. Temiz bağımlılık kurulumu ve ilgili regresyonlar gerçek dağıtılmış, Production'dan ayrı veritabanlı Preview kabulünün yerine geçmez.

Gerçek Preview'da doğrulanmış 801 taban üzerine yalnız 17 kayıt mevcut `appendRealVenues` yordamıyla uygulanacak; taban 801, hedef818. Yanlış fiziksel dal/Production parmak izi yazmayı durdurur. Genel seed/upsert veya migration çalıştırılmaz. Eski kullanıcı/deneyim/menü/Google verileri korunur; ekleme ve tekrar sonrası doğrulanır.

## Yayın ve geri dönüş

Henüz Production onayı veya yayın yok. Kabul ve yayın SHA'sı aynı olmalı; kullanıcıya kesin SHA ve kapsam sunulmalıdır. Veri işlemi yalnız 17 kabul slug'ı ve 801 tabanıyla tek transaction olarak hazırlanır. Kod geri dönüşü `174a1c9`; DB kod geri dönüşüyle silinmez. Yeni kayda kullanıcı ilişkisi doğmuşsa kayıt silinmez. Hedefli geri alma yalnız ilişki olmadığı yeniden kontrol edilip yazmalar kontrollü durdurularak yapılabilir. Geçici test sürücüsü, araştırmanın diğer kayıtları ve yeni otomasyonlar yayına taşınmaz.
