# Paket 21: Overture güven 0,75–0,9 havuzu (247 aday) ve casual_eatery değerlendirmesi

Kontrol: 2026-11-12 · Dal: `paket/istanbul-21-overture-075` (taban: paket 20) · Kataloğa eklenmedi. Yayını Codex yapar; onay sahibindedir.

**Havuz:** Overture Places 2026-10-21.0, `restaurant` + `fast_food_restaurant`, güven 0,75–0,9, web sitesi var.
- 4.602 kayıt; ön süzgeç (platform, zincir, katalogda olanlar) sonrası 3.436.
- 1.870 site açıldı; 356'sında ad + telefon/sokak eşleşti; 341 uygun aday.
- Öncelik puanıyla 250 seçildi; 3'ü 906 ortak olduğu için ayrıldı, 247 incelendi.
- Overture güveni tek başına kanıt sayılmadı; her kayıt resmî siteden doğrulandı.

**Uygulananlar:**
- Adres yalnız resmî sitede, yazılan sokak + kapı no birlikte bulununca yazıldı (`adres-dogrula.mjs`). 247 adayın 123'ünde bulundu.
- Tür (`tur-karar.json`, 19 karar) yalnız işletmenin öz tanımından.
- Elle karar (`elle-karar.json`): 29 C. Bunlar çiğ köfteci, börekçi, pastane, künefeci, bar, catering, gıda üreticisi, dernek, belediye ve ilgisiz siteler.

**casual_eatery sonucu:** Bu kategoride web sitesi olan 3.700 kaydın çoğu fırın, tatlıcı, dondurmacı ya da şarküteri; restoran kapsamı dışında. Restoran sayılabilecek alt türler (diner, bistro, fondü) 116 kayıt:
- ön süzgeç sonrası 89;
- sitesi açılan 36;
- kimliği eşleşen 10;
- doğrulanan 0.

Bu havuzdan paket çıkmadı. Kafe, bar ve büfe restoranlarla karıştırılmadı.

**Öne çıkanlar:**
- Haso Ocakbaşı Karaköy
- Kilisli Yaşar Usta
- Ozzie's 1968 Kokoreç
- Beyoğlu Esnaf Lokantası
- Sentez Rooftop
- Kazancı İşkembe
- Çorbacı Gada
- Saye Ocakbaşı
- Laamaacuun
- Thai Nepal Kitchen

**Başarı göstergeleri:**
- İncelenen adaylardan doğrulananlar: 48/247 (%19,4)
- Restoran başına doğrulanmış veri alanı: %81,7 (5 eksen: kimlik, faaliyet, adres, tür, koordinat; A = 5/5, A-konumsuz = 4/5)
- Az temsil edilen ilçelere (katalogda < 25 mekân) kazandırılan: 20

**Tablo 1 — Genel durum**

| Gösterge | Önceki durum | Yeni durum | Değişim |
|---|---:|---:|---:|
| Production mekân sayısı | 792 | 792 | 0 |
| Yayını bekleyen benzersiz kayıtlar | 263 | 311 | +48 |
| Yeni A sınıfı (bekleyen toplam) | 88 | 92 | +4 |
| Yeni A-konumsuz (bekleyen toplam) | 175 | 219 | +44 |
| Toplam yayın adayı (A + B1 + A-konumsuz) | 263 | 311 | +48 |
| Yayın sonrası hedef mekân sayısı | 1055 | 1103 | +48 |

**Tablo 2 — Araştırma ve doğrulama sonuçları (247 aday, birbirini dışlayan)**

| Sonuç | Adet | Oran |
|---|---:|---:|
| İncelenen aday | 247 | %100 |
| Production'da mevcut | 0 | %0,0 |
| Açık PR'larda mevcut | 2 | %0,8 |
| 906 havuzuyla ortak | 0 | %0,0 |
| Yeni A | 4 | %1,6 |
| Yeni A-konumsuz | 44 | %17,8 |
| B — eksik kanıt | 159 | %64,4 |
| C — güvenilir değil / kapsam dışı | 38 | %15,4 |
| Diğer elenenler | 0 | %0,0 |

**Tablo 3 — Yeni restoranlar (öncelik sırasına göre ilk 20; tam liste paket.json)**

