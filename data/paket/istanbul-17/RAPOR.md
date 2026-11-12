# Paket 17: Overture keşfi (250 aday)

Kontrol: 2026-11-11 · Dal: `paket/istanbul-17-overture` (taban: paket 16) · Kataloğa eklenmedi.

**Kalite düzeltmesi (2026-11-12):** Overture adres metninden yazılan sokak + kapı no resmî sitede birlikte yeniden arandı (`scripts/katalog/adres-dogrula.mjs`). Bulunamayan 6 A-konumsuz kayıt B'ye indi; ayrıntı `paket.json` → `kaliteDuzeltmesi` ve `inceleme.json`.

**Havuz:**
- Paket 16'da incelenmeyen ve kimliği eşleşen adaylar.
- Sitesi ilk ölçümde açılmayan 3.001 adayın yeniden ölçümü (8 eşzamanlı, 25 sn zaman aşımı); 959 site açıldı.

**Uygulananlar:**
- Tür, resmî site ya da menüden alındı. `tur-karar.json`: 27 aday menüyle doğrulandı.
- Elle karar (`elle-karar.json`):
  - 5 B: bakım sayfası, pub/kafe karışık, park, kasap satış, karışık tür;
  - 5 C: su ürünleri, et ve balıkçılık firmaları; catering; organizasyon.
- Adres kurtarma: 3 kayıt.

**Öne çıkanlar:**
- Lale İşkembecisi (1960)
- Çeltik Kebap ve Lahmacun (1974)
- Nato Lokantası
- Arafat Köfte (1986)
- Karaköy Sarıhan İşkembe
- Hayat Cihangir
- Rakofoli
- Tarihi Degustasyon Ocakbaşı
- Tarihi Cumhuriyet Meyhanesi
- Kadıköy Midyecisi
- Kipos Balık
- Hasan Usta Kebap (1986)
- Eski Babel Ocakbaşı
- Peymane

**Yöntem:** Tekrar kullanılabilir döngü:
`overture-cek.py` → `overture-aday.ts` → `overture-site-olc.mjs` → `paket-overture.mjs` (+ `elle-karar.json`, `tur-karar.json`, adres kurtarma) → `paket-rapor.mjs`

Eksenler ayrı değerlendirilir (kimlik, faaliyet, adres, tür, koordinat):
- Koordinat yalnız sıkı eşleşen OSM restoran kaydından alınır. OSM'si olmayanlar A-konumsuz olur.
- Overture güveni tek başına kanıt sayılmaz.
- Google verisi yok.
- Her kayıtta Overture GERS kimliği, sürüm, kaynak ve lisans var.

**Başarı göstergeleri:**
- İncelenen adaylardan doğrulananlar: 80/250 (%32,0)
- Restoran başına doğrulanmış veri alanı: %87,0 (5 eksen: kimlik, faaliyet, adres, tür, koordinat; A = 5/5, A-konumsuz = 4/5)
- Az temsil edilen ilçelere (katalogda < 25 mekân) kazandırılan: 40

**Tablo 1 — Genel durum**

| Gösterge | Önceki durum | Yeni durum | Değişim |
|---|---:|---:|---:|
| Production mekân sayısı | 574 | 574 | 0 |
| Yayını bekleyen benzersiz kayıtlar | 297 | 377 | +80 |
| Yeni A sınıfı (bekleyen toplam) | 132 | 160 | +28 |
| Yeni A-konumsuz (bekleyen toplam) | 63 | 115 | +52 |
| Toplam yayın adayı (A + B1 + A-konumsuz) | 297 | 377 | +80 |
| Yayın sonrası hedef mekân sayısı | 871 | 951 | +80 |

**Tablo 2 — Araştırma ve doğrulama sonuçları (250 aday, birbirini dışlayan)**

| Sonuç | Adet | Oran |
|---|---:|---:|
| İncelenen aday | 250 | %100 |
| Production'da mevcut | 0 | %0,0 |
| Açık PR'larda mevcut | 0 | %0,0 |
| 906 havuzuyla ortak | 17 | %6,8 |
| Yeni A | 28 | %11,2 |
| Yeni A-konumsuz | 52 | %20,8 |
| B — eksik kanıt | 148 | %59,2 |
| C — güvenilir değil / kapsam dışı | 5 | %2,0 |
| Diğer elenenler | 0 | %0,0 |

