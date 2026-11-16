# Toplu engel ve karar planı (16 Kasım 2026)

Veri: `data/arastirma/toplu-teslim/engel-plani.json` · Test: `npm run test:engel-plani`
Kaynak: yalnız mevcut manifestler (#56, #58, #63, #65, #66). Yeni web taraması yok.

**Kapsam ve sınırlar:**
- Hiçbir kayıt kabul edilmedi ya da durumu değiştirilmedi; İBB'nin üç şubesi de dahil.
- Kaynak türü önerileri mevcut standarda uyduklarını varsaymaz.
- Katalog, veritabanı, Preview, Production ve kabul dalları değişmedi.

## Engel grupları — #63'te kanıt bekleyen 708 kayıt

| Grup | Restoran | Kafe | Belirsiz | Toplam |
|---|---:|---:|---:|---:|
| Bağımsız kaynak yok (resmî kaynak var) | 436 | 137 | 0 | **573** |
| İşletmeci kaynağı yok (editoryal var) | 24 | 2 | 13 | **39** |
| İkisi de eksik (tek editoryal ya da >12 ay) | 38 | 2 | 0 | **40** |
| Adres / şube çelişkisi | 17 | 1 | 4 | **22** |
| Kimlik / eşleşme bulunamadı | 7 | 0 | 2 | **9** |
| Faaliyet beklemesi | 8 | 0 | 0 | **8** |
| Kafe politikası (Codex: karar gerekli) | 0 | 8 | 0 | **8** |
| Platform + editoryal (doğrulanmamış) | 2 | 1 | 0 | **3** |
| Kanıtı tamam, kabul kararı bekliyor (#65) | 2 | 0 | 1 | **3** |
| Erişim engeli (403, kaynak bütünlüğü) | 2 | 0 | 0 | **2** |
| Kategori kaynakta yok | 1 | 0 | 0 | **1** |

**Gruplara ek etkenler:**
- Kafe politikası kanıt bekleyen 151 kaydın tamamını etkiliyor.
- 21 kaydın kategorisi belirsiz.
- 9 kayıtta kapı numarası yok; adres AVM, park ya da site düzeyinde.
- 4 kayıt kamu işletmeli (İBB).
- Faaliyet beklemesinin ayrıntısı: 3 "yakında", 2 taşınma, 1 ad değişikliği, 1 resmî sayfa 404, 1 kapanış işareti.

## Kaynak türü → hangi grup (öneri)

Sayılar grup büyüklüğüdür, yani etkinin üst sınırı; kaç kaydın çözüleceğine dair bir tahmin değildir.

| Kaynak türü | Çözebileceği grup | Grup büyüklüğü | Mevcut standart | Karar |
|---|---|---:|---|---|
| Resmî şube sayfası / marka şube listesi | Şube düzeyinde işletmeci ve bağımsız kaynak eksiği | 10 | ÖNERİ: manifestlerde resmî kaynak olarak kayıtlı, ama bağımsız kaynağın yerini tutmaz | Codex teyidi |
| İşletmenin doğrulanmış resmî sosyal hesabı | İşletmeci kaynağı eksiği | 79 | ÖNERİ: mevcut kurala göre Instagram tek başına kanıt değil, otomatik okuma da reddedildi | Harun |
| Kamu işletmeci kaydı (İBB tesis sayfası) | Kamu işletmeli lokantalar | 4 | ÖNERİ: İBB sayfası işletmecinin kendi kaynağı; bağımsız sayılıp sayılmayacağı belirsiz | Harun |
| Belediye işyeri ruhsatı / kamu sicili | Bağımsız kaynak eksiği, faaliyet | 621 | ÖNERİ: tarih, erişim (form ya da captcha aşılmaz) ve KVKK uygunluğu belirsiz; denenmedi | Harun ve hukuk |
| Yeni yıl rehberleri (G&M ve MICHELIN 2027) | Bağımsız kaynak eksiği, adres güncellemesi | 635 | Uygun görünüyor; aynı rehberin iki yılı yine tek kaynak sayılır | Karar gerekmez |
| Yerel basın / açılış haberi | Bağımsız kaynak eksiği | — | Uygun, ama #66'da hedefli 3 aramada sonuç 0 | Karar gerekmez |
| Rezervasyon / sipariş platformu | Platform istisnası | 3 | Mevcut standartta bağımsız kaynak sayılmıyor | Harun |
| İşletmeyle doğrudan teyit | Adres, faaliyet, kimlik | 39 | Şu an yasak | Harun |

## Karar tablosu

| Konu | Kayıt | Kim | Standart değişir mi |
|---|---:|---|---|
| Kanıtı tamam olan 3 kayıt: Hamdi kapı çelişkisi, Az Çok Thai kategorisi, Şahan Ataşehir | 3 | Codex/Pilot kabulü | Hayır |
| "Yakında" ve taşınma beklemelerinde aynı resmî sayfanın tarihli yeniden kontrolü | 5 | Araştırma (takvimli, kayıt başına tek istek) | Hayır |
| Yeni rehber yılı yayımlanınca yerel toplu eşleştirme | 635 | Araştırma (takvimli) | Hayır |
| Eşleşmesi bulunamayan kayıtları yerel dal verisinden yeniden bağlama | 9 | Araştırma (yerel, ağ yok) | Hayır |
| Erişim engeli ve kaynak bütünlüğü sorunu olan kayıtlar | 2 | Bekletme sürer (403 aşılmaz) | Hayır |
| Doğrulanmış sosyal hesap işletmeci kaynağı sayılır mı; erişim yolu ne olur | 79 | **Harun** | Evet |
| Kamu kaydı bağımsız kaynak sayılır mı (ruhsat yolu seçilirse 573'lük havuzun tamamını etkiler) | 4 | **Harun** | Evet |
| Kapı numarası olmayan kompleks adresi kabul edilir mi | 9 | **Harun** | Evet |
| Platform + editoryal istisnası için doğrudan teyit | 3 | **Harun** | Evet |
| Kafe/pastane yayın politikası (kanıt bekleyen kafelerin tamamı 151) | 8 | **Harun** | Evet |
| İşletmeyle doğrudan iletişime izin | 39 | **Harun** | Evet |
| Kategori kuralı (börekçi, kahvaltıcı, meyhane/bar) | 21 | Harun/Codex | Evet |

## Öneri

1. **Aynı havuzda kayıt kayıt arama turu açılmasın.** #66'da 19 kayıttan hiçbiri tamamlanmadı; bağımsız kaynak eksiği olan 573 kayıt aramayla kapanmıyor.
2. **Önce Harun kararları alınsın.** En büyük grupları sosyal hesap, kamu kaydı ve kompleks adres kararları açar. Her karar tek bir kural olarak yazılıp toplu uygulanmalı, kayıt başına değil.
3. **Karar gerektirmeyen tek yüksek verimli kaldıraç takvimli yerel eşleştirme.** G&M ya da MICHELIN'in yeni yılı yayımlandığında manifest bir kez yeniden birleştirilir.
4. **"Yakında" ve taşınma beklemeleri için takvimli tek istek yeterli.** Kayıt başına araştırma gerekmez.
5. **Kabul havuzu yalnız kanıtı tamamlanmış kayıtlarla beslensin.** Bu plan hiçbir kaydı kabul etmez.

## Test

| Test | Ortam | Sonuç |
|---|---|---|
| `npm run test:engel-plani`: manifestler ve data/real değişmedi; 708 kayıt #63 ile birebir; sayımlar satırlardan yeniden hesaplandı; kabul alanı yok; İBB kayıtları kabul edilmedi; belirsiz kaynak türleri ÖNERİ olarak işaretli; Harun kararları ayrı | yerel | Geçti 18/18 |
| `tsc --noEmit` | yerel | Geçti |
| Preview / Production | — | Çalıştırılmadı (yayın yok) |
