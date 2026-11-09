# Google Places UI Kit — lisans, teknik uygunluk ve maliyet kontrol planı

Amaç: Google puanı gösterilecekse bunu yalnız resmî ve saklama gerektirmeyen bir yolla yapmak. **Bu belge bir plandır; UI Kit henüz koda eklenmedi.**

## 1. Neden UI Kit

- Puan, değerlendirme sayısı ve atıf Google'ın kendi bileşeninde, kullanıcının tarayıcısında çizilir. Gidenler sunucusu bu veriyi görmez ve saklamaz. Saklanan tek şey zaten izinli olan place ID'dir.
- Fiyatlandırma istek başınadır, alan başına değildir (resmî fiyat listesi, 9 Kasım 2026):

| SKU | Aylık ücretsiz | İlk kademe (USD / 1.000) |
|---|---:|---:|
| Places UI Kit Query (Essentials) — `PlaceDetailsElement`, `PlaceDetailsCompactElement` | 10.000 | 1,00 |
| Places UI Kit Pro — `AdvancedPlaceDetails*Element` | 5.000 | 5,00 |
| Karşılaştırma: Places API Place Details Enterprise (bugünkü sunucu çağrısı) | 1.000 | 20,00 |

## 2. Lisans kontrol listesi (yayından önce, her madde kaynakla kapatılır)

- [ ] Google Maps Platform Hizmet Şartları ve Places UI Kit'e özgü hizmet koşulları okunacak. Kaydedilecek konular: önbellek ve saklama yasağı, içeriğin Google haritası dışında gösterilmesi, puanın kendi sıralamamıza veri olarak kullanılması.
- [ ] **Sıralama yasağı varsayımı:** UI Kit'in gösterdiği puan hiçbir sıralamaya, filtreye, rozete veya "en iyi" listesine girmez, yalnız mekân sayfasında bilgi olarak durur. Şartlar daha geniş kullanıma izin verse bile bu kural korunur, çünkü Gidenler puanının bağımsızlığı bunu gerektirir.
- [ ] Atıf ve marka kuralları (Google logosu, "Google'da gör" bağlantısı) UI Kit'in kendi çiziminde kalır ve CSS ile gizlenmez.
- [ ] Bileşenin Türkçe arayüzü ve Türkiye'de kullanılabilirliği kontrol edilecek.
- [ ] Gizlilik ve KVKK: bileşen kullanıcının tarayıcısından Google'a istek atar. Çerez/aydınlatma metnine "Google Maps Platform" üçüncü taraf olarak eklenecek ve gerekiyorsa açık rıza ile yüklenecek ("Google puanını göster" düğmesi).
- [ ] Uyumlu yapılandırma bir sayfaya uygulanıp hukuk danışmanına gösterilecek.

## 3. Teknik uygunluk

- **Yükleme:** Maps JavaScript API (`places` kütüphanesi), kullanıcı istediğinde (tıklama) ya da görünür olduğunda tek mekân için yüklenir. Liste ve kart görünümlerinde yüklenmez: 20 kartlık bir listede 20 ücretli istek demek olur.
- **Anahtar:** Ayrı bir tarayıcı anahtarı açılır. HTTP referrer kısıtı yalnız `www.gidenler.com/*` (ileride `restoranyorum.com/*`, `yemekyorum.com/*`), API kısıtı yalnız Maps JavaScript API. Sunucu anahtarı (`GOOGLE_PLACES_API_KEY`) tarayıcıya hiçbir zaman verilmez.
- **CSP:** `maps.googleapis.com`, `maps.gstatic.com` ve bileşenin gerektirdiği diğer kaynaklar izin listesine eklenir.
- **Performans:** Komut dosyası yalnız düğmeye basıldığında yüklenir. Bunun LCP ve CLS'ye etkisi Preview'da ölçülür; yer tutucu yükseklik sabit tutulur.
- **Bütçe kapısı:** Bileşen yüklenmeden önce tarayıcı `/api/google/ui-izin` ucundan izin ister. Sunucu ortak sayacı (§4) bir birim düşürür. İzin yoksa bileşen yüklenmez ve "Google'da gör" bağlantısı gösterilir. Bu bağlantı yalnız place ID'den üretilen resmî Maps adresidir ve ücretsizdir.
- **Mevcut sunucu tarafı Places çağrıları** (`lib/providers/google.ts`: yorumlar, fotoğraflar, Enterprise SKU) UI Kit'e geçilince gözden geçirilir. Pahalı sunucu çağrıları kaldırılabilir.

## 4. Ortak bütçe: üç domain, aylık 100 USD

Bugün `lib/usage/counter.ts` yalnız Gidenler sunucusunun Places API çağrılarını Redis sayacıyla 100 USD'de durduruyor. Yeni tasarım:

1. **Tek Google Cloud projesi ve tek faturalandırma hesabı.** Üç domain aynı projeyi kullanır, ayrı proje açılmaz. Böylece 100 USD tek havuzdur.
2. **Tek sayaç:** Mevcut sayaç tek havuz olur. Yeni anahtarlar eklenir: `google:uikit_query`, `google:uikit_pro`. Fiyatlar bu SKU'lara göre tanımlanır. Restoranyorum ve yemekyorum sayaca yalnız Gidenler'in izin ucu üzerinden erişir; kendi Google çağrıları yoktur.
3. **Domain payı (başlangıç):** Gidenler 70 USD, RestoranYorum 20 USD, YemekYorum 10 USD. Paylar aynı 100 USD tavanının içindedir. Kullanılmayan pay ay sonuna kadar diğer domainlere açılmaz; bu basitlik bilerek seçildi.
4. **Sert tavan Google tarafında da kurulur.** Redis sayacı uygulama içindedir. Asıl güvence Cloud Console'daki API kotalarıdır:
   - Maps JavaScript / Places UI Kit: günlük kota ≈ (10.000 ücretsiz + 70.000 ücretli) / 30 ≈ **2.600 istek/gün** (yalnız Query SKU kullanılırsa ≈ 80 USD/ay)
   - Places API (New) sunucu çağrıları: mevcut günlük sınırlar korunur
   - Faturalandırma bütçe uyarıları: 50, 80 ve 100 USD. Bütçe uyarısı harcamayı durdurmaz; durduran kotadır.
5. **Ay sonu raporu:** `/yonetim` altında SKU başına kullanım, ücretsiz kota, faturalanan adet ve USD gösterilir (mevcut `report()` genişletilir).

**Örnek kapasite** (yalnız Essentials, 100 USD): 10.000 ücretsiz + 90.000 ücretli ≈ ayda **100.000 bileşen yüklemesi**. Pro SKU ile 5.000 + 19.000 ≈ 24.000. Başlangıç önerisi yalnız Essentials (compact) kullanmaktır.

## 5. Karar kapısı

UI Kit, şu dört koşulun tamamı sağlanmadan Production'a alınmaz: §2'deki kutuların tamamı kaynakla kapatılmış olmalı, Cloud kotaları kurulmuş olmalı, bütçe kapısı test edilmiş olmalı ve Preview'da performans ölçülmüş olmalı. Saklanan eski okumalar (`google_ratings`) bu yolda **kullanılmaz**.
