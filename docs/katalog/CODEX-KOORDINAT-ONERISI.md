# Codex için teknik öneri: koordinat kaynağı ve konumsuz işletme kaydı (2026-11-11)

Kritik dosyalar (`data/real/index.ts`, Production, Google otomasyonu, GitHub Actions) bu çalışmada **değiştirilmedi**. Aşağıdakiler Codex'in değerlendirmesi ve uygulaması içindir.

## 1. Bugünkü durum (doğrulandı)
**`data/real/index.ts`:** işletme kaydı (`isletme/<slug>`) koordinatsız geçerlidir.
- `invalidRecord`, lat/lng yoksa yalnız kaynak, slug ve kimlik alanlarını denetler.
- lat/lng varsa `location.provider === "osm"` zorunludur.

**Koordinat okuyan yerler:**

| Dosya | Davranış |
|---|---|
| `components/map/RealMap.tsx` | `geo` olmayanı filtreler; sahte nokta çizilmez. |
| `lib/venue.ts` → `mapLinks` | `geo` yoksa `null`. |
| Profil "Konum" bölümü | "harita noktası henüz yok; yerini adresle ara". |
| `lib/seo.ts` | `GeoCoordinates` yalnız `geo` varsa yazılır. |
| `lib/sor/engine.ts` | mesafe `null`. |
| `lib/gpuan/venues.ts` | koordinatsız kaydı atlar; Google puanı otomasyonu etkilenmez. |
| `lib/db/seed.ts` | `lat/lng` için `null` yazar. |

**Yerel benzetim:** Production + paket 7–14 + 18 koordinatsız kayıt, 810 mekân.
- bin1test, katalogtest, aramatest, seotest, anasayfatest, anasayfa8test, sortest ✓.
- `next build` ✓.
- Önizleme denetimi 56/56.
- Ek denetim: profil, adres, OSM gömmesi yok, JSON-LD'de koordinat yok, sitemap.

## 2. Bulunan hata ve düzeltme (ayrı dal, PR)
`components/venue/VenueInfo.tsx`, işletme kaydında koordinat olmasa da "Konum OpenStreetMap adres verisinden, sokak düzeyinde (© OSM)" yazıyordu. Koordinatsız kayıtta bu yanlış bir atıf.
- **Düzeltme:** `geo` yoksa "Doğrulanmış harita konumu yok; adres resmî kaynaktan, harita noktası gösterilmez."
- **Değişmeyen:** `geo` varsa metin aynen kalır.
- **Dal:** `duzeltme/konumsuz-profil-metni` (taban `feature/investor-v1`). Paket 15'in yayını bu düzeltmeye bağlıdır.

**Ayrıca gözden geçirilmeli** (değiştirilmedi): genel "kimlik bilgileri © OpenStreetMap" ifadeleri. İşletme kayıtları çoğaldıkça bunlar kısmen yanlış olur. Öneri: "Çoğu mekânın kimlik bilgisi © OpenStreetMap katkıcıları (ODbL); işletme kayıtları resmî kaynaktan."
- `components/home/RealVenues.tsx:54`
- `components/home/RealExplore.tsx:30`
- `components/layout/Footer.tsx:46`
- `components/venue/DataCompleteness.tsx:24`

## 3. Öneri: ikinci koordinat kaynağı (Overture Maps Places)
**Şema** (`RealVenueRecord.location`):
```ts
location?:
  | { provider: "osm"; ref: string; precision: "address" | "building" }
  | { provider: "overture"; ref: string /* GERS ID */; release: string /* "2026-10-21.0" */;
      precision: "poi"; confidence: number; dataset: string /* "meta" | "Foursquare" | ... */; license: string;
      crossCheck: { phone: true; district: true; distanceM: number } };
```

**Doğrulayıcı** (`invalidRecord`, işletme kaydı):
- `provider === "overture"` ise `ref`, `release`, `license` zorunlu;
- `confidence >= 0.9`;
- `crossCheck.phone && crossCheck.district && crossCheck.distanceM <= 100`;
- lat/lng İstanbul kutusunda.

**Atıf:**
- Profildeki konum satırında "Konum: Overture Maps Foundation, kaynak <dataset> (<license>)".
- Alt bilgide genel atıf.
- Foursquare kaynaklı noktalarda `NOTICE.txt` gereği.

**Güncelleme:**
- Overture aylık sürüm çıkarır; GERS ID kalıcıdır.
- Her yayın paketinde nokta yeniden çekilir. Telefon ya da ilçe uyumu bozulursa konum kaldırılır ve kayıt A-konumsuz'a döner.

**Testler:**
- `scripts/restoranpakettest.ts` paket 15 kuralları hazır (konumsuz kayıt).
- KO3 için eklenecekler: crossCheck zorunluluğu, lisans ve atıf, Google kaynaklı kayıt olmadığı.

**Kullanılmamalı:**
- Michelin koordinatı (rehber içeriği);
- Google verisi (puan sistemi dışında);
- kısaltılmış Google Haritalar bağlantılarından çıkarılan koordinat;
- kaynağı belirsiz Wikidata koordinatı;
- adres enterpolasyonu (sokak üzerinde tahmini nokta).

## 4. Hazır veri
- `data/paket/istanbul-15/overture-oneri.json`: 18 kayıt için GERS ID, nokta, güven, kaynak ve lisans, ilçe kontrolü, uyum mesafesi, öneri (16 kullanılabilir).
- Şema desteği gelirse bu 16 kaydın konumu tek adımda eklenebilir. O zamana kadar kayıtlar A-konumsuz kalır.
