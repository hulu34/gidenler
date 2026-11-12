# Faaliyet kanıtı paketi — 456 kayıt (2026-11-12)

Dal: `veri/faaliyet-kaniti-456` (taban: `denetim/katalog-kalite-792`, PR #28). **venues.json değiştirilmedi**; kanıtlar `data/katalog/faaliyet/faaliyet-kaniti-2026-11-12.json` dosyasında. Yayın sırasında `node scripts/katalog/faaliyet-uygula.mjs data/katalog/faaliyet/faaliyet-kaniti-2026-11-12.json --yaz` yalnız `verifiedAt`, `confidence`, `verification` alanlarını ekler. Yayını Codex yapar, onay sahibindedir. Production veritabanına yazılmadı.

**Kapsam:** Kalite envanterinde tarihli faaliyet kanıtı olmayan bütün kayıtlar: ilk OSM aktarımı, dalga 0 (148) ve dalga 1 (308).

**Kanıt standardı** (paket kurallarıyla aynı, gevşetilmedi):
- **E1 resmî site:** ad + (sokak ya da telefon). Telefon yalnız telefon biçimli dizide aranır; sayfadaki bütün rakamlar birleştirilmez.
- **E2 OSM yerinde kontrol tarihi ≥ 2025-01:** `check_date`, `survey:date`, `check_date:opening_hours`. `source:date` sayılmadı.
- **E3 OSM son sürümü yerinde anket uygulamasıyla ≥ 2025-01:** StreetComplete, Every Door.
- **E4 paylaşılan resmî site (zincir ya da kurum):** ad + sokak ve ilçe/mahalle aynı bölümde. Bu sitelerde E1 tek başına sayılmadı.
- **Sayılmayanlar:** sitede yalnız ad + ilçe/mahalle ya da mobil düzenleyici kaydı (Organic Maps, OsmAnd vb.) zayıf kanıt olarak yazıldı, faaliyet kanıtı sayılmadı. Restoran rehberi ve dijital menü bağlantıları resmî site sayılmadı. Google kullanılmadı.

**Yöntem:**
- `faaliyet-osm.mjs`: OSM API'den güncel öğe ve değişiklik kümesi (100'erli istek, saniyede ≤1).
- `faaliyet-site.mjs`: resmî site ana sayfası ve en çok 3 iletişim/şube sayfası. Ölçülmeyen ya da zayıf kalanlar ikinci turda en çok 8 iç sayfa ve bir kez http/www çeşidiyle yeniden denendi. 403/429 yanıtları yeniden denenmedi. Alan adı başına istekler sırayla gitti; sayfa içeriği saklanmadı.
- `faaliyet-karar.mjs`: kayıt başına karar.

## 1. Sonuç

| Durum | Kayıt |
|---|---:|
| İncelenen | 456 |
| Kapanış kaydı olan (closed_confirmed 35 + closed_suspected 17); değiştirilmedi | 52 |
| OSM öğesi silinmiş; işaretlendi, kanıt uygulanmadı | 1 |
| **Güçlü faaliyet kanıtı bulundu** | **145** (açık 404 kayıt içinde %35,9) |
| Güçlü kanıt bulunamadı | 258 |

Kapanış kaydı olan 52 kayıttan hiçbirinde güncel güçlü kanıt çıkmadı; kapanış kararlarıyla çelişki yok.

**Kanıt türü** (bir kayıtta birden çok olabilir):

| Kanıt | Kayıt |
|---|---:|
| E1 resmî site | 112 |
| E2 OSM yerinde kontrol | 32 |
| E3 OSM yerinde anket | 21 |
| E4 resmî şube sayfası | 4 |

**Kategori:** restaurant 134, cafe 11. Kategori ve tür değiştirilmedi.

## 2. Kalite sınıfına etkisi (uygulanmış gibi bellekte ölçüm)

| Sınıf | Envanter (bugün) | Paket uygulanınca | Fark |
|---|---:|---:|---:|
| A | 223 | 302 | +79 |
| B1 | 102 | 102 | 0 |
| kapalı | 35 | 35 | 0 |
| inceleme gerekli | 432 | 353 | -79 |

