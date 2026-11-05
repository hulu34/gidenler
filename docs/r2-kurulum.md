# Cloudflare R2 kurulumu

Fiyat ve kurallar 31 Ekim 2026'da Cloudflare belgelerinden okundu (`r2/pricing`, `r2/buckets/public-buckets`, `dns/zone-setups/partial-setup`). Açmadan önce yeniden bakın. Maliyetler tahmindir, fatura değildir.

## Fiyat
| Kalem | Aylık ücretsiz | Sonrası |
|---|---|---|
| Depolama | 10 GB-ay | 0,015 USD / GB-ay |
| Class A (PUT, kopyalama) | 1 milyon | 4,50 USD / milyon |
| Class B (GET, HEAD) | 10 milyon | 0,36 USD / milyon |
| Silme | Ücretsiz | Ücretsiz |
| Çıkış | Ücretsiz | Ücretsiz |

## Görsel adresi: DNS değişmeden başlanır
Özel alan adı zorunlu değildir. `MEDIA_PUBLIC_BASE` boşsa onaylı dosyalar uygulamanın `/api/media/file/` ucundan, `www.gidenler.com` üzerinden sunulur. Kova herkese kapalı kalır, DNS değişmez.
- **Bedeli:** görsel trafiği Vercel'den geçer. Kaldırılan dosya en çok 10 dakika önbellekte kalabilir.
- **Ne zaman geçilir:** Vercel kullanım panosunda görsel trafiği belirginleşince. O zaman R2 özel alan adı gerekir; bu, alan adının Cloudflare'de bölge olmasını ister. `gidenler.com` GoDaddy'de ve kısmi kurulum yalnız Business ve Enterprise planında var, bu yüzden o aşamada ayrı bir görsel alan adı ya da ad sunucusu taşıma kararı verilir. `r2.dev` üretim için önerilmez.

## Sizin yapacaklarınız
Hesap zaten varsa yeni hesap açmayın. Anahtarları sohbete yapıştırmayın; yalnız Vercel paneline girin.
1. dash.cloudflare.com → **R2 Object Storage** → etkinleştirin. Ödeme yöntemi istenebilir.
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

Sürücü sahte sunucuyla ve S3 uyumlu MinIO ile sınandı (`scripts/s3test.ts`). Gerçek R2 ile sınanmadı.

## Production ve geri dönüş
Sıra `docs/medya.md` içindedir. Geri dönüş: `MEDIA_S3_*` değişkenlerini kaldırıp yeniden dağıtın. Yükleme kapanır, onaylı kullanıcı fotoğrafları görünmez olur, dosyalar kovada kalır, izinli fotoğraflar etkilenmez.
