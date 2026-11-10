# Çok şehir, çok kategori ve ölçek — prototip ve ölçümler

Dal: `mimari/sehir-kategori`. Bu dal `veri/istanbul-genisleme` üzerine kuruludur.

Production'a etkisi:
- Pilot şehir bayrak kapalıyken derlemeye hiç girmez. Bu, `.next` çıktısında `cankaya-ankara` aranarak doğrulandı.
- `VERCEL_ENV=production` iken bayrak açık olsa da yüklenmez.

## 1 · Şehir modeli

- **Kayıt:** `RealVenueRecord.city` isteğe bağlı il kimliğidir.
  - Alan yoksa kayıt İstanbul sayılır.
  - Mevcut 574 kaydın kimliği, slug'ı ve URL'si değişmez.
- **Kimlik:**
  - İstanbul dışında slug biçimi `<ad>-<ilçe>-<il>`.
  - Aynı adlı iki mekân farklı ilde ayrı kimlik alır.
  - Şube ayrımı: ad + ilçe + (gerekirse mahalle/sokak) + il.
- **Doğrulama:**
  - `invalidRecord` koordinatı kaydın ilinin sınır kutusunda arar.
  - İlçe ataması OSM ilçe sınırıyla yapılır.
  - Bilinmeyen il ve `city`'si düşmüş Ankara kaydı geçersiz sayılır.
- **Şehir kaydı:** `data/katalog/sehirler.json` (`yayinda` / `pilot` / `plan`).
  - Genişleme sırası koda yazılmaz. `lib/katalog/sehirSirasi.ts`, TÜİK dosyasından hesaplar.
- **URL ve SEO:**
  - Profil URL'si düz kalır: `/mekan/<slug>/`, canonical aynı.
  - Şehir sayfası: `/sehir/<il>/`. Pilot şehirde `noindex`.
  - Başlıkta ve yapılandırılmış veride il entity'den gelir: `addressRegion`, "(Çankaya, Ankara)".
  - Sitemap yalnız görünür kayıtları içerir.
- **Arama:**
  - Sunucu araması zaten il alanını tanıyor: belgede `city`, sözlükte il adı konum sayılır, `searchV3({ city })` filtresi var.
  - "Çankaya kafe" → Çankaya. "ankara" → Ankara.
  - "Kadıköy kebap" → yalnız İstanbul (test).
- **Öneri havuzu:** ana sayfa, Keşfet ve sıralamalar İstanbul'la sınırlı (`activeEntities`). Pilot kayıt İstanbul listelerine karışmaz.
- **Sor Gidenler:**
  - Dizin derlemede üretilir. Pilot derlemede Ankara mekânlarını içerir.
  - Metinlerdeki "İstanbul" varsayımı bir sonraki adımda şehir bilgisine bağlanmalı. Bu turda Sor'un yanıt metnine dokunulmadı.
- **Kullanıcı deneyimleri:** deneyim `places.slug`'a bağlıdır. Şehir alanı deneyim kaydını değiştirmez.

**Ankara pilotu:** 30 kayıt (A sınıfı), `data/sehir-pilot/ankara/`.
- Kaynak: OSM + resmî site ölçümü + OSM bina adresi.
- Dağılım: 27 Çankaya, 2 Yenimahalle, 1 Altındağ.
- Havuz: 2.367 OSM noktası, 112 resmî siteli aday; 32 B, 1.957 C.
- Pilot yalnız `NEXT_PUBLIC_SEHIR_PILOT=1` ile derlenen izole Preview'da görünür.

## 2 · Çok kategorili şema (prototip, hiçbir sayfaya bağlı değil)

`lib/kategori/sema.ts`:
- **Ortak temel:** kimlik, ad, şube, ana/alt kategori, konum, iletişim, saat, faaliyet, görsel (hak kaydıyla), kaynaklar, doğrulama sınıfı.
- **Kategoriye özgü ek nesneler:**
  - Restoran: mutfak, servis, rezervasyon, menü, atmosfer.
  - Otel: konaklama türü, yıldız, oda, tesis belgesi, giriş-çıkış.
  - Kuaför: hizmetler, cinsiyet, randevu, fiyat şeffaflığı.
  - Spor: tesis, üyelik, 24 saat.
