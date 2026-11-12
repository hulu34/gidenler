# Paket 19: B havuzunu yükseltme (250 aday)

Kontrol: 2026-11-12 · Dal: `paket/istanbul-19-b-yukseltme` (taban: paket 18) · Kataloğa eklenmedi. Yayını Codex yapar; onay sahibindedir.

**Havuz:** Paket 16–18'de eksik kanıt nedeniyle B kalan 459 adaydan 250'si. Önce tek eksiği olanlar (yalnız tür ya da yalnız adres), sonra öncelik puanı. Elle karar verilmiş ve yalnız http sitesi olanlar dışarıda kaldı.

**Uygulananlar:**
- Derin ölçüm (`b-derin-olc.mjs`): her resmî sitede ana sayfa, iletişim, hakkımızda ve menü sayfaları. Alan adı başına en çok 10 sayfa, sırayla; sayfa içeriği saklanmadı.
- Tür (`tur-karar.json`, 35 karar): yalnız restoranın kendi öz tanımı kabul edildi (başlık, açıklama, hakkımızda cümlesi, menü başlığı, schema.org servesCuisine). Ad ve Overture kategorisi tek başına kabul edilmedi.
- Adres:
  - Overture metninden çıkan "sokak + kapı no" resmî sitede birlikte arandı (`adres-dogrula.mjs`).
  - Overture adresi sitede yoksa, sitenin kendi iletişim satırı kullanıldı: telefonla aynı sayfada ya da schema.org kaydında, ilçe adıyla (20 karar). Yanlış şubeyi gösteren 3 öneri elendi.
- Elle karar (`elle-karar.json`): 42 C (dizin/Linktree sitesi, kafe, bar, büfe, catering, düğün/piknik alanı, gıda üreticisi, ilgisiz firma, çiğ köfte) ve 5 B (eski içerik, ad uyuşmazlığı, şablon site).

**Bulunan hata ve düzeltme:** Eski adres ayrıştırıcısı Overture metnindeki ilk sayıyı kapı numarası sanabiliyordu ("Başakşehir 1. Etap ..." → "Başakşehir No:1"). Ayrıca eski kuralda sitede aranan "sokak", bazen adresin ilk parçasındaki mahalle adıydı. Düzeltme:
- yeni ayrıştırıcı: kapı numarası sokak türü sözcüğünden hemen sonra gelmeli (`ov-adres.mjs`);
- yazılacak adres sitede birlikte aranır;
- paket 16–18'de doğrulanamayan 15 kayıt kendi dallarında B'ye indirildi.

**Mükerrer kuralı:** Aynı binada farklı bağımsız bölüm istisnası testte. Ad farklı olmalı, ikisinde de iç kapı numarası yazılı olmalı ve numaralar kesişmemeli. Miyabi Sushi (No:6/14-15) ile 906'daki Elbet (No:6/21) bu kuralla ayrı sayıldı; iki ayrı OSM öğesi var.

**Öne çıkanlar:**
- Tarihi Merkezefendi Köftecisi (1962)
- Sait (Galataport)
- Pepo's Galata
- Kenan Usta Ocakbaşı
- Bence Tantuni
- Sayla Mantı (1969)
- Reşat Efendi
- Olden 1545
- Anzer Sofrası
- Çömlek Kuru Fasulye
- Tepe Balık Sarıyer
- Filika Meyhane

**Başarı göstergeleri:**
- İncelenen adaylardan doğrulananlar: 50/250 (%20,0)
- Restoran başına doğrulanmış veri alanı: %84,4 (5 eksen: kimlik, faaliyet, adres, tür, koordinat; A = 5/5, A-konumsuz = 4/5)
- Az temsil edilen ilçelere (katalogda < 25 mekân) kazandırılan: 30

**Tablo 1 — Genel durum**

| Gösterge | Önceki durum | Yeni durum | Değişim |
|---|---:|---:|---:|
| Production mekân sayısı | 574 | 574 | 0 |
| Yayını bekleyen benzersiz kayıtlar | 409 | 459 | +50 |
| Yeni A sınıfı (bekleyen toplam) | 174 | 185 | +11 |
| Yeni A-konumsuz (bekleyen toplam) | 133 | 172 | +39 |
| Toplam yayın adayı (A + B1 + A-konumsuz) | 409 | 459 | +50 |
| Yayın sonrası hedef mekân sayısı | 983 | 1033 | +50 |

**Tablo 2 — Araştırma ve doğrulama sonuçları (250 aday, birbirini dışlayan)**

| Sonuç | Adet | Oran |
|---|---:|---:|
| İncelenen aday | 250 | %100 |
| Production'da mevcut | 0 | %0,0 |
| Açık PR'larda mevcut | 2 | %0,8 |
| 906 havuzuyla ortak | 0 | %0,0 |
| Yeni A | 11 | %4,4 |
| Yeni A-konumsuz | 39 | %15,6 |
| B — eksik kanıt | 156 | %62,4 |
| C — güvenilir değil / kapsam dışı | 42 | %16,8 |
| Diğer elenenler | 0 | %0,0 |

**Tablo 3 — Yeni restoranlar (öncelik sırasına göre ilk 20; tam liste paket.json)**

