# Cloudflare R2 kurulumu

Fiyatlar 31 Ekim 2026'da developers.cloudflare.com/r2/pricing sayfasından okundu. Açmadan önce yeniden bakın.

## Gerekli hizmet ve maliyet
Yalnız Cloudflare R2 (Standard). R2 için ödeme yöntemi tanımlanması istenebilir.

| Kalem | Aylık ücretsiz | Sonrası |
|---|---|---|
| Depolama | 10 GB-ay | 0,015 USD / GB-ay |
| Class A (yazma, listeleme) | 1 milyon istek | 4,50 USD / milyon |
| Class B (okuma) | 10 milyon istek | 0,36 USD / milyon |
| İnternete çıkış | Ücretsiz | Ücretsiz |

Her fotoğraf üç boyutta saklanır. Boyut gerçek fotoğrafa göre değişir; test karelerinden kesin rakam çıkmaz. İlk ay gerçek kullanımı panodan okuyun.

## Sizin yapacaklarınız
1. Cloudflare'de R2'yi etkinleştirin.
2. Dört kova açın: `gidenler-preview-ozel`, `gidenler-preview-genel`, `gidenler-prod-ozel`, `gidenler-prod-genel`. Özel kovalar herkese kapalı kalır.
3. Yalnız genel kovalara özel alan adı bağlayın (ör. `foto.gidenler.com`). DNS değişikliği sizde.
4. İki ayrı API anahtarı üretin: Preview anahtarı yalnız preview kovalarına, Production anahtarı yalnız prod kovalarına "Object Read & Write" yetkisiyle.
5. Vercel'de ilgili ortama ayrı ayrı girin:

| Değişken | Değer |
|---|---|
| `MEDIA_S3_ENDPOINT` | `https://<hesap-kimliği>.r2.cloudflarestorage.com` |
| `MEDIA_S3_KEY`, `MEDIA_S3_SECRET` | API anahtarı |
| `MEDIA_S3_PRIVATE_BUCKET` | özel kova |
| `MEDIA_S3_PUBLIC_BUCKET` | genel kova |
| `MEDIA_PUBLIC_BASE` | genel alan adı |

## Kod tarafında hazır olanlar
S3 imzalı adaptör, iki kova ayrımı, onayda özel kovadan genele kopyalama, tekrar denenen silme kuyruğu, günlük bakım görevi, depolama yoksa yüklemenin kapalı kalması. Sürücü yalnız sahte sunucuyla sınandı.

## Akış
- **Moderasyon:** Yüklenen dosya özel kovaya yazılır. Önizleme `/api/media/file/` üzerinden, yalnız yükleyen ve personele sunulur; kova adresi ve anahtar tarayıcıya gitmez.
- **Yayın:** Onayda dosya genel kovaya kopyalanır, özel kopya silinir.
- **Silme:** Durum hemen değişir, dosya kuyruktan silinir. Başarısız silme "Sorunlu kayıtlar"da görünür ve tekrar denenir.
- **CDN:** Genel dosyalar bir yıl önbelleğe alınabilir. Telif ya da mahremiyet kaldırmasında Cloudflare panosundan o adres ayrıca temizlenmelidir. Otomatik temizleme yok; Cloudflare API anahtarı gerektirir.

## İlk deneme ve geri dönüş
1. Önce Preview değişkenleriyle gerçek dosya yükleyin, onaylayın, kaldırın; kovadan silindiğini görün.
2. Production'da geçişler `0002` ve `0003`, ardından `staff_roles` kaydı.
3. Geri dönüş: `MEDIA_S3_*` değişkenlerini kaldırın. Yükleme kapanır, onaylı kullanıcı fotoğrafları görünmez olur, eski fotoğraflar etkilenmez; dosyalar kovada kalır.
