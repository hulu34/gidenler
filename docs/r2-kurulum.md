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

## Önce verilecek karar: görsel alan adı
R2 özel alan adı, alan adının aynı Cloudflare hesabında bölge (zone) olmasını ister. `r2.dev` adresi hız sınırlıdır ve üretim için önerilmez. `gidenler.com`'un DNS'i GoDaddy'de; kısmi (CNAME) kurulum yalnız Business ve Enterprise planlarında var.
- **Önerilen:** görseller için ayrı, küçük bir alan adını Cloudflare'de açmak. Ana sitenin DNS'ine dokunulmaz; yıllık alan adı ücreti çıkar.
- **Alternatif:** `gidenler.com`'un ad sunucularını Cloudflare'e taşımak. Ek ücret yok ama site, e-posta ve demo kayıtlarının tamamı taşınır.

## Sizin yapacaklarınız
Hesap zaten varsa yeni hesap açmayın. Anahtarları sohbete yapıştırmayın; yalnız Vercel paneline girin.
1. dash.cloudflare.com → **R2 Object Storage** → etkinleştirin. Ödeme yöntemi istenebilir.
2. **Create bucket** ile dört kova: `gidenler-preview-ozel`, `gidenler-preview-genel`, `gidenler-prod-ozel`, `gidenler-prod-genel`. Konum Automatic, sınıf Standard.
3. Yalnız `-genel` kovalarda **Settings → Custom Domains → Add**: `gidenler-preview-genel` için `preview.<görsel-alanı>`, `gidenler-prod-genel` için `foto.<görsel-alanı>`. Özel kovalara alan adı bağlamayın, r2.dev erişimini kapalı bırakın.
4. **R2 → Manage API tokens → Create API token** ile iki anahtar. İzin **Object Read & Write**; **Apply to specific buckets only** seçin: biri yalnız iki preview kovasına, diğeri yalnız iki prod kovasına.
5. **My Profile → API Tokens → Create Token → Custom**: izin **Zone · Cache Purge · Purge**, kaynak yalnız görsel alan adının bölgesi. Bölge kimliği, alan adının **Overview** sayfasındadır.
6. Vercel → proje → **Settings → Environment Variables**. Her değişkeni **Sensitive** işaretleyip yalnız ilgili ortama girin. Önce yalnız **Preview**:

| Değişken | Değer |
|---|---|
| `MEDIA_S3_ENDPOINT` | `https://<hesap-kimliği>.r2.cloudflarestorage.com` |
| `MEDIA_S3_KEY`, `MEDIA_S3_SECRET` | 4. adımdaki anahtar |
| `MEDIA_S3_PRIVATE_BUCKET` | özel kova |
| `MEDIA_S3_PUBLIC_BUCKET` | genel kova |
| `MEDIA_PUBLIC_BASE` | `https://preview.<görsel-alanı>` |
| `MEDIA_CF_ZONE_ID`, `MEDIA_CF_PURGE_TOKEN` | 5. adım |

7. Bana "Preview değişkenleri girildi" deyin. Değerleri yazmayın. Testleri ayrı Preview kovasında çalıştırırım.

## Kod tarafında hazır olanlar
- S3 imzalı adaptör, onaya kadar özel kova, onayda genel kovaya kopya.
- Kova kilidi: özel ve genel aynıysa, Production'da `preview/test/dev`, Preview'da `prod` adı varsa yükleme kapanır.
- Silme kuyruğu: dosya silinir, CDN temizlenir. Biri başarısızsa kayıt kuyrukta kalır ve artan aralıkla denenir.
- Önbellek: temizleme açıkken tarayıcıda 1 saat, CDN'de uzun; kapalıyken ikisi de 1 saat. Tarayıcıdaki kopya uzaktan silinemez.
- `/yonetim/medya-saglik` → **Depolamayı dene**: yazma, okuma, genel erişim, silme ve CDN temizliğini gerçek kovada dener. Test depolamasını gerçek saymaz.

Sürücü bugüne dek yalnız sahte sunucuyla sınandı. Gerçek R2 ile sınanmadı.

## Production ve geri dönüş
Sıra `docs/medya.md` içindedir. Geri dönüş: `MEDIA_S3_*` değişkenlerini kaldırıp yeniden dağıtın. Yükleme kapanır, onaylı kullanıcı fotoğrafları görünmez olur, dosyalar kovada kalır, izinli fotoğraflar etkilenmez.
