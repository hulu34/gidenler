# Kapanış ve faaliyet denetimi — sabah raporu (2026-11-12)

Dal: `veri/kapanis-isaretleri`. Taban Production kodu: `feature/investor-v1` @ 721b1a1. Diğer veri PR'larından bağımsız.

**`data/real/kapanis.json` bu PR'da değişmiyor.** Production'a ve Production veritabanına dokunulmadı.

| Durum | Ne |
|---|---|
| Planlanan | 7 kural değişikliği + 3 sahip kararı (üçü de 12.11.2026'da onaylandı) |
| Yerelde hazırlanan | karar dosyası, uygulama betiği, testler; yerelde uygulanıp ölçüldü, sonra geri alındı |
| Preview'da doğrulanan | yok (Neon dal sınırı, Engelli) |
| Production'da yayımlanan | yok |

**Uygulama** (Codex, yayın sırasında):
```
node scripts/katalog/kapanis-uygula.mjs data/katalog/kapanis/kapanis-kararlari-2026-11-12.json --yaz
node scripts/katalog/kapanis-uygula.mjs data/katalog/kapanis/kapanis-kararlari-2026-11-12.json --yaz --sahip=onayli
npx tsx scripts/sor-index.ts   # ad değiştiği için Sor dizini yeniden üretilir
```
- İlk komut yalnız görünür etkisi olmayan 7 kural değişikliğini yazar.
- **3 sahip kararı onaylandı** (12.11.2026, "Üçü de onay"). Onaylar karar dosyasında kayıtlı (`sahip[].onay`). `--sahip=onayli` yalnız onay kaydı olanları uygular; düz `--yaz` hâlâ hiçbir sahip kararını uygulamaz.
- **Arda Ocakbaşı → Ase Ocakbaşı:** Ad değişikliği ayrıca onaylandı (12.11.2026, "Evet, adı değiştir"; `adDuzeltme`). `--sahip=onayli` `venues.json`'da yalnız bu kaydın `name` alanını yazar. Profil adresi (`/mekan/arda-ocakbasi-umraniye`), OSM ref, adres, telefon ve diğer alanlar korunur; ikinci profil açılmaz.

**Kurallar** (kararlar `scripts/katalog/kapanis-karar.mjs` tarafından denetlenir; ihlalde çıktı yazılmaz):
- **Kesin kapanış:** En az iki bağımsız kapanış sinyali gerekir ve en az biri Google dışı ve güçlü olmalı. Tek bir Google ya da tek bir OSM sinyali yetmez.
- **Ayrı değerlendirilenler:** İşletme kapanışı, şube kapanışı (marka açık), isim değişikliği, taşınma ve aynı yerde yeni işletme.
- **İsim değişikliği ya da yeni işletme:** Bu bir kapanış sinyali sayılmaz.
- **Yeni işletme:** Eski işletmenin profiline dönüştürülmez.
- **Yeniden açık:** Resmî kaynakta güçlü açık sinyali gerekir: aynı adres ve telefon.
- **Karar kaydı:** Her kararda tür, güven, kimlik (ad, şube, ilçe, adres, telefon, OSM öğesi; katalogdan) ve kanıtlar (kaynak, bağlantı, tarih, güç) yazılı.
- **Google:** Bu pakette yeni Google okuması yapılmadı. "Google (önceki denetim)" satırları mevcut kapanış kaydından geliyor; Google bağlantısı kanıt olarak kullanılmadı.

**Kaynaklar:**
- **OSM:** öğe geçmişi ve changeset açıklamaları; ~60 m içindeki OSM notları. Yalnız mekânın adını taşıyan notlar kullanıldı.
- **Resmî kaynaklar:** resmî siteler ve şube listeleri.
- **Arama:** bağımsız rehber ve haber araması. Açılmayan sayfalar ve arama özetleri zayıf sayıldı.

**Kapsam (59 kayıt):**
- Kapanış kaydındaki 53 kayıt: 35 kesin, 17 şüpheli, 1 yeniden açık.
- Faaliyet paketinde kapanış ya da kimlik işareti taşıyan 6 açık kayıt.

## 1. Kesin kapanış

**Bu paket yeni kesin kapanış yazmıyor.** Tek kesinleştirme önerisi Emirgan Sütiş (Arnavutköy); o da sahip kararında (§5).

Mevcut 35 kesin kapanışın Google dışı ikinci kaynağı:

| Sınıf | Kayıt | Mekânlar |
|---|---:|---|
| Google dışı güçlü ikinci kaynak | 3 | Refik (2020 haberleri), Tahtalıköy (alan adı BTK kararıyla kapatılmış), Kiss The Frog (bu pakette: OSM sahadan "geschlossen" notu, 13.06.2025) |
| Google dışı zayıf ikinci kaynak | 2 | Gasto Nişantaşı (sunucu varsayılan sayfası), Niwa (alan adı bırakılmış) |
| İsim değişikliği ya da yeni işletme (ikinci kaynak sayılmadı) | 1 | Yako Balık (§2) |
| Çelişkili kanıt | 2 | The Hunger Ümraniye (güçlü), Mama Bowl (zayıf) (§4) |
| **Yalnız Google (tek sinyal)** | **27** | aşağıda |

**Tek Google sinyaline dayanan 27 kesin kapanış — sahip kararı: kesin kalsın (12.11.2026).**
- **Kayıtlar:** Acı Biber, Ala Türk Mutfağı, Bishop, Çekmeköy Nefist Döner, Cluster Society, CoffeeBoss, Curtis, Dubb Indian, Frontiere, Gardaş Cağ Kebap, Gospoda 1882, Gram, Hira Han, Köprüaltı, Lalezar Meyhanesi, Olivia's Pizzeria, Ono, Öz Pide, Palulu Cumali, Pidepark, Rice House, Tepsi Et Başakşehir, Usturmaca Balık, Vagabondo's, Whisper Kitchen Bar, Yeniköy Kavak Balıkçısı, Zoom Bahçe.
- **Dayanak:** Önceki denetimde tek bir Google görünümüyle kesinleştirildiler; OSM'de ne kapanış ne açılış izi var.
- **Karar:** Kayıtlar değişmiyor, kesin kapalı kalıyorlar. Karar `kapanis-elle` dosyasında (`sahipKararlari`) ve üretilen kararlarda kayıt bazında (`kesinKapanis[].sahipKarari`) yazılı.
- **Kuralın kapsamı:** İki bağımsız sinyal kuralı yeni kesinleştirmelere uygulanıyor; bu 27 kayda geriye dönük uygulanmadı.
- **Yeniden inceleme:** Bu kayıtlardan birinde Google dışı bir açık sinyali (resmî site, OSM yerinde kontrol, sahadan not) çıkarsa o kayıt ayrıca incelenir.

## 2. İsim değişikliği

| Mekân | Bugün | Bulgu | Kimlik kanıtı | Güven | Karar |
|---|---|---|---|---|---|
| Arda Ocakbaşı (Ümraniye) | şüpheli | Resmî alan adı aseocakbasi.com'a yönleniyor; site "Ase Ocakbaşı" adını kullanıyor | Aynı adres (Baraj Yolu No:44), kayıttaki telefon (0532 178 27 32), info@ardaocakbasi.com | yüksek | **Onaylandı:** yeniden açık + profil adı "Ase Ocakbaşı" (aynı profil) |
| Yako Balık (Kadıköy) | kesin kapalı | OSM öğesi 29.10.2026'da "Kalis Lokanta" adına çevrilmiş | Yok: aynı işletmenin yeni adı mı, yeni işletme mi bilinmiyor | düşük | **Kural:** yalnız not. Kapanışın ikinci kaynağı sayılmadı. Kalis Lokanta bu profile dönüştürülmez; ayrı aday |

## 3. Taşınma (olası)

| Mekân | Bugün | Bulgu | Güven | Karar |
|---|---|---|---|---|
| Pizzeria Quattro (Beyoğlu) | açık (kapanış kaydı yok) | OSM öğesi 11.11.2026'da silindi; resmî alan adı satılık; rehberde ayrı ve daha yeni bir "Pizzeria Quattro Taksim" kaydı var | düşük | **Kural:** yeni şüphe kaydı (görünür etki yok); kapanış ya da taşınma elle doğrulanmalı |
| Dem Karaköy (Beyoğlu) | şüpheli | 2017 haberi yeni yere taşındığını anlatıyor; bir rehberde "Artık Kapalı" başlığı var (sayfa giriş istiyor) | düşük | Şüphe kalıyor; kayıttaki adresin eski mi yeni mi olduğu bilinmiyor |

## 4. Çelişkili kanıt

| Mekân | Bugün | Kapanış sinyali | Açık sinyali | Güven | Karar |
|---|---|---|---|---|---|
| The Hunger Ümraniye Limonlu Cadde | kesin kapalı | Google (06.11, tam görünüm) | Resmî şube listesinde "Ümraniye Limonlu Cadde" (12.11); OSM'de 19.06.2026 "şubesinin açılışı için" düzenlemesi | düşük | **Sahip:** şüpheye indir |
| Mama Bowl Kozyatağı | kesin kapalı | Google (06.11) | Site açık, çalışma saati yazıyor (tarihsiz); OSM notu Temmuz 2025 açılışı | orta | **Kural:** yalnız not; kapanış korunur |
| Et-Inn Kebap & Steak | şüpheli | Google (çelişkili) | Site yanıt veriyor (içerik okunamadı); sipariş platformunda listeli | düşük | **Kural:** yalnız not; şüphe kalıyor |
| Blak Coffee Co. | şüpheli | Google (eşleşme yok) | Sipariş platformunda Cihannüma şubesi | düşük | **Kural:** yalnız not; şüphe kalıyor |

## 5. Sahip kararları (üçü de onaylandı, 12.11.2026)

| Mekân | Tür | Onaylanan karar | Görünür etki |
|---|---|---|---|
| Arda Ocakbaşı | isim değişikliği | şüpheli → yeniden açık; profil adı "Ase Ocakbaşı" (ayrı onay) | Ad: profil başlığı, arama, Sor ve SEO başlığı yeni adı gösterir; "Arda" aramasıyla bulunmaz, eski profil adresi çalışır. Kalite sınıfı A'ya çıkar |
| The Hunger Ümraniye Limonlu Cadde | çelişkili kanıt | kesin kapalı → şüpheli | **Var:** kapanış notu kalkar, listelere ve Sor'a döner, Google puanı varsa görünür |
| Emirgan Sütiş (Arnavutköy kaydı) | şube kapanışı (marka açık) | şüpheli → kesin kapalı. Sinyaller: resmî şube listesinde Arnavutköy yok (güçlü) + konumdaki kapalı Google kaydı (zayıf) | **Var:** kapanış notu, listelerden ve Sor'dan çıkar, Google puanı gizlenir |

**Ayrıca, kayıt düzeltmesi gerekenler** (bu pakette yok, ayrı küçük veri işi):
- **Site bağlantısı kaldırılmalı:** Privato Cafe (alan adı satışta), Altınkapı (alan adının süresi dolmuş), Burger Hopdaddy (otomatik üretilmiş sayfa), Desi Vibes (park alanı; OSM'ye göre açık).
- **Beso Restaurant Bistro:** Alan adı başka işletmeye yönleniyor; Byzantion Bistro ile olası mükerrer.
- **Ercan Burger (Pendik):** Ercan Pizza ile aynı adreste; olası mükerrer.

**Ad değişikliğinin yan etkileri (Arda → Ase):**
- **Arama:** Arama yalnız güncel addan takma ad üretiyor. Eski adla bulunabilmesi için kodda bir takma ad alanı gerekir; bu Codex'in alanı ve bu pakette yok.
- **Google puanı:** Günlük kontrol, kayıtlı Google kaydının adını ("Arda") yeni adla karşılaştıracak. Ad benzerliği düşeceği için eşleşme yeniden onaya düşebilir. Otomasyon ve zamanlama değişmedi.
- **OSM:** Öğede ad hâlâ "Arda Ocakbaşı".
- **Web sitesi:** Kayıttaki site (ardaocakbasi.com) yeni siteye yönleniyor ve çalışıyor; değiştirilmedi.

## 6. Şüphe olarak kalan 11 kayıt (yeni güçlü kanıt yok)

Artlocalist, Beş Bıçak, Cabra Loca (Fatih şubesi), Ercan Burger (Pendik), Fish Var, Hacı Ali Ocakbaşı, Hanedan Et, Lunchbox, Marmaris Expres, Nusr-Et Burger Bebek, Ringa Sea Food. Gerekçe ve kaynaklar `kalsin` bölümünde.

Şüpheli 17 kaydın kalan 6'sı:
- Dem Karaköy (§3);
- Et-Inn, Blak ve Komün: not eklendi, şüphe sürüyor (§4, §7);
- Arda ve Emirgan Sütiş: sahip kararı (§5).

Bu kayıtlar için ücretsiz, Google dışı ve saldırgan olmayan başka kaynak kalmadı; karar yerinde kontrol ister.

## 7. Kural değişiklikleri (7) — ayrı ayrı test edildi

| # | Mekân | Değişiklik | Değişen alan |
|---:|---|---|---|
| 1 | Kiss The Frog | Google dışı ikinci kaynak (OSM notu) | note, sources |
| 2 | Yako Balık | Not: isim değişikliği ya da yeni işletme; ikinci kaynak sayılmadı | note, sources |
| 3 | Mama Bowl | Not: zayıf çelişki | note, sources |
| 4 | Et-Inn | Not: zayıf açık işaretleri | note |
| 5 | Blak Coffee | Not: zayıf açık işareti | note |
| 6 | Komün | Not: zayıf kapanış işaretleri | note |
| 7 | Pizzeria Quattro | Yeni closed_suspected kaydı (Google kullanılmadı) | yeni kayıt |

Hiçbirinde `state` ya da `checkedAt` değişmiyor. Kesin kapalı sayısı 35 kalıyor.

## 8. Kalite sınıfına etkisi (yerelde ölçüldü, geri alındı)

| Durum | A | İnceleme | B1 | Kapalı |
|---|---:|---:|---:|---:|
| Bugün | 223 | 432 | 102 | 35 |
| 7 kural değişikliği | 223 | 432 | 102 | 35 |
| Kural + 3 sahip kararı | 224 | 431 | 102 | 35 |

## 9. Testler (taban `feature/investor-v1`)

| Test | Sonuç | Başarılı / Toplam |
|---|---|---|
| kapanistest | Geçti | 523/523 |
| … 7 kural değişikliği ayrı ayrı: yalnız o kayıt, yalnız note/sources, beklenen değer, diğer veri dosyaları bayt bayt aynı, tekrar çalıştırma 0 | Geçti | 7/7 kayıt |
| … sahip kararları varsayılan çalıştırmada uygulanmıyor; tek onay yalnız o kaydı uyguluyor | Geçti | 3/3 kayıt |
| … 792 kaydın kimliği tekil; veri dosyaları bayt bayt aynı; kapanış kaydı yalnız hedeflerde değişiyor (kural ve kural + sahip) | Geçti | 2/2 durum |
| … tam tekrar çalıştırma: 0 değişiklik, dosya bayt bayt aynı | Geçti | 2/2 durum |
| … sahip kararı: 27 tek sinyalli kesin kapanış kayıtlı, kesin kapalı ve pakette dokunulmamış | Geçti | 27/27 kayıt |
| … onaylı kip (`--sahip=onayli`): yalnız onaylı 3 kayıt; Arda'nın katalog adı değişmiyor; kesin kapalı 35; tekrar çalıştırma 0 | Geçti | 1/1 |
| … ad düzeltmesi: yalnız onaylı kayıtta, yalnız `name` alanı; diğer 791 kayıt ve bütün satırlar aynı; tekrar çalıştırma 0 | Geçti | 1/1 kayıt |
| kapanistest bozuk girdi denemesi: adla birlikte başka alan yazan betik | Geçti (hata yakalandı) | 1/1 |
| Onaylı kip + ad (Sor dizini yeniden üretildi): Katalog / Arama / SEO / Ana sayfa / V8 | Geçti | 52/52 · 49/49 · 49/49 · 31/31 · 33/33 |
| Onaylı kip + ad: B1 / Yayın ekleme / bin1 / Sor + dizin / Google puanı / tsc | Geçti | 104+3 · 8/8 · 18/18 · 322/322 · 103/103 · 1/1 |
| Onaylı kip + ad: next build | Geçti (derleme içi tip kontrolü kapalı) | 1/1 (1.633 sayfa) |
| Yerel profil: başlık, sayfa başlığı ve JSON-LD "Ase Ocakbaşı"; kapanış notu yok; arama "Ase Ocakbaşı" 1. sırada, "Arda Ocakbaşı" bulmuyor (beklenen); 5 profilde kapanış notu doğru | Geçti | 1/1 + 5/5 |
| kapanistest bozuk girdi denemeleri (tek sinyalle kesinleştirme; checkedAt'i değiştiren betik) | Geçti (hata yakalandı) | 2/2 |
| Katalog / Arama / SEO (kural ve kural + sahip) | Geçti | 52/52 · 49/49 · 49/49 |
| Ana sayfa / V8 | Geçti | 31/31 · 33/33 |
| B1 konum / Yayın ekleme / bin1test | Geçti | 104+3 · 8/8 · 18/18 |
| Sor + dizin kontrolü | Geçti | 322/322 · 1/1 |
| Google puanı (gpuantest; bugün, kural, kural + sahip) | Geçti | 103/103 |
| tsc | Geçti | 1/1 |
| next build (kural + sahip) | Geçti | 1/1 (1.633 sayfa) |
| Yerel profil HTML'i: kapanış notu 6 profilde beklendiği gibi; arama API'sinde Emirgan "kapalı", The Hunger işaretsiz | Geçti | 8/8 |
| Vercel Preview | Engelli | Neon dal sınırı |

- **Görsel inceleme yapılmadı:** Profiller HTML olarak denetlendi.
- **Ortam notu (ad düzeltmesi turu):**
  - Bu çalışma klasöründeki `node_modules`, ana proje klasörüne (`gidenler/node_modules`) giden bir kısayol. O klasör 15:59'da boşaldı ve 5 dakikada dolmadı. Ana klasöre dokunulmadı.
  - Paketler kilit dosyasıyla bu klasöre ayrı kuruldu (`npm ci --ignore-scripts`). Testlerden sonra kurulum silindi ve kısayol geri kondu.
  - `next build` tip kontrolü adımında bellek yetmediği için düştü. Tip kontrolü `tsc` ile ayrıca geçti. Derleme, yalnız yerelde `next.config.ts`'e geçici olarak eklenen derleme içi tip ve lint atlamasıyla geçti; değişiklik hemen geri alındı ve commit'e girmedi.
- **Google puanı:** Otomasyonu ve 06.00/08.30 zamanlaması değişmedi.
- **Dosyalar:**
  - `data/katalog/kapanis/`: elle kanıt dosyası, üretilmiş kararlar, OSM özeti.
  - `scripts/katalog/kapanis-*.mjs`: karar, uygulama, OSM geçmişi, OSM notları.
  - `scripts/kapanistest.ts`.
