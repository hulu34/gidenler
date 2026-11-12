# Paket 7–14 yayın planı

Hedef: b95d284 tabanındaki 574 mekâna yalnız 218 ekleme: 116 A + 102 B1 = 792.
Kaynaklar: PR #6–13, sıralı zincirin sonu e6c89c77dfc5e0559890f230fcc6b4c86254d717.
Claude'un kaynak dalları değiştirilmedi. Sekiz paket katalog ve Sor Gidenler indeksinde etkin.

## Konum doğruluğu

102 B1 kaydı sokak düzeyinde gösterilir. Profil bilgi tablosunda, haritada ve harita seçiminde yaklaşık konum uyarısı vardır. Kesin giriş noktası işareti ve koordinata yol tarifi üretilmez; adresle arama açılır. JSON-LD kesin koordinat yayımlamaz. A kayıtlarının mevcut yol tarifi korunur. Japon Erdal galerisi ve harita mimarisi değişikliği kapsam dışıdır.

## Veritabanı işlemi

`POST /api/admin/db/` yalnız korumalı dağıtımın kendi adresinde; mevcut hedef/onay ve Preview DB parmak izi kontrollerinden sonra:

```json
{"action":"seed-add-only","target":"production","confirm":"EVET","baselineCount":574,"slugs":["YALNIZ 218 PAKET KAYDININ SLUG LİSTESİ"]}
```

Gerçek liste sekiz paketin kayitlar.json/isletme-kayitlari.json dosyalarından üretilir; liste boyu ve tekillik 218 olmalıdır. Ön kontrol: mevcut toplam 574, bütün 218 yok, migration drift/pending/unknown yok, Google ve kullanıcı tablosu ölçümleri kaydedilmiş.

İşlem tek transaction içinde ekler. UPDATE/DELETE yok; mevcut UUID'ler ve alanlar korunur. Paket dışındaki sayı 574 değilse, slug/legacy/kaynak çakışırsa durur. Yarım hata bütünü geri alır. Aynı işlem tekrarı tam no-op olmalıdır. Eski `seed` işlemi bu yayında kullanılmaz. Şema geçişi yoktur.

## Test kanıtı

- Paket testleri sekizinde geçti.
- Orijinal dbtest bağımsız tekrarında 290 geçti / 3 kaldı. Sebep, yeniden deneme kuyruğu yerine tüm katalogdan telefonlu kayıt seçen test düzeneği. Kuyruğun ilk kaydı ve açık test telefonu kullanılarak düzeltildi; Google çalışma kodu değiştirilmedi.
- dbtest: 293/293 gerçek katalog, 294/294 demo.
- Sor: 322/322; 187 yeni tam ad ve 3 Develi Samatya regresyonu (tam ad kısmi eşleşmeden önce gelir); arama: 49/49, 792/792 ad ve ASCII arama.
- SEO: 49/49; rezervasyon: 22/22; Google puanı: 103/103.
- Gece: 59/59; ilk kullanıcı: 35/35.
- B1: 102 kaydın tümü + A geri uyumu + Preview izolasyon kontrolleri.
- Ekleme işlemi: 8/8; 574 satır ve kaynaklarının aynı kalması, 218 ekleme, tekrar no-op, taban/çakışma reddi, yarım hata geri alma ve yeniden uygulama.
- Tip kontrolü ve Production derlemesi geçti. Bulut Preview ve mobil/masaüstü sonuçları PR açıklamasına eklenir; doğrulanmayan kontrol geçmiş sayılmaz.

## Korunan sistemler

Google puanı sağlayıcıları/işleri, 06.00 ve 08.30 zamanlamaları, Excel/şifreli yedek kodu ve iş akışları değişmedi. Üç ürün ayrı kalır; Yorum depolarına bu işlemde yazılmaz.

## Yayın ve geri dönüş

Belirli aday commit için kullanıcının son açık onayı gelmeden merge, Production deploy veya Production DB yazması yapılmaz.
Onay sonrası önce aynı ağaç Production'da dağıtılır, ardından korumalı uçta ekleme ve bağımsız salt okunur bütünlük kontrolü yapılır. 792 mekân, mevcut 574 kimlik, kullanıcı ve Google puanı ölçümleri kontrol edilir. Eski profil, yeni A/B1 profiller, arama, form, sitemap ve Sor canlıda denetlenir.

Kod geri dönüşü: b95d2844d9ff7641dcfaf6043870e71599d94f51 / gidenler-8z4tjti3l-hulu34.vercel.app. Veri eklemeleri varsayılan olarak tutulur; yeni kullanıcı verisi olabileceğinden otomatik silme yapılmaz. İstenirse yalnız bu 218 mekân için bağımlılık denetiminden sonra ayrı onayla veri temizliği değerlendirilir. Kullanıcı tablosuna toplu geri yükleme yapılmaz.

## Son kontrol notları

- Bulut Vercel Preview 471e912: KMBwKCUX2QieT2cpYv5KGRdH9mny, `gidenler-i0u3h8rvq-hulu34.vercel.app`. Neon dal kotası dolu: "Branch limit reached". Derleme başlamadan kaynak hazırlamada durdu. Dallar silinmedi, plan/koruma/bağlantı ayarları değiştirilmedi. Bu başarısız dağıtım çalışan Preview olarak sunulmaz.
- GitHub Actions 43063320660, 471e912 üzerinde ayrı PostgreSQL 17 ile ekleme/geri alma/tekrar ve 218 profil + 218 form + 102 B1 uyarısı + 218 sitemap kontrolünü geçti. Son Sor düzeltmesinin yeni commit'inde aynı paket yeniden koşturulur; son bağlantı PR'da tutulur.
- Yerel izole HTTP ortamında üç hazır test oturumlu deneyim (A/OSM, A/işletme, B1) doğru mekân kimliğine bağlandı. Gerçek Google OAuth değildir. Ekleme yönetim ucu tekrar no-op ve yanlış hedef reddi de geçti.
- Yerel gerçek tarayıcı: 390 px B1 profili/arama, 375 px form/taslak yenileme ve 1440 px A profili. Yatay taşma yok. Bulut Preview/gerçek telefon sonucu olarak raporlanmaz.
- 792 katalog kaydı ile "açık mekân" sayısı farklıdır: mevcut kapanış kuralları nedeniyle 757 açık mekân ve 746 sitemap profili. Yeni 218'in tümü açık ve sitemap'te. Eski kapanış kararları korunur.
