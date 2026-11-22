# Paket 22: B havuzunun kalanı (196 aday)

Kontrol: 2026-11-12 · Dal: `paket/istanbul-22-b-kalan` (taban: paket 21) · Kataloğa eklenmedi. Yayını Codex yapar; onay sahibindedir.

**Havuz:** Paket 16–18'in B adaylarından paket 19'da seçilmeyen 168'i, kalite düzeltmesinde B'ye inen 15'i ve yalnız http sitesi olan 13'ü. Elle karar verilmiş 28 aday dışarıda kaldı.

**Uygulananlar:**
- Derin ölçüm (`b-derin-olc.mjs`) ve adres doğrulama (`adres-dogrula.mjs`). Numara artık sokak adından önce de aranıyor ("No:47/A Fetih Cd.").
- 7 site https ile doğrulandı.
- Tür (`tur-karar.json`, 11 karar) yalnız işletmenin öz tanımından.
- Site adres satırı 2 karar: Pizzeria Capra ("Pirireis Caddesi No:24/B"), Sarıhan Mantı.
- Elle karar: 9 C. Bunlar diş kliniği, ev aletleri, 4x4 ekipmanı, kasap, düğün salonu, çiğ köfteci, büfe, gösteri mekânı ve akvaryum firmasının sitesi.

**Geri dönenler:** Paket 16–17 düzeltmesinde inen Dönerci Ali Usta, Cağistan ve Pizzeria Capra bu kez resmî sitede yazılan adresle doğrulandı.

**Verim düşük (%9,7):** Bu havuz zaten eksik kanıtlı adaylardan oluşuyor. Kalan B'lerin çoğunda resmî sitede kapı numarası ya da tür tanımı yok.

**Öne çıkanlar:**
- Emek Restaurant (Karaköy, 1973)
- Kalinka Meyhane
- Suat Usta Mersin Tantuni
- Tütsü by Düvee
- Koşuyolu Kebap
- Hasan Ustam Ocakbaşı
- Küçükyalı Balıkçısı
- Nur Abla Karadeniz Sofrası

**Başarı göstergeleri:**
- İncelenen adaylardan doğrulananlar: 19/196 (%9,7)
- Restoran başına doğrulanmış veri alanı: %82,1 (5 eksen: kimlik, faaliyet, adres, tür, koordinat; A = 5/5, A-konumsuz = 4/5)
- Az temsil edilen ilçelere (katalogda < 25 mekân) kazandırılan: 10

**Tablo 1 — Genel durum**

| Gösterge | Önceki durum | Yeni durum | Değişim |
|---|---:|---:|---:|
| Production mekân sayısı | 792 | 792 | 0 |
| Yayını bekleyen benzersiz kayıtlar | 311 | 330 | +19 |
| Yeni A sınıfı (bekleyen toplam) | 92 | 94 | +2 |
| Yeni A-konumsuz (bekleyen toplam) | 219 | 236 | +17 |
| Toplam yayın adayı (A + B1 + A-konumsuz) | 311 | 330 | +19 |
| Yayın sonrası hedef mekân sayısı | 1103 | 1122 | +19 |

**Tablo 2 — Araştırma ve doğrulama sonuçları (196 aday, birbirini dışlayan)**

| Sonuç | Adet | Oran |
|---|---:|---:|
| İncelenen aday | 196 | %100 |
| Production'da mevcut | 0 | %0,0 |
| Açık PR'larda mevcut | 2 | %1,0 |
| 906 havuzuyla ortak | 0 | %0,0 |
| Yeni A | 2 | %1,0 |
| Yeni A-konumsuz | 17 | %8,7 |
| B — eksik kanıt | 166 | %84,7 |
| C — güvenilir değil / kapsam dışı | 9 | %4,6 |
| Diğer elenenler | 0 | %0,0 |

**Tablo 3 — Yeni restoranlar (öncelik sırasına göre ilk 19; tam liste paket.json)**

