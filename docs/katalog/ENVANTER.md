# İstanbul katalog envanteri — 10 Kasım 2026

Üretim: `scripts/katalog/envanter.mjs` ve `scripts/katalog/katalog-kalite.mjs` (yeniden üretilebilir; ham OSM verisi repoya girmez).

**Kaynaklar:**
- Katalog: `data/real/venues.json` + `isletme.json`.
- OSM evreni: Overpass, `timestamp_osm_base` 2026-11-10 20:20 UTC. 12.859 adlı yeme-içme noktası; 12.092'si İstanbul'un 39 ilçe sınırı içinde.
- İlçe sınırları: OSM admin_level=6.
- Nüfus: TÜİK ADNKS 2025.
- "Google" sütunu: canlı profillerde puanın görünüp görünmediği (salt okunur tarama, 456 profil).

## Sütunlar
- **Tam adres:** adreste kapı numarası var.
- **Kaynaklı tür:** OSM `cuisine` / `amenity` ya da resmî site; addan çıkarılmaz.
- **Addan tür:** gösterilen tür yalnız mekânın adından türemiş, kaynakta yok.
- **Görsel:** izinli ya da açık lisanslı fotoğraf.
- **Dolu profil:** tam adres + kaynaklı tür + harita + iletişim + çalışma saati, kalıcı kapalı değil.
- **Kapsama:** katalog ÷ ilçedeki zincir olmayan OSM noktası. OSM'nin eksik olduğu yerde gerçek yoğunluk daha yüksektir.
- **A/B/C:** `lib/katalog/kalite.ts`.

## 906 paketinin doğrulanmış durumu

`feature/yayin-906` @ c57ae42: 456 yayında + dalga 2/3/4 = 140/104/206.

**Sonuç:**
- Bütün dal: A 270 · B 582 · C 55.
- Yayında olmayan 450 kayıt: C yok; A 64 · B 386.
- B'lerin eksikleri: kapı numarası 267, mutfak türü (kaynakta yok) 245, bağımsız kimlik/faaliyet doğrulaması 18.
- 432 kaydın kimliği ve konumu bu dalın kendi eşiğiyle doğrulanmış: Google sayfası ölçümü ≤ 60 m, ad benzerliği ≥ 0,8, kalıcı kapalı değil.
- 18 kayıtta ölçüm bu eşiğin dışında; elle bakılmalı.
- B olmalarının asıl nedeni tür ya da kapı numarası eksikliği.
- Önerilen sıra korunur: 140 → 104 → 206.

**Mükerrer çiftler (katalog içi, C):**
- beso-restaurant-bistro-fatih — katalog_ici_cift:byzantion-bistro-ve-restaurant-fatih(tel)
- byzantion-bistro-ve-restaurant-fatih — katalog_ici_cift:beso-restaurant-bistro-fatih(tel)
- ercan-burger-pendik — kapanis_suphesi, katalog_ici_cift:ercan-pizza-pendik(5m)
- ercan-pizza-pendik — katalog_ici_cift:ercan-burger-pendik(5m)

**Yayındaki 457 kayıt:** A 206 · B 196 · C 55.
- C nedenleri: kapanis_suphesi 17, kalici_kapali_kaydi 35, katalog_ici_cift 4.
- Gösterilen türü yalnız addan gelen kayıt: 30.

### Production (5509aee, canlı): 457 kayıt · OSM 2026-11-10

