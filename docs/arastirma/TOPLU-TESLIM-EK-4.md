# Toplu teslim eki 4 — ikinci kanıt turu (16 Kasım 2026)

Ek: `data/arastirma/toplu-teslim/ek-4-kanit-turu-2.json` · Test: `scripts/arastirmatopluteslimek4test.ts` (`npm run test:toplu-teslim-ek4`)
Temel: #65 `886200a` (#63 `f88fa1c` üstünde) · Canlı: #62 `2b43757` (876 / 841 / 716 aktif restoran)

**Ayrı araştırma teslimi.** Sonuçlar toplu kabul havuzu içindir; kayıt başına yayın talebi yok. YorumS aynı manifesti kullanır.
- Her kayıtta yalnız adı konmuş eksik ya da çelişki için kaynak açıldı; mevcut kanıtlar yeniden taranmadı.
- Resmî kanıt eksikliği editoryal ya da başka bir kaynakla örtülmedi.
- Ücretli kaynak, işletmeye mesaj ve erişim engeli aşma yok.
- Katalog, veritabanı, kabul dalları, Preview ve Production değişmedi.
- **Kapsam dışı:**
  - canlı 876 kayıt;
  - #64 ve Pilot'un birleşik adayı (Monteverdi ve Şahan Ataşehir No:4);
  - #65'teki 20 kayıt; bunların içinde açık kalan Hamdi adres çelişkisi ve Az Çok Thai kategorisi de var;
  - Maderia, Suna'nın Yeri ve #63'teki mükerrer şüpheleri;
  - Pilot'un #64'te baktığı kayıtlar.

## Seçim

Havuz: #63'te kanıt bekleyen restoranlar; #65 ve kapsam dışı kayıtlar hariç. Adı konmuş tek bir eksiği olan 19 kayıt seçildi. 20'nci kayıt alınmadı, çünkü kalan adayların eksiği yalnız genel araştırmayla kapanabilir. Bu tura alınmayanlar:
- "Bağımsız kaynak yok" (561) ve yalnız yemek.com'a dayanan "eksik faaliyet" kayıtları;
- White Burger şube kayıtları (tek kaynak);
- Sankai (kaynak bütünlüğü engeli);
- Brasserie Noir ve Hodan (Codex'in tür/taşınma bekletmesi);
- Akbabalı, Madam Despina, Pizza Emirgan, La Boom ve Sofram (kayıtlı işletmeci URL'si yok).

## Sonuç: 0 tamamlandı, 19 bekliyor

Canlı tekilleştirme: 19 kaydın hiçbiri canlıda yok.
- Ad ya da ilçe benzerliği olan 4 kayıtta sokak ve kapı numarası karşılaştırıldı; dördü de ayrı işletme ya da şube çıktı.
- Bu dört kayıt: Sarıgazi ↔ Sancaktepe Kent Lokantası, Toro ↔ Brio, White Burger Finanskent ↔ Meydan, Palude ↔ M Point.

| Bekleyiş nedeni | Kayıt | Kayıtlar ve bulgu |
|---|---:|---|
| İşletmeci kaynağı yok | 6 | Papalina, Lipa Pendik, Sushi Manga (Göktürk): aramada yalnız toplayıcı siteler çıktı. Tam Ocakbaşı ve Strada: alan adı park sayfası. 7mila: Innova otel sitesi yalnız Teras ve Revan restoranlarını listeliyor |
| Bağımsız kaynak yok | 3 | İBB Silivri, Sarıgazi ve Çekmeköy Kent Lokantası: İBB sayfası bugün kapı numaralı adresi veriyor; tarihli haber bulunamadı |
| Faaliyet "yakında" | 2 | White Burger Galataport ("Yakında") ve Finanskent ("Çok Yakında") |
| Kapı no yok | 1 | İBB Çırpıcı: İBB sayfasında adres yok, yalnız "park girişi"; Evrensel haberi (23.10.2026) mevcut |
| Ad sürekliliği | 1 | Aliée: Accor sayfası "Taste by Aliée" diyor (No 11:19); Thomas Bühner adı yok, ad değişikliği varsayılmadı |
| Erişim engeli | 1 | Toro Latin Gastro: Six Senses sayfası HTTP 403 verdi, aşılmadı |
| Resmî sayfa yok | 1 | Nişantaşı Beymen Brasserie: resmî URL HTTP 404 (kapanış hükmü değil) |
| Adres çelişkisi | 1 | Catch: Allpoints marka sayfası bugün Catch adresi göstermiyor |
| Kategori belirsiz | 1 | Zambak Boşnak Börekçisi: adres ve telefon resmî sitede; satış mağazası, restoran/kafe ayrımı kaynakta yok |
| İlçe belirsiz | 1 | Hüsrev Lokantaları: denenen alan adı çözülmedi |
| Şube kimliği | 1 | Palude: denenen alan adı çözülmedi; Zeytinburnu şubesi için kaynak yok |

**Kullanım:** 16 kontrol satırı (15 farklı URL; White Burger şube listesi iki kayıtta kullanıldı ve aynı gün #65 turunda alınmıştı) ve 6 arama.
- **Tahmini alan adları** (5): yalnız içerik ad ve adresle eşleşirse kanıt sayılacaktı. İkisi park sayfası çıktı, ikisi çözülmedi; Innova otel sitesi açıldı ama 7mila adı geçmiyor.

## Bulgu

#63 havuzunda kanıtı tek bir resmî kaynakla tamamlanabilecek restoran kalmadı. Kalan kayıtların eksiği iki türlü:
- işletmecinin kendi kaynağı hiç yok;
- ya da şube düzeyinde tarihli bağımsız kaynak yok.

Bu eksikler ücretsiz kaynaklarla sınırlı turda kapanmıyor. Kayıtları açıkça bekleyen olarak bıraktım.

## Test

| Test | Ortam | Sonuç |
|---|---|---|
| `npm run test:toplu-teslim-ek4`: #56–#65 dosyaları ve data/real değişmedi; kayıt sayısı ≤20, hepsi #63'te kanıt bekleyen restoran; kapsam dışı kayıt yok; kontroller tarihli; canlı tekilleştirme canlı 876'dan yeniden doğrulandı; park sayfası ya da 403/404 kanıt sayılmadı; sayım tutarlı; Google/toplayıcı/puan/koordinat yok | yerel | Geçti 23/23 |
| `npm run test:toplu-teslim-ek3` | yerel | Geçti 27/27 |
| `tsc --noEmit` | yerel | Geçti |
| Preview / Production | — | Çalıştırılmadı (yayın yok) |
