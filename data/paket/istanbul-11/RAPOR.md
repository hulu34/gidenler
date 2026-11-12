# Paket 11: İkonik İstanbul restoranları (Michelin dışı)

Kontrol tarihi: 2026-11-11 · Dal: `paket/istanbul-11-ikonik` (paket 10'un üstünde) · Kataloğa eklenmedi. Yayını Codex yapar; onay sahibindir.

## Kapsam
- **Aday:** Michelin seçkisinde olmayan, adı bilinen İstanbul restoranları; ocakbaşı, kebap, balık, meyhane ve bölge mutfakları.
  - 90'dan fazla ad sorgusu OSM havuzunda (2026-11-10) ve katalogda arandı.
  - Production'da zaten olanlar ayrıldı. Örnekler: Çiya, Hünkar, Kanaat, Pandeli, Kasap Osman, Hocapaşa Pidecisi, Agora Meyhanesi 1890, Sofyalı 9, Halil Lahmacun, Bayramoğlu Döner, Tarihi Sultanahmet Köftecisi Selim Usta.
- **Bu pakete giren:** 7 A kaydı (6 OSM + 1 işletme kaydı).
- **İnceleme:** 27 satır (`inceleme.json`), her birinin gerekçesi yazılı.

## A kayıtları

| Restoran | İlçe | Tür | Tür kanıtı |
|---|---|---|---|
| Hacı Abdullah | Beyoğlu | Türk mutfağı (Osmanlı saray mutfağı) | şube |
| Matbah | Fatih | Türk mutfağı (Osmanlı saray mutfağı) | şube |
| Lacivert | Beykoz | Akdeniz mutfağı (deniz ürünleri) | şube |
| Develi Samatya | Fatih | Antep mutfağı | şube |
| Develi Florya | Bakırköy | Antep mutfağı | marka |
| Hayvore | Beyoğlu | Karadeniz mutfağı | şube |
| Hatay Medeniyetler Sofrası Taksim | Beyoğlu | Hatay mutfağı | marka |

## A şartı (her kayıt)
1. **Resmî site ölçümü:** sayfada ad ile birlikte telefon ya da sokak geçmeli. Sayfa içeriği saklanmadı; yalnız ölçüm sonucu kayda geçti.
2. **Adres:** resmî sitedeki kapı numaralı adres.
3. **Koordinat yalnız OSM'den:**
   - restoranın OSM kaydı;
   - ya da OSM adres noktası (Hacı Abdullah: Atıf Yılmaz Caddesi 9).
4. **İlçe sınırı uyumu.**
5. **Kaynaklı tür, kanıt düzeyiyle birlikte** (`turKanitDuzeyi`):
   - **şube:** türü bu şubenin ya da tek konumun kendi sayfası söylüyor.
   - **marka:** markanın genel tanımı. Yalnız tek konseptli markada ve resmî listede yer alan şubeye uygulandı (Develi Florya, Hatay Medeniyetler Taksim).
     - Develi Balık ve Flora by Develi ayrı konseptler; bunlara marka türü uygulanmadı.
6. **Mükerrer yok:** OSM ref, slug, aynı ad 150 m, aynı bina 60 m ve telefon karşılaştırıldı. Karşılaştırılanlar:
   - Production;
   - paket 6, 7, B1, 9 ve 10;
   - 906 ve seyrek-ilçeler dalları.

Addan tür üretilmedi. Google verisi yok.

## Elenen ya da incelemeye kalan önemli adaylar
- **Resmî sitede tür yazmıyor:** Hamdi (Eminönü), Mangerie Bebek. Adres ve telefon resmî sitede var.
- **Resmî siteye kumar ve reklam metinleri sızdırılmış:** Sur Ocakbaşı, Akdeniz Hatay Sofrası. Site bakımsız göründüğü için güncel faaliyet kanıtı sayılmadı.
- **Alan adı park edilmiş ya da el değiştirmiş:** Asitane, Rejans, Krependeki İmroz, Yakup 2, Canım Ciğerim (alan adı Çorlu'daki başka bir işletmenin).
- **Resmî site bu ağdan zaman aşımına düşüyor:** Kadı Nimet, Cibalikapı Balıkçısı. Erişim atlatılmadı.
- **Develi'nin diğer şubeleri:**
  - Kalamış: resmî sayfada kapı numarası yok.
  - Etiler ve Nişantaşı: OSM noktası yok.
  - Tuzla: iki konsept aynı AVM'de; OSM noktasının hangisi olduğu belirsiz.

## Mükerrer ve çakışma notları
- **906 dalıyla ortak OSM kaydı (2):**
  - Hayvore;
  - Develi Florya (906'da "Develi Restaurant").

  906 yayın adayı değil. İleride eklenirse `pakete-ekle` aynı kaydı reddeder.
- **OSM'de aynı restoran için ikinci nokta** (kullanılmadı):
  - Develi Samatya: node/5088190875;
  - Hatay Medeniyetler Taksim: node/5710046238.
- **Hacı Abdullah:** OSM'deki aynı adlı nokta (node/4545698295) Beşiktaş'ta ve resmî adresten 4,7 km uzakta. Resmî site yalnız Beyoğlu adresini veriyor. Bu yüzden konum OSM adres noktasından alındı ve kayıt işletme kaydı oldu.

## Testler (yerel; GitHub Actions'a dokunulmadı)
- `restoranpakettest` paket 11: 20/20.
  - 906 ve seyrek dallarını da karşılaştırınca 17/20. Kalan 3 hata, yukarıdaki 2 ortak OSM kaydından geliyor; beklenen ve belgelenmiş durum.
- **Yayın benzetimi** (yalnız yerel kopyada): paket 7, B1, 9, 10 ve 11 kataloğa eklendi (738 OSM + 27 işletme kaydı = 765 mekân).
  - Geçen testler: bin1test 17/17, katalogtest 52/52, aramatest (765/765 adla bulunur), seotest 49/49, anasayfatest 31/31, anasayfa8test 33/33, sortest 322/322.
  - `next build` geçti.
  - Yerel sunucuda profil, arama (ilk 8), deneyim formu ve sitemap denetimi: OSM kayıtlarında 20/20, işletme kaydında 5/5.
