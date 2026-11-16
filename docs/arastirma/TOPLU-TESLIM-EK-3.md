# Toplu teslim eki 3 — kanıt tamamlama turu (16 Kasım 2026)

Ek: `data/arastirma/toplu-teslim/ek-3-kanit-tamamlama.json` · Test: `scripts/arastirmatopluteslimek3test.ts` (`npm run test:toplu-teslim-ek3`)
Temel: #63 `f88fa1c` · Canlı: #62 `2b43757` (876 / 841 / 716 aktif restoran)

**Ayrı araştırma teslimi; YorumS ekipleri için tek ortak manifest.**
- Kanıt turunda her kayıtta yalnız o kaydın adı konmuş eksiği ya da çelişkisi için gereken kaynak bir kez açıldı. Mevcut kanıtlar yeniden taranmadı.
- Ücretli kaynak, işletmeye mesaj ve erişim engeli aşma yok.
- Yorum, yemek, puan ya da menü eşleşmesi üretilmedi.
- Uygulama kataloğu, veritabanı, kabul dalları, Preview ve Production değişmedi.
- **Kapsam dışı:**
  - canlı 876 kayıt;
  - Pilot'un Monteverdi kaydı (#64 `40239d6`);
  - Maderia (kullanıcı beklemesi);
  - Suna'nın Yeri (belirsizlik #60/#61'de açık);
  - #63'teki 6 mükerrer şüphesi.
- Pilot'un #64'te bu tur baktığı kayıtlara yeniden bakılmadı. Tek istisna Az Çok Thai: yalnız resmî site erişimi denendi.

## Seçim (20 kayıt)

Havuz: #63'te kanıt bekleyen 537 restoran. Az Çok Thai #63'te kategori belirsiz olarak geçiyor; tür eksiği kendi eksiğinin parçası olduğu için dahil edildi.

| Grup | Kayıt | Ölçüt |
|---|---:|---|
| A | 12 | Resmî ya da işletmeci URL'si kayıtlı; tek bir adres, kapı, şube ya da faaliyet çelişkisi var |
| B | 8 | G&M 2026 ve 2026 tarihli ikinci bir editoryal kaynak var; eksik yalnız işletmeci kaynağı |

"Bağımsız kaynak yok" (561) ve "eksik faaliyet" havuzları seçilmedi; bunlar genel araştırma gerektiriyor.

## Sonuç

| Sonuç | Kayıt |
|---|---:|
| Tamamlandı | 2 |
| Şube ayrımı (bir şube tam kanıtlı) | 1 |
| Bekliyor | 17 |
| **Toplam** | **20** |

**Tam kanıtlı 3 kayıt:**

| Kayıt | Resmî kaynak (16.11.2026) | Tarihli bağımsız kaynak | Not |
|---|---|---|---|
| Az Çok Thai (Beyoğlu) | azcokthai.com: Ağa Külhani Sok. No:12/A, +90 212 251 18 11, her gün 12:00–22:00, Tayland mutfağı | G&M (25.12.2025): Ağa Külhanı Sok. No:12/A, aynı telefon | Codex'in ağından açılmayan site bu turda HTTP 200 verdi. Tür resmî siteden alındı. Metinde "café" ifadesi de geçiyor; kategoriyi Codex onaylamalı |
| Hamdi Restaurant (Fatih) | hamdi.com.tr: Kalçın Sok. No:11, Eminönü | G&M (23.12.2025): Kalçın Sok. No:11 | Telefonlar farklı (212 528 03 90 ↔ 212 528 09 30); telefon alanı boş bırakılmalı. Codex'in No:17 kaynakları yeniden taranmadı; çelişkinin kapanması Codex kararı |
| Şahan — **Ataşehir şubesi** | sahan.com: Kardelen Sk. No:4, Ataşehir, (0216) 315 37 37 | G&M (23.12.2025): Kardelen Sok. No:4, aynı telefon | #56 iki şubeyi `sahan\|kadikoy` anahtarında birleştirmiş. Önerilen anahtar: `sahan\|atasehir`. Kadıköy şubesi (Bağdat Cad. No:461) yalnız resmî listede var, bekliyor |

**Bekleyen 17 kayıt ve kalan eksik:**

| Kayıt | Kalan eksik |
|---|---|
| MykOrini İstanbul | Resmî site No:5, G&M 27J. Telefon ve sokak aynı; aynı giriş olduğu kanıtlanmadı. Tersane İstanbul sitesinde kayıt yok |
| Filo d'Olio Caddebostan | Resmî liste İstanbul için "yeni adres çok yakında" diyor; 319-321C adresinde faaliyet desteklenmiyor. Kapanış hükmü değil |
| Il Cortile | Resmî site No:20/A, G&M 14 D:20 (telefon aynı) |
| Dafni Ateşbaşı | Resmî site Nakkaştepe Yolu, G&M Babanakkaş Sok. (kapı no ve telefon aynı) |
| Akali Mall of İstanbul | Resmî şube listesi var (Süleyman Demirel Blv. No:7); şube düzeyinde tarihli bağımsız kaynak yok |
| Sushi Barba | AVM rehberi yalnız "1. Kat" diyor; No:73 ile No:11 çelişkisi çözülmedi |
| White Burger Pendik | Resmî liste Osmanlı Blv. No:1/2T diyor; şube düzeyinde bağımsız kaynak yok |
| Adana Ocakbaşı Kurtuluş | Resmî site yalnız Nişantaşı'nı veriyor; Kurtuluş'ta işletmeci kaynağı yok. Kapanış hükmü değil |
| Çakı Restoran | Resmî site ve yemek.com'da kapı no yok (adres site/blok düzeyinde) |
| Ali Ocakbaşı, Eskiyer, Kruton, Yeniköy Balıkçısı | İşletmeci kaynağı yok. G&M sayfasında web sitesi bağlantısı yok; bu turda arama yapılmadı |
| Efendy | İşletmeci kaynağı yok. Alan adı "Çok Yakında" sayfası gösteriyor, adres yok; MICHELIN bağımsız rehber, işletmeci değil |
| GOU Society, Kendime İstanbul | İşletmeci kaynağı yok; aramada yalnız toplayıcı siteler çıktı (kanıt sayılmadı) |
| Günaydın Kebap (Etiler) | İşletmeci kaynağı yok; eski alan adı HTTP 404 |

**Kullanım:** bu turda 25 URL açıldı ve 4 arama yapıldı.

## Test

| Test | Ortam | Sonuç |
|---|---|---|
| `npm run test:toplu-teslim-ek3`: #56/#58/#63 ve data/real değişmedi; kayıt sayısı ≤20, hepsi #63'te kanıt bekleyen; kapsam dışı kayıt yok; kontroller tarihli; tamamlananda kapı no resmî kaynakta ve ≥15.11.2025 tarihli bağımsız kaynakta aynı; bekleyende kalan eksik yazılı; Google/toplayıcı/puan/koordinat yok | yerel | Geçti 27/27 |
| Aynı test, Hamdi'nin kapı numarası 17'ye bozularak (mutasyon denetimi) | yerel | Beklendiği gibi Başarısız 26/27 |
| `npm run test:toplu-teslim-ek2` | yerel | Geçti 25/25 |
| `tsc --noEmit` | yerel | Geçti |
| Preview / Production | — | Çalıştırılmadı (yayın yok) |
