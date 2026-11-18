# Katalog kalite envanteri — 792 mekân (2026-11-12)

Kaynak: `feature/investor-v1` @ `721b1a1` (Production kodu ve verisi, salt okunur). **Veri değiştirilmedi**; bu belge yalnız denetim sonucudur. Her kaydın sınıfı, konum güveni ve sorunları: `data/katalog/denetim/katalog-kalite-2026-11-12.json`.

**Yöntem:**
- Otomatik denetim (`scripts/katalog/katalog-denetim.ts`): 792 kaydın hepsi. Şema, ad, adres, ilçe sınırı, kategori/tür, faaliyet, kapanış, fotoğraf hakları, mükerrer.
- Resmî site erişimi (`scripts/katalog/site-erisim.mjs`): kayıtlı 472 bağlantı; yalnız durum kodu saklandı.
- Profil görünümü (`scripts/katalog/profil-denetim.mjs`): yerel Production derlemesinde (`next start`) 792 profil, arama, sitemap ve açıklama metinleri. Yerel ölçümdür, canlı site değildir.
- Gerçek tarayıcı: 6 temsilî profil, 375 px ve 1280 px, 9 kontrol (`gorsel-inceleme-2026-11-12.json`). Diğer profiller görsel olarak incelenmedi.

## 1. Kalite dağılımı

| Sınıf | Kayıt | Oran |
|---|---:|---:|
| inceleme gerekli | 432 | %54,5 |
| A | 223 | %28,2 |
| B1 | 102 | %12,9 |
| kapalı | 35 | %4,4 |

- **A:** kimlik + tarihli faaliyet kanıtı + kapı numaralı adres + kaynaklı tür + OSM koordinatı; sınıfı değiştiren sorunu yok.
- **B1:** 102 kaydın hepsi sokak düzeyinde (`adresDuzeyi: sokak`). Hiçbirinde kapı numarası yazılı değil; hepsinde profil uyarısı görünüyor. Kesin koordinat verilmedi.
- **A-konumsuz: 0.** Tek koordinatsız kayıt (Japon Erdal) tarihli faaliyet kanıtı olmadığı için incelemede.
- **Kapalı:** 35 kaydın kapanışı doğrulanmış. Profilde bildirim var, önerilerde yoklar.

**İnceleme gerekenlerin nedeni** (bir kayıtta birden çok olabilir):

| Neden | Kayıt |
|---|---:|
| faaliyet | 421 |
| tür | 144 |
| adres | 134 |
| kategori | 10 |
| mükerrer | 4 |
| konum | 1 |

- 139 kaydın tek eksiği tarihli faaliyet kanıtı (ilk OSM aktarımı, dalga 0–1). Bu kayıtlar hatalı değil; kanıt kayıt düzeyinde yok.
- Dalga 0–1'deki 456 kaydın hiçbirinde `verifiedAt` yok. Önceki kapanış denetimi Google görünümüne dayanıyordu; bugünkü standartta faaliyet kanıtı sayılmadı.

## 2. Konum güveni

| Konum güveni | Kayıt |
|---|---:|
| OSM öğesi noktası | 662 |
| yaklaşık (sokak düzeyi; kapı numarası doğrulanmadı) | 102 |
| yok (işletme kaydı, harita noktası gösterilmez) | 1 |
| adres (OSM) | 19 |
| bina (OSM) | 8 |

## 3. Bulgular ve önerilen işlem

