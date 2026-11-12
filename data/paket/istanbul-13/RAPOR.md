# Paket 13: 906 havuzunun yeniden doğrulanması (ilk paket)

Kontrol tarihi: 2026-11-11 · Dal: `paket/istanbul-13-906-dogrulama` (paket 12'nin üstünde) · Kataloğa eklenmedi. Yayını Codex yapar; onay sahibindedir.

## Neden gerekti
- 906 dalında olup Production'da olmayan **441 restoran** var.
- Paket 7'nin otomatik hattı, 906 dalıyla eşleşen adayları "mevcut" saydığı için bunları hiç doğrulamamıştı.
- 906 dalı yayın adayı değil. Bu paket 906'yı toplu olarak taşımaz: her kayıt bugünkü A kurallarıyla, baştan ve tek tek doğrulandı.

## Yöntem
1. Aday havuzu yeniden kuruldu. "Mevcut" olarak yalnız şunlar sayıldı:
   - Production;
   - paket 6, 7, B1, 9, 10, 11 ve 12;
   - seyrek-ilçeler dalı.
2. 441 restoranın hepsi taze OSM çekiminde (2026-11-10) bulundu.
3. Kanıtlar paket 7'nin test edilmiş hattıyla toplandı:
   - resmî site ölçümü;
   - OSM yerinde kontrol tarihi;
   - yerinde anket uygulamasıyla yapılmış OSM düzenlemesi;
   - resmî zincir şube sayfası;
   - İBB resmî işletmeci listesi;
   - OSM bina adresi (ters konum).
4. Sınıflandırma `paket-restoran.mjs` ile yapıldı. Kurallar paket 7'yle aynı; gevşetme yok.

## Sonuç (438 restoran adayı; 3 kayıt kafe ya da tatlıcı, ayrı havuz)

| Sınıf | Sayı |
|---|---:|
| **A, bu paket** (`kayitlar.json`) | **15** |
| B: kanıt var, alan eksik (`inceleme.json`) | 66 |
| ↳ yalnız kapı numarası eksik | 3 |
| C | 355 |
| Ret | 2 |

**A kayıtları:**
- **Beşiktaş:** Tahtasaray, Tike (Etiler).
- **Beyoğlu:** Güney (Kuledibi), No.19 Dining.
- **Kadıköy:** Koço (Moda), Perran Ocakbaşı, Leylak, Vefalı Köfteci, Yerinde Pide, Adam's Pizza, House of B, Hacapuri.
- **Kartal:** Koz Kanat.
- **Sarıyer:** Bestra Kitchen.
- **Şişli:** Hakkı Karakaş Mantı.

**Kanıt dağılımı:**
- **Faaliyet:** resmî site 12, OSM yerinde kontrol 5, anket uygulaması 2. Bir kayıtta birden çok kanıt olabilir.
- **Adres:** 13 kayıtta OSM kaydının kendi kapı numarası, 2 kayıtta OSM bina adresi.

**Tür:** Tür, OSM kaynağındaki mutfak etiketinden alındı; 906'daki türler devralınmadı.
- Gösterilen tür kaynaktaki ilk etiketten gelir; diğer etiketler `cuisine` alanında korunur.
- Koço: 906'da "Balık restoranı", OSM'de "turkish;seafood"; kayıtta "Türk mutfağı" + seafood.
- Perran Ocakbaşı "turkish;kebab", Hakkı Karakaş Mantı "turkish;dumplings".

## A olamayanlar
- **C, faaliyet kanıtı yok (338):**
  - OSM'de resmî site yok, 2025+ yerinde kontrol yok, yerinde anket düzenlemesi yok.
  - 906 dalındaki Google puanı eşleşmesi bu sistemde faaliyet kanıtı sayılmaz.
- **C, zincir şüphesi (68):** markanın resmî şube sayfasında bu şube doğrulanamadı.
- **C, mükerrer şüphesi (32):** aynı site alanı ya da aynı bina adresi.
- **B (66):** en sık eksik kaynaklı mutfak türü (53), ardından sokak adresi (21).
  - Bunların çoğunda resmî site var. Resmî sitedeki tür tanımıyla bir sonraki pakette tamamlanabilir.

## Mükerrer kontrolü
- Production ve bütün açık paketlerle: OSM ref, slug, aynı ad 150 m, aynı bina 60 m ve telefon karşılaştırıldı. Çakışma yok.
- **906 dalı:** kayıtlar 906'daki OSM ref ve slug'ı aynen kullanıyor (15/15 slug aynı). 906 dalı ileride eklenirse `pakete-ekle` aynı OSM kaydını reddeder; çift kayıt oluşmaz.

## Testler (yerel; GitHub Actions'a dokunulmadı)
- `restoranpakettest` paket 13: 18/18.
- **Yayın benzetimi** (yalnız yerel kopyada; paket 7–13 eklendi; 785 mekân):
  - bin1test, katalogtest, aramatest, seotest, anasayfatest, anasayfa8test ve sortest geçti.
  - `next build` ✓.
  - Profil, arama, form ve sitemap denetimi: 47/47.
- **Vercel Preview:** Neon dal sınırı nedeniyle açılamıyor ve yeniden denenmedi. İzole önizleme yerel kopyada yapıldı.