Kanıt bulunan 145 kayıttan 79 kayıt A'ya çıkıyor; 66 kayıt başka nedenle incelemede kalıyor: tür 39, adres 31, bağlantı 5, seo 4, kategori 3, mükerrer 1. Yalnız faaliyet kanıtı eksik olan kayıt sayısı 139 → 64.

## 3. Kanıt bulunamayanlar (258)

| Resmî site durumu | Kayıt |
|---|---:|
| kayıtlı resmî site yok | 142 |
| site açıldı, ad bulunamadı | 52 |
| site açıldı, ad var; sokak ve telefon yok | 30 |
| site açılmadı | 21 |
| paylaşılan site | 8 |
| site park/satış alanına yönleniyor | 3 |
| kayıtlı bağlantı resmî site değil | 2 |

- 26 kayıtta yalnız zayıf kanıt var (sitede ad + ilçe/mahalle ya da mobil düzenleyici). Sayılmadı; kayıt satırında duruyor.
- Sitesi olmayan 142 kayıt için Google'sız ücretsiz bir faaliyet kaynağı kalmadı. Yerinde kontrol ya da işletmeyle iletişim gerekir.
- Bu kayıtlar hatalı sayılmadı ve katalogdan çıkarılmadı. Yalnız kanıtları kayıt düzeyinde yok.

## 4. Sahip kararı gereken işaretler

**Kapanış ya da kimlik değişimi riski** (alan adı satışta, başka işletmeye yönleniyor, OSM öğesi silinmiş ya da adı değişmiş):

| Kayıt | İşaret | Kapanış kaydı | Bu paketteki durum |
|---|---|---|---|
| Desi vibes (Fatih) | site park/satış alanına yönleniyor (desivibesrestaurant.com → sa.pxdx.co) | yok | kanıt uygulandı |
| Privato Cafe (Beyoğlu) | site park/satış alanına yönleniyor (privatocafe.com → hugedomains.com) | yok | güçlü faaliyet kanıtı bulunamadı |
| Altınkapı Restaurant (Fatih) | site park/satış alanına yönleniyor (altinkapiiskender.com → expireddomains.com) | yok | güçlü faaliyet kanıtı bulunamadı |
| Burger Hopdaddy (Sarıyer) | site park/satış alanına yönleniyor (hopdaddyburger.com → hopdaddy-burger.higgsfield.app) | yok | güçlü faaliyet kanıtı bulunamadı |
| Beso Restaurant Bistro (Fatih) | site başka alana yönleniyor (restaurantbeso.com → steak-okinawa.com) | yok | güçlü faaliyet kanıtı bulunamadı |
| Arda Ocakbaşı (Ümraniye) | site başka alana yönleniyor (ardaocakbasi.com → aseocakbasi.com) | closed_suspected | kapanış kaydı (closed_suspected, 2026-11-08) |
| Pizeria Quattro (Beyoğlu) | OSM öğesi silinmiş (2026-11-12) | yok | OSM öğesi silinmiş |
| Yako Balık (Kadıköy) | OSM adı değişmiş: "Yako Balık" → "Kalis Lokanta" (sürüm 2, 2026-10-29) | closed_confirmed | OSM adı değişmiş; kapanış kaydı (closed_confirmed, 2026-11-06) |

- Bu işaretler `kapanis.json`'a yazılmadı. Kapanış kararı elle bakılarak verilmeli.
- Beso Restaurant Bistro'nun sitesi başka bir işletmeye yönleniyor. Bu kayıt envanterde Byzantion Bistro ile olası mükerrer çiftti; kapanış ya da ad değişimi olabilir.
- Yako Balık zaten kapalı kayıtlı. OSM'de aynı noktada "Kalis Lokanta" var; yeni aday olabilir, bu pakette eklenmedi.
- Desi Vibes'ın sitesi düşmüş, ama OSM'de 2025-10 yerinde kontrol ve 2026-04 Every Door düzenlemesi var. Bu yüzden kanıt uygulandı; site bağlantısı kaldırılmalı.

