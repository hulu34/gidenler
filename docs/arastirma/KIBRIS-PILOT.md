# Kıbrıs pilotu — kaynaklı ve tekilleştirilmiş restoran adayları (15 Kasım 2026, kanıt tutarlılığı turu dahil)

Dal: `arastirma/kibris-pilot` · Taban: Production `f8131dd` · Veri: `data/arastirma/kibris/adaylar.json` · Test: `scripts/arastirmakibristest.ts`

**Yalnız araştırma.**
- Kataloğa eklenmedi, veritabanına yazılmadı, canlıda sayılmaz.
- Production, Sor ve Google dosyalarına dokunulmadı.
- PR #50 dalı ve kabul SHA'sı (`77bc434`) ile Codex'in PR #51'i değişmedi.
- Ücretli kaynak, API, dış iletişim ya da otomasyon kullanılmadı.

## Mevcut kapsam kontrolü

Bütün uzak dallar ve `data/`, `docs/`, `lib/` tarandı:
- **Kıbrıs kapsamı yoktu.** Eşleşmeler İstanbul'daki mekân adlarıydı (ör. "Kıbrıs Yöre Evi").
- **PR #5'teki şehir modeli:** `lib/sehir.ts` ve `data/katalog/sehirler.json` yalnız Türkiye illeri için (`id`, `ad`, `plaka`, `durum`, `bbox`). Kıbrıs bu modele doğrudan oturmuyor; bkz. teknik varsayımlar.

## Sayılar — İstanbul ile Kıbrıs ayrı

