# Yayındaki 26 profilin kalite denetimi — 14 Kasım 2026

**Başlangıç durumu (doğrulandı):** Production `feature/investor-v1` = `c0af4987c19146841494242e65d1cb0bc4dbe1a8`, 793 kayıt. PR #43 ile 26 profil (PR #39'dan 14, PR #40'tan 12), 411 menü kalemi, 16 video ve 3 adres düzeltmesi yayında. Açık PR'lar: #37 (Sor, Codex), #35, #34 (taslak veri paketleri). Codex dalları (`ops/pr43-*`, `inceleme/pr41-*`) yalnız kendi betik ve kanıt dosyalarına dokunuyor; bu dal onlarla ortak dosya değiştirmez.

**Yöntem:** Canlı www.gidenler.com, yalnız okuma. Chrome 375 / 390 / 1280 px ve WebKit 390 px; 26 profil × 4 görünüm = 104 sayfa. Her sayfada: HTTP durumu, yatay taşma, JS hatası, menü bölümü ve başlığı, telefon ve rezervasyon bağlantıları, video oynatıcıları ve İşbirliği etiketi, fotoğraf, JSON-LD. Canlı video listesi `/api/media/<slug>/` ile, katalog telefonları resmî sitelerle karşılaştırıldı. Dokuz profil (Ulus 29, Sunset, Mürver, Nicole, Mikla, Çiya Sofrası, TURK, Hacı Abdullah, Kanaat) ekran görüntüsüyle ayrıca incelendi.

## Özet

- **Kritik:** yok. Menüler doğru restoranda, videolar doğru restoranda (16 yeni videonun hepsi), sponsorluk işaretli video yok, taşma ve JS hatası yok (tek seferlik bir 404 tekrar üretilemedi).
- **Önemli (düzeltildi, bu dal):**
  1. Üst eylem satırı katalog kaydını kullanıyordu: profilde resmî telefonu olan 1924, Kanaat, Nicole, Selim Usta ve TURK'ta "Ara"; Mikla ve Nicole'de "Web sitesi" yoktu. Tüm 70 profilde 13 eksik.
  2. Rezervasyon bilgisi olan profillerde üstte rezervasyona giden yol yoktu; artık "Rezervasyon bilgisi" (#bilgi). "Rezervasyon yap" denmiyor (Gidenler rezervasyon almıyor).
  3. Mürver ve Mikla'da "sitedeki menü temsilî" uyarısı, Ulus 29, Sunset ve Topaz'da fiyat geçerlilik notu menüden uzaktaydı; artık menünün hemen üstünde de var (metin aynen).
  4. 30 kalemden uzun menüler (Hacı Abdullah 79, Ulus 29 57, 1924 55, Sunset 54) mobilde sayfayı çok uzatıyordu; ilk bölümler açık, kalanı katlanır. Bütün ürünler HTML'de kalır.
  5. Menüsüz 15 profilde "Menü" sekmesi çıkışsız bir mesaja gidiyordu; artık resmî siteye bağlantı var.
- **Küçük:** saat aralıkları bitişikti ("12.00-15.00,18.00-02.00" → "12.00–15.00, 18.00–02.00"). Ulus 29'un katalog türü "Türk mutfağı" menüyle uyumsuz (tür paketi PR #34'ün alanı; dokunulmadı). Aşeka'nın menü başlığı "FALL/WINTER 2027" (notta açık).
- **Codex'e:** Çiya Sofrası'ndaki 9 eski video kaydı (3 TikTok, 3 Instagram, 3 YouTube Shorts) bu pakette doğrulanmadı; YouTube başlıkları Çiya Sofrası'nı anlatıyor, TikTok/Instagram başlıkları bu ortamdan okunamadı.
- **Fotoğrafsız profiller:** 26 profilin 25'inde fotoğraf yok (Kanaat'ta 1 Commons). Sayfa "Henüz Gidenler fotoğrafı yok" yazıyor, düzen bozulmuyor; karar için menü, saat, telefon ve rezervasyon bilgisi üstte yeterli. Görsel kaynakları için `FOTOGRAF-ENVANTERI-14-KASIM.md`.

## Tablo (canlı, Chrome 390 px)

