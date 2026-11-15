# Kıbrıs pilotu — kaynaklı ve tekilleştirilmiş restoran adayları (15 Kasım 2026)

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
| Güçlü aday (resmî kaynak + tarihli bağımsız kaynak) | 3 | 6 | **9** |
| İnceleme | 4 | 11 | 15 |
| Kapsam dışı | 0 | 2 | 2 |

Pilot sınırı 20'ydi. Ölçütü sağlayan 9 kayıtla durduk; sayı için zayıf kayıt eklenmedi.

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

## Doğrulanmış 9 aday

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

Her kaynak, aday dosyası kurulurken (15.11.2026) yeniden açıldı ve aranan ifade sayfada bulundu. Doğrulanamayan kayıt otomatik olarak incelemeye düşüyor.

## Bekleyenler (15)

- **Adres ve şube çelişkisi (1):** Niazi's (Girne). Resmî site "Kordonboyu Str., Dome Hotel karşısı" diyor, yemek.com "Ziya Rızkı Cad. No:3". Markanın sitesi başka şubeler de listeliyor ve başlığında "Established 1949, Limassol" yazıyor; adanın iki kesiminde marka ve şube ayrımı araştırılmalı.
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

## Sahip kararı gereken konular

1. **Yer tarifli adres:** Kapı numarası olmayan Kıbrıs adresleri kabul edilecek mi?
2. **"Kıbrıs mutfağı" türü:** Tür listesine eklenecek mi?
3. **Kesim önceliği:** Pilot yayına hazırlanırken önce tek bir kesim mi, iki kesim birlikte mi?