| Restoran | İlçe | Mutfak | Kalite | Konum güveni | Kanıt |
|---|---|---|---|---|---|
| Dönerci Hamit Efendi | Beylikdüzü | Dönerci | A-konumsuz | yok (Overture önerisi ayrı) | [donercihamitefendi.com](https://donercihamitefendi.com/) |
| White Burger | Ümraniye | Burger | A-konumsuz | yok (Overture önerisi ayrı) | [whiteburger.com](https://www.whiteburger.com/) |
| Karadeniz Mutfağı Erol Usta Efulim Çayeli kuru fasulye | Güngören | Karadeniz mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [efulimerolusta.com](https://www.efulimerolusta.com/) |
| Kebap dünyası | Beylikdüzü | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [kebapdunyasi.com.tr](https://kebapdunyasi.com.tr/) |
| Çekmeköy Sinop Mantı | El Açması Mantı | Çekmeköy | Mantıcı | A-konumsuz | yok (Overture önerisi ayrı) | [cekmekoysinopmanti.com](https://www.cekmekoysinopmanti.com/) |
| Kazancı İşkembe | Bağcılar | Çorbacı | A-konumsuz | yok (Overture önerisi ayrı) | [kazanciiskembe.com](https://kazanciiskembe.com/) |
| Usul Döner | Silivri | Dönerci | A-konumsuz | yok (Overture önerisi ayrı) | [usuldoner.com](https://usuldoner.com/) |
| Gönen Rooftop Ocakbaşı Terrace Restaurant & Roof Bar | Beyoğlu | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [gonenrooftop.com](https://gonenrooftop.com/) |
| Kilisli Yaşar Usta | Fatih | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [kilisliyasarusta.com](https://kilisliyasarusta.com/) |
| Etçi Mehmet Burger Yakuplu | Beylikdüzü | Burger | A-konumsuz | yok (Overture önerisi ayrı) | [etcimehmetburger.com](https://www.etcimehmetburger.com/) |
| Haso Ocakbaşı Karaköy | Beyoğlu | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [hasoocakbasi.com](http://www.hasoocakbasi.com/) |
| Ayvaz Burger | Bahçelievler | Burger | A-konumsuz | yok (Overture önerisi ayrı) | [ayvazburger.com.tr](https://ayvazburger.com.tr/) |
| Akali Mall of İstanbul | Başakşehir | Burger | A-konumsuz | yok (Overture önerisi ayrı) | [akali.co](https://www.akali.co/) |
| Doğa Mantı Evi | Kağıthane | Mantıcı | A-konumsuz | yok (Overture önerisi ayrı) | [dogamantievi.com](https://dogamantievi.com/) |
| Hasel DÖNer | Ümraniye | Dönerci | A-konumsuz | yok (Overture önerisi ayrı) | [haseldoner.com](https://haseldoner.com/) |
| Zeffirino Istanbul | Beşiktaş | İtalyan | A-konumsuz | yok (Overture önerisi ayrı) | [zeffirino-restaurant.com](https://zeffirino-restaurant.com/en/istanbul/) |
| Antep Kuzu Tava & Lahmacun | Kağıthane | Türk mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [antepkuzutava.com](https://www.antepkuzutava.com/) |
| HBS Antakya Ocakbaşı & Restoran Ataşehir | Ataşehir | Türk mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [hbsantakyarestaurant.com](https://www.hbsantakyarestaurant.com/) |
| Çorbacı Gada | Pendik | Çorbacı | A | OSM restoran kaydı | [corbacigada.com](https://corbacigada.com/) |
| Turkahvaltı | Kağıthane | Kahvaltı | A-konumsuz | yok (Overture önerisi ayrı) | [turkahvalti.com](https://www.turkahvalti.com/) |

**Tablo 4 — Eksikler ve riskler**

| Sorun | Etkilenen kayıt | Önem derecesi | Çözüm / sonraki işlem |
|---|---:|---|---|
| Koordinat doğrulanamadı | 44 | Orta | A-konumsuz; Overture noktası yalnız öneri dosyasında, şema kararı Codex'te |
| Tam adres eksik | 123 | Yüksek (B) | iletişim sayfası derin tarama, schema.org PostalAddress |
| Resmî site doğrulanamadı | 9 | Orta (B) | https / ilçe kanıtı bulunursa yeniden ölçüm |
| Mutfak türü belirsiz | 122 | Orta (B) | menü sayfası; Overture kategorisi tek başına kabul edilmez |
| Mükerrer şüphesi | 2 | Düşük | yeni kayıt açılmadı; 906 kimliği korunur |
| Sor ad eşleşmesi ("yüksek" → Yüksel Balık) | 1 test | Yüksek (yayın engeli) | Codex: QUERY_NOISE'a sıralama sözcükleri (CODEX-SOR-ONERISI.md); PR #22'de de yok |
| Lisans / kaynak sorunu | 0 | — | kayıt düzeyinde Overture GERS, sürüm, kaynak, lisans; OSM atfı |

**Tablo 5 — Test ve yayın hazırlığı**

| Test | Sonuç | Başarılı / Toplam | Açıklama |
|---|---|---|---|
| TypeScript | Geçti | 1/1 | tsc --noEmit, paket 19 dalında |
| Katalog | Geçti | 52/52 | katalogtest; benzetim (Production + paket 7–21) |
| Mükerrer kontrolü | Geçti | 28/28 | restoranpakettest (paket 20–21 dalında): Production, PR #6–15 paketleri, paket 16–21'in diğerleri, 906, seyrek, PR #17 Menemen |
| Arama | Geçti | 49/49 | aramatest + önizlemede her kayıt kendi adıyla ilk 8'de |
| Sor Gidenler | Başarısız | 321/322 | "Yüksel Balık" ad eşleşmesi (paket 16 kaydı); Codex önerisiyle 322/322 (docs/katalog/CODEX-SOR-ONERISI.md) |
| SEO / Sitemap | Geçti | 49/49 | seotest; önizlemede hepsi sitemap'te |
| Mobil / Masaüstü | Geçti | 4/4 | 375 px: Sait (koordinatsız), Asitane (OSM); 1024 px: Pepo's Galata (OSM), Sait; yatay taşma yok, koordinatsız profilde harita noktası iddiası yok; paket 21 aynı iki profil türünü kullanır (önizleme denetiminde profil + arama + form) |
| Next build | Geçti | 1/1 | benzetim kopyası (Production + paket 7–21) |
| Yerel yayın benzetimi | Geçti | 14/14 + 134/134 | önizleme denetimi (profil, arama, form, sitemap); Production değildir |
| Gerçek Vercel Preview | Engelli | 0/1 | Neon Preview veritabanı dal sınırı (PR #22'de de 10/10 dolu); yeniden denenmedi |

**Tablo 6 — GitHub teslim bilgileri**

| Alan | Değer |
|---|---|
| Production dalı / SHA | feature/investor-v1 @ 721b1a1 (PR #18 birleşti; dalda 792 kayıt; bu çalışmada dokunulmadı) |
| Geliştirme dalı | paket/istanbul-21-overture-075 |
| Paket numarası | 21 |
| PR bağlantısı / Commit SHA | PR açıklamasında (dosya kendi commit SHA'sını içeremez) |
| Yeni benzersiz kayıt sayısı | 48 |
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