| # | Profil | Menü (kalem · fiyat · tarih) | Telefon | Rezervasyon | Video | Fotoğraf | Mobil 375/390/1280 + WebKit | Bulgu |
|---|---|---|---|---|---|---|---|---|
| 1 | 1924-istanbul-beyoglu | 55 · fiyatlı · tarih yok | profil | profil metni | 0 | yok | taşma yok, JS hatası yok | Önemli: üstte Ara yoktu (düzeltildi). 375 px'de tek seferlik 404 kaynak hatası; 4 tekrarda üretilemedi. |
| 2 | aida-vino-e-cucina-kadikoy | yok | profil | profil metni | 0 | yok | taşma yok, JS hatası yok | Kritik/önemli sorun yok. |
| 3 | alaf-besiktas | yok | katalog | profil metni | 2 | yok | taşma yok, JS hatası yok | Menü yoktu (tamamlayıcı 19 kalem kalan-18 dalında). |
| 4 | ali-ocakbasi-karakoy-beyoglu | yok | profil | profil metni | 0 | yok | taşma yok, JS hatası yok | Kritik/önemli sorun yok. |
| 5 | aseka-beyoglu | 20 · fiyatsız · tarih yok | profil | yok | 0 | yok | taşma yok, JS hatası yok | Küçük: menü başlığı 'FALL/WINTER 2027' (notta). |
| 6 | calipso-fish-maltepe | yok | profil | profil metni | 0 | yok | taşma yok, JS hatası yok | Kritik/önemli sorun yok. |
| 7 | ciya-sofrasi-kadikoy | yok | katalog | yok | 11 (2 yeni) | yok | taşma yok, JS hatası yok | Önemli: 9 eski kayıt (3 TikTok, 3 Instagram, 3 YouTube) bu pakette doğrulanmadı; YouTube başlıkları Çiya Sofrası. Menü yok (günlük menü). |
| 8 | cuma-beyoglu | yok | profil | profil metni | 0 | yok | taşma yok, JS hatası yok | Kritik/önemli sorun yok. |
| 9 | deraliye-fatih | yok | profil | profil metni | 0 | yok | taşma yok, JS hatası yok | Kritik/önemli sorun yok. |
| 10 | fauna-atasehir | yok | profil | profil metni | 0 | yok | taşma yok, JS hatası yok | Kritik/önemli sorun yok. |
| 11 | haci-abdullah-beyoglu | 79 · fiyatsız · tarih yok | katalog | yok | 2 | yok | taşma yok, JS hatası yok | Önemli: 79 kalemlik menü mobilde çok uzun (katlandı). Telefon katalogdan, resmî sitedeki tek numarayla aynı. |
| 12 | kanaat-lokantasi-uskudar | yok | profil | profil metni | 2 | 1 Commons | taşma yok, JS hatası yok | Önemli: üstte Ara yoktu (düzeltildi); menü yoktu (tamamlayıcı 153 kalem kalan-18 dalında). Çocuk dostu işareti SSS'te kaynaklı. |
| 13 | lokanta-1741-fatih | 25 · fiyatlı · tarih yok | katalog | profil metni | 0 | yok | taşma yok, JS hatası yok | Küçük: sitede iki farklı saat (notta açık). |
| 14 | mikla-turkey-fusion-beyoglu | 26 · fiyatlı · tarih yok | profil | yok | 0 | yok | taşma yok, JS hatası yok | Önemli: üstte Web yoktu; temsilî menü notu menüden uzaktı (düzeltildi). |
| 15 | murver-beyoglu | 27 · fiyatlı · tarih yok | katalog | profil metni | 2 | yok | taşma yok, JS hatası yok | Önemli: 'temsilî menü' notu menüden uzaktaydı (düzeltildi). |
| 16 | mutfakkoz-kadikoy | 27 · fiyatlı · tarih yok | profil | profil metni | 0 | yok | taşma yok, JS hatası yok | Kritik/önemli sorun yok. |
| 17 | nicole-beyoglu | 18 · fiyatlı · 2026-11-12 | profil | yok | 0 | yok | taşma yok, JS hatası yok | Önemli: üstte Ara ve Web yoktu (düzeltildi). |
| 18 | park-fora-besiktas | yok | katalog | profil metni | 1 | yok | taşma yok, JS hatası yok | Kritik/önemli sorun yok. |
| 19 | rumelihisari-iskele-sariyer | yok | profil | profil metni | 0 | yok | taşma yok, JS hatası yok | Kritik/önemli sorun yok. |
| 20 | sade-bes-denizler-mutfagi-sisli | yok | katalog | profil metni | 0 | yok | taşma yok, JS hatası yok | Kritik/önemli sorun yok. |
| 21 | sunset-grill-ve-bar-besiktas | 54 · fiyatlı · 2026-11-05 | katalog | profil metni | 2 | yok | taşma yok, JS hatası yok | Küçük: sushi ve tatlı menüsü ayrı (notta). Menü 05.11.2026 tarihli, açık. |
| 22 | tarihi-sultanahmet-koftecisi-selim-usta-fatih | yok | profil | yok | 2 | yok | taşma yok, JS hatası yok | Önemli: üstte Ara yoktu (düzeltildi). Aramada 3. sıradaydı (P4'te düzeltildi). |
| 23 | tavaci-recep-usta-bostanci-maltepe | yok | katalog | yok | 0 | yok | taşma yok, JS hatası yok | Kritik/önemli sorun yok. |
| 24 | topaz-beyoglu | 23 · fiyatlı · tarih yok | katalog | profil metni | 0 | yok | taşma yok, JS hatası yok | Küçük: menü 'Eylül 2026 güncellendi' notu artık menünün üstünde. |
| 25 | turk-fatih-tutak-sisli | yok | profil | profil metni | 0 | yok | taşma yok, JS hatası yok | Önemli: üstte Ara yoktu (düzeltildi). Menü kalemi yayımlanmıyor; menüsüz bölüm artık resmî siteye yönlendiriyor. |
| 26 | ulus-29-besiktas | 57 · fiyatlı · 2026-07-07 | katalog | profil metni | 1 | yok | taşma yok, JS hatası yok | Önemli: rezervasyon üstte görünmüyor; saat bitişik yazılıyor. Küçük: katalog türü 'Türk mutfağı' menüyle uyumsuz (PR #34 alanı, dokunulmadı). |

Tarih sütunu: "tarih yok" menüler sayfada "fiyatlar kaynaktaki gibi; son kontrol 13.11.2026" diye görünür; geçerlilik tarihi uydurulmadı.

## Doğrulama

- `npx tsx scripts/profil-kalite-p0-test.ts` — 327/327 (70 profilin tamamında üst eylem satırı ve menü HTML'i).
- Yerel `next dev` + bellek içi PGlite (70 profil uygulanmış; Production'a bağlanmaz): Chrome 375/390/1280 ve WebKit 390'da 10 profil, taşma ve JS hatası yok. Bu yerel bir denetimdir, Preview başarısı değildir.
- Regresyon: katalog 52, arama 49, SEO 51, Seçki 65, Menemen 252, PR39 203, PR40 271, Sor 322, Google 103, rezervasyon 22 geçti. Ana sayfa 30/31 ve medya 164/165 Production tabanındaki bilinen başarısızlıklar.