| Bulgu | Kayıt | Önem | Önerilen işlem (karar sahibinde) |
|---|---:|---|---|
| B1 profillerinde 360° bağlantısı kesin koordinatla açılıyor (`map_action=pano&viewpoint=`) | 102 | Yüksek | PR #22'de kaldırılıyor; Codex yayınıyla çözülür. Veri değişikliği gerekmez. |
| Koordinatsız kayıtta "Konum OpenStreetMap adres verisinden" yazıyor | 1 | Orta | PR #14 (taslak) düzeltmesi; Codex'in yayın kararı. |
| Kapanma şüphesi (`closed_suspected`), elle inceleme bekliyor | 17 | Yüksek | Resmî kaynakla yeniden kontrol; kapalıysa `closed_confirmed`. |
| Tarihli faaliyet kanıtı yok (dalga 0–1) | 456 | Orta | Resmî site ya da OSM yerinde kontrol tarihiyle `verifiedAt` doldurma paketi (veri PR'ı, ayrı onay). |
| Genel tür ("Restoran", "Kafe", "Bar") | 159 | Orta | Paket 14 yöntemiyle resmî site ve menüden tür tamamlama. |
| Adres yok | 85 | Yüksek / orta | 39'u bilinçli olarak `sitemap-adressiz` listesinde; 46'sı sitemap dışında. Adres kurtarma paketi. |
| Kapı numarası yok (B1 dışı) | 54 | Orta | Resmî site adres doğrulaması (`adres-dogrula.mjs`); bulunamazsa B1 değerlendirmesi. |
| Resmî site açılmıyor | 136 | Orta | Durum: 403 → 3, 404 → 34, 429 → 1, 500 → 2, 504 → 2, 523 → 1, 526 → 1, bağlantı yok → 92. 403 ve bağlantı hataları bot engeli olabilir; elle bakılmadan kaldırılmamalı. |
| Resmî site yalnız http | 19 | Düşük | https sürümü denenmeli. |
| Tatlıcı restoran kategorisinde | 7 | Orta | Kafe/tatlı kategorisi önerisi; kategori değişikliği veri PR'ı. |
| Kafe kategorisinde restoran türü | 3 | Orta | Kaffa Miro, Artisan craft, Rucio Cafe: tür ya da kategori elle düzeltilmeli. |
| OSM amenity cafe ↔ restoran kategorisi (kahvaltı/tatlı) | 5 | Düşük | Kahvaltı salonları restoran kalabilir; tatlıcılar yukarıda. |
| Olası mükerrer çift | 2 | Yüksek | Beso Restaurant Bistro ↔ Byzantion Bistro (aynı telefon, aynı sokak; OSM noktaları 1,7 km ayrı); Ercan Burger ↔ Ercan Pizza (5 m, aynı adres). Elle karar. |
| Aynı ad ya da kurum, ayrı şube (mükerrer değil) | 9 | — | Burger Yiyelim, HD İskender, İBB Kent Lokantaları, Beykoz Belediyesi, Bedri Usta: en az 1,5 km ve farklı adres. |
| Koordinat ilçe çokgeni dışında | 1 | Düşük | Deniz Park (Sarıyer, kıyı noktası); ilçe doğru görünüyor. |
| Adda SEO eki, tamamı büyük harf ya da çok uzun | 14 | Düşük | Görünen adı sadeleştirme önerisi (OSM adı korunur). |
| Fotoğraf hakkı eksik | 0 | — | 4 izinli fotoğraf kaydı ve 2 Commons kapağında hak kaydı, lisans, atıf ve kaynak tam; dosyalar mevcut. 1 bekleyen (Savoy) yayında değil. |

## 4. Profil, arama ve SEO (yerel derleme)

| Ölçüm | Sonuç |
|---|---:|
| Profil 200 + ad + ilçe | 792/792 |
| Arama ilk 8 (ad ya da ad + semt) | 792/792 (9 şube adıyla) |
| Sitemap | 746/792 (dışarıdakiler: adresi olmayan 41 açık + 5 kapalı/şüpheli; tasarım gereği) |
| B1 uyarısı | 102/102 |
| Kapanış bildirimi | 35/35 |
| JSON-LD koordinatı | 604 (B1 ve adresi olmayan kayıtlarda bilinçli olarak yok; koordinatsız kayıtta yok) |

## 5. Kategori dağılımı

| Kategori | Kayıt |
|---|---:|
| cat.cafe | 114 |
| cat.restaurant | 667 |
| cat.bar | 11 |