| Restoran | İlçe | Mutfak | Kalite | Konum güveni | Kanıt |
|---|---|---|---|---|---|
| Durak Pide | Kartal | Pideci | A-konumsuz | yok (Overture önerisi ayrı) | [durakpide.com](https://www.durakpide.com/) |
| Küçükyalı Balıkçısı | Maltepe | Balık restoranı | A-konumsuz | yok (Overture önerisi ayrı) | [kucukyalibalikcisi.com](https://www.kucukyalibalikcisi.com/) |
| Ökkeş Demir usta | Büyükçekmece | Türk mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [okkesdemir.com](https://okkesdemir.com/) |
| Burger Zmash | Sarıyer | Burger | A-konumsuz | yok (Overture önerisi ayrı) | [burgerzmash.com](https://www.burgerzmash.com/) |
| Pileki Pide | Sarıyer | Pideci | A-konumsuz | yok (Overture önerisi ayrı) | [pilekipide.com](https://pilekipide.com/) |
| Pizzeria Capra | Çekmeköy | Pizza | A-konumsuz | yok (Overture önerisi ayrı) | [pizzeriacapra.com](https://www.pizzeriacapra.com/) |
| Bi İşkembe Halkalı | Küçükçekmece | Türk mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [biiskembe1978.com](https://biiskembe1978.com/halkali/) |
| Dönerci Ali Usta | Maltepe | Dönerci | A | OSM restoran kaydı | [donercialiusta.com](https://www.donercialiusta.com/iletisim.php) |
| Cağistan Erzurum Cağ Kebabı | Eyüpsultan | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [cagistan.com](https://www.cagistan.com/) |
| Kalinka | Beyoğlu | Meyhane | A-konumsuz | yok (Overture önerisi ayrı) | [kalinkameyhane.com](https://www.kalinkameyhane.com/) |
| Hasan Ustam Barbecue Restaurant | Beyoğlu | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [hasanustamocakbasi.com](https://www.hasanustamocakbasi.com/) |
| Koşuyolu Kebap | Kadıköy | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [kosuyolukebap.com](https://www.kosuyolukebap.com/) |
| Tütsü by Düvee | Beşiktaş | Steakhouse | A-konumsuz | yok (Overture önerisi ayrı) | [tutsubyduvee.com](https://tutsubyduvee.com/) |
| Esenler Pide Lahmacun ve Döner Salonu | Esenler | Pideci | A-konumsuz | yok (Overture önerisi ayrı) | [esenlerpide.net](https://www.esenlerpide.net/) |
| Suat Usta Mersin Tantuni | Beyoğlu | Tantuni | A | OSM restoran kaydı | [suatustatantuni.com.tr](https://suatustatantuni.com.tr/) |
| Emek Restaurant | Beyoğlu | Türk mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [emekrestaurant.com.tr](https://emekrestaurant.com.tr/) |
| Kağıthane Gece Dönercisi | Kağıthane | Dönerci | A-konumsuz | yok (Overture önerisi ayrı) | [kagithanegecedonercisi.com](https://www.kagithanegecedonercisi.com/) |
| Jaa Jaa Grill Maslak 1453 | Sarıyer | Steakhouse | A-konumsuz | yok (Overture önerisi ayrı) | [jaajaa.com.tr](https://www.jaajaa.com.tr/) |
| Nur Abla Karadeniz Sofrası | Çekmeköy | Karadeniz mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [nurabla.com.tr](https://nurabla.com.tr/) |

**Tablo 4 — Eksikler ve riskler**

| Sorun | Etkilenen kayıt | Önem derecesi | Çözüm / sonraki işlem |
|---|---:|---|---|
| Koordinat doğrulanamadı | 17 | Orta | A-konumsuz; Overture noktası yalnız öneri dosyasında, şema kararı Codex'te |
| Tam adres eksik | 130 | Yüksek (B) | iletişim sayfası derin tarama, schema.org PostalAddress |
| Resmî site doğrulanamadı | 10 | Orta (B) | https / ilçe kanıtı bulunursa yeniden ölçüm |
| Mutfak türü belirsiz | 145 | Orta (B) | menü sayfası; Overture kategorisi tek başına kabul edilmez |
| Mükerrer şüphesi | 2 | Düşük | yeni kayıt açılmadı; 906 kimliği korunur |
| Sor ad eşleşmesi ("yüksek" → Yüksel Balık) | 1 test | Yüksek (yayın engeli) | Codex: QUERY_NOISE'a sıralama sözcükleri (CODEX-SOR-ONERISI.md); PR #22'de de yok |
| Lisans / kaynak sorunu | 0 | — | kayıt düzeyinde Overture GERS, sürüm, kaynak, lisans; OSM atfı |

**Tablo 5 — Test ve yayın hazırlığı**

| Test | Sonuç | Başarılı / Toplam | Açıklama |
|---|---|---|---|
| TypeScript | Geçti | 1/1 | tsc --noEmit, paket 19 dalında |
| Katalog | Geçti | 52/52 | katalogtest; benzetim (Production + paket 7–23) |
| Mükerrer kontrolü | Geçti | 28/28 | restoranpakettest: Production, PR #6–15 paketleri, paket 16–23'ün diğerleri, 906, seyrek, PR #17 Menemen |
| Arama | Geçti | 49/49 | aramatest + önizlemede her kayıt kendi adıyla ilk 8'de |
| Sor Gidenler | Başarısız | 321/322 | "Yüksel Balık" ad eşleşmesi (paket 16 kaydı); Codex önerisiyle 322/322 (docs/katalog/CODEX-SOR-ONERISI.md) |
| SEO / Sitemap | Geçti | 49/49 | seotest; önizlemede hepsi sitemap'te |
| Mobil / Masaüstü | Geçti | 4/4 | 375 px: Sait (koordinatsız), Asitane (OSM); 1024 px: Pepo's Galata (OSM), Sait; yatay taşma yok, koordinatsız profilde harita noktası iddiası yok; paket 21 aynı iki profil türünü kullanır (önizleme denetiminde profil + arama + form) |
| Next build | Geçti | 1/1 | benzetim kopyası (Production + paket 7–23) |
| Yerel yayın benzetimi | Geçti | 8/8 + 53/53 | önizleme denetimi (profil, arama, form, sitemap); Production değildir |
| Gerçek Vercel Preview | Engelli | 0/1 | Neon Preview veritabanı dal sınırı (PR #22'de de 10/10 dolu); yeniden denenmedi |

**Tablo 6 — GitHub teslim bilgileri**

| Alan | Değer |
|---|---|
| Production dalı / SHA | feature/investor-v1 @ 721b1a1 (PR #18 birleşti; dalda 792 kayıt; bu çalışmada dokunulmadı) |
| Geliştirme dalı | paket/istanbul-22-b-kalan |
| Paket numarası | 22 |
| PR bağlantısı / Commit SHA | PR açıklamasında (dosya kendi commit SHA'sını içeremez) |
| Yeni benzersiz kayıt sayısı | 19 |
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
| Paket 21 (PR #26) | 4 | 44 | 0 | 1103 | Hazır |
| Paket 22 (yeni PR) | 2 | 17 | 0 | 1122 | Hazır |
| Paket 23 (yeni PR) | 2 | 2 | 0 | 1126 | Hazır |

