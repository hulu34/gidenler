# Katalog hazırlama sistemi

Aday bulmaktan Codex'e teslime kadar 10 adım. Hepsi yeniden çalıştırılabilir. Ham veri ve önbellekler repoya girmez; yalnız paketler ve raporlar girer.

## Kaynaklar ve kurallar
- **OpenStreetMap (Overpass):**
  - Ad, tür, konum, adres, iletişim ve çalışma saati alınır.
  - ODbL atfı korunur: her pakette ve sınır dosyasında "© OpenStreetMap katkıcıları, ODbL".
- **OSM Nominatim (ters konum):**
  - Yalnız OSM'deki bina adresi alınır.
  - Saniyede en çok 1 istek, tanıtıcı User-Agent, önbellek.
- **İşletmenin resmî sitesi:**
  - Yalnız ölçüm yapılır: sayfada ad, sokak, mahalle/ilçe ve telefon geçiyor mu.
  - Sayfa içeriği saklanmaz.
  - Sosyal medya ve sipariş platformları resmî site sayılmaz.
- **MICHELIN Rehberi (resmî rehber sayfası, paket 10+):**
  - Yalnız ayrım (yıldız / Bib Gourmand / seçki), mutfak kategorisi ve rehber bağlantısı tutulur (`data/katalog/michelin-istanbul-2026.json`).
  - Rehber metni, fotoğrafı ve koordinatı kopyalanmaz. Koordinat yine yalnız OSM'den gelir.
  - Faaliyet kanıtı sayılır; tek başına A yapmaz. Ayrıca resmî sitede ad + telefon/sokak ya da OSM kaydında tam adres aranır.
  - Yıldızsız restoran yıldızlı gösterilmez; ayrım test edilir (`restoranpakettest`).
- **Google:**
  - Google içeriği bu sistemde hiç kullanılmaz: puan, yorum, fotoğraf, adres yok.
  - Ücretli API çağrısı yok.
  - Google puanı sistemi ayrı ve dokunulmadı.

## Adımlar

| # | Adım | Araç | Çıktı |
|---|---|---|---|
| 1 | Aday bul | Overpass sorgusu (il bbox / il alanı) | ham JSON (scratch) |
| 2 | İlçe ata | `lib/katalog/geo.ts` + `data/katalog/<il>-ilceler.json` | il dışı elenir |
| 3 | Mevcutla karşılaştır, mükerrer ayır | `scripts/katalog/aday-havuzu.mjs` (`lib/katalog/aday.ts`) | havuz |
| 4 | Adres ve şube doğrula | `site-dogrula.mjs` (resmî site), `adres-ters.mjs` (OSM bina adresi) | kanıt önbelleği |
| 5 | Tür sınıflandır | `lib/katalog/mutfak.ts` | çoklu, kaynaklı etiket |
| 6 | Kanıt ve kaynak bağlantısı | paket satırındaki `kaynak`, `kanit`, `adresKaynagi` | |
| 7 | Güven seviyesi | `lib/katalog/kalite.ts` → A/B/C | |
| 8 | İnceleme kuyruğu | `inceleme.json` (B kanıtlı + C kanıtlı/mükerrer), `ret.json` | |
| 9 | Yayına hazır paket | `paket-uret.mjs` → `venues-dalgaN.json` + `paket.json` | yalnız A |
| 10 | Kataloğa ekle ve teslim et | `pakete-ekle.mjs` + `scripts/katalogtest.ts` | Codex inceler; yayın kararı sahibin |

Katalogdaki mevcut kayıtlar için aynı sınıflandırmayı `katalog-kalite.mjs` yapar. Kayıtları değiştirmez; yalnız rapor üretir. `envanter.mjs` ilçe ve hücre (semt) kapsamasını çıkarır.

