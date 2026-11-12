# Paket 12 — Michelin eksiklerinin tamamlanması

Kontrol tarihi: 2026-11-11 · Dal: `paket/istanbul-12-michelin-tamamlama` (paket 11'in üstünde) · Kataloğa eklenmedi. Yayını Codex yapar; onay sahibindedir.

## Ne yapıldı
Paket 10'un inceleme havuzundaki 39 restoran yeniden değerlendirildi. Yeni kaynaklar:
- **Taze OSM** (Overpass, 2026-11-11T14:45Z): rehber noktasının 300 m çevresindeki tüm yeme-içme, turizm ve adlı bina kayıtları.
  - Bu kez `name` etiketi olmayan, yalnız `name:en` taşıyan kayıtlar da tarandı.
  - Rehber koordinatı yalnız eşleştirme için kullanıldı; kayda yazılmadı.
- **OSM adres noktaları:** 37.786 nokta, rehber noktasına 1,5 km içinde. Sokak adları esnek eşleştirildi (Cevdet Paşa / Cevdetpaşa, kısaltmalar, kapı numarası ekleri).
- **OSM'de telefon ve site alanı eşleşmesi.**
- **İBB Açık Veri:** kapı numarası ya da bina konumu veri seti yok.
- **Wikidata:** yıldızlılardan dördünün koordinatı var. Kaynağı belirsiz; Casa Lavanda'nın koordinatı rehberdekiyle birebir aynı. Bu yüzden koordinat kaynağı sayılmadı.

## Sonuç
| | Sayı |
|---|---:|
| **Yeni A (bu paket)** | **5** (4 OSM + 1 işletme kaydı) |
| İncelemede kalan | 34 |

| Restoran | Ayrım | İlçe | Konum kanıtı |
|---|---|---|---|
| Park Fora | Rehber seçkisi | Beşiktaş | OSM restoran kaydı node/4779993130 (tam adres, aynı telefon ve site; `name` yok, `name:en` var) |
| Sade Beş Denizler Mutfağı | Bib Gourmand | Şişli | OSM restoran kaydı node/6831046889 (`name:en` "Sade 5 continents food", rehber noktasına 2 m) |
| Tatbak | Bib Gourmand | Şişli | OSM restoran kaydı node/6831047086 (`name:en` "Tatbak 1960", 3 m) |
| Ali Ocakbaşı Karaköy | Bib Gourmand | Beyoğlu | OSM restoran kaydı node/9517184617 (`name:en` "Ali Ocakbasi Karakoy", 11 m); resmî şube sayfasında telefon rehberle aynı |
| Itsumi (Levent) | Rehber seçkisi | Beşiktaş | OSM bina kaydı İş Kuleleri way/156828999 (bina düzeyi); resmî iletişim sayfasında Kule 2 No:43 + telefon |

**Michelin kapsaması** (paket 10 ve 12 ile):

| | Önce | Şimdi |
|---|---:|---:|
| Tüm seçki | 46/85 | 51/85 (%60) |
| Bib Gourmand | 8/16 | 11/16 |
| Yıldızlı | 4/9 | 4/9 |

## Yıldızlı beş restoran neden hâlâ A değil
Arkestra, Araka, Araf, Sankai by Nagaya ve Casa Lavanda'nın resmî siteleri ve rehber kayıtları doğru. Ama açık kaynakta konum yok:
- Taze OSM'de 300 m içinde restoran kaydı yok; `name:en` taraması da sonuç vermedi.
- Kapı numaralı adres noktası yok.
- Bina kaydı yok (Bebek Hotel, Sümko N Blok).

Koordinatsız kayıt katalogda gösterilemez. Kanıt standardı düşürülmedi. İki yol var:
1. OSM'ye nokta eklenmesi (açık kaynak katkısı). Bu dışarıya yayın sayılır; yapılmadı.
2. Sahip onayıyla yerinde kontrol.

## İncelemede kalan diğerleri (`inceleme.json`, her satırda `yenidenDegerlendirme`)
- **OSM'de bina var ama resmî sayfa 403 ya da 404** (atlatılmadı): AQUA, Avlu (Four Seasons), Akira Back (JW Marriott), Monteverdi (Conrad).
- **Kimlik yalnız rehberde:** Basta Neo Bistro, Monteverdi. Adres noktası var, resmî site yok.
- **Resmî sitede tam adres ve telefon var, OSM'de kapı numarası yok:** Ruby.
- **Resmî şube sayfasında adres yok:** Seraf Mahmutbey, Seraf Vadi.

## Mükerrer kontrolü
Karşılaştırılanlar: Production, paket 6, 7, B1, 9, 10, 11, 906 ve seyrek-ilçeler dalları. Çakışma yok.
- 906 ve seyrek dahil test: 22/22.
- **Ali Ocakbaşı:** markanın üç şubesi ayrı.
  - Suadiye Production'da.
  - Gümüşsuyu 906 dalında; resmî sayfada adresi yok, bu pakete alınmadı.
  - Karaköy bu pakette.

## Yan bulgu: `name:en`'li OSM kayıtları
OSM'de bazı restoranların `name` etiketi yok, yalnız `name:en` var. Bu kayıtlar 10 Kasım çekiminde ve havuzda hiç görünmüyordu. Bütün İstanbul için ayrı bir aday havuzu olarak taranmaları önerilir.

## Testler (yerel; GitHub Actions'a dokunulmadı)
- `restoranpakettest` paket 12: 22/22. Michelin ayrımı rehberle birebir; yıldız ifadesi yok.
- **Yayın benzetimi** (yalnız yerel kopyada): paket 7, B1, 9, 10, 11 ve 12 eklendi; 770 mekân.
  - Geçen testler: bin1test 17/17, katalogtest 52/52, aramatest 49/49, seotest 49/49, anasayfatest 31/31, anasayfa8test 33/33, sortest 322/322.
  - `next build` geçti.
  - Yerel sunucuda profil, arama (ilk 8), deneyim formu ve sitemap denetimi: OSM kayıtlarında 14/14, işletme kaydında 5/5.
- **İzole Preview hakkında:** Vercel Preview veritabanı (Neon dal sınırı) bu ortamda açılamıyor. Talimat gereği yeniden denenmedi. İzole önizleme yukarıdaki yerel kopyada yapıldı.
