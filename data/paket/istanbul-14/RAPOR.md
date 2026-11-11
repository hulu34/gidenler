# Paket 14: B havuzunda tür tamamlama

Kontrol tarihi: 2026-11-11 · Dal: `paket/istanbul-14-b-tur-tamamlama` (paket 13'ün üstünde) · Kataloğa eklenmedi. Yayını Codex yapar; onay sahibindedir.

## Kapsam
B havuzunda 333 kayıt var: paket 7'den 267 (B1'e girenler hariç) ve paket 13'ten 66.
- **Tek eksiği kaynaklı mutfak türü olan kayıt:** 54. Bunlarda faaliyet kanıtı güçlü ve kapı numaralı adres tam.
- **Bunlardan resmî sitesi olan:** 20. Her sitenin başlığı, açıklaması ve ilk başlığı okundu.
- **Tür kabul ölçütü:** restoranın kendi açık tanımı (ör. "Adana Kebapçısı", "Antakya Mutfağı").
  - Belirsiz tanımlar kabul edilmedi: "Geleneksel Tatlar, Modern Dokunuşlar", "Şef Restoranı", "Keyif & Huzur".
  - Boş sayfalar kabul edilmedi.
  - Addan tür üretilmedi. Örnek: Tomris Ocakbaşı'nın sitesi boş olduğu için "ocakbaşı" adı tür sayılmadı.

## A kayıtları (7)

| Restoran | İlçe | Tür | Resmî sitedeki tanım | Düzey |
|---|---|---|---|---|
| Nalia Karadeniz Mutfağı | Ataşehir | Karadeniz mutfağı | "Karadenizin eşsiz lezzetleri" (açıklama) | marka |
| Hatay Gurme | Ataşehir | Hatay mutfağı | "Antakya Mutfağı ve Hatay Sofrası" (başlık) | şube |
| Köyüm Pide | Kadıköy | Pideci | "Lezzetli pide çeşitleri" (açıklama) | şube |
| Mis Adana | Pendik | Kebapçı / Ocakbaşı | "Mis Adana Kebap … 2009'dan beri" | şube |
| Bedri Usta Çiftehavuzlar | Kadıköy | Kebapçı / Ocakbaşı | "Adana Kebapçısı" (şube sayfası başlığı) | şube |
| Bedri Usta Kalamış | Kadıköy | Kebapçı / Ocakbaşı | "Adana Kebapçısı" (şube sayfası başlığı) | şube |
| Zeytin Ocakbaşı | Kadıköy | Kebapçı / Ocakbaşı | "Ocakbaşı, kokteyl ve şarap seçkisi" (açıklama) | şube |

- **Hepsi ortak:**
  - faaliyet kanıtı: resmî sitede ad + sokak eşleşmesi;
  - adres: OSM kaydının kendi kapı numaralı adresi;
  - koordinat: OSM.
- **Bedri Usta:** iki şube de markanın resmî şube sayfasında kapı numarasıyla doğrulandı.
- **Hepsi 906 dalında da var:** paket 13'ün B listesinden yükseltildiler. Kayıt, 906'daki OSM ref'i kullanır; çift kayıt oluşmaz.

## Yükseltilemeyen 13 siteli kayıt ve nedeni
- **Tanım belirsiz:** Sunset, Evrim, Hani, Venge, Han Restoran, The Townhouse, Ada Tesisleri, Ahali 279, Adana İl Sınırı.
- **Sayfa boş:** Tomris Ocakbaşı.
- **Platform sayfası, resmî site sayılmadı:** Ülker Abla Ev Yemekleri (eatbu.com).
- **Tatlıcı:** Gaziburma. Restoran değil, restoran hedefine sayılmadı.
- **Zincir, kapsam dışı bırakıldı:** BigChefs.

## B havuzunda kalan büyük grup
- **Paket 7 B listesinde 180 kayıtta hem kaynaklı tür hem sokak/kapı adresi eksik.** Çoğunun faaliyet kanıtı OSM yerinde anket düzenlemesi; resmî sitesi yok.
- Bunlar ancak OSM'de adres ve tür etiketi eklendiğinde ya da yerinde kontrolle A olabilir. Kanıt standardı düşürülmedi.

## Testler (yerel; GitHub Actions'a dokunulmadı)
- `restoranpakettest` paket 14: 18/18.
- **Yayın benzetimi** (yalnız yerel kopyada; paket 7–14 eklendi; 792 mekân):
  - bin1test, katalogtest, aramatest, seotest, anasayfatest, anasayfa8test ve sortest geçti.
  - `next build` ✓.
  - Profil, arama, form ve sitemap denetimi: 23/23.
- **Vercel Preview:** Neon dal sınırı nedeniyle açılamıyor ve yeniden denenmedi. İzole önizleme yerel kopyada yapıldı.
