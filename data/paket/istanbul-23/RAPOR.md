# Paket 23: Overture güven 0,75–0,9 havuzunun kalanı (68 aday)

Kontrol: 2026-11-12 · Dal: `paket/istanbul-23-overture-075-kalan` (taban: paket 22) · Kataloğa eklenmedi.

**Havuz:** Paket 21'de seçilmeyen uygun adaylar (91 uygun; alan adı başına en çok 3, 69 seçim; 1'i 906 ortak, 68 incelendi). Yöntem paket 21 ile aynı.

**Sonuç:** 4 restoran: Sushi Lab, Pizza V Bostancı, SushiCo Tuzla Marina, Cluster. 23 C: kafe, büfe, kurum kafeteryası, ilgisiz siteler. Bu havuz tükendi.

**Başarı göstergeleri:**
- İncelenen adaylardan doğrulananlar: 4/68 (%5,9)
- Restoran başına doğrulanmış veri alanı: %90,0 (5 eksen: kimlik, faaliyet, adres, tür, koordinat; A = 5/5, A-konumsuz = 4/5)
- Az temsil edilen ilçelere (katalogda < 25 mekân) kazandırılan: 1

**Tablo 1 — Genel durum**

| Gösterge | Önceki durum | Yeni durum | Değişim |
|---|---:|---:|---:|
| Production mekân sayısı | 792 | 792 | 0 |
| Yayını bekleyen benzersiz kayıtlar | 330 | 334 | +4 |
| Yeni A sınıfı (bekleyen toplam) | 94 | 96 | +2 |
| Yeni A-konumsuz (bekleyen toplam) | 236 | 238 | +2 |
| Toplam yayın adayı (A + B1 + A-konumsuz) | 330 | 334 | +4 |
| Yayın sonrası hedef mekân sayısı | 1122 | 1126 | +4 |

**Tablo 2 — Araştırma ve doğrulama sonuçları (68 aday, birbirini dışlayan)**

| Sonuç | Adet | Oran |
|---|---:|---:|
| İncelenen aday | 68 | %100 |
| Production'da mevcut | 0 | %0,0 |
| Açık PR'larda mevcut | 0 | %0,0 |
| 906 havuzuyla ortak | 0 | %0,0 |
| Yeni A | 2 | %2,9 |
| Yeni A-konumsuz | 2 | %2,9 |
| B — eksik kanıt | 41 | %60,3 |
| C — güvenilir değil / kapsam dışı | 23 | %33,8 |
| Diğer elenenler | 0 | %0,0 |

**Tablo 3 — Yeni restoranlar (öncelik sırasına göre ilk 4; tam liste paket.json)**

| Restoran | İlçe | Mutfak | Kalite | Konum güveni | Kanıt |
|---|---|---|---|---|---|
| SushiCo | Tuzla | Sushi / Japon | A-konumsuz | yok (Overture önerisi ayrı) | [sushico.com.tr](https://www.sushico.com.tr/tr/) |
| Pizza V Bostancı | Kadıköy | Pizza | A | OSM restoran kaydı | [v.pizza](https://v.pizza/) |
| Cluster | Şişli | Burger | A-konumsuz | yok (Overture önerisi ayrı) | [clusterftb.com](https://www.clusterftb.com/) |
| Sushi Lab | Beşiktaş | Sushi / Japon | A | OSM restoran kaydı | [sushilab.com.tr](https://www.sushilab.com.tr/) |

**Tablo 4 — Eksikler ve riskler**

| Sorun | Etkilenen kayıt | Önem derecesi | Çözüm / sonraki işlem |
|---|---:|---|---|
| Koordinat doğrulanamadı | 2 | Orta | A-konumsuz; Overture noktası yalnız öneri dosyasında, şema kararı Codex'te |
| Tam adres eksik | 57 | Yüksek (B) | iletişim sayfası derin tarama, schema.org PostalAddress |
| Resmî site doğrulanamadı | 1 | Orta (B) | https / ilçe kanıtı bulunursa yeniden ölçüm |
| Mutfak türü belirsiz | 45 | Orta (B) | menü sayfası; Overture kategorisi tek başına kabul edilmez |
| Mükerrer şüphesi | 0 | Düşük | yeni kayıt açılmadı; 906 kimliği korunur |
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
| Yerel yayın benzetimi | Geçti | 8/8 + 8/8 | önizleme denetimi (profil, arama, form, sitemap); Production değildir |
| Gerçek Vercel Preview | Engelli | 0/1 | Neon Preview veritabanı dal sınırı (PR #22'de de 10/10 dolu); yeniden denenmedi |

**Tablo 6 — GitHub teslim bilgileri**

| Alan | Değer |
|---|---|
| Production dalı / SHA | feature/investor-v1 @ 721b1a1 (PR #18 birleşti; dalda 792 kayıt; bu çalışmada dokunulmadı) |
| Geliştirme dalı | paket/istanbul-23-overture-075-kalan |
| Paket numarası | 23 |
| PR bağlantısı / Commit SHA | PR açıklamasında (dosya kendi commit SHA'sını içeremez) |
| Yeni benzersiz kayıt sayısı | 4 |
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