| Restoran | İlçe | Mutfak | Kalite | Konum güveni | Kanıt |
|---|---|---|---|---|---|
| Tarihi Merkezefendi Köftecisi Ahmet Usta | Zeytinburnu | Köfteci | A | OSM restoran kaydı | [tarihimerkezefendikoftecisi.com.tr](https://tarihimerkezefendikoftecisi.com.tr/tr) |
| Bİ YER Et & Kebap | Çekmeköy | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [biyerdeyiz.com](https://biyerdeyiz.com/) |
| Calisto Balık | Beylikdüzü | Balık restoranı | A-konumsuz | yok (Overture önerisi ayrı) | [calisto.com.tr](https://www.calisto.com.tr/) |
| Il Cortile | Beyoğlu | Pizza | A-konumsuz | yok (Overture önerisi ayrı) | [ilcortileistanbul.com](https://ilcortileistanbul.com/) |
| Bafra Pidecisi | Tuzla | Pideci | A-konumsuz | yok (Overture önerisi ayrı) | [bafrapidecisi.com](https://www.bafrapidecisi.com/) |
| Buyuk Erzurum Sofrasi | Kartal | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [buyukerzurumsofrasi.com.tr](https://buyukerzurumsofrasi.com.tr/) |
| Konyalı Köşk | Gaziosmanpaşa | Türk mutfağı | A | OSM restoran kaydı | [konyalikosk.com.tr](https://konyalikosk.com.tr/) |
| Nedim Usta Cağ Kebap | Maltepe | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [nedimusta.com](https://nedimusta.com/) |
| Karaf Et & Kebap | Ümraniye | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [karafrestoran.com](https://karafrestoran.com/) |
| Pepo's Galata | Beyoğlu | Türk mutfağı | A | OSM restoran kaydı | [pepogalata.com](https://pepogalata.com/) |
| Kenan Usta Ocakbaşı | Beyoğlu | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [kenanusta.com.tr](https://kenanusta.com.tr/) |
| Tepe Balık Restaurant Sarıyer | Sarıyer | Balık restoranı | A-konumsuz | yok (Overture önerisi ayrı) | [tepebalik.com](https://tepebalik.com/) |
| Zekibey İskender | Üsküdar | Türk mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [zekibeyiskender.com.tr](https://zekibeyiskender.com.tr/) |
| Tarihi Saray Pide Evren | Bağcılar | Pideci | A-konumsuz | yok (Overture önerisi ayrı) | [tarihisaraypide.com.tr](https://www.tarihisaraypide.com.tr/) |
| Sait | Beyoğlu | Balık restoranı | A-konumsuz | yok (Overture önerisi ayrı) | [sait.com.tr](https://www.sait.com.tr/) |
| Dragos Balık | Kartal | Balık restoranı | A-konumsuz | yok (Overture önerisi ayrı) | [dragosbalik.com](https://www.dragosbalik.com/tr/) |
| Sini Et Balık Restaurant | Küçükçekmece | Balık restoranı | A-konumsuz | yok (Overture önerisi ayrı) | [sinietbalik.com](https://www.sinietbalik.com/) |
| Afgan Kebap | Esenyurt | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [afgankebap.com](https://www.afgankebap.com/) |
| Kocaman Restaurant | Beylikdüzü | Karadeniz mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [kocamanrestaurant.com](https://kocamanrestaurant.com/) |
| Maide Türk Mutfağı | Tuzla | Türk mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [maideturkmutfagi.com](https://www.maideturkmutfagi.com/) |

**Tablo 4 — Eksikler ve riskler**

| Sorun | Etkilenen kayıt | Önem derecesi | Çözüm / sonraki işlem |
|---|---:|---|---|
| Koordinat doğrulanamadı | 39 | Orta | A-konumsuz; Overture noktası yalnız öneri dosyasında, şema kararı Codex'te |
| Tam adres eksik | 75 | Yüksek (B) | iletişim sayfası derin tarama, schema.org PostalAddress |
| Resmî site doğrulanamadı | 10 | Orta (B) | https / ilçe kanıtı bulunursa yeniden ölçüm |
| Mutfak türü belirsiz | 75 | Orta (B) | menü sayfası; Overture kategorisi tek başına kabul edilmez |
| Mükerrer şüphesi | 2 | Düşük | yeni kayıt açılmadı; 906 kimliği korunur |
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
| Yerel yayın benzetimi | Geçti | 35/35 + 119/119 | önizleme denetimi (profil, arama, form, sitemap); Production değildir |
| Gerçek Vercel Preview | Engelli | 0/1 | Neon Preview veritabanı dal sınırı (PR #22'de de 10/10 dolu); yeniden denenmedi |

**Tablo 6 — GitHub teslim bilgileri**

| Alan | Değer |
|---|---|
| Production dalı / SHA | feature/investor-v1 @ b95d284 (574 mekân, değişmedi) |
| Geliştirme dalı | paket/istanbul-19-b-yukseltme |
| Paket numarası | 19 |
| PR bağlantısı / Commit SHA | PR açıklamasında (dosya kendi commit SHA'sını içeremez) |
| Yeni benzersiz kayıt sayısı | 50 |
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