| İstanbul hedefi | Sayı |
|---|---:|
| Canlı sitede gösterilen aktif mekân | **783** |
| Production dalı kayıt (PR #51'in 17 kaydı dahil) | 818 |
| 2.000 aktife kalan (yalnız yayımlanmış aktif) | **1.217** |

| Kıbrıs pilotu (yalnız araştırma, canlıda değil) | Kuzey | Güney | Toplam |
|---|---:|---:|---:|
| Tam kanıtlı aday (iki kaynakta aynı sokak ve kapı no) | 0 | 4 | **4** |
| Koşullu aday (tam kabul edilmiş değil) | 4 | 2 | **6** |
| Bekleyen (inceleme) | 3 | 11 | 14 |
| Kapsam dışı | 0 | 2 | 2 |

Pilot sınırı 20'ydi; sayı için zayıf kayıt eklenmedi. İlk teslimdeki "9 güçlü aday" satır bazında yeniden kontrol edildi; bkz. aşağıdaki bölüm.

## Bölge etiketleme ilkesi

Her kayıtta iki ayrı alan var, ada tek bir idari ya da hukuki alana indirgenmedi:

- **`cografiBolge`:** Adadaki coğrafi bölge (Girne bölgesi, Lefkoşa güney/kuzey kesim, Larnaka, Limasol, Baf). Yerel ad karşılıkları ayrı alanda: Girne/Kyrenia/Keryneia, Lefkoşa/Nicosia/Lefkosia, Limasol/Limassol/Lemesos, Baf/Paphos/Pafos.
- **`operasyonelBolge`:** Yerel yönetim ve operasyon alanı:
  - "kuzey — Kıbrıs Türk yönetimindeki alan (yerel kurumlar: KKTC)";
  - "güney — Kıbrıs Cumhuriyeti hükümetinin fiilî kontrolündeki alan".

  Telefon ve para birimi varsayımları bu alana bağlı.
- **`hukukiNot`:** Adanın siyasi ve hukuki statüsü uluslararası olarak tartışmalı; kuzeydeki yönetimi yalnız Türkiye tanıyor. Bu alan hukuki hüküm vermez; adres, telefon, para birimi ve mevzuat gibi operasyonel varsayımlar için tutulur.
- **Bölünmüş şehir:** Lefkoşa'da kesim (kuzey/güney) ayrıca yazıldı.

Pilotta tampon bölge ya da İngiliz üs bölgelerinde (Dhekelia, Akrotiri/Episkopi) aday yok. Böyle bir kayıt çıkarsa ayrı etiket ve araştırma notu gerekir.

## Kanıt tutarlılığı turu (15.11.2026)

İlk teslimde 9 aday için "iki kaynak aynı adresi doğruluyor" dendi. Bu genel iddia her satırda iki kaynağın adres metni yan yana okunarak yeniden kontrol edildi. **İddia 4 kayıtta doğru, 5 kayıtta yalnız kısmen doğru.** Bu 5 kayıt ve yeni resmî kaynağı bulunan Niazi's koşullu aday olarak işaretlendi.

Kayıtlardaki yeni alanlar:
- `adresKaniti`: `durum`, iki kaynağın adres metni ve sokak, kapı no, telefon için ayrı `eslesme`.
- `kosul`: yalnız koşullu kayıtlarda; tam kabul edilmiş olmadığını yazar.

### İki kaynakla eşleşen gerçek adresler (tam kanıtlı, 4)

| Aday | Resmî kaynak | Bağımsız kaynak (Cyprus Mail yazı metni, "WHERE" satırı) | Telefon |
|---|---|---|---|
| Oniro by the Sea | Glikou Nerou 05, Peyia 8560 | Glikou Nerou 05, Peyia, Paphos | eşleşti (7007 7272) |
| MasaMoro | Stasandrou 2, 1060 Nicosia | Stasandrou 2, Nicosia | resmî sitede yok |
| Stavri Kitchen | Kalimnou 6b, Larnaca 6037 | Kalimnou 6B, 6037, Larnaca | eşleşti (24 255592) |
| Gourmet Taverna | 1-2 Dyonisou, 8041 Kato Paphos | Dionysou 1-2, Paphos | eşleşti (26 933626) |

Dyonisou ve Dionysou aynı adın iki harf çevirisi.

### Koşullu adaylar (6) — kanıt durumları ayrı

| Aday | Adres kanıtı durumu | Ne eşleşti | Ne eşleşmedi |
|---|---|---|---|
| LPM Restaurant & Bar | `ayni-otel-ve-telefon-sokak-kapi-no-tek-kaynak` | otel (Parklane), telefon 25 862222 | Giannou Kranidioti 11 yalnız resmî sayfada |
| Novél (The Agora Hotel) | `ayni-otel-ve-telefon-sokak-kapi-no-tek-kaynak` | otel, telefon 24 726000 | 25 Timiou Stavrou yalnız resmî sitede. Yazının harita bileşeninde de var ama plus code taşıyor (Google kökenli), sayılmadı |
| Calamari | `ayni-yer-tarifi-kapi-no-yok` | "Lapta Oteller Bölgesi, Hacı Ali Hotel yanı" iki kaynakta aynı | sokak ve kapı no iki kaynakta da yok |
| Bellapais Gardens | `ayni-koy-sokak-adi-farkli-kapi-no-yok` | köy (Bellapais = Beylerbeyi) | **sokak adı farklı:** resmî "Crusader Road", yemek.com "Şehit Fuat Niyazi Sokak"; aynı yol olduğu doğrulanmadı. Kapı no yok |
| Silver Rocks | `sokak-tek-kaynak-kapi-no-yok` | köy (Lapta) | **adres tek kaynakta:** "Fevzi Çakmak Caddesi" yalnız yemek.com'da; resmî site yalnız "Lapta 99440" ve telefon veriyor. Kapı no yok |
| Niazi's Restaurant (Girne) | `ayni-sokak-kapi-no-tek-kaynak-sube-belirsiz` | sokak: resmî şube sayfası "Ziya Rızkı Str., Sıdıka Ersoy Apt." ve yemek.com (25.12.2025) "Ziya Rızkı Caddesi No:3" | No:3 yalnız yemek.com'da. Resmî sitenin iletişim sayfası başka adres veriyor ("Kordonboyu Str., Dome Hotel karşısı"). Şube sayfasında aynı adreste ikinci bir Girne şubesi (hızlı servis) var |

**Kuzeyde kapı numarası:** Kuzeydeki 4 adayın hiçbirinde iki kaynakta ortak kapı numarası yok. Bu yüzden kuzeyde tam kanıtlı aday yok. Yer tarifli adres kabul edilirse yalnız Calamari tam kanıtlı olmaya en yakın kayıt; Bellapais ve Silver Rocks yine de sokak teyidi ister.

Bu turda hiçbir ürün kararı uygulanmadı:
- Yer tarifli adres, "Kıbrıs mutfağı" türü ve kesim önceliği kabul edilmedi.
- Telefon, saat ve para birimi biçimleri ile Google otomasyonu değişmedi.

Hepsi aşağıda teknik öneri ya da teyit gereksinimi olarak duruyor.

### Bekleyenler için sınırlı tur

Tek tur yapıldı, yalnız yeni ve kolay erişilen resmî kaynaklarla:
- **Yeni kaynak aranan yerler:** Cyprus Mail yazılarındaki dış bağlantılar ve Niazi's'in kendi şube sayfası.
- **Kullanılmayan yöntemler:**
  - Daha önce başarısız olan alan adları yeniden denenmedi.
  - Erişim engeli aşılmadı.
  - İşletmelere mesaj gönderilmedi.
  - Ücretli kaynak kullanılmadı.

| Bekleyen | Sonuç |
|---|---|
| Niazi's | Resmî şube sayfası bulundu; sokak eşleşti → **koşullu adaya geçti** |
| Artio Symposium | Yazıdaki bağlantıdan otel sitesi (elinntraditionalsuites.com) açıldı. Kathikas'ı doğruluyor ama restorandan ve sokak adresinden söz etmiyor → **bekliyor** |
| Diğer 13 | Yazılarda resmî bağlantı yok (yalnız Instagram/izleyici) → **bekliyor** |

## İlk teslimdeki 9 aday (kaynak özeti)

| Aday | Coğrafi bölge | Operasyon | Tür | Resmî kaynak | Bağımsız kaynak (tarih) | Eksik |
|---|---|---|---|---|---|---|
| LPM Restaurant & Bar | Limasol | güney | Akdeniz | lpmrestaurants.com/limassol (Giannou Kranidioti 11) | Cyprus Mail (29.01.2026) | — |
| Oniro by the Sea | Baf (Peyia) | güney | Akdeniz | oniro.cy (Glikou Nerou 05, aynı tel.) | Cyprus Mail (08.05.2026) | tür teyidi (beach club'a yakın) |
| MasaMoro | Lefkoşa (güney) | güney | Dünya mutfağı (taco) | masamoro.com (Stasandrou 2) | Cyprus Mail (23.10.2026) | — |
| Stavri Kitchen | Larnaka | güney | Burger | stavriskitchen.com (Kalimnou 6b, aynı tel.) | Cyprus Mail (06.11.2026) | — |
| Gourmet Taverna | Baf (Kato Paphos) | güney | geleneksel Kıbrıs | gourmettaverna.com (1-2 Dyonisou, aynı tel.) | Cyprus Mail (18.02.2026) | "Kıbrıs mutfağı" türü yok |
| Novél (The Agora Hotel) | Larnaka (Pano Lefkara) | güney | Kahvaltı / tüm gün | theagorahotel.com (aynı tel.) | Cyprus Mail (14.01.2026) | kapı no (otel adresi) |
| Calamari Restaurant | Girne (Lapta) | kuzey | Balık | calamarirestaurant.com (aynı yer tarifi) | yemek.com (07.10.2026) | kapı no (yer tarifi) |
| Bellapais Gardens Restaurant | Girne (Beylerbeyi/Bellapais) | kuzey | Akdeniz | bellapaisgardens.com (Crusader Road) | yemek.com (07.10.2026) | kapı no; sokak adı iki dilde farklı |
| Silver Rocks Restaurant | Girne (Lapta) | kuzey | Balık | silverrocksrestaurant.com (güncel menü) | yemek.com (07.10.2026) | kapı no; adres yalnız yemek.com'da |

Her kaynak, aday dosyası kurulurken (15.11.2026) yeniden açıldı ve aranan ifade sayfada bulundu. Doğrulanamayan kayıt otomatik olarak incelemeye düşüyor. Tablodaki "Eksik" sütunu ilk teslime aittir; güncel durum yukarıdaki kanıt tutarlılığı bölümündedir.

## Bekleyenler (14)

Niazi's koşullu adaya geçti; markanın Lefkoşa ve Gazimağusa şubeleri ayrı kayıt olur.
- **Resmî işletme kaynağı yok (14):** Yalnız tarihli bağımsız yazı var.
  - **Kuzey:** Salut Marin, Lagoon, Archway.
  - **Güney:** Kuzuba, Three and the Cuckoo, Deliyard, Lysiotiki Souvla Pais, Kyparissos, The Farmyard, Artio Symposium, Santerra, Stou Roushia (Larnaka; şube ayrımı gerekli), Lush, Jan Takeaway.
- **Kapsam dışı:** The A Burgers (seyyar araç), The Ship Inn (pub).

## Kaynaklar

| Kaynak | Kullanım | Not |
|---|---|---|
| Cyprus Mail restoran eleştirileri (2026) | Güney için bağımsız, tarihli kaynak; bilgi kutusunda adres ve telefon | 19 yazı tarandı |
| yemek.com: "Girne'nin En İyi Balık Restoranları" (07.10.2026), "Kıbrıs yılbaşı" (25.12.2025) | Kuzey için bağımsız, tarihli kaynak | 2024 tarihli Lefkoşa yazısı eşik dışında; adresleri Google plus code — kullanılmadı |
| İşletmelerin ve otellerin resmî siteleri | Resmî işletme kaynağı | Instagram kanıt sayılmadı |
| Gault&Millau Türkiye 2026, Michelin | — | Kıbrıs kaydı yok |

## Sonraki teknik kabul için varsayımlar

1. **Bölge modeli:** `sehirler.json`'daki `plaka` alanı Kıbrıs'a uymuyor.
   - Önerilen alanlar: `ulke/ada: "kibris"`, `cografiBolge` (Girne, Lefkoşa, Gazimağusa, Güzelyurt, İskele, Lefke; Limasol, Larnaka, Baf, Lefkoşa güney, Ayia Napa/Famagusta) ve ayrı `operasyonelBolge`.
   - Slug: `<ad>-<bolge>-kibris`.
   - Pilot şehir bayrağıyla (`durum: "pilot"`) yalnız Preview'da açılmalı.
2. **Arama:** Yer adları iki ya da üç dilde aranmalı (Girne/Kyrenia, Lefkoşa/Nicosia/Lefkosia, Baf/Paphos, Mağusa/Famagusta). Bunun için arama dizinine eş anlamlı listesi gerekli. Sor'un ilçe çıkarımı İstanbul ilçe listesine bağlı; Kıbrıs için ayrı liste gerekir.
3. **Adres:** Kuzeyde kapı numarası çoğu kez yok; adres yer tarifiyle veriliyor ("Hacı Ali Hotel yanı"). İstanbul'daki "kapı no zorunlu" kuralı Kıbrıs'ta kayıtların çoğunu dışarıda bırakır. Yer tarifli adresin kabul edilip edilmeyeceği sahip ve Codex kararı. Posta kodu güneyde 4 haneli; kuzeyde "99xxx" biçimi Türkiye posta sistemiyle görülüyor.
4. **Telefon:**
   - Kuzey: +90 392 ve 7 hane (yerelde 0392…).
   - Güney: +357 ve 8 hane (sabit hat 2x, mobil 9x; bazı işletmelerde 7000/7777 ile başlayan ücretli/kısa numaralar).
   - Doğrulamada iki biçim ayrı kontrol edilmeli.
5. **Para birimi:** Güneyde EUR. Kuzeyde TRY; sahada EUR/GBP de kabul edilebilir, bu yüzden fiyat gösterimi yapılmamalı ya da işletme bazında doğrulanmalı. Pilot dosyasında fiyat tutulmadı.
6. **Saat dilimi:** İki kesim de bugün EET/EEST kullanıyor (Europe/Nicosia ve Europe/Famagusta). Kuzey 2016–2017'de Türkiye saatini izlemişti. Çalışma saati gösterilecekse teyit edilmeli.
7. **Dil:** İçerik Türkçe, Rumca ve İngilizce kaynaklardan; ad yazımları farklı olabiliyor (ör. Stavri/Stavris Kitchen, Dionysou/Dyonisou).
8. **Koordinat:** Hiç yazılmadı (A-konumsuz). Harita için bağımsız bir açık veri eşleştirmesi (OSM) ayrı bir iş.
9. **Google puan otomasyonu:** Kıbrıs kayıtları kapsam dışında tutulmalı; yeni API maliyeti olmamalı.

## Eksik kararlar — tek liste

Bu araştırmada hiçbiri uygulanmadı.

**Sahip kararı:**
1. **Yer tarifli adres:** Kapı numarası olmayan Kıbrıs adresi (ör. "Hacı Ali Hotel yanı") kabul edilecek mi? Kuzeydeki 4 koşullu adayı doğrudan etkiler.
2. **Tek kaynaktaki sokak/kapı no:** Otel içi restoranlarda (LPM, Novél) bağımsız kaynağın otel adı ve telefonu eşleşiyorsa, resmî kaynaktaki sokak ve kapı no yeterli mi?
3. **"Kıbrıs mutfağı" türü:** Tür listesine eklenecek mi? (Gourmet Taverna şimdilik "Türk mutfağı" önerisiyle.)
4. **Kesim önceliği:** Pilot yayına hazırlanırken önce tek bir kesim mi, iki kesim birlikte mi?

**Teyit gereksinimi:** Bunlar karar değil, kaynakla kapanır.
5. **Bellapais Gardens:** Crusader Road ile Şehit Fuat Niyazi Sokak aynı yol mu?
6. **Silver Rocks:** Fevzi Çakmak Caddesi ikinci bir kaynakta.
7. **Niazi's:** Kayıt hangi Girne şubesi (Ziya Rızkı Str. / Kordonboyu)? No:3 ikinci bir kaynakta.

**Codex/Atlas teknik kabulü:**
8. Telefon (+90 392 / +357), saat dilimi ve para birimi biçimleri.
9. Bölge modeli ve arama eş anlamlıları.
10. Kıbrıs'ın Google puan otomasyonu dışında tutulması.
