# Tür ve kategori paketi — 172 kayıt (2026-11-12)

Dal: `veri/tur-kategori` (taban: `veri/faaliyet-kaniti-456`, PR #33). **venues.json ve duzeltmeler.json değiştirilmedi.**

- **Kararlar:** `data/katalog/tur/tur-kategori-2026-11-12.json`.
- **Uygulama:** yayın sırasında `node scripts/katalog/tur-uygula.mjs data/katalog/tur/tur-kategori-2026-11-12.json --yaz` çalıştırılır.
  - **Tür:** `duzeltmeler.json`'a `kind` + `sourceUrl` + `why` yazılır. Bu, sitenin zaten kullandığı tür düzeltme biçimi.
  - **Kategori:** `venues.json`'da yalnız o kaydın `categoryId` alanı değişir.
- **Yayın sorumlusu:** Codex; onay sahipte. Production veritabanına yazılmadı.

**Kapsam:** Kalite envanterinde tür ya da kategori sorunu çıkan bütün kayıtlar:
- genel türlü ("Restoran", "Kafe", "Bar"): 159;
- kategori çelişkili: 13.

**Kanıt standardı** (paket kurallarıyla aynı, gevşetilmedi; addan tür üretilmedi):

- **Resmî site tanımı.** İşletmenin kendi açık tür tanımı paket 14 ölçütüyle elle okundu: sayfa başlığı, açıklama, ilk başlık, JSON-LD.
  - Kabul edilen 13 ifade `data/katalog/tur/site-tanimlari-2026-11-12.json` dosyasında.
  - Karar betiği her ifadenin ölçülen sayfada gerçekten geçtiğini yeniden denetler.
  - Kabul edilmeyenler:
    - belirsiz tanım;
    - yalnız ad;
    - sipariş ya da menü platformu;
    - paylaşılan sitede şube bölümü olmayan kayıt;
    - resmî şube listesinde olmayan şube.
- **OSM'nin bugünkü `cuisine` etiketi.** Eşleme paket 7+ ile aynı (turkish → Türk mutfağı, chinese → Asya mutfağı …).
  - Belirsiz değerler tür seçmez: `american`, `meat`, `mediterranean`, `greek`, `world`. Yanlarında açık bir değer varsa o kullanılır.
    - Örnek: Antiochia'nın `mediterranean;turkish` etiketi "Dünya mutfağı" değil, "Türk mutfağı" olur.
  - Restoran kategorisinde ilk etiket kafe/tatlı/fırın ise restoran türü yazılmaz; kayıt sahibe gider.
  - Kafe kategorisinde yalnız kafe ailesi tür olur: Kahveci (coffee_shop), Tatlıcı, Fırın, Kahvaltı.
  - Bar kategorisinde `amenity=pub` → Pub.
- **Önce gelen kural:** Site, OSM etiketiyle uyumlu ve daha belirgin bir tür söylüyorsa site tanımı kullanılır. Örnekler: Güneşin Sofrası → Meyhane, Heybet → Dönerci. Uyumsuzsa uygulanmaz.
- **Kategori.** OSM `amenity=cafe` olan ve türü Tatlıcı ya da Kahvaltı olan restoran kayıtları kafe kategorisine alınır.
  - Emsal: katalogda aynı tür ve aynı OSM etiketindeki 6 tatlıcı ve 3 kahvaltıcı zaten kafe kategorisinde.
  - Diğer kategori sorunları sahibe gider.
- **Uygulanmayanlar:**
  - kapanış kaydı olan kayıt;
  - OSM öğesi silinmiş ya da adı değişmiş kayıt;
  - türü daha önce elle düzeltilmiş kayıt (Seyirtepe).
- Google kullanılmadı.

**Yöntem:**
- `faaliyet-osm.mjs` (`HEDEF=` ile): 172 kaydın OSM öğesi, bugünkü sürüm.
- `tur-site.mjs`: 99 kayıtlı sitenin ana sayfası ve en çok 2 "hakkımızda/menü" sayfası.
  - Yalnız kısa üst bilgiler okundu; gövde metni saklanmadı.
  - Alan adı başına istekler sırayla gitti; 403/429 yeniden denenmedi.
- `tur-karar.mjs`: kayıt başına karar.

## 1. Sonuç

| Durum | Kayıt |
|---|---:|
| Genel türlü kayıt | 159 |
| **Kaynaklı tür bulundu** | **86** |
| … OSM `cuisine` / `amenity=pub` | 73 |
| … resmî site tanımı | 13 |
| Tür uygulanmadı | 73 |
| Kategori çelişkili kayıt | 13 |
| **Kategori düzeltildi** (restoran → kafe) | **5** |
| Kategori sahibe bırakıldı | 8 |

**Yeni türler** (86):

| Tür | OSM | Resmî site | Toplam |
|---|---:|---:|---:|
| Türk mutfağı | 58 | 1 | 59 |
| Asya mutfağı | 7 | 0 | 7 |
| Dünya mutfağı | 5 | 0 | 5 |
| Lokanta | 0 | 3 | 3 |
| Meyhane | 0 | 2 | 2 |
| Pub | 1 | 1 | 2 |
| Kahveci | 0 | 1 | 1 |
| Tatlıcı | 1 | 0 | 1 |
| Kebapçı / Ocakbaşı | 0 | 1 | 1 |
| Karadeniz mutfağı | 0 | 1 | 1 |
| Kahvaltı | 0 | 1 | 1 |
| Dönerci | 0 | 1 | 1 |
| Pideci | 0 | 1 | 1 |
| Sokak lezzeti | 1 | 0 | 1 |

- **Eski tür:** Restoran 82, Kafe 2, Bar 2. Dalga 0: 28, dalga 1: 56, dalga 6: 2.
- **"Asya mutfağı" alan Hint restoranları** (Desi Vibes, Fusion Indian, Kaan): paketlerin tür sözlüğünde Hint mutfağı yok.
- **Aynı marka, farklı tür:** Cantinery'nin iki şubesi farklı tür alıyor (Beşiktaş Türk mutfağı, İstinye Park Dünya mutfağı) çünkü OSM etiketleri farklı.

**Resmî siteden alınan 13 tür:**

| Restoran | İlçe | Yeni tür | İşletmenin kendi ifadesi | Yer |
|---|---|---|---|---|
| Petra Roasting Co. | Beşiktaş | Kahveci | "taze kavrulmuş çekirdekleriyle … kahve deneyimi" | ana sayfa açıklaması |
| Çınaraltı Mangalbaşı | Ataşehir | Kebapçı / Ocakbaşı | "özenle hazırlanan ızgara çeşitleri, mezeler ve salatalarla" | ana sayfa açıklaması |
| Muhlama Karadeniz Mutfağı | Ataşehir | Karadeniz mutfağı | "Karadeniz Mutfağının En İyi Temsilcisi" | açıklama ve JSON-LD |
| Moston Cafe Restoran | Maltepe | Lokanta | "Moston Ev Yemekleri & Zeytinyağlılar" | Maltepe menü sayfası başlığı |
| Menemenci Haydar | Silivri | Kahvaltı | "Çakallı menemen, serpme kahvaltı …" | ana sayfa açıklaması |
| Zennup 1844 Fişekhane | Zeytinburnu | Türk mutfağı | "Fişekhane Şube Menüsü; … geleneksel Türk mutfağı" | şube sayfası |
| Adile Sultan Ümraniye | Ümraniye | Lokanta | "Ümraniye Restoran Şube \| Adile Sultan Ev Yemekleri" | şube sayfası başlığı |
| Heybet | Başakşehir | Dönerci | "Heybet Döner Lokantası" | ana sayfa başlığı |
| Konya Mevlana | Bahçelievler | Pideci | "Konya mutfağının etli ekmek, pide ve kebap lezzetleri" | hakkımızda |
| Güneşin Sofrası | Kadıköy | Meyhane | "Güneşin Sofrası – Meyhane" | ana sayfa başlığı |
| Nebras | Pendik | Lokanta | "açık büfe yemek, kahvaltı ve ev yemekleri konseptiyle" | ana sayfa açıklaması |
| Saklı Kadeh | Maltepe | Meyhane | "Saklı Kadeh Meyhane \| Altıntepe Bostancı" | ana sayfa başlığı |
| Bosphorus Brewing Company | Şişli | Pub | "Ingiliz Pub atmosferinde" (OSM `amenity=pub` ile aynı) | ana sayfa açıklaması |

**Kategori düzeltmeleri (restoran → kafe):**

| Mekân | İlçe | Tür | OSM |
|---|---|---|---|
| Viva Gelateria di Roma | Bakırköy | Tatlıcı | amenity=cafe, cuisine=ice_cream;coffee_shop |
| Antepli Hünkar Künefe | Kartal | Tatlıcı | amenity=cafe |
| 700 Gram | Kadıköy | Kahvaltı | amenity=cafe, cuisine=breakfast |
| Flake Breakfast & More | Kadıköy | Kahvaltı | amenity=cafe, cuisine=breakfast;turkish |
| Samatya Cafe ve Van Kahvaltı Salonu | Fatih | Kahvaltı | amenity=cafe |

Antepli Hünkar Künefe'nin türü ("Tatlıcı") yalnız addan geliyor; OSM'de mutfak etiketi yok. Kategori OSM etiketine göre düzeldi, tür değiştirilmedi.

## 2. Kalite sınıfına etkisi (uygulanmış gibi bellekte ölçüm)

`TUR=` ve `FAALIYET=` ortam değişkenleriyle `katalog-denetim.ts`. Dosyalar değişmedi.

| Durum | A | İnceleme gerekli | B1 | Kapalı | Tür sorunu | Kategori sorunu |
|---|---:|---:|---:|---:|---:|---:|
| Bugün | 223 | 432 | 102 | 35 | 159 | 13 |
| Yalnız bu paket | 225 | 430 | 102 | 35 | 73 | 8 |
| Yalnız faaliyet paketi (PR #33) | 302 | 353 | 102 | 35 | 159 | 13 |
| **İki paket birlikte** | **328** | **327** | 102 | 35 | 73 | 8 |

- **Bu paketin tek başına etkisi küçük.** Tür düzelen kayıtların çoğu dalga 0–1'den ve tarihli faaliyet kanıtları da eksik.
- **Faaliyet paketiyle birlikte** 26 kayıt daha A'ya çıkıyor, örneğin Pandeli, Çiya Sofrası, Giritli, Olden 1772, Muhlama, Chef Taus, Şafak Pub.
- **Değişmeyenler:** B1 (102) ve kapalı (35) aynı kalıyor. B1 kayıtlarında koordinat ve adres değişmiyor; bunu test ediyor.
- **Kategori dağılımı:** kafe 114 → 119, restoran 667 → 662, bar 11.

## 3. Tür bulunamayanlar (73)

| Neden | Kayıt | Örnekler |
|---|---:|---|
| Kapanış kaydı var (closed_confirmed / closed_suspected); dokunulmadı | 20 | Dem Karaköy, Emirgan Sütiş, Refik, Mama Bowl, Bishop |
| OSM'de mutfak etiketi yok, kayıtlı resmî site yok | 17 | Mikla, Kızılkayalar, Asmalı Cavit, Barba Yani, Nicole, Le Pere Bistrot |
| OSM'de mutfak etiketi yok, sitede açık tür tanımı yok | 14 | Feriye, Develi, Vefa Bozacısı, Küçük Çamlıca Köşkü, Ghalia |
| Site tanımı reddedildi | 11 | Hasırlı (şube listesinde yok), Cajun Corner (marka geneli), Cookshop (paylaşılan site), Trakyum (yalnız ad), Kilisli Ömer Usta (sipariş platformu) |
| Bar, OSM'de alt tür yok | 5 | Geyik, Summit Bar, Altkat Lokal, Muhit Kadıköy |
| Kafe kategorisinde restoran mutfağı | 4 | Kantin, The Hill Cafe, Kuzguncuk Çınaraltı, Katibim |
| OSM etiketi belirsiz | 1 | Ali Baba Et Mangal (`meat`) |
| Daha önce elle türü düzeltilmiş | 1 | Seyirtepe Sosyal Tesisleri (resmî sayfaya göre "Restoran"; korunur) |

- Bu kayıtlar yanlış sayılmadı. Profillerde "Restoran / Kafe / Bar" görünmeye devam ediyor.
- Addaki kelimeler tür sayılmadı. Örnek: Trakyum Mangalbaşı, Ali Baba Et Mangal.

## 4. Sahip kararı gereken işaretler (15)

| Grup | Kayıt | Durum | Soru |
|---|---|---|---|
| Tatlıcı adı, OSM restoran | Beyzade Künefe, Saray Muhallebicisi, Diyarzade Künefe, Paşahan Künefe, Baklava Hanem | Tür "Tatlıcı" addan geliyor; OSM `amenity=restaurant`, `cuisine=turkish`. Baklava Hanem'in sitesi "Tatlının Yeni Hali!" diyor. | Kafe kategorisine mi alınsın, yoksa restoran kalıp türü "Türk mutfağı" mı olsun? |
| Kafe kategorisinde restoran türü ya da mutfağı | Kaffa Miro, Artisan craft, Rucio Cafe, Kantin, The Hill Cafe, Kuzguncuk Çınaraltı, Katibim | OSM `amenity=cafe`; mutfak etiketi Türk / pizza / burger. Kategori kaynağa uygun. | Kafe kalıp türü "Kafe" mi olsun, yoksa yerinde kontrol mü? |
| Bar ↔ restoran | 360 Istanbul, Gizia Brasserie | 360: "Rooftop Restaurant & Club". Gizia: site "restaurant", OSM `amenity=bar`. | Kategori bar mı kalsın, restoran mı olsun? |
| Nargile | HuQQabaz Mall of İstanbul | Site: "En İyi Nargile & En İyi Kahvaltı". Katalog kurallarında nargile kafe C sınıfı. | Kapsamda kalsın mı? |

**Ek notlar:**
- **Hasırlı Konya Mutfağı (Büyükçekmece):** Resmî site yalnız Esenyurt ve Bahçeşehir şubelerini sayıyor. Kaydın kimliği ya da ilçesi ayrıca kontrol edilmeli.
- **Mama Bowl Kozyatağı:** Kapanışı doğrulanmış kayıt, ama sitesi açık ve çalışma saati yazıyor. Kapanış kaydına dokunulmadı.

## 5. Örneklem kontrolü

- **Yöntem:** Sabit tohumla 15 karar seçildi: 8 OSM türü, 4 site tanımı, 3 kategori. `scripts/katalog/tur-ornek-kontrol.mjs` bunları karar betiğinin ölçüm dosyalarını kullanmadan yeniden denetledi: OSM tek öğe API'si ve kaynak sayfanın ham HTML'i.
- **Sonuç:** 15/15 Geçti (`data/katalog/tur/ornek-kontrol-2026-11-12.json`).
- **Görsel inceleme sayılmaz:** Bu kontrol betikle yapıldı. Profiller ayrıca yerel derlemede HTML olarak denetlendi (bkz. §6).

## 6. Testler

Tür ve kategori kararları çalışma kopyasında uygulandı, testler bu veriyle çalıştırıldı, sonra `venues.json`, `duzeltmeler.json` ve `sor-index.json` geri alındı.

| Test | Sonuç | Başarılı / Toplam |
|---|---|---|
| turtest (paket kuralları, uygulama benzetimi, ikinci çalıştırma) | Geçti | 1416/1416 |
| Katalog | Geçti | 52/52 |
| Arama | Geçti | 49/49 |
| SEO | Geçti | 49/49 |
| Ana sayfa | Geçti | 31/31 |
| Ana sayfa V8 | Geçti | 33/33 |
| B1 konum | Geçti | 104 + 3 |
| Yayın ekleme | Geçti | 8/8 |
| bin1test (dalga 2) | Geçti | 18/18 |
| Sor (dizin yeniden üretilmeden) | Başarısız | 321/322 |
| Sor (dizin `sor-index.ts` ile yeniden üretildikten sonra) | Geçti | 322/322 |
| tsc | Geçti | 1/1 |
| next build | Geçti | 1/1 (1.633 sayfa) |
| Yerel profil HTML'i: yeni tür görünüyor | Geçti | 86/86 |
| Yerel profil: kategori kafe (JSON-LD CafeOrCoffeeShop ya da kategori bağlantısı) | Geçti | 5/5 |
| Vercel Preview | Engelli | Neon dal sınırı |

- **Sor'daki tek başarısızlık:** "dizin: güncel" kontrolü.
  - `data/real/sor-index.json` veriden üretiliyor; tür ve kategori değişince eskiyor.
  - `next build` öncesinde (`prebuild`) dizin kendiliğinden yeniden üretiliyor.
  - Yayın commit'inde dizin `npx tsx scripts/sor-index.ts` ile yeniden üretilmeli. Bu dosya Codex'in Sor alanında; bu PR'da değiştirilmedi.
- **Antepli Hünkar Künefe:** Adresi olmadığı için profilde JSON-LD bilerek yok (`lib/seo.ts`). Kafe kategorisi profilin kategori bağlantısından doğrulandı.
- **Görsel kontrol:** Tarayıcı paneli gizli olduğu için ekran görüntüsü alınamadı. Profiller görsel olarak incelenmiş sayılmaz.

## Yayında dikkat

- **Gösterim:** Tür (`subcategory`) ve kategori, sitede veri dosyalarından okunur.
- **Production veritabanı:** `places.subcategory` ve `places.category_id` sütunları güncellenmez. Senkron kararı Codex'te.
- **Google puanı:** Otomasyon değişmedi. Excel raporundaki kategori ve mutfak sütunları yeni değerleri gösterir; eşleşme mantığı bu alanları kullanmaz.
- **Kod değişikliği:** Paket koda yalnız iki küçük şey ekliyor:
  - `lib/katalog/mutfak.ts`'te `COMPATIBLE` artık dışa açık;
  - `katalog-denetim.ts`'e `TUR=` öngörü kipi eklendi.
- **Dokunulmayan dosyalar:** Sor, Seçki ve Codex dosyaları.
