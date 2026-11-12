# Birleşik 793 mekân yayın adayı

Kapsam: PR #18 `824613eea6bb392614bd00909f8948696d7d4ba5` ve PR #17
`c15d243ec35ba8610031b43e84703bf3ec0b702e`. Paket 15 ve sonrası yoktur.
Taban: `b95d2844d9ff7641dcfaf6043870e71599d94f51`.

574 eski kayıt + Paket 7–14'ten 218 kayıt + Menemen Beşiktaş = 793 katalog kaydı.
Eski kapanış kararları korunur; bu sayı yalnız açık restoran sayısı değildir.
İki PR'ın işletme kayıtları birleştirildi; Sor indeksi birleşik katalogdan yeniden
üretildi. Japon Erdal'ın iki gerçek fotoğraflı kapağı ve altılı Seçki dahil.
Pages önizlemesinin iş akışı, derleme betiği ve paket ayarları dahil değildir.

Yanlışlıkla sürüme giren yerel `node_modules` sembolik bağlantısı kaldırıldı.
102 B1 kayıtta yaklaşık sokak konumu, adresle arama ve uyarı korunur; kesin
koordinattan 360° bağlantısı da kaldırıldı. A kayıtlarının konumu değişmedi.

## Yayın kapısı

Kullanıcı 12 Kasım'da birleşik sürümü, kontrollerin geçmesi koşuluyla açıkça
yetkilendirdi. İzole doğrulama, çalışan Vercel Preview ve Production ön kontrolü
geçmeden Production dalı veya veritabanı değiştirilmez. Neon'un 10/10 dolu
önizleme kotası henüz çözülmüş sayılmaz. Dal silme, kota aşma, ücretli plan
değişikliği veya Preview'ı Production veritabanına bağlama bu plana dahil değildir.

## Yalnız ekleme

Korunan yönetim ucundaki `seed-add-only` işlemi, `baselineCount: 574` ile yalnız
Paket 7–14'ün 218 slug'ı ve `menemen-besiktas` olmak üzere 219 kayıt için kullanılır.
Tek transaction; mevcut kayıtlarda UPDATE/DELETE, şema değişikliği veya eski
`seed` işlemi yoktur. Çakışma ve taban değişikliği işlemi durdurur; tekrar no-op.
Eski 574 kayıt/kimlik/kaynak, kullanıcı deneyimleri ve Google puanı kayıtları
yayın öncesi/sonrası salt okunur kontrollerle karşılaştırılır.

Google puanı otomasyonu, zamanlamalar, OAuth, yedekler ve Production bağlantı
ayarları değişmez. Gerçek kullanıcı deneyimi denemesi Production'da yapılmaz.

## Geri dönüş

Doğrulanmış önceki Production: `b95d2844d9ff7641dcfaf6043870e71599d94f51`,
`https://gidenler-8z4tjti3l-hulu34.vercel.app`, Vercel dağıtımı
`3c1SqAtGHqxaqUa5zuymdwkT9vfs`. Kod bu dağıtıma geri alınır. Eklenen kayıtlar,
yeni deneyimleri kaybetmemek için korunur; otomatik veri silme veya kullanıcı
tablolarına toplu geri yükleme yapılmaz.
