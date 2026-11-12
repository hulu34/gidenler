# İstanbul restoran B1 paketi (dalga 8) — 2026-11-11

**Sahip onayı (2026-11-11):** kapı numarası olmayan, sokak düzeyinde adresli restoranlar ayrı paket olarak hazırlanır.

**Bu kayıtlar A değildir.** Her kayıtta şu alanlar var:
- `kaliteSinifi: "B1"`, `adresDuzeyi: "sokak"`, `confidence: "orta"`;
- kanıtta adres düzeyi ve sahip onayı yazılı.

**Kayıtlar `venues.json`'a eklenmedi.** Kataloğa ekleme yayın paketinde yapılır; Codex'in ve sahibin onayına bağlıdır.

| Kalem | Sayı |
|---|---:|
| B1 restoran | 102 |
| Mahalle bilgisi olan | 102 |
| Mükerrer ya da yakın aynı ad nedeniyle elenen | 0 |
| Zincir şubesi (resmî şube sayfası kanıtlı; slug'da mahalle) | 12 |

**İlçeler:** Beyoğlu 39, Üsküdar 10, Fatih 9, Kadıköy 7, Sancaktepe 6, Beşiktaş 4, Şişli 4, Ataşehir 4, Arnavutköy 4, Tuzla 3, Pendik 2, Esenyurt 2, Sarıyer 2, Çekmeköy 1, Bağcılar 1, Küçükçekmece 1, Ümraniye 1, Maltepe 1, Şile 1.

**Türler:** Türk mutfağı 34, Kebapçı / Ocakbaşı 22, Balık restoranı 16, Pizza 9, Burger 7, Asya mutfağı 3, Tavuk 3, Sushi / Japon 3, Sokak lezzeti 2, Dünya mutfağı 1, Dönerci 1, Steakhouse 1.

**Faaliyet kanıtı** (ilk kanıta göre): yerinde kontrol 61, anket 27, şube sayfası 7, İBB 5, resmî site 2.

**Kurallar:**
- Faaliyet kanıtı tarihli ve güçlü. Kaynaklar paket 7'dekilerle aynı: OSM yerinde kontrol ≥ 2025-01, OSM son düzenleme yerinde anket uygulamasıyla 2025+, markanın resmî şube sayfası, İBB Açık Veri listesi.
- Tür kaynaktan geliyor.
- Adres sokak + mahalle + ilçe düzeyinde: OSM kaydından ya da OSM ters konumdan. Koordinat OSM'den.

**Mükerrer kontrolü:**
- Karşılaştırma: Production + PR #4, 906 dalı, seyrek paketi, paket 7.
- Kurallar: aynı OSM kaydı, slug, aynı ad ya da yazım farkı 150 m içinde.
- Sonuç: slug ve OSM kaydı çakışması 0.

**Eksikler** (yayında boş gösterilmez): kapı numarası, çoğunda telefon ve çalışma saati.

**Test:** `PAKET=data/paket/istanbul-8-b1 ADRES_DUZEYI=sokak npx tsx scripts/restoranpakettest.ts`.