- **Değerlendirme kategoriye özgüdür** (`DEGERLENDIRME`):
  - Başka kategorinin ölçütü verilirse puan hesabı hata verir. Restoran puanı otele aktarılamaz (test).
  - Kategoriler arası tek sıralama yoktur.
- **Mevcut restoran sistemi korunur:** `fromRealVenue` bugünkü kaydı ortak şemaya kayıpsız eşler (ham kayıt aynen). Bugünkü tablolar ve sayfalar değişmez.
- **Aday kaynağı:** OSM etiket eşlemesi `OSM_ESLEME` (`tourism=hotel`, `shop=hairdresser`, `shop=beauty`, `leisure=fitness_centre` …). Ad kategori üretmez.

**Maliyet ve riskler:**
- **Doğrulama yükü:**
  - Otelde tesis belgesi (Kültür ve Turizm Bakanlığı), kuaförde hijyen ve fiyat beyanı gibi kategoriye özgü kanıt gerekir.
  - OSM'de kuaför ve güzellik merkezi kapsaması restorandan zayıftır.
- **Hukuki:** sağlık beyanı içeren güzellik hizmetleri ayrıca değerlendirilmeli; kategori uyum politikası zaten var (`compliance.mode`).
- **Ürün:** ana sayfa bugün yeme-içme. Yeni kategori ayrı giriş ve ayrı sıralama ister; restoran gelişimini durdurmamalı.
- **Teknik:** aşağıdaki ölçek sınırları her kategori için geçerli. Kategori eklemek istemci paketini daha da büyütür.

## 3 · Ölçek ölçümleri

Ölçümler sentetiktir; gerçek kullanıcı yükü değildir. `N=<kayıt> npx tsx scripts/yuk-testi.ts` ağsız ve veritabanısız çalışır (yerel Mac, Node 24).

| Kayıt | Arama p50 / p95 | Sor p50 / p95 | İlk arama (dizin) | Kart havuzu | Sitemap URL | Varlık verisi | Bellek |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 574 (bu dal) | 5,7 / 8,2 ms | 11,1 / 17,1 ms | 42 ms | 4 ms | 528 | 334 KB | 71 MB |
| 1.000 | 9,4 / 15,0 ms | 19,7 / 28,3 ms | 65 ms | 4 ms | 877 | 614 KB | 117 MB |
| 2.000 | 18,8 / 28,6 ms | 39,5 / 54,3 ms | 115 ms | 5 ms | 1.726 | 1,25 MB | 170 MB |
| 5.000 | 47,8 / 75,7 ms | 101 / 133 ms | 274 ms | 6 ms | 4.283 | 3,18 MB | 330 MB |
| 10.000 | 94,7 / 152 ms | 203 / 275 ms | 550 ms | 8 ms | 8.548 | 6,40 MB | 344 MB |

**Derleme (`next build`, yerel, veritabanısız, bu dal, 574 kayıt):**
- Süre: 31 s.
- İlk yükleme JS: ana sayfa 262 kB, /ara 237 kB, profil 252 kB.
- Mekân verisini taşıyan ortak istemci parçası: 391 KB ham, 82,5 KB gzip.
- `venues.json` kayıt başına yaklaşık 80 bayt gzip.

**Bulgular:**
1. **İstemci paketi en önce kırılacak yer.**
   - Bugün 13 istemci bileşeni bütün mekân verisini içe aktarıyor: /ara, /harita, /sor, /kategori, Keşfet, karşılaştır ve diğerleri.
   - Kayıt başı ~80 bayt gzip ile 5.000 kayıtta ortak parça ~+0,4 MB, 10.000'de ~+0,8 MB büyür. Bu, mobil için kabul edilemez.
   - **Öneri:** 2.000 kayıt geçilmeden bu sayfalar sunucu aramasına geçmeli. `/api/ara` zaten var: sayfalama, önbellek ve kart alanları.
   - Harita için görünür alan (bbox) uç noktası gerekir.
