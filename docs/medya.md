# Fotoğraf arşivi

## Akış
Deneyim kaydedilir → fotoğraflar tek tek `POST /api/reviews/:id/photos` → `pending/` (özel) → editör onayı `/yonetim/fotograf-moderasyon` → `public/` → galeri. Kapak ayrı karardır (`lib/media/cover.ts`).

Fotoğraf puana, güven etiketine, ziyaret doğrulamasına ve eşik bildirimine girmez.

## Production'a geçiş (onay gerektirir)
1. Kalıcı depolama aç (S3 uyumlu; R2 önerilir): özel kova, genel kova ve genel kova için CDN alan adı.
2. Vercel Production değişkenleri: `MEDIA_S3_ENDPOINT`, `MEDIA_S3_KEY`, `MEDIA_S3_SECRET`, `MEDIA_S3_PRIVATE_BUCKET`, `MEDIA_S3_PUBLIC_BUCKET`, `MEDIA_PUBLIC_BASE`.
3. Geçiş `0002_fotograf_arsivi` (yalnız yeni tablolar: `photo_assets`, `staff_roles`, `media_blobs`).
4. `staff_roles` tablosuna moderatör ekle. Bunun için Production ucu yok; bilinçli olarak elle yapılır.
5. Küçük bir gerçek dosyayla depolama denemesi. Sürücü bugüne dek yalnız sahte S3 ile sınandı.

Değişkenler yoksa Production bugünkü gibi çalışır: yükleme alanı görünmez, fotoğraf tablolarına sorgu gitmez. `db` sürücüsü Production'da seçilmez.

## Geri alma
- Kod: Production'ı önceki dağıtıma döndür. Tablolar ek olduğu için kalabilir.
- Yüklemeyi kapatma: `MEDIA_S3_*` değişkenlerini kaldır. Onaylı fotoğraflar da görünmez olur; dosyalar silinmez.
- Tek fotoğraf: moderasyondan Kaldır (galeri ve kapaktan hemen düşer). CDN önbelleği kullanılıyorsa ayrıca temizlenmelidir.

## Test
`npm run test:medya`. Uçtan uca: `ops/medya-e2e.mjs` (yalnız Preview; izolasyon doğrulanmadan başlamaz).
