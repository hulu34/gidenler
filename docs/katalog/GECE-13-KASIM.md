# Gece operasyonu — 13 Kasım 2026

Taban: Production `feature/investor-v1` @ `9a11a3b8a3a35398bcc4242294dce6377670db88` (793 mekân). Dal: `denetim/gece-13-kasim`.
Production'a yazılmadı, birleştirme ve deploy yapılmadı. Menemen (PR #38) ve Codex'in alanlarındaki dosyalara dokunulmadı.

## Bu gece yapılan yeni işler

### 1. Birleşik aday denetimi (öncelik 4)
- **Betik:** `scripts/katalog/birlesik-aday.mjs`.
- **Çıktı:** `data/katalog/gece-13/birlesik-aday.json`.
- **Kapsam:** açık paket PR'larındaki 334 yeni kayıt, yani paket 15–23 (PR #15, #19, #20, #21, #23, #24, #26, #30, #31). Kayıtlar güncel Production'a ve birbirlerine karşı yeniden denetlendi.
- **Sonuç:** 334 geçerli yeni kayıt (96 A, 238 A-konumsuz, hepsi restoran). Hepsi yayımlanırsa katalog 793'ten 1.127'ye çıkar. Elenen kayıt yok.
- **Sahip kararı (13.11.2026):** Ouzo Roof Restaurant (paket 16 / PR #19), Production'daki `perran-ocakbasi-kadikoy` ile aynı bina adresinde, 40 m mesafede. Sahip iki ayrı işletme olduğunu bildirdi. Karar `data/katalog/gece-13/sahip-kararlari.json` dosyasında.
  - Karar yalnız bu iki slug arasındaki şüpheyi kaldırır.
  - Kesin mükerrer ve kapanış kontrolleri her zaman çalışır.
  - Yeniden çalıştırma aynı çıktıyı verir.
- **Bilgi notları (9):** 8'i aynı telefon ya da site (zincir şubesi olabilir, mükerrer sayılmadı), 1'i sahip kararı.
- **Az temsil edilen ilçelere katkı:**

  | İlçe | Önce | Sonra |
  |---|---:|---:|
  | Kağıthane | 2 | 10 |
  | Bağcılar | 2 | 9 |
  | Tuzla | 6 | 18 |
  | Güngören | 1 | 4 |
  | Çekmeköy | 4 | 10 |
  | Silivri | 3 | 8 |
  | Esenler | 0 | ilk kayıt |

  Sultanbeyli'ye katkı yok.
- Paket dosyaları değişmedi. Yayın sırası Codex'te.

### 2. Resmî siteden adres tamamlama (öncelik 1)
- **Betik:** `scripts/katalog/site-adres.mjs`.
- **Çıktı:** `data/katalog/gece-13/site-adres.json`.
- **Hedef:** adresi ya da kapı numarası eksik 141 kayıt (B1 dışı).
  - 61'inin sitesi yok, 10'u kapalı, 8'i paylaşılan site kullanıyor.
  - Taranan: 57.
- **Sonuç:** otomatik kuralı 4 kayıt geçti.
  - **1 ret:** Küçük Ev. Bulunan adres Levent (Beşiktaş) şubesi; kayıt Sarıyer.
  - **3 kayıt sahip onayıyla uygulandı (13.11.2026):**
    - Altın Sofra (Küçükçekmece): İnönü Caddesi No:144, Yeni Mahalle;
    - Bayındır (Pendik): Mimar Sinan Caddesi No:23, Fevzi Çakmak;
    - Antula Gurme (Beykoz): Orhan Veli Kanık Caddesi No:38, Kavacık Mahallesi.
  - Üç sokak da kayıtlı koordinatın 120 m içinde (OSM Overpass); koordinatlar değişmedi.
- **Elenme nedenleri:**

  | Neden | Kayıt |
  |---|---:|
  | Sitede ad yok | 14 |
  | Kapı numaralı adres yok | 11 |
  | İlçede birden çok şube | 11 |
  | İlçe yakın değil | 7 |
  | Sokak farklı | 4 |
  | Site açılmadı | 6 |

- OSM etiketlerinden tamamlama da denendi ve verim alınmadı: kapı numarası alanında 3 telefon numarası çıktı.
- **`venues.json`:** yalnız bu 3 kaydın `address` alanı değişti; Altın Sofra ve Antula'ya `neighborhood` eklendi.
  - Uygulama `scripts/katalog/site-adres-uygula.mjs` ile yapıldı: varsayılan kuru çalıştırma, yazmak için `--yaz`; tekrar çalıştırmak değişiklik yapmaz.
  - Sor dizininde bu 3 satır güncellendi.
- **Site haritası:** Altın Sofra ve Antula `sitemap-adressiz.json` listesinde kaldı. Liste testte 39 kayıt olarak sabit; adresleri olduğu için haritada kalıyorlar ve artık JSON-LD de alıyorlar.

### 3. Yüksek değerli restoran profilleri (öncelik 3)
14 yeni içerik profili (`content/profiles/<slug>.json`). Hepsi yalnız resmî siteden alındı ve 13.11.2026'da kontrol edildi.
- **Kurallar:**
  - Video, fotoğraf ve misafir yorumu yok.
  - Fiyat yalnız sitede yazıldığı gibi; fiyatı yazılmayan kalem fiyatsız bırakıldı.
- **Profiller:**

  | Profil | İçerik |
  |---|---|
  | TURK Fatih Tutak | Kurallar, ön ödeme, kıyafet; tadım fiyatı not olarak |
  | Nicole | 12.11.2026 tarihli tadım menüsü ve fiyatları |
  | Mutfakkoz | Menü 27 kalem; 20'si sitede fiyatlı, 7'si fiyatsız bırakıldı |
  | Mikla | Temsilî prix fixe menü, fiyatlı |
  | Aşeka | Fiyatsız sezon menüsü, 20 kalem |
  | Cuma | Saat, rezervasyon |
  | Fauna | Kurallar, saat notu |
  | Calipso Fish | Rezervasyon, otopark |
  | Deraliye | Tanıtım, iletişim |
  | Sade Beş Denizler | Saat |
  | Aida | İletişim |
  | Rumelihisarı İskele | İletişim |
  | Tavacı Recep Usta | Bostancı şubesi; zincir notu |
  | Ali Ocakbaşı | Karaköy şubesi |

- **Profili açılamayanlar:**
  - Gallada: Cloudflare 403, aşılmadı.
  - Tatbak: zaman aşımı.
  - Yanyalı Fehmi: TLS sertifikası geçersiz.
  - Mahir ve Sapa: resmî site yok.
  - Khorasani: yetersiz metin.
- **Doğrulama:** `scripts/katalog/profil-dogrula.ts` tüm profilleri denetler. `scripts/gece13-profil-test.ts` profilleri PGlite'ta uygular; gidiş-dönüş, tekrar uygulama ve geri alma kontrol edilir.
- **Uygulama:** Production DB'ye uygulanmadı. Codex yönetim yolundan (`profile-apply`) uygular.
- **Sor dizini:** profiller derlemede Sor dizinine girer. `data/real/sor-index.json` yeniden üretildi; 13 mekânın satırı değişti.

### Eski profillerde bulunan sorun (Codex'e not; kod değiştirilmedi)
4 eski profilin saati JSON-LD'ye çevrilemiyor. `lib/seo.ts` içindeki `openingHoursSpec` "24:00" değerini ve "Mo off" kuralını reddediyor; sonuçta saatlerin tamamı JSON-LD'den düşüyor.
- `kurucesme-balik-besiktas`: Mo-Su 12:00-24:00;
- `poyraz-sahil-balik-restaurant-beykoz`: 10:00-24:00;
- `amara-sile-ocakbasi-restoran-sile`: 24:00 ve 02:00;
- `zennup-1844-fisekhane-zeytinburnu`: Mo off.

Düzeltme iki yoldan biriyle yapılabilir: veri tarafında 24:00 → 00:00 ve "off" kuralını çıkarmak, ya da ayrıştırıcıyı genişletmek. Bu karar Codex'te.

## Önceden tamamlanmış işler (bu gece değişmedi)
- **Açık PR'lar:**
  - PR #28: katalog envanteri.
  - PR #33: faaliyet kanıtı.
  - PR #34: tür ve kategori.
  - PR #35: kapanış işaretleri.
  - PR #38: Menemen.
  - Paket PR'ları #15 ve #19–#31.
- Bu gece bu PR'ların dosyaları değiştirilmedi. Yalnız paket 15–23 kayıtları okundu ve birleşik denetimden geçirildi.

## Kalite sayıları (Production 793, PR #28 denetim betiği)

| Durum | A | İnceleme | Kapalı | B1 |
|---|---:|---:|---:|---:|
| Bugün | 223 | 433 | 35 | 102 |
| + PR #33 faaliyet | 302 | 354 | 35 | 102 |
| + PR #33 + PR #34 tür | 328 | 328 | 35 | 102 |

İki katman uygulandıktan sonra incelemede kalan eksenler:

| Eksen | Kayıt |
|---|---:|
| Faaliyet | 278 |
| Adres | 134 |
| Bağlantı | 93 |
| Tür | 58 |
| Kategori | 8 |
| Mükerrer | 4 |
