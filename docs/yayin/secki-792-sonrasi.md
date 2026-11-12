# 792 sonrası Seçki geliştirme ve tek Menemen ekleme planı

Taban: Production `721b1a1a3280b2f08141af2629d322cf5c9a2e11` (PR #18).
12 Kasım 2026'da yayın sorumlusunun Production işlemi 43136403936 ve canlı
kontrolü 43136643739 başarılı; 792 kayıt, bütünlük ve Google görünür sayı 331.
Bu teslim tamamlandıktan sonra ayrı geliştirme dalı açıldı.

## Kapsam

- Ana sayfada HomeSecki ve altı gerçek restoran; Türkçe/İngilizce Seçki kartları.
- Japon Erdal'ın dış cephesi solda, çift yumurtalı pide sağda. Orijinal fotoğraflar
  ve izin kayıtları korunur; aynı 31/20 çerçevede fotoğraflar kesilmeden gösterilir.
- Neolokal adresi restoranın resmî sitesine göre gösterilir: SALT Galata,
  Bankalar Caddesi, Karaköy, 34420 İstanbul. Kaynak ve kontrol tarihi görünür.
  Bu gösterim düzeltmesi eski ham kaydı, DB adresini veya OSM kimliğini değiştirmez.
- Tek yeni işletme Menemen Beşiktaş'tır. Koordinat uydurulmaz.

PR #22 birleştirilmez; önceki 218 kayıt tekrar taşınmaz. Paket 15 ve sonrası,
Google puanı otomasyonu, OAuth, rezervasyon sistemi, şema ve Production ayarları
bu geliştirmeye dahil değildir. Git'te izlenen yerel node_modules bağlantısı
bu dalda kaldırılmıştır; derleme bağımlılıkları sürüme girmez.

## Doğrulama ve Preview

`scripts/secki-menemen-test.ts`, Production tabanındaki 792 kaydı korur ve
yalnız Menemen ile 793'e çıkar. Atomik hata geri alma, tekrar no-op, yanlış
taban, çakışma, mükerrer ve hatalı kaynak reddi; mevcut kimlikler/kaynaklar ve
sentetik deneyim/Google puanı satırlarının korunması izole DB'de sınanır.

`scripts/secki-http-test.ts`, ana sayfa/TR/EN altı kartı, altı profili, iki
fotoğrafı, adres kaynağını ve Menemen sitemap girdisini denetler. Yerel PostgreSQL
ile yönetim ucu tekrar no-op/yanlış hedef reddi ve hazırlanmış test oturumunun
Menemen deneyimini doğru kimliğe yazması da sınanır. Gerçek OAuth testi sayılmaz.

CI yalnız bu geliştirme dalında, sıfırdan açılan PostgreSQL 17 üzerinde çalışır.
Production sırlarına veya bağlantısına erişmez. Yerel/CI sonuçları, çalışan
Vercel Preview sonucu yerine sunulmaz. Gerçek Preview için kaynak commit,
Preview ortamı ve Production'dan farklı DB parmak izi ayrıca doğrulanmalıdır.
Neon kapasitesi için dal silme, plan/bağlantı değiştirme bu geliştirmede yapılmaz.

## İlerideki yayın işlemi — bu görevde uygulanmaz

Plan: `data/yayin/secki-menemen-20261112.json`.

Canlı hâlâ 792 ve Menemen yoksa, yeni kaynak commit için ayrıca Production
onayı alındıktan sonra korumalı dağıtım adresinde yalnız şu işlem hazırlanır:

```json
{"action":"seed-add-only","target":"production","confirm":"EVET","baselineCount":792,"slugs":["menemen-besiktas"]}
```

Beklenen sonuç: yalnız 1 ekleme, 793 toplam; mevcut 792 kaydın UUID'leri ve
alanları, kullanıcı deneyimleri ve Google tabloları aynı. Tekrar tam no-op.
Genel seed, eski 218 slug listesi, şema geçişi, UPDATE/DELETE kullanılmaz.
Canlı taban değişmişse işlem yapılmaz; plan yayın sorumlusuyla yeniden değerlendirilir.

Kod geri dönüşü: `721b1a1` / `gidenler-e3dsrf0gs-hulu34.vercel.app`.
Menemen kaydı ve yeni kullanıcı verileri geri dönüşte korunur; otomatik veri
silme veya toplu geri yükleme yapılmaz. Bu geliştirme Production'a yazmaz,
PR #18'in bitmiş yayın işlemini veya PR #22'yi değiştirmez.
