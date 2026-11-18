# PR72 kesin ağacına taşıma — yerel doğrulama eki

- Bu dal artık kesin PR72 commit'i `bcaef512ca8a5feac20b07c36a006bfd97d19750` üzerine kurulu; bunun canlıya çıktığı iddia edilmiyor. PR72 dağıtımı koordinatör bilgisine göre halen onay bekliyor.
- Önceki 879 temelli rapor aşağıda tarihçe olarak korunmuştur; bu dalın geçerli toplamı **884**.
- Çakışmalar yalnız üretilmiş presentation/sor-index dosyalarındaydı. PR72 kaynakları korunarak iki dosya yeniden üretildi; eski 879 çıktısı kopyalanmadı.
- Il Cortile, Dafni Ateşbaşı, Parle Zorlu, Sushi Barba İstinyePark ve Akbabalı Meyhane kayıtları aynen korunuyor. Yeni regresyon testi beş kaydı tam kaynak nesnesi ve UI/Sor türüyle kontrol ediyor.
- Ortak çalışma alanı, PR72 dalı, dış/üretim DB, remote ve yayın değiştirilmedi. Kabul testi yalnız bellekte PGlite test veritabanı kullanır; canlı bağlantı açmaz.
- Yayın öncesi güncel production SHA teyidi hâlâ zorunlu. Genel seed uygulanmayacak.
- Bu 884 temelde sonuçlar: menü regresyonu geçti; PR72 birleşik kabul testi **16/16**; ana sayfa **33/33**; iki generated dizin --check, typecheck, git diff --check ve production build geçti.
- PR72 kabul testinin ilk çalışması engine.ts dosyası için eski metinle birebir karşılaştırmada durdu. Kontrol gevşetilmedi: yalnız `Balık restoranı` → `Deniz ürünleri` metin değişimine kesin izin verilerek güvenlik kodunun geri kalanı birebir doğrulandı; ardından 16/16 geçti.
- Bu 884 temelde Search QA yine 27 bulgu; tüm genel testlerin yeşil olduğu iddia edilmiyor. Sor 321/322 sayımı aşağıdaki önceki 879 temel testine aittir; 884 temelde yeniden çalıştırılmadı. Menü ve PR72 testleri Sor dizinini/ilgili kuralları ayrıca doğruladı.
- Ham venues.json, isletme.json ve PR72 beş kayıt paketi ile kesin bcaef512 ağacı arasında diff yok.

---

# Menü kaynaklı kategori düzeltmesi — yerel hazırlık

## Temel ve sınır
- Temel: `f4ebf2fe6304f1d83a959493cbca3668b65d5fe4`, koordinatörün son teyit ettiği production commit'i.
- Yeni ve bağımsız clone; PR72/ortak çalışma ağacına dokunulmadı.
- Site HTTP 200 döndü. GitHub deployment kaydı güncel Vercel SHA'sını göstermedi; Vercel inspect sonuç vermedi. Bu nedenle şu an canlıdaki SHA bağımsız doğrulanmış değildir.
- Bu temel 879 kayıt içeriyor. PR72'nin 5 yeni kaydı/884 DB durumu bu değişikliğe dahil edilmedi. Eski temelden doğrudan yayın YAPILMAMALI.
- Üretim DB, deploy, remote push, PR veya merge yapılmadı.

## Kaynak ve karar
- My Home Döner → Dönerci. https://myhomedoner.com/ : İskender, porsiyon, pilav üstü, tombik ve dürüm döner.
- Massa Bistro → Türk mutfağı. https://massa-bistro.com/menu/ : kebap, pide, meze ve Türk mutfağı ana yemekleri. Menü kanıtı koordinatörün resmî kaynak araştırmasından; blog içerikleri kullanılmadı.
- Işıl Garden → Türk mutfağı. https://www.isilgardenrestaurant.com/tr/menu : Türk/Osmanlı yemekleri, kebap, pide, kahvaltı; deniz ürünleri yalnız menünün bir bölümü.
- Kaynak URL'si, kontrol tarihi ve gerekçe `data/real/duzeltmeler.json` içinde.

