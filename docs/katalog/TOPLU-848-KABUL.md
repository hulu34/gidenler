# 848 tabanında bağımsız restoran kabulü

Taban: `792455963ec2be1597fe9954eea69daf0213d7c0` (848 toplam / 813 aktif). Production değişmedi. Bu dal yalnız yayın adayıdır; kesin SHA için yeni açık kullanıcı onayı olmadan merge, deploy veya canlı DB yazımı yapılmaz.

## Kapsam

12 restoran adayı: Galeyan, Mira Balık, Nato Lokantası, Uskumru, Cecconi’s Istanbul, CokCok Thai, Büyük Erzurum Sofrası, Cağistan, Banyan, Da Mario Etiler, Yüksel Balık Tarabya ve Arjantin Burger Avcılar. Her kaydın resmî kaynağı, bağımsız tarihli kaynağı ve adres farklarının açıklaması `toplu-848-kabul.json` içindedir.

Hedef: **860 toplam / 825 aktif / 700 aktif restoran**. 114 kafe, 11 bar ve 35 kapalı değişmez. Aday, gerçek Preview’a eklenen ve Production’da yayımlanan ayrı aşamalardır; bu commit hazırlanırken Production’da yeni kayıt sayısı **0**, Preview kabulü **bekliyor**.

Araştırma PR #56 `4fbd8824cf64c4676b590e80831d3a6fefaefb13` birleştirilmedi; 883 birleşik kaydı güncel848 ile karşılaştırıldı:125 mevcut,12 paket adayı,746 bekleyen. Önceki1333 kaynak satırı da mevcut848 ile karşılaştırıldı; bu kaynak havuzları örtüşür, toplanarak işletme sayısı üretilemez. 906, kafeler, barlar, Kıbrıs ve önceki bekletmeler otomatik kabul edilmedi.

## Kaynak kararları

- Mira için resmî iletişimdeki70/1 korunur; rehber70 diye bina düzeyinde yazar. Arnavutköy semti, Beşiktaş ilçesidir.
- Banyan’da resmî No:3 ve rehber3/3 aynı işletme/telefon/sokak. Katalog işletmecinin adresini alır; kaynak farkı açıkça kaydedilir. Galeyan’da da13/B ile rehber13 birim ayrıntısı ayrıdır.
- Da Mario yalnız Etiler; İstinyePark değil. Yüksel yalnız Tarabya208; Yeşilköy değil. Arjantin yalnız Ambarlı15/A; Beylikdüzü/Bostancı değil. CokCok Thai başka CokCok Pera kaydıyla birleştirilmez.
- Sipariş platformu tam sokak/kapı adresini göstermeyen Alaçatı Gurme-i ALA ve Meşhur Yayla Kokoreççisi bekletildi. Manifestteki üçüncü taraf sahip kararı ifadesi doğrudan yeni kullanıcı onayı sayılmadı.
- Tüm yeni kayıtlar **A-konumsuz**. Eski araştırmadaki OSM/Overture noktaları doğrulanmış konum diye taşınmadı. Açık adres var; harita noktası uydurulmaz, koordinatsız uyarısı korunur.
- Rehber puanı, ödül, yorum, menü, fiyat, fotoğraf, telefon veya saat alınmaz. Saha ya da telefon teyidi yapıldığı iddia edilmez.

## Koruma ve test kapıları

Eski848 kayıt bütün alanlarıyla korunur. Sor/güvenlik kodu, veri şeması, kullanıcılar, deneyimler, Menemen, Google06.00/08.30 işleri, Excel ve şifreli yedek kaynakları değişmez. Sor ve istemci indeksi son birleşik katalogdan yeniden üretilir; ham araştırma kanıtları istemciye eklenmez.

Yeni paket testi gerçek PostgreSQL uyumlu PGlite üzerinde848→860 ekleme, tekrar/no-op, yanlış tabanın reddi, kullanıcı ilişkisi varken geri almanın reddi ve hedefli geri alma sonrası eski verinin birebir korunmasını kapsar. Eski #55 testi tarihsel alt kümeyi korur; yeni kesin sayım bu paketin testindedir. Temiz kurulum, tip denetimi, derleme ve mevcut regresyon kapıları ayrıca çalıştırılır.

Gerçek Preview kabulü aynı kesin SHA üzerinde, Production’dan ayrı fiziksel veritabanı doğrulanarak yapılmalıdır. READY veya derleme içi smoke gerçek kabul sayılmaz. 1440/390 px profil/arama/form, Menemen, sitemap, olumsuz tercih/takip ve yüksek-puan/Yüksel ayrımı doğrulanır. AI yapılandırılmamışsa kurallı yanıt gerçek AI diye raporlanmaz.

## Geri dönüş

Kod noktası `792455963ec2be1597fe9954eea69daf0213d7c0`; önceki canlı dağıtım `GPLmnUgTqziXftEhEcoNkD49n289`. Yalnız ekleme yapan ve tekrarlanabilir veri planı, mevcut848’i değiştirmeden hazırlanır. Veri geri alma yalnız bu12 hedefte kullanıcı ilişkileri kontrol edilerek yapılabilir; tüm veritabanı eski kopyayla değiştirilmez. Production işlemi onay bekler.