| İlçe | Nüfus | Toplam | Rest. | Kafe | Bar | Tam adres | Koord. | Kaynaklı tür | Addan tür | Google | Kapalı | Şüpheli | Görsel | Dolu profil | A/B/C | OSM evreni | Kapsama |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|
| Beyoğlu | 215.991 | 44 | 37 | 6 | 1 | 35 | 43 | 37 | 2 | 35 | 1 | 2 | 2 | 15 | 25/16/3 | 935 | 4.7% |
| Kadıköy | 458.573 | 43 | 37 | 5 | 1 | 35 | 43 | 36 | 6 | 30 | 5 | 2 | 1 | 22 | 23/13/7 | 1529 | 2.8% |
| Beşiktaş | 165.895 | 39 | 34 | 3 | 2 | 33 | 39 | 35 | 2 | 25 | 4 | 5 | 0 | 24 | 21/9/9 | 391 | 10% |
| Fatih | 351.786 | 35 | 33 | 2 | 0 | 26 | 35 | 33 | 0 | 26 | 0 | 2 | 0 | 21 | 20/11/4 | 2149 | 1.6% |
| Sarıyer | 344.883 | 32 | 29 | 3 | 0 | 24 | 32 | 31 | 0 | 21 | 4 | 1 | 0 | 16 | 15/12/5 | 276 | 11.6% |
| Şişli | 261.959 | 32 | 26 | 6 | 0 | 24 | 32 | 30 | 0 | 25 | 5 | 0 | 0 | 14 | 18/9/5 | 277 | 11.6% |
| Ataşehir | 412.125 | 28 | 28 | 0 | 0 | 18 | 28 | 16 | 9 | 19 | 1 | 1 | 0 | 5 | 8/18/2 | 401 | 7% |
| Üsküdar | 514.294 | 23 | 17 | 6 | 0 | 19 | 23 | 17 | 3 | 20 | 1 | 0 | 2 | 9 | 13/9/1 | 249 | 9.2% |
| Pendik | 752.033 | 20 | 20 | 0 | 0 | 9 | 20 | 17 | 2 | 15 | 0 | 1 | 0 | 7 | 6/12/2 | 445 | 4.5% |
| Bakırköy | 218.204 | 15 | 13 | 2 | 0 | 9 | 15 | 11 | 1 | 12 | 1 | 0 | 1 | 7 | 6/8/1 | 160 | 9.4% |
| Beykoz | 246.833 | 14 | 13 | 1 | 0 | 11 | 14 | 10 | 1 | 8 | 2 | 0 | 0 | 6 | 4/8/2 | 142 | 9.9% |
| Maltepe | 525.044 | 12 | 12 | 0 | 0 | 6 | 12 | 10 | 2 | 9 | 1 | 0 | 0 | 3 | 3/8/1 | 346 | 3.5% |
| Ümraniye | 728.913 | 11 | 11 | 0 | 0 | 11 | 11 | 9 | 0 | 8 | 2 | 1 | 0 | 7 | 7/1/3 | 175 | 6.3% |
| Eyüpsultan | 425.216 | 9 | 7 | 2 | 0 | 4 | 9 | 9 | 0 | 5 | 0 | 0 | 0 | 3 | 2/7/0 | 145 | 6.2% |
| Adalar | 17.489 | 8 | 7 | 1 | 0 | 2 | 8 | 6 | 0 | 8 | 0 | 0 | 0 | 2 | 2/6/0 | 101 | 7.9% |
| Kartal | 475.630 | 8 | 7 | 1 | 0 | 5 | 8 | 8 | 0 | 4 | 1 | 0 | 0 | 4 | 2/5/1 | 310 | 2.6% |
| Beylikdüzü | 422.988 | 7 | 7 | 0 | 0 | 3 | 7 | 7 | 0 | 3 | 1 | 0 | 0 | 1 | 2/4/1 | 80 | 8.8% |
| Avcılar | 440.663 | 6 | 6 | 0 | 0 | 2 | 6 | 5 | 0 | 4 | 0 | 0 | 0 | 0 | 0/6/0 | 101 | 5.9% |
| Bahçelievler | 539.035 | 6 | 6 | 0 | 0 | 3 | 6 | 5 | 0 | 6 | 0 | 0 | 0 | 2 | 3/3/0 | 74 | 8.1% |
| Başakşehir | 536.797 | 6 | 6 | 0 | 0 | 4 | 6 | 5 | 0 | 4 | 2 | 0 | 0 | 2 | 2/2/2 | 88 | 6.8% |
| Bayrampaşa | 272.978 | 6 | 6 | 0 | 0 | 6 | 6 | 4 | 0 | 4 | 0 | 1 | 0 | 3 | 3/2/1 | 60 | 10% |
| Çatalca | 81.143 | 6 | 6 | 0 | 0 | 1 | 6 | 3 | 1 | 5 | 1 | 0 | 0 | 1 | 1/4/1 | 65 | 9.2% |
| Arnavutköy | 358.469 | 5 | 5 | 0 | 0 | 2 | 5 | 4 | 0 | 2 | 0 | 0 | 0 | 1 | 1/4/0 | 68 | 7.4% |
| Büyükçekmece | 283.239 | 5 | 5 | 0 | 0 | 5 | 5 | 3 | 0 | 5 | 0 | 0 | 0 | 3 | 3/2/0 | 205 | 2.4% |
| Küçükçekmece | 785.270 | 5 | 5 | 0 | 0 | 4 | 5 | 5 | 0 | 3 | 1 | 0 | 0 | 2 | 2/2/1 | 110 | 4.5% |
| Şile | 50.090 | 5 | 5 | 0 | 0 | 1 | 5 | 4 | 0 | 3 | 0 | 0 | 0 | 1 | 1/4/0 | 58 | 8.6% |
| Zeytinburnu | 275.471 | 5 | 5 | 0 | 0 | 5 | 5 | 3 | 0 | 4 | 0 | 0 | 0 | 3 | 3/2/0 | 303 | 1.7% |
| Çekmeköy | 315.959 | 3 | 3 | 0 | 0 | 1 | 3 | 2 | 1 | 2 | 1 | 0 | 0 | 1 | 1/1/1 | 68 | 4.4% |
| Esenyurt | 1.003.905 | 3 | 3 | 0 | 0 | 1 | 3 | 3 | 0 | 1 | 0 | 1 | 0 | 1 | 1/1/1 | 90 | 3.3% |
| Sancaktepe | 507.500 | 3 | 3 | 0 | 0 | 2 | 3 | 3 | 0 | 3 | 0 | 0 | 0 | 2 | 2/1/0 | 117 | 2.6% |
| Silivri | 240.029 | 3 | 3 | 0 | 0 | 2 | 3 | 2 | 0 | 3 | 0 | 0 | 0 | 1 | 1/2/0 | 124 | 2.4% |
| Tuzla | 313.865 | 3 | 3 | 0 | 0 | 1 | 3 | 3 | 0 | 2 | 1 | 0 | 0 | 0 | 1/1/1 | 136 | 2.2% |
| Gaziosmanpaşa | 478.395 | 2 | 2 | 0 | 0 | 2 | 2 | 2 | 0 | 2 | 0 | 0 | 0 | 2 | 2/0/0 | 82 | 2.4% |
| Kağıthane | 446.420 | 2 | 2 | 0 | 0 | 1 | 2 | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 1/1/0 | 62 | 3.2% |
| Bağcılar | 707.635 | 1 | 1 | 0 | 0 | 0 | 1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0/1/0 | 392 | 0.3% |
| Güngören | 251.242 | 1 | 1 | 0 | 0 | 1 | 1 | 1 | 0 | 1 | 0 | 0 | 0 | 1 | 1/0/0 | 29 | 3.4% |
| Sultanbeyli | 378.908 | 1 | 1 | 0 | 0 | 0 | 1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0/1/0 | 323 | 0.3% |
| Esenler | 419.878 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0 | 25 | 0% |
| Sultangazi | 529.306 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0 | 90 | 0% |
| **Toplam** | | **457** | 415 | 38 | 4 | 318 (70%) | 456 | 382 (84%) | 30 | 331 | 35 | 17 | 6 | 192 (42%) | 206/196/55 | 10781 | 4% |

