# Cloudflare R2 kurulumu

Fiyat ve kurallar 31 Ekim 2026'da okundu, 5 Kasım 2026'da `developers.cloudflare.com/r2/pricing/` ve `r2/api/tokens/` sayfalarından yeniden doğrulandı (değişiklik yok). Açmadan önce yeniden bakın. Maliyetler tahmindir, fatura değildir.

## Fiyat
| Kalem | Aylık ücretsiz | Sonrası |
|---|---|---|
| Depolama | 10 GB-ay | 0,015 USD / GB-ay |
| Class A (PUT, kopyalama) | 1 milyon | 4,50 USD / milyon |
| Class B (GET, HEAD) | 10 milyon | 0,36 USD / milyon |
| Silme | Ücretsiz | Ücretsiz |
| Çıkış | Ücretsiz | Ücretsiz |

**5.000 restoran tahmini** (fatura değil): mekân başına ortalama 20 onaylı fotoğraf, fotoğraf başına üç boyut toplam ~400 KB → 100.000 fotoğraf ≈ 40 GB → depolama ≈ (40 − 10) × 0,015 ≈ **0,45 USD/ay**. Yükleme başına 3 PUT + onayda 3 kopya: 100.000 fotoğraf ≈ 600.000 Class A, ücretsiz katmanda kalır. Görüntüleme: özel alan adı yokken her görsel isteği uygulamadan geçer ve 60 saniye önbellekte kalır; önbellek dışı istek R2'de 1 Class B'dir. Ayda 10 milyon önbellek dışı görsel isteğine kadar ücretsiz.

## Görsel adresi: DNS değişmeden başlanır
Özel alan adı zorunlu değildir. `MEDIA_PUBLIC_BASE` boşsa onaylı dosyalar uygulamanın `/api/media/file/` ucundan, `www.gidenler.com` üzerinden sunulur. Kova herkese kapalı kalır, DNS değişmez.
- **Bedeli:** görsel trafiği Vercel'den geçer. Kaldırılan dosya en çok 60 saniye önbellekte kalabilir (5 Kasım'da 10 dakikadan indirildi; kısa süre, kaldırılan fotoğrafın açık kalmaması için).
- **Ne zaman geçilir:** Vercel kullanım panosunda görsel trafiği belirginleşince. O zaman R2 özel alan adı gerekir; bu, alan adının Cloudflare'de bölge olmasını ister. `gidenler.com` GoDaddy'de ve kısmi kurulum yalnız Business ve Enterprise planında var, bu yüzden o aşamada ayrı bir görsel alan adı ya da ad sunucusu taşıma kararı verilir. `r2.dev` üretim için önerilmez.

## Sizin yapacaklarınız
Hesap zaten varsa yeni hesap açmayın. Anahtarları sohbete yapıştırmayın; yalnız Vercel paneline girin.
1. dash.cloudflare.com → **R2 Object Storage** → etkinleştirin. Panel ödeme yöntemi isteyebilir (resmî fiyat sayfası bunu yazmıyor); ücretsiz katman içinde ücret çıkmaz. Bu adım sizindir; ben hesap açmam ve ödeme bilgisi girmem.
2. **Create bucket** ile dört kova: `gidenler-preview-ozel`, `gidenler-preview-genel`, `gidenler-prod-ozel`, `gidenler-prod-genel`. Hiçbirine genel erişim ya da r2.dev açmayın.
3. **R2 → Manage API tokens → Create API token** ile iki anahtar. İzin **Object Read & Write**, **Apply to specific buckets only**: biri yalnız iki preview kovasına, diğeri yalnız iki prod kovasına.
4. Vercel → proje → **Settings → Environment Variables**. Her değişkeni **Sensitive** işaretleyip önce yalnız **Preview** ortamına girin:

| Değişken | Değer |
|---|---|
| `MEDIA_S3_ENDPOINT` | `https://<hesap-kimliği>.r2.cloudflarestorage.com` |
| `MEDIA_S3_KEY`, `MEDIA_S3_SECRET` | preview anahtarı |
| `MEDIA_S3_PRIVATE_BUCKET` | `gidenler-preview-ozel` |
| `MEDIA_S3_PUBLIC_BUCKET` | `gidenler-preview-genel` |

5. Bana "Preview değişkenleri girildi" deyin. Değerleri yazmayın. Testleri Preview kovasında çalıştırırım; Production anahtarı ancak bu testlerden sonra girilir.

İleride özel alan adı kullanılırsa `MEDIA_PUBLIC_BASE`, `MEDIA_CF_ZONE_ID` ve `MEDIA_CF_PURGE_TOKEN` (izin: Zone · Cache Purge · Purge) eklenir.

## Kod tarafında hazır olanlar
- S3 imzalı adaptör, onaya kadar özel kova, onayda genel kovaya kopya.
- Eksik ya da geçersiz değişken yüklemeyi kapatır.
- Kova kilidi: özel ve genel aynıysa, Production'da `preview/test/dev`, Preview'da `prod` adı varsa yükleme kapanır.
- Silme kuyruğu: dosya silinir, CDN temizlenir. Biri başarısızsa kayıt kuyrukta kalır ve artan aralıkla denenir.
- Önbellek: temizleme açıkken tarayıcıda 1 saat, CDN'de uzun; kapalıyken ikisi de 1 saat. Tarayıcıdaki kopya uzaktan silinemez.
- `/yonetim/medya-saglik` → **Depolamayı dene**: yazma, okuma, genel erişim, silme ve CDN temizliğini gerçek kovada dener. Test depolamasını gerçek saymaz.

Gerçek S3 protokolü: 5 Kasım 2026 gecesi GitHub Actions'ta kaynaktan derlenen MinIO sunucusunda sınandı (dl.min.io artık hazır program vermiyor, Docker Hub imajı da çekilemedi). `scripts/s3test.ts` 11/11 (adaptör) ve `scripts/s3akis.ts` 29/29: uygulamanın kendi fotoğraf servisi ve `/api/media/file/` ucu gerçek kovaya bağlıyken yükleme, kovada saklandığının bayt bayt doğrulanması, EXIF/GPS'in silinmesi, yetkili açma, yetkisiz/oturumsuz/sahte çerezle açamama, onayda genel kovaya taşıma, silme, silme sonrası okunamama, bağlantı kesikken dürüst hata ve kuyruktan yeniden deneme. Çalıştırma: ops dalında `[s3]` etiketi.
**Gerçek R2 ile sınanmadı.** R2 aynı S3 API'sini konuşur; bağlandıktan sonra `/yonetim/medya-saglik` → **Depolamayı dene** ve Preview uçtan uca testi R2 kovasında yeniden çalıştırılmalıdır.

## Production ve geri dönüş
Sıra `docs/medya.md` içindedir. Geri dönüş: `MEDIA_S3_*` değişkenlerini kaldırıp yeniden dağıtın. Yükleme kapanır, onaylı kullanıcı fotoğrafları görünmez olur, dosyalar kovada kalır, izinli fotoğraflar etkilenmez.