```bash
npx tsx scripts/katalog/aday-havuzu.mjs ham.json havuz.json data/real/venues.json data/real/isletme.json <diğer paketler...>
npx tsx scripts/katalog/site-dogrula.mjs havuz.json site-kanit.json
node scripts/katalog/adres-ters.mjs havuz.json site-kanit.json ters.json
TERS=ters.json npx tsx scripts/katalog/paket-uret.mjs havuz.json site-kanit.json data/paket/istanbul-6 6 2026-11-10 data/real/venues.json data/real/isletme.json <diğer paketler...>
node scripts/katalog/pakete-ekle.mjs data/paket/istanbul-6/venues-dalga6.json
npx tsx scripts/katalogtest.ts
```

İstanbul dışı il için `SEHIR=ankara` verilir. Sınır dosyası `data/katalog/ankara-ilceler.json` olur ve slug'a il eklenir.

## Güven seviyeleri (yeni aday)

**Ret:** pakete hiç girmez.
- Marka etiketi (zincir).
- OSM'de kapalı işareti.
- Genel ad ("Kafe", "Restoran").
- Kurum, otel ya da kapalı alan.
- Aday içinde çift kayıt.

**C:** doğrudan yayımlanmaz.
- Mükerrer şüphesi:
  - aynı OSM kaydı;
  - aynı ad 150 m içinde;
  - yazım farkı (Levenshtein ≤ 1–2) 150 m içinde;
  - aynı bina adresi;
  - aynı telefon;
  - aynı site alanı.
- Zincir şüphesi: aynı site 2+ noktada ya da aynı ad 3+ noktada ve 2+ ilçede.
- Türü belirsiz fast food.
- Nargile kafe.
- Paket içinde aynı bina.
- Faaliyet kanıtı yok.

**B:** kanıt var ama eksik alan yazılı.
- Kapı numarası.
- Kaynakta mutfak türü.
- Addaki tür ipucu doğrulanmamış.

**A:** hepsi aranır.
- **Faaliyet ve kimlik:** resmî sitede ad + (sokak ya da telefon) eşleşmesi, ya da OSM yerinde kontrol tarihi ≥ 2025-01.
- **Tam adres:** OSM `addr:street` + `addr:housenumber`, ya da OSM bina adresi.
- **Kaynaklı tür.**
- **İlçe sınırı uyumu.**
- **Mükerrer ve zincir şüphesi yok.**

## Güven seviyeleri (mevcut kayıt)

Bir kaydın Google puanıyla eşleşmiş olması tek başına A değildir. A için ayrıca şunlar aranır:
- kapı numaralı adres,
- kaynaklı tür,
- OSM kaydının bugün de durması,
- ilçe sınırı uyumu.

C nedenleri:
- kalıcı kapalı ya da kapanış şüphesi (`kapanis.json`);
- OSM kaydı silinmiş ya da kapalı işaretli;
- koordinatı başka ilçede;
- katalog içinde çift kayıt;
- gösterilen tür addan türemiş ve kaynakla çelişiyor.

## Mutfak kuralları
- **Tür kanıtının düzeyi ayrı yazılır** (paket 11+, `turKanitDuzeyi`):
  - **şube:** türü o şubenin ya da tek konumun kendi sayfası söylüyor.
  - **marka:** markanın resmî sitesindeki genel tanım. Yalnız tek konseptli markada ve resmî şube listesindeki şubeye uygulanır.
  - Yetersiz kanıtlı kayıt A'ya yükseltilmez.
  - Resmî sitesine istenmeyen reklam metinleri sızdırılmış ya da alan adı park edilmiş işletmede site, faaliyet kanıtı sayılmaz.
- **Etiket yalnız kaynaktan gelir.** Mekânın adı etiket üretmez.
  - Örnek: Japon Erdal'ın adında "Japon" geçer ama kaynakta türk + pide yazar. Japon etiketi verilmez; çelişki rapora not düşülür.
- **Fine dining, popüler, ödüllü gibi nitelikler OSM'den hiç üretilmez.** Yalnız elle ve yazılı kaynakla verilir.
- **Bir mekân birden çok etiket taşıyabilir.** Sıra, kaynaktaki sıradır.
- **Mevcut kayıtların gösterilen türü topluca değiştirilmez.**
  - "Addan tür" sayısı ölçülür: yayında 30 kayıt, 906 dalında 123.
  - Bu kayıtlar ayrı bir düzeltme turunun konusudur.