**Mutfak etiketleri (kaynaklı, çoklu):** Türk mutfağı 201 · kaynakta tür yok 75 · Balık ve deniz ürünleri 61 · Kebap ve ocakbaşı 58 · Kafe 55 · Pizza ve İtalyan 47 · Et ve steakhouse 32 · Burger 30 · Diğer dünya mutfakları 24 · Kahvaltı ve brunch 23 · Tavuk 16 · Çin, Kore, Tayland ve diğer Asya 15 · Sokak lezzetleri (köfte, kokoreç, dürüm…) 12 · Pastane ve tatlıcı 11 · Japon, sushi ve ramen 10 · Fırın ve börek 5 · Bar 4 · Pide ve lahmacun 3 · Döner 2 · Esnaf lokantası / ev yemekleri 2 · Meyhane 1 · Vegan / vejetaryen 1

**En zayıf semtler (~1 km hücre, OSM'de ≥ 40 nokta):**

| İlçe | Semt | OSM noktası | Katalog | Oran |
|---|---|---:|---:|---:|
| Fatih | (adsız) | 109 | 0 | 0% |
| Fatih | Şehremini Mahallesi | 92 | 0 | 0% |
| Maltepe | bağlarbaşı mahallesi | 90 | 0 | 0% |
| Fatih | (adsız) | 63 | 0 | 0% |
| Kadıköy | Rasimpaşa Mahallesi | 60 | 0 | 0% |
| Kartal | Kordonboyu Mahallesi | 57 | 0 | 0% |
| Fatih | Şehremini Mahallesi | 55 | 0 | 0% |
| Pendik | Batı Mahallesi | 54 | 0 | 0% |
| Sultanbeyli | (adsız) | 54 | 0 | 0% |
| Kadıköy | Feneryolu Mahallesi | 51 | 0 | 0% |
| Sultanbeyli | (adsız) | 51 | 0 | 0% |
| Fatih | (adsız) | 50 | 0 | 0% |
| Sancaktepe | Atatürk | 47 | 0 | 0% |
| Silivri | (adsız) | 46 | 0 | 0% |
| Bağcılar | (adsız) | 46 | 0 | 0% |
| Bağcılar | Hürriyet Mah. | 45 | 0 | 0% |
| Büyükçekmece | (adsız) | 43 | 0 | 0% |
| Fatih | Katip Kasım Mahallesi | 204 | 1 | 0.5% |
| Fatih | Molla Gürani Mahallesi | 155 | 1 | 0.6% |
| Fatih | (adsız) | 123 | 1 | 0.8% |

### 906 dalı (feature/yayin-906 c57ae42, Preview): 907 kayıt · OSM 2026-11-10

| İlçe | Nüfus | Toplam | Rest. | Kafe | Bar | Tam adres | Koord. | Kaynaklı tür | Addan tür | Google | Kapalı | Şüpheli | Görsel | Dolu profil | A/B/C | OSM evreni | Kapsama |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|
| Kadıköy | 458.573 | 154 | 148 | 5 | 1 | 121 | 154 | 82 | 24 | 30 | 5 | 2 | 1 | 29 | 54/93/7 | 1529 | 10.1% |
| Fatih | 351.786 | 87 | 85 | 2 | 0 | 36 | 87 | 46 | 24 | 26 | 0 | 2 | 0 | 24 | 25/58/4 | 2149 | 4% |
| Ataşehir | 412.125 | 65 | 65 | 0 | 0 | 37 | 65 | 27 | 15 | 19 | 1 | 1 | 0 | 5 | 11/52/2 | 401 | 16.2% |
| Beyoğlu | 215.991 | 64 | 57 | 6 | 1 | 44 | 63 | 50 | 3 | 35 | 1 | 2 | 2 | 17 | 31/30/3 | 935 | 6.8% |
| Beşiktaş | 165.895 | 57 | 52 | 3 | 2 | 47 | 57 | 44 | 6 | 25 | 4 | 5 | 0 | 31 | 26/22/9 | 391 | 14.6% |
| Pendik | 752.033 | 51 | 51 | 0 | 0 | 20 | 51 | 31 | 6 | 15 | 0 | 1 | 0 | 7 | 6/43/2 | 445 | 11.5% |
| Şişli | 261.959 | 42 | 36 | 6 | 0 | 28 | 42 | 37 | 0 | 25 | 5 | 0 | 0 | 14 | 20/17/5 | 277 | 15.2% |
| Sarıyer | 344.883 | 40 | 37 | 3 | 0 | 26 | 40 | 36 | 1 | 21 | 4 | 1 | 0 | 17 | 16/19/5 | 276 | 14.5% |
| Üsküdar | 514.294 | 31 | 25 | 6 | 0 | 23 | 31 | 21 | 4 | 20 | 1 | 0 | 2 | 9 | 14/16/1 | 249 | 12.4% |
| Maltepe | 525.044 | 27 | 27 | 0 | 0 | 8 | 27 | 21 | 3 | 9 | 1 | 0 | 0 | 3 | 4/22/1 | 346 | 7.8% |
| Kartal | 475.630 | 24 | 23 | 1 | 0 | 7 | 24 | 22 | 2 | 4 | 1 | 0 | 0 | 4 | 3/20/1 | 310 | 7.7% |
| Bakırköy | 218.204 | 20 | 18 | 2 | 0 | 10 | 20 | 15 | 1 | 12 | 1 | 0 | 1 | 7 | 6/13/1 | 160 | 12.5% |
| Ümraniye | 728.913 | 20 | 20 | 0 | 0 | 14 | 20 | 12 | 5 | 8 | 2 | 1 | 0 | 7 | 8/9/3 | 175 | 11.4% |
| Bağcılar | 707.635 | 18 | 18 | 0 | 0 | 0 | 18 | 1 | 9 | 1 | 0 | 0 | 0 | 0 | 0/18/0 | 392 | 4.6% |
| Beykoz | 246.833 | 17 | 16 | 1 | 0 | 13 | 17 | 13 | 1 | 8 | 2 | 0 | 0 | 6 | 6/9/2 | 142 | 12% |
| Zeytinburnu | 275.471 | 16 | 16 | 0 | 0 | 6 | 16 | 4 | 5 | 4 | 0 | 0 | 0 | 3 | 4/12/0 | 303 | 5.3% |
| Sultanbeyli | 378.908 | 15 | 15 | 0 | 0 | 1 | 15 | 3 | 7 | 1 | 0 | 0 | 0 | 0 | 0/15/0 | 323 | 4.6% |
| Eyüpsultan | 425.216 | 13 | 11 | 2 | 0 | 4 | 13 | 12 | 1 | 5 | 0 | 0 | 0 | 3 | 2/11/0 | 145 | 9% |
| Tuzla | 313.865 | 12 | 12 | 0 | 0 | 5 | 12 | 8 | 1 | 2 | 1 | 0 | 0 | 1 | 2/9/1 | 136 | 8.8% |
| Adalar | 17.489 | 10 | 9 | 1 | 0 | 2 | 10 | 7 | 0 | 8 | 0 | 0 | 0 | 2 | 2/8/0 | 101 | 9.9% |
| Bayrampaşa | 272.978 | 10 | 10 | 0 | 0 | 9 | 10 | 6 | 0 | 4 | 0 | 1 | 0 | 3 | 4/5/1 | 60 | 16.7% |
| Beylikdüzü | 422.988 | 10 | 10 | 0 | 0 | 3 | 10 | 9 | 1 | 3 | 1 | 0 | 0 | 1 | 2/7/1 | 80 | 12.5% |
| Gaziosmanpaşa | 478.395 | 9 | 9 | 0 | 0 | 4 | 9 | 7 | 1 | 2 | 0 | 0 | 0 | 2 | 3/6/0 | 82 | 11% |
| Şile | 50.090 | 9 | 9 | 0 | 0 | 1 | 9 | 7 | 1 | 3 | 0 | 0 | 0 | 1 | 1/8/0 | 58 | 15.5% |
| Arnavutköy | 358.469 | 8 | 8 | 0 | 0 | 2 | 8 | 6 | 0 | 2 | 0 | 0 | 0 | 1 | 1/7/0 | 68 | 11.8% |
| Avcılar | 440.663 | 8 | 8 | 0 | 0 | 2 | 8 | 7 | 0 | 4 | 0 | 0 | 0 | 0 | 0/8/0 | 101 | 7.9% |
| Başakşehir | 536.797 | 8 | 8 | 0 | 0 | 4 | 8 | 7 | 0 | 4 | 2 | 0 | 0 | 2 | 2/4/2 | 88 | 9.1% |
| Büyükçekmece | 283.239 | 8 | 8 | 0 | 0 | 5 | 8 | 6 | 0 | 5 | 0 | 0 | 0 | 3 | 3/5/0 | 205 | 3.9% |
| Küçükçekmece | 785.270 | 8 | 8 | 0 | 0 | 4 | 8 | 7 | 0 | 3 | 1 | 0 | 0 | 2 | 2/5/1 | 110 | 7.3% |
| Bahçelievler | 539.035 | 7 | 7 | 0 | 0 | 3 | 7 | 6 | 0 | 6 | 0 | 0 | 0 | 2 | 3/4/0 | 74 | 9.5% |
| Çatalca | 81.143 | 7 | 7 | 0 | 0 | 2 | 7 | 3 | 1 | 5 | 1 | 0 | 0 | 1 | 1/5/1 | 65 | 10.8% |
| Esenyurt | 1.003.905 | 7 | 7 | 0 | 0 | 2 | 7 | 6 | 0 | 1 | 0 | 1 | 0 | 1 | 1/5/1 | 90 | 7.8% |
| Sancaktepe | 507.500 | 6 | 6 | 0 | 0 | 3 | 6 | 6 | 0 | 3 | 0 | 0 | 0 | 2 | 3/3/0 | 117 | 5.1% |
| Silivri | 240.029 | 6 | 6 | 0 | 0 | 2 | 6 | 3 | 0 | 3 | 0 | 0 | 0 | 1 | 1/5/0 | 124 | 4.8% |
| Çekmeköy | 315.959 | 4 | 4 | 0 | 0 | 1 | 4 | 3 | 1 | 2 | 1 | 0 | 0 | 1 | 1/2/1 | 68 | 5.9% |
| Sultangazi | 529.306 | 4 | 4 | 0 | 0 | 0 | 4 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0/4/0 | 90 | 4.4% |
| Güngören | 251.242 | 2 | 2 | 0 | 0 | 1 | 2 | 2 | 0 | 1 | 0 | 0 | 0 | 1 | 1/1/0 | 29 | 6.9% |
| Kağıthane | 446.420 | 2 | 2 | 0 | 0 | 1 | 2 | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 1/1/0 | 62 | 3.2% |
| Esenler | 419.878 | 1 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0/1/0 | 25 | 4% |
| **Toplam** | | **907** | 865 | 38 | 4 | 501 (55%) | 906 | 587 (65%) | 123 | 331 | 35 | 17 | 6 | 213 (23%) | 270/582/55 | 10781 | 8% |

**Mutfak etiketleri (kaynaklı, çoklu):** Türk mutfağı 321 · kaynakta tür yok 320 · Kebap ve ocakbaşı 81 · Balık ve deniz ürünleri 79 · Pizza ve İtalyan 64 · Kafe 57 · Et ve steakhouse 41 · Burger 38 · Diğer dünya mutfakları 33 · Kahvaltı ve brunch 27 · Çin, Kore, Tayland ve diğer Asya 22 · Tavuk 21 · Japon, sushi ve ramen 19 · Sokak lezzetleri (köfte, kokoreç, dürüm…) 14 · Pastane ve tatlıcı 13 · Fırın ve börek 5 · Pide ve lahmacun 5 · Bar 4 · Döner 3 · Esnaf lokantası / ev yemekleri 3 · Meyhane 1 · Vegan / vejetaryen 1

**En zayıf semtler (~1 km hücre, OSM'de ≥ 40 nokta):**

| İlçe | Semt | OSM noktası | Katalog | Oran |
|---|---|---:|---:|---:|
| Büyükçekmece | (adsız) | 43 | 0 | 0% |
| Büyükçekmece | Fatıh Mahallesi | 71 | 1 | 1.4% |
| Fatih | (adsız) | 109 | 2 | 1.8% |
| Sultanbeyli | (adsız) | 54 | 1 | 1.9% |
| Fatih | (adsız) | 52 | 1 | 1.9% |
| Fatih | (adsız) | 50 | 1 | 2% |
| Sancaktepe | Atatürk | 47 | 1 | 2.1% |
| Silivri | (adsız) | 46 | 1 | 2.2% |
| Bağcılar | Hürriyet Mah. | 45 | 1 | 2.2% |
| Fatih | Katip Kasım Mahallesi | 204 | 5 | 2.5% |
| Fatih | Molla Gürani Mahallesi | 155 | 4 | 2.6% |
| Fatih | Balat | 77 | 2 | 2.6% |
| Kadıköy | Caferağa Mahallesi | 167 | 5 | 3% |
| Maltepe | bağlarbaşı mahallesi | 90 | 3 | 3.3% |
| Kadıköy | Rasimpaşa Mahallesi | 60 | 2 | 3.3% |
| Fatih | (adsız) | 208 | 7 | 3.4% |
| Fatih | (adsız) | 141 | 5 | 3.5% |
| Fatih | Küçük Ayasofya, Kennedy Cad. No:44, Sultanahmet | 51 | 2 | 3.9% |
| Fatih | (adsız) | 49 | 2 | 4.1% |
| Fatih | Şehremini Mahallesi | 92 | 4 | 4.3% |
