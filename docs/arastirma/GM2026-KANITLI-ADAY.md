# İstanbul Gastronomi Atlası — kanıtlı aday araştırması (Gault&Millau 2026 + resmî kaynaklar)

Tarih: 15 Kasım 2026 · Dal: `arastirma/gm2026-kanitli-aday` · Taban: Production `99568ec` (katalog 793 kayıt, `data/` a225e8c ile aynı)

**Yalnız araştırma verisi.** Kataloğa eklenmedi, veritabanına yazılmadı, Production'da gösterilmez. PR #48'e, Codex'in dallarına, Sor'a ve Google otomasyonuna dokunulmadı. Ücretli servis kullanılmadı.

Dosyalar:
- `data/arastirma/gm2026/adaylar.json` — denetlenebilir aday dosyası (her kayıtta durum, kaynak URL'leri, kontrol tarihi, dört ayrı değerlendirme, mükerrer kontrolü, güven, eksikler)
- `data/arastirma/gm2026/eksik-analizi.json` — ilçe ve mutfak türüne göre katalog eksikleri
- `scripts/arastirmagm2026test.ts` — aday dosyasının kalite testi

## 1. Sayılar

| Ölçü | Sayı |
|---|---:|
| Gault&Millau Türkiye 2026 rehberinde İstanbul kaydı (resmî site) | 226 |
| Bunlardan katalogda ya da açık dallarda zaten olan | 117 |
| Açık mükerrer (adı farklı yazılmış ama aynı işletme) | 17 |
| Kapsam dışı (kokteyl barı / pub) | 10 |
| Daha önce incelemede ya da retle bekleyen kayda **yeni kanıt** | 7 |
| **Yeni ve benzersiz aday** | **93** |
| — yüksek güvenle doğrulanan (güçlü) | **29** (15 nitelikli mekân/şube + 14 zincir şubesi) |
| — eksik kanıt nedeniyle bekletilen (inceleme) | **64** |

İlk hedef 100 doğrulanmış restorandı; standardı düşürmeden **29** kayıt doğrulanabildi. Bekletilen 64 kaydın 50'sinde eksik olan yalnız *güncel* faaliyet kanıtı: rehber 2026 baskısında var, ama bugün işletmeyi gösteren ikinci bir resmî kaynak bulunamadı.

## 2. Kabul ölçütü

Varlık, faaliyet, adres ve tür ayrı ayrı değerlendirildi (`degerlendirme` alanı).

- **Varlık ve tür:** Gault&Millau Türkiye 2026 (resmî site, Aralık 2025 yayın). Editoryal rehber; adı, açık adresi, telefonu ve mutfak kategorisini veriyor. Tür yalnız rehberin mutfak açıklamasından alındı; addan tür üretilmedi.
- **Güncel faaliyet:** İşletmenin ya da işletmecisinin (otel, marka) resmî sayfası 15 Kasım 2026'da açılıyor ve işletmeyi gösteriyor. Gösterme ölçütü: ad + telefon ya da kapı no, ya da otelin güncel restoran listesi. Aday dosyası kurulurken her güçlü kaydın kanıt sayfası yeniden açıldı; doğrulanamayan kayıt otomatik olarak incelemeye düştü.
- **Adres:** Kapı numarası zorunlu. Rehber ile resmî kaynak çelişirse kayıt incelemeye alındı.
- **Koordinat:** Yalnız OSM kaydı ad ve konumla eşleşirse yazıldı (1 kayıt: Tas Ramen, `node/11890967545`). Diğerleri **A-konumsuz** önerisiyle; PR #14 ve şema desteği gerekiyor.
- **Puan ve sıralama:** Rehber puanı (toque, /20) ve rehber metni saklanmadı. Gidenler puanı, popülerlik ya da sıralama üretilmedi. Google verisi kullanılmadı.
- **Aynı binada farklı konseptler** otomatik mükerrer sayılmadı. Örnekler: The Lobby ile Gallada (Peninsula); Baylan ve White Burger ile Liman İstanbul (Galataport).

## 3. Yüksek güvenle doğrulanan 29 aday

### Nitelikli mekân ve şubeler (15)

| Mekân | İlçe | Tür | Güncel resmî kaynak |
|---|---|---|---|
| Agata Nişantaşı | Beşiktaş | Modern mutfak | agataistanbul.com: ad, telefon, kapı no |
| Aliée İstanbul, Taste by Thomas Bühner | Beyoğlu | Modern mutfak | Accor otel sayfası: ad, telefon, kapı no |
| Basta! Street Food Bar | Kadıköy | Sokak lezzeti | bastafood.com iletişim |
| Basta! Street Food Bar Kuşdili | Kadıköy | Sokak lezzeti | bastafood.com iletişim (ikinci adres) |
| Baylan Bebek | Beşiktaş | Pastane | baylangida.com şube listesi |
| Baylan Galataport | Beyoğlu | Pastane | baylangida.com şube listesi |
| Beca | Beşiktaş | Kahvaltı | becaistanbul.com |
| Da Vittorio Ristorante Italiano | Beşiktaş | İtalyan | Accor (Mövenpick) sayfası |
| Hamdi Restaurant Şişli | Şişli | Geleneksel mutfak | hamdi.com.tr şube adresi |
| Olea & Bar | Beşiktaş | İtalyan | Mandarin Oriental güncel restoran listesi |
| The Lobby | Beyoğlu | Modern mutfak | Peninsula restoran sayfası (saatler + adres) |
| The Levant Tahinier | Zeytinburnu | Tatlıcı | tahinier.com: ad, telefon |
| Tas Ramen & Sushi Bar (A) | Şişli | Sushi / Japon | tasramen.com iletişim, aynı adres |
| Tuzz | Beyoğlu | Modern mutfak | Khai Hotel resmî sitesi |
| 16 Roof | Beşiktaş | Asya mutfağı | Accor (Swissôtel) sayfası |

### Zincir şubeleri (14)

White Burger by Serhat Doğramacı'nın resmî şube listesinde ayrı kapı numaralı adresi olan İstanbul şubeleri:
- Bakırköy, Başakşehir, Beşiktaş, Beylikdüzü, Esenyurt (Marmara Park), Eyüpsultan, Galataport, Kadıköy (Söğütlüçeşme), Maltepe (Hilltown), Nişantaşı, Pendik, Sarıyer (Yeniköy), Ümraniye (Finanskent) ve Üsküdar.

PR #48'deki Ümraniye Meydan şubesi tekrar eklenmedi. Tür marka düzeyinde (burger). Sayıya katkısı gerçek ama gastronomik değeri düşük; yayına alınıp alınmayacağı ayrı bir karar.

## 4. Bekletilenler (64)

| Eksik | Sayı | Örnekler |
|---|---:|---|
| Güncel faaliyet kanıtı | 50 | Zübeyir Ocakbaşı Taksim, Lokanta Yoğurt, OCAK (alan adı çözülmüyor), Eskiyer ve Papalina (alan adı çözülmüyor), Hakkasan (Mandarin Oriental'in güncel listesinde yok, kapanmış olabilir), La Boom ve Atölye (bulunan alan adı başka işletmenin) |
| Adres (kapı no eksik ya da çelişkili) | 13 | Madam Despina (3 farklı kapı no), MykOrini (27J ↔ No:5), Natolia ve İsokyo (kapı no yok), Hüsrev (Gayrettepe ↔ Esentepe), White Burger Moda (rehber adresi güncel şube listesinde yok) |
| Şube kimliği | 1 | Palude (rehber metni Urla diyor, adres Zeytinburnu) |

Her kaydın gerekçesi `neden` alanında. Bu kayıtlar silinmedi ve kabul edilmiş gösterilmedi.

## 5. Mükerrer olduğu için elenenler

- **Açık mükerrer (17):** Adı farklı yazılmış ama aynı işletme. Örnekler:
  - Production'da: Karaköy Lokantası, Hünkar Nişantaşı, Tarihi Bebek Balıkçı, Borsa Kandilli, Kör Agop. Kör Agop'un Production'daki ilçesi Beyoğlu, rehberde Fatih; bu bir veri düzeltmesi adayı.
  - PR #48'de: Çok Çok Thai (= CokCok Thai), Da Mario Etiler, Il Cortile, Masa, The BARN, Sahan Ataşehir, Chalet, Akali.
- **Zaten katalogda ya da dallarda (117):** Production + 111 uzak dal + Production `data/` altındaki 84 dosya (eski paketlerin inceleme ve ret listeleri dahil) ile karşılaştırıldı. İlk eşleştirmenin yanlış "var" dediği kayıtlar ilçe ve adres düzeyinde elle ayıklandı: Hamdi, Günaydın Etiler, Yeniköy Balıkçısı, Lokanta Yoğurt, OCAK.
- **Bekleyen kayda yeni kanıt (7):** Yeni aday sayılmadı; mevcut bekleyen kaydın yükseltilmesi için kanıt olarak raporlanıyor.
  - Hamdi Eminönü (paket 11'de tür eksikti; rehber "Geleneksel mutfak" veriyor)
  - Shang Palace ve Tam Ocakbaşı (paket 6 ve 7 incelemesi)
  - Baylan Kadıköy (paket 6)
  - Zula (paket 7 reddi; rehber burger türünü veriyor, güncel kaynak yok)
  - Strada Suadiye ve Arnavutköy Balıkçısı (906 havuzu)

## 6. Katalog eksikleri

**İlçe, yüz bin kişiye düşen yayımlanmış aktif mekân** (`eksik-analizi.json`):

| İlçe | Nüfus 2025 | Production aktif | /100 bin | PR #48 | Bu araştırma |
|---|---:|---:|---:|---:|---:|
| Esenler | 419.878 | 0 | 0,0 | 3 | 0 |
| Bağcılar | 707.635 | 2 | 0,3 | 10 | 0 |
| Gaziosmanpaşa | 478.395 | 2 | 0,4 | 3 | 0 |
| Güngören | 251.242 | 1 | 0,4 | 4 | 0 |
| Kağıthane | 446.420 | 2 | 0,4 | 9 | 0 |
| Sultangazi | 529.306 | 2 | 0,4 | 3 | 0 |
| Sultanbeyli | 378.908 | 2 | 0,5 | 1 | 0 |
| Esenyurt | 1.003.905 | 6 | 0,6 | 5 | 1 |
| Küçükçekmece | 785.270 | 6 | 0,8 | 15 | 0 |

Editoryal rehberler yalnız merkez semtleri kapsıyor: bu araştırmanın güçlü adaylarının çoğu Beşiktaş, Beyoğlu, Şişli ve Kadıköy'de. Seyrek ilçeler editoryal kaynakla kapanmıyor.

**Mutfak türü (Production aktif / PR #48 / bu araştırma):**

| Tür | Production | PR #48 | Bu araştırma | Değerlendirme |
|---|---:|---:|---:|---|
| Ocakbaşı ve kebap | 123 | 124 | 0 | güçlü |
| Balık ve deniz ürünleri | 83 | 52 | 0 | güçlü |
| İtalyan / pizza | 59 | 38 | 2 | yeterli |
| Steakhouse | 23 | 15 | 0 | yeterli |
| Kahvaltı | 19 | 33 | 1 | zayıf |
| Japon | 17 | 9 | 1 | zayıf |
| Pastane / tatlıcı | 17 | 40 | 3 | zayıf |
| Lokanta / esnaf lokantası | 14 | 11 | 0 | **çok zayıf** |
| Asya (Çin, Tay, diğer) | 10 | 8 | 1 | **çok zayıf** |
| Meyhane | 7 | 21 | 0 | **çok zayıf** |
| Modern / çağdaş / şef | 4 | 2 | 4 | **çok zayıf** |
| Kore | 3 | 3 | 0 | **çok zayıf** |

Editoryal kapsama: Michelin İstanbul 2026'nın 85 kaydından yalnız yaklaşık 51'i yayımlanmış aktif katalogda; kalanı PR #48 ve önceki paketlerde bekliyor. Gault&Millau 2026'nın 226 İstanbul kaydının 76'sı hiçbir dalda yoktu. 93 yeni adayın kalan 17'si resmî şube listelerinden geldi: 3 nitelikli şube ve 14 zincir şubesi.

Kullanıcı açısından en büyük boşluklar:
- esnaf lokantaları ve köklü lokantalar;
- meyhane;
- şef restoranları, fine dining ve yeni nesil;
- Kore ve Asya mutfakları;
- seyrek ilçelerdeki yerel mekânlar.

## 7. 2.000 hedef tablosu

| | Toplam | Aktif | 2.000 aktife kalan |
|---|---:|---:|---:|
| **Production (yayımlanmış, doğrulanmış)** | 793 | **758** | **1.242** |
| + PR #48 adayları (596, yayımlanmadı) | 1.389 | 1.354 | 646 |
| + bu araştırmanın güçlü adayları (29, yayımlanmadı) | 1.418 | 1.383 | 617 |
| + bekleyen kayda yeni kanıt (7, yükseltilirse) | 1.425 | 1.390 | 610 |
| (inceleme 64 — kanıt tamamlanmadan sayılmaz) | — | — | — |

Kalan sayı resmî olarak yalnız Production satırıdır: **1.242**. Diğer satırlar adayların bağımsız kalite ve teknik kabulden geçmesi hâlinde olası toplamlardır.

## 8. Üçlü ekosistem notu

`kaynaktaOneCikan` alanı yalnız araştırma verisidir. Kaynakta adı geçen öne çıkan yemekleri tutar; örnekler:
- Basta: dürüm, kuzu burger;
- Baylan: Adisababa, Montebianco;
- Adana Ocakbaşı: ciğer, uykuluk;
- Hüsrev: kuru fasulye.

Bu alan YemekYorum'da doğrulanmış menü ya da tadım olarak yayımlanmaz. RestoranYorum için ziyaret deneyimi üretilmedi.

## 9. Testler

| Test | Ortam | Sonuç |
|---|---|---|
| `scripts/arastirmagm2026test.ts` | yerel dal, taban 99568ec; PR #48 havuzu (596) git'ten okundu | Geçti 359/359 |
| Kanıt sayfalarının yeniden açılması (29 güçlü kayıt) | aday dosyası kurulurken, 15.11.2026 | Geçti (doğrulanamayan kayıt otomatik incelemeye düşer) |
| Preview | — | Çalıştırılmadı (veri katalogda değil, arayüzü etkilemiyor) |
| Production | — | Dokunulmadı |

## 10. Riskler

- **Faaliyet tarihi:** Rehber Aralık 2025'te yayımlandı. Güçlü kayıtlarda güncel kanıt resmî sayfa olsa da sitelerin güncelliği değişkendir.
- **Alan adı:** OCAK, Eskiyer ve Papalina'nın alan adları çözülmüyor. Kapanış kanıtı değil ama izlenmeli.
- **Hakkasan:** Mandarin Oriental'in güncel restoran listesinde yok; kapanmış olabilir.
- **Koordinat:** 29 kaydın 28'i A-konumsuz. Yayın için PR #14 ve şema desteği gerekiyor.
- **Zincir şubeleri:** 14 kayıt marka düzeyinde tür taşıyor; ürün açısından değeri düşük.

## 11. Sonraki araştırma için kaynaklar

1. **Michelin 2026 seçkisi:** Yayımlanmamış ~34 kaydın PR #48 ve önceki paketlerdeki inceleme kayıtlarını yükseltmek. Yeni kaynak gerekmez.
2. **Gault&Millau 2026'nın bekletilen 64 kaydı:** İşletmelerin rezervasyon sayfaları ya da otel işletmecisi sayfaları ile tek tek güncel faaliyet kanıtı.
3. **Köklü markaların resmî şube listeleri:** Baylan, Hamdi ve Hüsrev'de olduğu gibi. Gaziantep ve Hatay mutfağı markaları ile esnaf lokantası zincirleri; seyrek ilçeler için de verimli.
4. **Belediye ve meslek kuruluşları:** İBB ve ilçe belediyelerinin "tarihî esnaf" ve "asırlık esnaf" listeleri, esnaf odaları. Esnaf lokantası ve tarihî restoran boşluğu için.
5. **Culinary Backstreets ve benzeri editoryal yayınlar:** Yalnız yazının tarihi ve kapı numarası olan kayıtlar, ikinci bir güncel kaynakla birlikte.
6. **Sahip kararı gereken kaynak türü:** Resmî sitesi olmayan işletmede Instagram hesabı ya da sipariş platformu sayfası tek başına güncel faaliyet kanıtı sayılır mı? Şu an sayılmıyor; tarih doğrulanamıyor.
