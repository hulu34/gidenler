# Paket 10 — Michelin İstanbul 2026 (yüksek profil)

Kontrol tarihi: 2026-11-11 · Dal: `paket/istanbul-10-michelin` (paket 9'un üstünde) · Kataloğa eklenmedi; yayın Codex'te, onay sahipte.

## Kaynak
- **MICHELIN Rehberi Türkiye 2026, İstanbul ili seçkisi:** resmî rehber sayfaları (`guide.michelin.com/en/tr/istanbul-province/...`), 85 restoran.
  - 1 İki Yıldız: TURK Fatih Tutak, Yeşil Yıldız da var (resmî 2026 duyurusunda).
  - 8 Bir Yıldız.
  - 16 Bib Gourmand.
  - 60 rehber seçkisi.
- Dosyada yalnız şu bilgiler tutulur: ayrım, mutfak kategorisi, ilçe, rehber bağlantısı (`data/katalog/michelin-istanbul-2026.json`).
- Rehberden kopyalanmayanlar: metin, fotoğraf, koordinat.
- Yeşil Yıldız yalnız resmî duyuruda adı geçen restoran için işaretlendi. Diğer kaynaklardaki "Neolokal ve Casa Lavanda Yeşil Yıldız" bilgisi rehber sayfasında doğrulanamadığı için yazılmadı.

## Sonuç (85 restoran)

| Durum | Sayı | Yıldızlı | Bib | Seçki |
|---|---:|---:|---:|---:|
| Production kataloğunda zaten var | 12 | 3 (Neolokal, Nicole, Mikla) | 3 | 6 |
| Yeni A (bu paket) | 34 | 1 (TURK Fatih Tutak ★★) | 5 | 28 |
| İnceleme havuzu (A değil) | 39 | 5 (Arkestra, Araka, Araf, Sankai, Casa Lavanda) | 8 | 26 |

- **Yıldızlı kapsama:** Production'da 3/9, bu paketle 4/9.
- **Michelin seçkisi kapsaması:** Production'da 12/85 (%14), bu paketle 46/85 (%54).

## A şartı (her kayıt)
1. **Michelin 2026 kaydı:** resmî rehber sayfası.
2. **Kimlik ve adres:** aşağıdakilerden biri.
   - Resmî sitede ad + telefon/sokak eşleşmesi.
   - Resmî site yoksa OSM kaydında tam adres. Bu yalnız Sapa ve Mahir için geçerli.
3. **Koordinat yalnız OSM'den.** İki durum var:
   - **25 kayıt:** OSM restoran kaydı.
   - **9 kayıt:** OSM'de restoran noktası yok, bunlar işletme kaydı oldu. Konum OSM'deki bina ya da adres noktasından alındı (`location.precision`):
     - adres düzeyi (`address`): Topaz, Nobu;
     - bina düzeyi (`building`): Okra (The Marmara Taksim), Lokanta 1741 (Cağaloğlu Hamamı), Zuma (İstinyePark), Liman (Galataport), BİZ (AKM), Tuğra (Çırağan Sarayı), Borsa (Adile Sultan Sarayı).
4. **Konum rehberdeki ilçeyle aynı ilçe sınırında.**
5. **Tür:** rehberin mutfak kategorisi. Bu açık bir gastronomi tanımıdır; addan tür üretilmedi.
6. **Mükerrer kontrolü:** OSM ref, slug, aynı ad 150 m, aynı bina 60 m, telefon. Karşılaştırılanlar:
   - Production;
   - PR #6, PR #7, PR #8;
   - 906 dalı ve seyrek-ilçeler dalı.

## Mükerrer ve çakışma notları
- **Divan İstanbul:** Lokanta by Divan (Production) ile Maromi İstanbul aynı otelde. İkisi de rehberde ayrı restoran olarak geçtiği için ayrı tutuldu; test bu durumu adla ayırıyor.
- **906 dalı:** aynı OSM kaydı şu 7 restoranda da var: Gallada, Sapa, Şans, Mutfakkoz, Yanyalı Fehmi, Fauna, Ulus 29.
  - 906 dalı yayın adayı değil.
  - 906 günün birinde kataloğa eklenirse `pakete-ekle` aynı OSM kaydını reddeder, yani çift kayıt oluşmaz.
- **OSM adları:** 5 kayıtta OSM adı yazım hatalı ya da eksik. Kayıtta resmî ad kullanıldı, OSM kimliği korundu:
  - "Turk Fatik Tutak" → TURK Fatih Tutak;
  - "Terezza italia" → Terrazza Italia;
  - "Iskele" → Rumelihisarı İskele;
  - "Alaf 2 Tek" → Alaf;
  - "Maromi" → Maromi İstanbul.
- **Şubeli markalar:** Tavacı Recep Usta Bostancı, Sıralı Kebap Etiler ve Borsa Adile Sultan ayrı şube kimliğiyle tutuldu. 906'daki Sıralı Kebap Ümraniye ve Production'daki Borsa Lokantası Caddebostan farklı şubelerdir.

## İnceleme havuzu (39) — `inceleme.json`
Her satırda gerekçe var. Ana nedenler:
- **Açık kaynakta koordinat yok:** 30'a yakın restoran. Resmî site çoğunda kanıt veriyor, ama OSM'de ne restoran ne bina ya da adres noktası var.
  - Yıldızlılar: Arkestra, Araka, Araf, Sankai, Casa Lavanda.
  - Ötekiler: Tershane, Tatbak, Sade, Spago, St. Regis Brasserie, Aila, Herise, Ruby, Kıyı, Park Fora ve diğerleri.
- **Resmî sayfa otomatik isteğe 403:** AQUA, Avlu, ROKA, Akira Back. Erişim atlatılmadı.
- **Resmî site yok ve kimlik yalnız rehberde:** Monteverdi, Basta Neo Bistro, Nazende Cadde, Havuş, Apartıman Yeniköy, Muutto, Ahmet Ustam.
- **Bu kayıtlar otomatik olarak A'ya yükseltilmez.** Konum için iki yol var:
  - OSM'ye nokta eklenmesi (açık kaynak katkısı);
  - ya da sahip onayıyla yerinde kontrol.

## Production'daki Michelin kayıtlarında eksik alan (değiştirilmedi)
- Neolokal: adres "11, Beyoğlu"; sokak yok, telefon yok.
- Karaköy Lokantası ve Beyti Lokanta: adres ve telefon yok.
- Nicole: telefon yok.
- Mikla: OSM adı "Mikla - Turkey fusion".

Bunların düzeltilmesi ayrı bir profil tamamlama işidir. Mevcut kayıtlara bu pakette dokunulmadı.

## Testler (yerel; GitHub Actions'a dokunulmadı)
- `tsc` geçti.
- `restoranpakettest` paket 10: 22/22.
  - Michelin ayrımı rehber dosyasıyla birebir.
  - Yıldızsız restoranda yıldız ifadesi yok.
- Paket 7: 18/18. B1: 20/20. Paket 9: 20/20.
- katalogtest 52/52, bin1test 17/17, seotest 49/49, sortest 322/322.
- **Yayın benzetimi** (yalnız yerel kopyada): paket 7, B1, 9 ve 10 kataloğa eklendi (732 OSM + 26 işletme kaydı = 758 mekân).
  - bin1test, katalogtest, aramatest (758/758 adla bulunur), seotest, anasayfatest, anasayfa8test ve sortest geçti.
  - `next build` ve yerel sunucuda profil, arama, form ve sitemap denetimi: sonuçlar PR açıklamasında.
