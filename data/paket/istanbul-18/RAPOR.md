# Paket 18: Overture keşfi (sonraki 250 aday)

Kontrol: 2026-11-11 · Dal: `paket/istanbul-18-overture` (taban: paket 17) · Kataloğa eklenmedi.

**Kalite düzeltmesi (2026-11-12):** Overture adres metninden yazılan sokak + kapı no resmî sitede birlikte yeniden arandı (`scripts/katalog/adres-dogrula.mjs`, PR #23). Bulunamayan 2 A-konumsuz kayıt B'ye indi; ayrıntı `paket.json` → `kaliteDuzeltmesi` ve `inceleme.json`.

**Verim düştü (%13,6).** Alt sıralardaki adayların çoğunda kapı numarası resmî kaynakta yok (141 aday).

**Uygulananlar:**
- Adres kurtarma 23 adayda kapı numarasını buldu.
- Menüyle tür doğrulama: 10 aday.
- Yeni mükerrer kuralı: mevcut kayıtla aynı resmî site alanı + aynı ilçe = aynı işletme. "Urfadan Kebapçı", paket 16'daki Urfa'dan Kebapçı'nın ikinci Overture POI'si olarak yakalandı.

**Öne çıkanlar:**
- Seyid Usta (1977)
- Todori Meyhanesi Fenerbahçe
- Kiva Galataport
- Cecconi's
- Pera Thai
- Molto Bene Galata
- Babacan Et Lokantası (1978)
- Kolcuoğlu Bomonti

**Not:** Miyabi Sushi ile 906'daki "Elbet" aynı binada, ayrı bağımsız bölümlerde (Yaren Sokak No:6/14-15 ve No:6/21; iki ayrı OSM öğesi, farklı adlar). Paket 20'deki iç kapı numarası kuralıyla 906 dahil test 28/28.

**Yöntem:** Tekrar kullanılabilir döngü:
`overture-cek.py` → `overture-aday.ts` → `overture-site-olc.mjs` → `paket-overture.mjs` (+ `elle-karar.json`, `tur-karar.json`, adres kurtarma) → `paket-rapor.mjs`

Eksenler ayrı değerlendirilir (kimlik, faaliyet, adres, tür, koordinat):
- Koordinat yalnız sıkı eşleşen OSM restoran kaydından alınır. OSM'si olmayanlar A-konumsuz olur.
- Overture güveni tek başına kanıt sayılmaz.
- Google verisi yok.
- Her kayıtta Overture GERS kimliği, sürüm, kaynak ve lisans var.

**Başarı göstergeleri:**
- İncelenen adaylardan doğrulananlar: 32/250 (%12,8)
- Restoran başına doğrulanmış veri alanı: %88,8 (5 eksen: kimlik, faaliyet, adres, tür, koordinat; A = 5/5, A-konumsuz = 4/5)
- Az temsil edilen ilçelere (katalogda < 25 mekân) kazandırılan: 7

**Tablo 1 — Genel durum**

| Gösterge | Önceki durum | Yeni durum | Değişim |
|---|---:|---:|---:|
| Production mekân sayısı | 792 | 792 | 0 |
| Yayını bekleyen benzersiz kayıtlar | 159 | 191 | +32 |
| Yeni A sınıfı (bekleyen toplam) | 44 | 58 | +14 |
| Yeni A-konumsuz (bekleyen toplam) | 115 | 133 | +18 |
| Toplam yayın adayı (A + B1 + A-konumsuz) | 159 | 191 | +32 |
| Yayın sonrası hedef mekân sayısı | 951 | 983 | +32 |

**Tablo 2 — Araştırma ve doğrulama sonuçları (250 aday, birbirini dışlayan)**

| Sonuç | Adet | Oran |
|---|---:|---:|
| İncelenen aday | 250 | %100 |
| Production'da mevcut | 0 | %0,0 |
| Açık PR'larda mevcut | 0 | %0,0 |
| 906 havuzuyla ortak | 9 | %3,6 |
| Yeni A | 14 | %5,6 |
| Yeni A-konumsuz | 18 | %7,2 |
| B — eksik kanıt | 199 | %79,6 |
| C — güvenilir değil / kapsam dışı | 10 | %4,0 |
| Diğer elenenler | 0 | %0,0 |

**Tablo 3 — Yeni restoranlar (öncelik sırasına göre ilk 20; tam liste paket.json)**

| Restoran | İlçe | Mutfak | Kalite | Konum güveni | Kanıt |
|---|---|---|---|---|---|
| Kolcuoglu Bomonti Ocakbasi Kebap | Şişli | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [kolcuoglubomonti.com](https://www.kolcuoglubomonti.com/) |
| Manerita Manti | Sancaktepe | Mantıcı | A-konumsuz | yok (Overture önerisi ayrı) | [manerita.com](https://www.manerita.com/) |
| Seyid Usta | Şişli | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [seyidusta.com](https://www.seyidusta.com/) |
| Hayalmest Meyhanesi Bostancı | Maltepe | Meyhane | A-konumsuz | yok (Overture önerisi ayrı) | [hayalmest.com](https://hayalmest.com/) |
| Babacan Et Lokantası | Silivri | Steakhouse | A-konumsuz | yok (Overture önerisi ayrı) | [babacanetlokantasi.com](https://www.babacanetlokantasi.com/) |
| Niyokki Makarna Piazza AVM | Maltepe | İtalyan | A-konumsuz | yok (Overture önerisi ayrı) | [niyokki.com.tr](https://niyokki.com.tr/) |
| Antique Pizzeria | Beyoğlu | Pizza | A | OSM restoran kaydı | [antique-pizzeria.com](https://www.antique-pizzeria.com/) |
| Miyabi Sushi ve Japanese Grill Bar | Beşiktaş | Sushi / Japon | A | OSM restoran kaydı | [miyabisushi.com.tr](https://miyabisushi.com.tr/) |
| Olive Anatolian Restaurant | Fatih | Türk mutfağı | A | OSM restoran kaydı | [oliverestaurant.com](https://oliverestaurant.com/) |
| Todori Fenerbahçe | Kadıköy | Meyhane | A | OSM restoran kaydı | [todorimeyhanesi.com](https://www.todorimeyhanesi.com/) |
| Keyif Nevizade | Beyoğlu | Balık restoranı | A | OSM restoran kaydı | [keyifnevizade.com](https://www.keyifnevizade.com/) |
| Döner Plus | Şişli | Dönerci | A | OSM restoran kaydı | [donerplus.com.tr](https://donerplus.com.tr/) |
| Maranda Döner | Fatih | Dönerci | A | OSM restoran kaydı | [marandadoner.com](https://www.marandadoner.com/) |
| Kiva Galataport | Beyoğlu | Türk mutfağı | A | OSM restoran kaydı | [kivarestoran.com](https://www.kivarestoran.com/) |
| Mekan Közde Döner | Üsküdar | Dönerci | A-konumsuz | yok (Overture önerisi ayrı) | [mekandoner.com](https://www.mekandoner.com/) |
| PideBan Sarıyer | Sarıyer | Türk mutfağı | A | OSM restoran kaydı | [pideban.com.tr](https://www.pideban.com.tr/) |
| Hattad Döner | Fatih | Dönerci | A | OSM restoran kaydı | [hattaddoner.com](http://hattaddoner.com/) |
| Muhlama | Beykoz | Karadeniz mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [muhlama.com.tr](https://muhlama.com.tr/) |
| Route Burger House Karaköy | Beyoğlu | Burger | A | OSM restoran kaydı | [routeburgerkarakoy.com](https://routeburgerkarakoy.com/) |
| Molto bene galata | Beyoğlu | İtalyan | A | OSM restoran kaydı | [moltobene.com.tr](https://moltobene.com.tr/) |

**Tablo 4 — Eksikler ve riskler**

| Sorun | Etkilenen kayıt | Önem derecesi | Çözüm / sonraki işlem |
|---|---:|---|---|
| Koordinat doğrulanamadı | 18 | Orta | A-konumsuz; Overture noktası yalnız öneri dosyasında, şema kararı Codex'te |
| Tam adres eksik | 127 | Yüksek (B) | iletişim sayfası derin tarama, schema.org PostalAddress |
| Resmî site doğrulanamadı | 7 | Orta (B) | https / ilçe kanıtı bulunursa yeniden ölçüm |
| Mutfak türü belirsiz | 142 | Orta (B) | menü sayfası; Overture kategorisi tek başına kabul edilmez |
| Mükerrer şüphesi | 9 | Düşük | yeni kayıt açılmadı; 906 kimliği korunur |
| Sor ad eşleşmesi ("yüksek" → Yüksel Balık) | 1 test | Yüksek (yayın engeli) | Codex: QUERY_NOISE'a sıralama sözcükleri (CODEX-SOR-ONERISI.md); PR #22'de de yok |
| Lisans / kaynak sorunu | 0 | — | kayıt düzeyinde Overture GERS, sürüm, kaynak, lisans; OSM atfı |

**Tablo 5 — Test ve yayın hazırlığı**

| Test | Sonuç | Başarılı / Toplam | Açıklama |
|---|---|---|---|
| TypeScript | Geçti | 1/1 | tsc --noEmit, paket 19 dalında |
| Katalog | Geçti | 52/52 | katalogtest; benzetim (Production + paket 7–21) |
| Mükerrer kontrolü | Geçti | 28/28 | restoranpakettest (paket 20 dalının ucunda): Production, PR #6–15 paketleri, paket 16–20'nin diğerleri, 906, seyrek, PR #17 Menemen; Miyabi–Elbet iç kapı numarası kuralıyla (paket 19 dalında) |
| Arama | Geçti | 49/49 | aramatest + önizlemede her kayıt kendi adıyla ilk 8'de |
| Sor Gidenler | Başarısız | 321/322 | "Yüksel Balık" ad eşleşmesi (paket 16 kaydı); Codex önerisiyle 322/322 (docs/katalog/CODEX-SOR-ONERISI.md) |
| SEO / Sitemap | Geçti | 49/49 | seotest; önizlemede hepsi sitemap'te |
| Mobil / Masaüstü | Geçti | 4/4 | 375 px: Sait (koordinatsız), Asitane (OSM); 1024 px: Pepo's Galata (OSM), Sait; yatay taşma yok, koordinatsız profilde harita noktası iddiası yok; paket 21 aynı iki profil türünü kullanır (önizleme denetiminde profil + arama + form) |
| Next build | Geçti | 1/1 | benzetim kopyası (Production + paket 7–21) |
| Yerel yayın benzetimi | Geçti | 44/44 + 56/56 | önizleme denetimi (profil, arama, form, sitemap); Production değildir |
| Gerçek Vercel Preview | Engelli | 0/1 | Neon Preview veritabanı dal sınırı (PR #22'de de 10/10 dolu); yeniden denenmedi |

**Tablo 6 — GitHub teslim bilgileri**

| Alan | Değer |
|---|---|
| Production dalı / SHA | feature/investor-v1 @ 721b1a1 (PR #18 birleşti; dalda 792 kayıt; bu çalışmada dokunulmadı) |
| Geliştirme dalı | paket/istanbul-18-overture |
| Paket numarası | 18 |
| PR bağlantısı / Commit SHA | PR açıklamasında (dosya kendi commit SHA'sını içeremez) |
| Yeni benzersiz kayıt sayısı | 32 |
| Preview bağlantısı / engel | Engelli: Neon dal sınırı |
| Production durumu | Dokunulmadı |
| Yayına engel olan konu | PR #14 + Codex Sor düzeltmesi |

**Kümülatif büyüme**

| Paket | Yeni A | Yeni A-konumsuz | Yeni B1 | Kümülatif hedef | Yayın durumu |
|---|---:|---:|---:|---:|---|
| Production (feature/investor-v1 @ 721b1a1; paket 7–14 dahil) | — | — | — | 792 | Canlı (PR #18 birleşti) |
| Paket 15 (PR #15) | 0 | 18 | 0 | 810 | Bekliyor (PR #14 düzeltmesine bağlı) |
| Paket 16 (PR #19) | 16 | 45 | 0 | 871 | Hazır |
| Paket 17 (PR #20) | 28 | 52 | 0 | 951 | Hazır |
| Paket 18 (PR #21) | 14 | 18 | 0 | 983 | Hazır |
| Paket 19 (PR #23) | 11 | 42 | 0 | 1036 | Hazır |
| Paket 20 (PR #24) | 19 | 0 | 0 | 1055 | Hazır |
| Paket 21 (yeni PR) | 4 | 44 | 0 | 1103 | Hazır |