**Bağlantı güncellemesi** (kapanış işareti değil; site yeni alan adına ya da üst kuruluşa yönleniyor):

| Kayıt | İşaret | Kapanış kaydı | Bu paketteki durum |
|---|---|---|---|
| Ismet Baba (Üsküdar) | site başka alana yönleniyor (ismetbaba.com.tr → ismetbaba.com) | yok | kanıt uygulandı |
| Saray Muhallebicisi (Bakırköy) | site başka alana yönleniyor (saraymuhallebicisi.com → online.saraymuhallebicisi.com) | yok | kanıt uygulandı |
| Tiryaki Restorant (Sarıyer) | site başka alana yönleniyor (tiryakikebap.com → tiryakiyenikoy.com) | yok | kanıt uygulandı |
| Summit Bar & Terrace (Beşiktaş) | site başka alana yönleniyor (conradhotels3.hilton.com → hilton.com) | yok | güçlü faaliyet kanıtı bulunamadı |
| Lalezar Meyhanesi (Şişli) | site başka alana yönleniyor (www3.hilton.com → hilton.com) | closed_confirmed | kapanış kaydı (closed_confirmed, 2026-11-06) |
| d'Orient Büyükada (Adalar) | site başka alana yönleniyor (vitavien.com.tr → vitavien.com) | yok | güçlü faaliyet kanıtı bulunamadı |
| Razaki (Kadıköy) | site başka alana yönleniyor (restaurantguru.com → tr.restaurantguru.com) | yok | güçlü faaliyet kanıtı bulunamadı |
| Nevale Mutfak (Beşiktaş) | site başka alana yönleniyor (nevalemutfak.dijital.menu → dijital.menu) | yok | güçlü faaliyet kanıtı bulunamadı |
| Müptela Kahvaltı Brunch (Ataşehir) | site başka alana yönleniyor (muptelakahvalti.com → muptelakahvalti.com.tr) | yok | güçlü faaliyet kanıtı bulunamadı |
| Dönerci Ali Usta Ataşehir (Ataşehir) | site başka alana yönleniyor (aliusta.com.tr → donercialiusta.com) | yok | güçlü faaliyet kanıtı bulunamadı |

## 5. Elle örnek kontrol

Kabul edilen resmî site kanıtlarından tohumlu rastgele 12 örnek açılıp eşleşen satır okundu: **12/12 doğru** (`elle-kontrol-2026-11-12.json`). Telefon ölçüsü sıkılaştırılınca 3 kaydın telefon eşleşmesi düştü; biri (Musaade Meyhane) bu yüzden kanıtsız kaldı.

## 6. Testler

Paket, çalışma kopyasında `faaliyet-uygula.mjs --yaz` ile uygulandı ve testler bu veriyle çalıştırıldı; ardından `venues.json` geri alındı. Bu yerel bir ölçümdür; Preview ya da Production testi değildir.

| Test | Sonuç | Başarılı / Toplam |
|---|---|---:|
| Faaliyet paketi (`faaliyettest.ts`) | Geçti | 1619/1619 |
| Uygulama: yalnız hedef satırlar değişti, ikinci çalıştırma boş | Geçti | 145 satır; ikinci çalıştırmada 0 |
| Katalog | Geçti | 52/52 |
| Arama | Geçti | 49/49 |
| SEO | Geçti | 49/49 |
| Ana sayfa / V8 | Geçti | 31/31 · 33/33 |
| B1 konum | Geçti | 104 + 3 |
| Yayın ekleme | Geçti | 8/8 |
| Dalga 2 | Geçti | 18/18 |
| Sor Gidenler | Geçti | 322/322 (bu tabanda; paket 16–23 benzetimindeki "yüksek" hatası Codex'te) |
| TypeScript | Geçti | 1/1 |
| Next build | Geçti | 1/1 (1.633 sayfa) |
| Gerçek Vercel Preview | Engelli | Neon dal sınırı; denenmedi |

`verifiedAt` arayüzde gösterilmiyor. Paket yalnız veri kaydını ve kalite sınıfını değiştirir; profil görünümü değişmez.