**Tablo 3 — Yeni restoranlar (öncelik sırasına göre ilk 20; tam liste paket.json)**

| Restoran | İlçe | Mutfak | Kalite | Konum güveni | Kanıt |
|---|---|---|---|---|---|
| Park Adana Et & Kebap | Çekmeköy | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [parkadanaetkebap.com](http://parkadanaetkebap.com/) |
| Kıraça Balık Lokantası | Tuzla | Balık restoranı | A | OSM restoran kaydı | [kiracabalik.com.tr](https://www.kiracabalik.com.tr/) |
| Tarihi Iskender Kebapcisi | Bayrampaşa | Dönerci | A | OSM restoran kaydı | [tarihiiskender.com](http://www.tarihiiskender.com/) |
| Faroz Pide ve Akcaabat Kofte Salonu | Kartal | Pideci | A | OSM restoran kaydı | [farozpide.com.tr](https://farozpide.com.tr/) |
| Tarihi Degustasyon Ocakbaşı | Beyoğlu | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [degustasyonocakbasi.com](https://www.degustasyonocakbasi.com/) |
| Dürüm Sarayı | Maltepe | Türk mutfağı | A | OSM restoran kaydı | [durumsarayi.com](https://durumsarayi.com/) |
| Lenza Balik Restoran | Tuzla | Balık restoranı | A-konumsuz | yok (Overture önerisi ayrı) | [lenzabalik.com.tr](https://www.lenzabalik.com.tr/) |
| Rota Erzurum Cağ Kebap | Tuzla | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [rotacagkebap.com](https://www.rotacagkebap.com/) |
| Konyali Meshur Pilavci | Kağıthane | Lokanta | A-konumsuz | yok (Overture önerisi ayrı) | [konyalimeshurpilavci.com](https://konyalimeshurpilavci.com/) |
| Gül Urfa | Bayrampaşa | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [gulurfa.com](https://www.gulurfa.com/) |
| Dönerci̇ Ahmet Usta | Sancaktepe | Dönerci | A | OSM restoran kaydı | [donerciahmetusta.com](https://www.donerciahmetusta.com/) |
| Beykoz Pide ve Börek Salonu | Beykoz | Pideci | A | OSM restoran kaydı | [beykozpide.com.tr](http://beykozpide.com.tr/) |
| Sisore | Beykoz | Pideci | A | OSM restoran kaydı | [sisorepide.com](http://www.sisorepide.com/) |
| Lotus Restaurant & Home | Şile | Balık restoranı | A-konumsuz | yok (Overture önerisi ayrı) | [lotussile.com](https://lotussile.com/) |
| Titiz Lokantası | Tuzla | Lokanta | A-konumsuz | yok (Overture önerisi ayrı) | [titizlokantasi.com](https://titizlokantasi.com/) |
| Çeltik Kebab and Lahmacun | Maltepe | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [celtikkebap.com.tr](https://www.celtikkebap.com.tr/) |
| Kaplan Kebap | Maltepe | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [kaplankebap.com](https://kaplankebap.com/) |
| KEBBABİ Kebap | Zeytinburnu | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [kebbabi.com.tr](https://www.kebbabi.com.tr/) |
| Bi Ciğer Bi Kebap | Kartal | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [bicigerbikebap.com](https://bicigerbikebap.com/) |
| Ziyade Fasıl | Kadıköy | Meyhane | A-konumsuz | yok (Overture önerisi ayrı) | [ziyadefasil.com](https://www.ziyadefasil.com/) |

**Tablo 4 — Eksikler ve riskler**

| Sorun | Etkilenen kayıt | Önem derecesi | Çözüm / sonraki işlem |
|---|---:|---|---|
| Koordinat doğrulanamadı | 52 | Orta | A-konumsuz; Overture noktası yalnız öneri dosyasında, şema kararı Codex'te |
| Tam adres eksik | 62 | Yüksek (B) | iletişim sayfası derin tarama, schema.org PostalAddress |
| Resmî site doğrulanamadı | 12 | Orta (B) | https / ilçe kanıtı bulunursa yeniden ölçüm |
| Mutfak türü belirsiz | 98 | Orta (B) | menü sayfası; Overture kategorisi tek başına kabul edilmez |
| Mükerrer şüphesi | 17 | Düşük | yeni kayıt açılmadı; 906 kimliği korunur |
| Sor ad eşleşmesi ("yüksek" → Yüksel Balık) | 1 test | Yüksek (yayın engeli) | Codex: QUERY_NOISE'a sıralama sözcükleri (CODEX-SOR-ONERISI.md); PR #22'de de yok |
| Lisans / kaynak sorunu | 0 | — | kayıt düzeyinde Overture GERS, sürüm, kaynak, lisans; OSM atfı |

**Tablo 5 — Test ve yayın hazırlığı**

| Test | Sonuç | Başarılı / Toplam | Açıklama |
|---|---|---|---|
| TypeScript | Geçti | 1/1 | tsc --noEmit, paket 19 dalında |
| Katalog | Geçti | 52/52 | katalogtest; benzetim (Production + paket 7–20) |
| Mükerrer kontrolü | Geçti | 28/28 | restoranpakettest (paket 20 dalının ucunda): Production, PR #6–15 paketleri, paket 16–20'nin diğerleri, 906, seyrek, PR #17 Menemen |
| Arama | Geçti | 49/49 | aramatest + önizlemede her kayıt kendi adıyla ilk 8'de |
| Sor Gidenler | Başarısız | 321/322 | "Yüksel Balık" ad eşleşmesi (paket 16 kaydı); Codex önerisiyle 322/322 (docs/katalog/CODEX-SOR-ONERISI.md) |
| SEO / Sitemap | Geçti | 49/49 | seotest; önizlemede hepsi sitemap'te |
| Mobil / Masaüstü | Geçti | 4/4 | 375 px: Sait (koordinatsız), Asitane (OSM); 1024 px: Pepo's Galata (OSM), Sait; yatay taşma yok, koordinatsız profilde harita noktası iddiası yok |
| Next build | Geçti | 1/1 | benzetim kopyası (Production + paket 7–20) |
| Yerel yayın benzetimi | Geçti | 86/86 + 158/158 | önizleme denetimi (profil, arama, form, sitemap); Production değildir |
| Gerçek Vercel Preview | Engelli | 0/1 | Neon Preview veritabanı dal sınırı (PR #22'de de 10/10 dolu); yeniden denenmedi |

**Tablo 6 — GitHub teslim bilgileri**

| Alan | Değer |
|---|---|
| Production dalı / SHA | feature/investor-v1 @ b95d284 (574 mekân, değişmedi) |
| Geliştirme dalı | paket/istanbul-17-overture |
| Paket numarası | 17 |
| PR bağlantısı / Commit SHA | PR açıklamasında (dosya kendi commit SHA'sını içeremez) |
| Yeni benzersiz kayıt sayısı | 80 |
| Preview bağlantısı / engel | Engelli: Neon dal sınırı |
| Production durumu | Dokunulmadı |
| Yayına engel olan konu | PR #14 + Codex Sor düzeltmesi |

**Kümülatif büyüme**

| Paket | Yeni A | Yeni A-konumsuz | Yeni B1 | Kümülatif hedef | Yayın durumu |
|---|---:|---:|---:|---:|---|
| Production (gerçek) | — | — | — | 574 | Canlı |
| Paket 7–15 (PR #6–15; 7–14 PR #22 birleşik adayında) | 116 | 18 | 102 | 810 | Bekliyor |
| Paket 16 (PR #19) | 16 | 45 | 0 | 871 | Hazır |
| Paket 17 (PR #20) | 28 | 52 | 0 | 951 | Hazır |
| Paket 18 (PR #21) | 14 | 18 | 0 | 983 | Hazır |
| Paket 19 (yeni PR) | 11 | 39 | 0 | 1033 | Hazır |
| Paket 20 (yeni PR) | 19 | 0 | 0 | 1052 | Hazır |