2. **Sunucu araması doğrusal.** 5.000'e kadar p95 < 80 ms yeterli. 10.000'de p95 152 ms.
   - **Öneri:** 5.000 öncesi ters dizin (token → belge) ve il/kategori ön filtresi. Ücretli arama motoru gerekmez.
3. **Sor aday bulma doğrusal.** 10.000'de p95 275 ms; model süresine göre küçük. İl ön filtresi yeterli.
4. **Profil sayfaları derlemede üretiliyor** (`generateStaticParams` bütün mekânlar, ISR 1 saat).
   - Her sayfa derlemede veritabanı okuması yapar; süre kayıtla doğrusal büyür.
   - **Öneri:** 2.000 sonrası yalnız deneyimi ya da puanı olanları önceden üret, gerisini ilk istekte üret (`dynamicParams`). URL değişmez.
5. **Sitemap 10.000'de tek dosyada sorun değil** (sınır 50.000 URL). Çok şehirde il başına sitemap dizini önerilir.
6. **Veritabanı:** bu turda migration yok. Mekân kimliği JSON'da; `places` satırı tohumlama ile oluşur.
   - Çok şehir için `places`'e `city` sütunu ileride gerekir. Bu turda Production'a uygulanmadı; plan yalnız belgede.

## 4 · Lansman için içerik hazırlık ölçütleri (öneri)

"Bugün" sütunu bu turda ölçüldü. Eşikler öneridir.

| Gösterge | Bugün (Production 457) | Bu dal (574) | Geniş tanıtım için eşik |
|---|---:|---:|---:|
| En az 10 mekânı olan ilçe (39'dan) | 13 | 13 | 30 |
| En az 1 mekânı olan ilçe | 37 | 37 | 39 |
| En zayıf 10 ilçede ortalama mekân / 100 bin kişi | 0,31 | 0,31 | ≥ 3 |
| Tam (kapı numaralı) adres oranı | %69,6 | %75,8 | ≥ %90 |
| Kaynaklı mutfak türü oranı | %83,6 | %86,9 | ≥ %95 |
| Türü yalnız addan gelen kayıt | 30 | 30 | 0 |
| A sınıfı oranı | %45,1 | %56,3 | ≥ %70 (C yayında %0, kapalı notlu hariç) |
| Katalog içi mükerrer çift | 2 çift | 2 çift | 0 |
| Kalıcı kapalı / şüpheli (açık listelerde gösterilmez) | 35 / 17 | 35 / 17 | şüpheli 0 (karara bağlanmış) |
| Dolu profil oranı | %42,0 | %38,9 | ≥ %60 |
| Fotoğraf oranı (hakkı kayıtlı) | %1,3 (6) | %1,0 (6) | ≥ %30 (ilk 500 mekânda) |
| Google puanı görünen (onaylı eşleşme) | 331 (%72) | 331 | — (gösterim kuralı ayrı) |
| Adıyla arandığında ilk 5'te | — | 117/117 yeni | %100 |
| Sor adıyla tanıma (tek şube) | 368/456 | %86 yeni | ≥ %90 |
| Sunucu arama p95 (sentetik, hedef kayıt sayısında) | 8 ms | 8 ms | < 100 ms |
| İstemci ortak parçası (gzip) | — | 82,5 KB | < 150 KB |

**Notlar:**
- Mobil arama süresi gerçek cihazda ölçülmedi. Preview ölçümü Actions sunucusundan yapıldı (PR'da).
- Rezervasyon ve harita bağlantısı kalitesi bu turda ölçülmedi:
  - Rezervasyon düğmesi bugün yalnız "iletişim" kipinde.
  - Harita bağlantısı her kayıtta koordinattan üretiliyor.