## Değişiklik
- Ham `venues.json` değiştirilmedi. Mevcut override katmanı menüyle doğrulanmış ana cuisine değerlerini de destekliyor.
- Üç kaydın `menuVerifiedKind` alanı, ham yan tag'lerin doğrulanmış ana kategoriyi yeniden ezmesini engelliyor. Diğer mekanlara bu işaret eklenmedi.
- Görünür kategori adı Deniz ürünleri; iç `balik` anahtarı korunuyor. Ham tarihsel Balık restoranı değerleri yükleme katmanında normalize ediliyor; tarihi kanıt dosyaları topluca yeniden yazılmadı.
- Ana sayfa deniz ürünleri havuzu 97 → 95: yalnız Massa ve Işıl çıkıyor. Koço, Lacivert ve diğer eski üyeler korunuyor.
- 93 görünür kayıtta değişiklik: 90'ında yalnız etiket adı, 3'ünde kaynaklı tür düzeltmesi. Başka restoran ana türü değiştirilmedi.
- presentation ve Sor dizini yeniden üretildi. İthalat/paket üreticileri yeni görünen adı kullanıyor. Eski ithalatın kategori öncelik algoritması topluca yeniden çalıştırılmadı; başka adayların menüsüz otomatik düzeltilmesi kapsam dışı.

## Doğrulama
- `node --import tsx scripts/menu-kategori-test.ts`: geçti (3 kayıt, UI/ana veri/Sor tutarlılığı, yanlış kategori geri dönüşü, ham kanıt, gerçek deniz ürünleri üyelerinin korunması).
- `node --import tsx scripts/client-catalog.ts --check`: geçti.
- `node --import tsx scripts/sor-index.ts --check`: geçti.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: geçti.
- `node node_modules/next/dist/bin/next build`: son değişikliklerle geçti (1807 statik sayfa üretimi).
- Ayrı interaktif tarayıcı QA / canlı DB kontrolü yapılmadı.
- `node --import tsx scripts/anasayfa8test.ts`: 33/33 geçti.
- Search QA: değişmemiş temelde 28 bulgu; düzeltmede 27. My Home döner hatası giderildi; diğer önceden var olan sınıflandırma/AI bulguları bu dar çalışmada çözülmedi.
- Sor test: temelde ve değişiklikte 321 geçti / 1 kaldı. Tek başarısızlık `dizin: güncel` alt çağrısının npx/tsx IPC sandbox kısıtına takılması; aynı dizin kontrolü doğrudan node --import tsx ile geçti. Tam paket yeşil diye sunulmamalı.
- CLI tsx IPC engeli nedeniyle testler node --import tsx üzerinden yürütüldü. Var olan yerel node_modules salt okunur symlink ile kullanıldı; ortak bağımlılıklar değiştirilmedi.

## Uygulama planı (henüz uygulanmadı)
1. PR72 deployment SHA'sını ve canlı 884 kayıt durumunu teyit et.
2. Bu yerel commit'i güncel production temelindeki ayrı dala taşı. Generated presentation/sor-index dosyalarını eski 879 kopyadan taşımak yerine yeni temel üzerinden yeniden üret; beş yeni kayıt kaybolmamalı.
3. Menü regresyonu, 884 kayıt ve PR72'nin beş slug'ının korunması; typecheck/build ve ilgili testleri yeniden çalıştır.
4. Canlı DB alanları gerekiyorsa önce hedef alanların yedeğini al; yalnız tam eşleşen üç slug için kategori değişikliğini, ad değişimi için yalnız eski Balık restoranı satırlarının subcategory dönüşümünü kontrollü transaction/dry-run ile hazırla. UUID, adres, kullanıcı/aktivite, puan ve medya alanlarına dokunma. Genel seed çalıştırma.
5. Yetkili yayın sonrasında üç detay sayfası, kategori listeleri/arama/Sor ve yeni kayıtları canlıdan tekrar oku. Onaylı deployment SHA'sı ile sonuçları eşleştir.
