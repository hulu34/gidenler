# PR #48 — dar kapsamlı kabul adayı

Bu dal 99568ec6e7385be51af2454330ef536c632b55d3 Production tabanından hazırlanır. Eski PR başı birleştirilmez. Henüz yayın onayı veya gerçek Preview kabulü değildir.

Uygulama kaynağı `data/real/isletme.json`: yalnız `data/paket/pr48-kabul/kayitlar.json` içindeki sekiz restoran eklenir. 793 eski kayıt korunur; 801 toplam, 766 aktif, 641 aktif restoran, 114 aktif kafe, 11 aktif bar, 35 kapalı kayıt. 588 aday `bekleyen.json` içindedir; kafe politikası, 14 Kasım denetiminde ileri tarihli kayıtlar ve eksik kanıtlar otomatik kabul edilmez. Tarihin 15 Kasım'a geçmesi eski kanıt boşluğunu kapatmaz. Ken Sushi ve Google-only havuz alınmaz. Sentetik yük testi verisi bu dalda bulunmaz.

Kaynak kanıtı `pr48-kabul-kaniti.json`. Restoran kimliği/faaliyet değerlendirmesi web kaynaklarına dayanır, fiziksel ziyaret iddiası değildir. Harita koordinatı üretilmez. Michelin yıldızı/yılı gibi bu paketin kapsamı dışındaki ödül iddiaları eklenmez.

`npm run prebuild` son katalogdan Sor indeksini ve UI görünümünü üretir. `presentation.json`, sunucu yükleyicisinin Entity çıktısının aynısıdır; ham doğrulama notları/kaynak araştırması istemciye taşınmaz. `npm run test:pr48` bunun güncelliğini ve alan eşitliğini denetler. Büyük kataloglar için görünür kartları sunucuda sayfalama ayrı sonraki optimizasyondur; bu düzeltme bütün UI kataloğunu tamamen kaldırdığı iddiasında değildir.

## Veri işlemi ve geri dönüş

- Şema değişikliği yok. Mevcut yönetim yolundaki `seed-add-only` ve `appendRealVenues` kullanılacak; kapsam yalnız sekiz kabul edilmiş slug, beklenen eski kayıt sayısı 793. Tam seed/upsert yapılmayacak.
- İlk ekleme tek transaction; tekrar tam no-op; mevcut satır/kimlik çatışması veya taban sayısı farkı işlemi durdurur. `test:pr48` gerçek yordamı bellek içi PGlite'ta, eski kullanıcı/deneyim/menü/Google test kayıtlarıyla sınar.
- Canlı işlemden önce fiziksel DB hedefi, kullanıcı/deneyim ve katalog sayımları ile mevcut yedek yöntemi doğrulanmalı. Mevcut yedek sistemi değiştirilmez.
- Kod geri dönüşü Production tabanı 99568ec6. Yeni kayıtlara kullanıcı ilişkisi oluştuysa veri silinmez. Hedefli veri geri alma yalnız ilişkisiz sekiz kayıt için, yazmalar durdurulmuş ve ilişkiler işlem öncesi yeniden kontrol edilmişken yapılabilir. Eşzamanlı yazmalar açıkken yerel geri alma testi güvence sayılmaz.

## Yayın kapısı

Kesin commit'te hedefli testler, korumalı ve Production'dan fiziksel olarak ayrı DB kullanan tek gerçek Preview, mobil/masaüstü ve hesap/veri kabulü gerekir. Preview ile yayımlanacak SHA aynı olmalıdır. READY/yerel test/manifest SHA'sı bu kapının yerine geçmez. Vercel 403 sürerse yeni yetki verme, korumayı gevşetme veya Production DB'sini kullanma; hesap sahibinin yetkili proje oturumunu tamamlamasını bekle. Hiçbir canlı işlem bu dosyayla otomatik tetiklenmez.
