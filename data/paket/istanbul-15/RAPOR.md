# Paket 15 (pilot): koordinatsız işletme kaydı, Michelin

Kontrol tarihi: 2026-11-11 · Dal: `paket/istanbul-15-konumsuz-pilot` (paket 14'ün üstünde) · Kataloğa eklenmedi. Yayını Codex yapar; onay sahibindedir. **Yayın, profil metni düzeltmesine bağlıdır** (`duzeltme/konumsuz-profil-metni`).

## Neden
- Önceki paketlerde koordinat yalnız OSM'den alınabiliyordu ve koordinatsız restoran A olamıyordu.
- Oysa Production'daki şema, OSM'de olmayan restoranı resmî kaynakla ve koordinatsız olarak zaten destekliyor. Kayıt adresle açılıyor, harita noktası gösterilmiyor.
- Bu pakette o mekanizma kullanıldı.
- A sınıfının anlamı değişmedi. Bu kayıtlar ayrı ve açıkça adlandırılmış bir sınıfta: **A-konumsuz**. Ayrıntı `docs/katalog/KALITE-MODELI-ONERI.md`'de.

## Yıldızlı beş: neden alınamamıştı, şimdi ne durumda

| Restoran | Kimlik (resmî site) | Faaliyet | Adres | Tür | Koordinat |
|---|---|---|---|---|---|
| Arkestra | ad + telefon + sokak | Michelin 2026 ★ | Dilhayat Sokak No:28 | Füzyon | OSM yok · Overture ✓ (22 m) |
| Araka | ad + telefon + sokak | Michelin 2026 ★ | Kapalı Bakkal Sokak No:8 | Yaratıcı | OSM yok · Overture ✓ (11 m) |
| Araf İstanbul | ad + telefon | Michelin 2026 ★ | Sümko N Blok No:1 | Çağdaş | OSM yok · Overture ✓ (66 m) |
| Sankai by Nagaya | ad + telefon + sokak | Michelin 2026 ★ | Cevdet Paşa Caddesi No:34 | Japon | OSM yok · Overture ✓ (7 m) |
| Casa Lavanda | ad + telefon + sokak | Michelin 2026 ★ | Seçilmiş Sokak No:2 | Geleneksel | OSM yok · Overture ✓ (44 m) |

- **Tek eksik koordinattı.** Kimlik, faaliyet, adres ve tür kanıtı paket 10'dan beri tamdı. Paket kuralım koordinatı yalnız OSM'den kabul ettiği için elendiler. Bu kural uygulamanın değil, benim paket kuralımdı.
- **Bu paketle:** beşi de A-konumsuz olarak hazır. Profil adresli açılıyor, harita noktası gösterilmiyor.
- **Overture:** beşinin de kaydında telefon resmî siteyle aynı, nokta doğru ilçede ve rehber noktasına 7–66 m. Şema desteği gelirse konumları eklenebilir (`overture-oneri.json`).
- **Michelin yıldızlı kapsama:** 4/9'dan 9/9'a çıkar (5'i konumsuz).

## Paketin tamamı: 18 A-konumsuz kayıt
- **Seçim:** paket 12 inceleme havuzunda resmî sitede ad ile telefon ya da sokağı eşleşen 18 restoran.
- **Kayıtlar:**
  - yıldızlı beş;
  - Bib Gourmand: Parvus Kalamış, Tershane;
  - seçki: Aila, Eleos Yeşilköy, Herise, Kıyı, Lokanta Limu, Ruby, Spago, St. Regis Brasserie, Telezzüz, The BARN, The Red Balloon.
- **Michelin seçkisi kapsaması:** 51/85'ten 69/85'e çıkar (%81).
- **Her kayıtta:**
  - `ref: isletme/<slug>`, `sourceKind: official_site`, `sourceUrl` resmî site;
  - `lat/lng` ve `location` yok;
  - `kaliteSinifi: "A-konumsuz"` ve dört eksenli `kalite` alanı (kimlik, faaliyet, adres, koordinat);
  - kanıt metninde "koordinat yazılmadı" ve nedeni;
  - Michelin ayrımı rehber dosyasıyla birebir.

## Overture önerisi (kayda yazılmadı)
- **Kaynak:** Overture Maps Places 2026-10-21.0; çoğu kayıtta veri sağlayıcı Meta, lisans CDLA Permissive 2.0.
- **Yöntem:** eşleşme telefonla yapıldı. Rehber noktası yalnız uyum ölçümü için kullanıldı.
- **Sonuç:** 18 kaydın 16'sı dört ölçütü geçti (telefon, ilçe sınırı, ≤100 m, güven ≥0,9).
  - Ruby: Overture güveni 0,77, kullanılmamalı.
  - The Red Balloon: telefonla eşleşen Overture kaydı yok.

## Düzeltme: Michelin dosyası
`data/katalog/michelin-istanbul-2026.json` içinde Tershane'nin ilçesi "Hotel Momento 8th Floor (8. kat)" yazıyordu; "Beyoğlu" olarak düzeltildi. Paket 10'daki kayıtlar bu satırı kullanmadığı için etkilenmedi.

## Mükerrer kontrolü
- Karşılaştırılanlar: Production, paket 6–14, 906 ve seyrek-ilçeler dalları.
- Slug, ad + ilçe ve telefon üzerinden çakışma yok.
- Koordinatsız kayıtta 150 m testi uygulanamaz. Onun yerine "aynı ilçede aynı ad" testi var.

## Testler (yerel; GitHub Actions'a dokunulmadı)
- **`restoranpakettest` paket 15: 25/25.** Yeni kurallar:
  - lat/lng ve location yok;
  - ilçe geçerli İstanbul ilçesi;
  - kapı numaralı adres;
  - kanıtta koordinat açıklaması;
  - satırda sınıf A-konumsuz;
  - aynı ilçede aynı ad yok.
- **Diğer paketlerin testleri değişmedi:** paket 7, B1, 9, 10, 11, 12, 13 ve 14'ün hepsi yeşil. `tsc` ✓.
- **Yayın benzetimi** (yerel kopya; Production + paket 7–15; 792 koordinatlı + 18 koordinatsız = 810 mekân):
  - Test takımları geçti: bin1test, katalogtest, aramatest, seotest, anasayfatest, anasayfa8test, sortest. `next build` ✓.
  - Önizleme denetimi (profil, arama ilk 8, form, sitemap): 56/56.
  - Ek koordinatsız denetim:
    - 18 profil açılıyor; adres görünüyor;
    - OSM harita gömmesi yok;
    - JSON-LD'de koordinat yok;
    - hepsi sitemap'te.
  - Bu ek betikteki arama denetimi yanlış adresi (`/ara/?q=`) sorguladığı için geçersiz sayıldı. Arama, önizleme denetimiyle doğrulandı: 18/18.
  - Tarayıcıda görüldü (Arkestra profili): Konum bölümünde "harita noktası henüz yok; yerini adresle ara".
    - Düzeltme öncesi bilgi satırında yanlış bir "Konum OpenStreetMap adres verisinden" atfı vardı.
    - Düzeltmeyle "Doğrulanmış harita konumu yok; adres resmî kaynaktan" oldu.
    - OSM konumlu işletme kaydında (Topaz) metin değişmedi.
- **Vercel Preview:** Neon dal sınırı nedeniyle açılamıyor ve yeniden denenmedi.
