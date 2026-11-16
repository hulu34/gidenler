# Ortak araştırma — güncel durum (16 Kasım 2026)

Veri: `data/arastirma/toplu-teslim/guncel-durum.json` · Test: `npm run test:guncel-durum`
Taban: #63 yayın uzlaşması, #67 engel grupları, #68 `247fa00` kimlik düzeltmeleri · Canlı: Production `2b43757` (değişmedi)

Bu dosya ortak manifestin güncel giriş noktasıdır; YorumS ve kabul havuzu bunu kullanır.

**Değişmeyenler:**
- Eski ek dosyaları (#56, #58, #63, #65, #66, #67, #68) ve `docs/katalog` kabul raporları değiştirilmedi; geriye dönük yazım yok.
- Uygulama kataloğu, veritabanı, Pilot kabul dalı (#64 `40239d6`), Preview, Production ve güvenlik ayarları.
- Yeni web araştırması, ücret ve dış iletişim olmadı.

**Önkoşul kontrolü:**
- #68 başı `247fa00`, Production `2b43757`, #64 `40239d6`; beklenmedik baş değişimi yok.
- `data/arastirma/toplu-teslim` dosyalarına yalnız bu araştırma dallarından yazılmış; aktif başka yazım ya da çakışma yok.

## Uygulanan düzeltmeler (12 günlük satırı)

| Kayıt | Önceki | Yeni | Gerekçe |
|---|---|---|---|
| Kör Agop Restaurant (Fatih) | Yayımlandı, canlı `kor-agop-beyoglu`'ya bağlı, kategori restoran (canlıdan alınmıştı) | Kanıt bekliyor (`sube-iliskisi-belirsiz`); canlı bağ yok; kategori belirsiz | Adres, ilçe ve telefon farklı. Eski bağ izi `oncekiCanliBag` alanında duruyor. Canlı Beyoğlu kaydı değişmedi |
| Liman İstanbul (Beyoğlu) | İki canlı slug'a bağlı, "olası çift kayıt" notu | Yalnız `liman-istanbul-beyoglu`'ya bağlı; not kaldırıldı | Galataport kaydıyla sokak, blok ve telefon aynı; `liman-karakoy-beyoglu` (Fermeneciler) ayrı kimlik |
| Grandma's Wonderland | Engel grubu: kimlik | Kimlik güvenli eşleşme (Overture `b1226550`); engel grubu: işletmeci ve bağımsız kaynak eksiği | Kimlik çözüldü; yalnız yemek.com var, kanıt eksiği sürüyor |
| Kalan 8 kimlik kaydı | — | Kimlik belirsiz (`kimlik` alanı) | Yerel kanıt yetmedi; kayıtlar kimlik grubunda kaldı |

Her günlük satırında tarih, önceki ve yeni değer, kaynak (#68 tam SHA ve dosya) ve gerekçe saklı.

## Gerçek sayım etkisi (güncel taban `2b43757`'ye göre yeniden hesaplandı)

| Sayım | #63 | Güncel | Fark |
|---|---:|---:|---:|
| Yayımlandı — toplam | 153 | 152 | −1 |
| Yayımlandı — restoran | 151 | 150 | −1 |
| Kanıt bekliyor — toplam | 708 | 709 | +1 |
| Kanıt bekliyor — restoran | 537 | **537** | 0 |
| Kanıt bekliyor — belirsiz | 20 | **21** | +1 |
| Manifestte yayımlanmış slug | 154 | 152 | −2 |
| Manifest dışı canlı kayıt | 722 | 724 | +2 |

**#68'deki tahminden farklar:**
- Kör Agop, kategorisini bağlı olduğu canlı kayıttan alıyordu. Bağ kalkınca kendi kaynağı kategori vermiyor; bu yüzden kanıt bekleyen restoran 537→538 değil, belirsiz 20→21 oldu.
- #68 yayımlanmış slug için yalnız Liman etkisini (154→153) yazmıştı. Kör Agop'un bağı da kalkınca güncel değer 152.

**Engel gruplarındaki fark (#67'ye göre):**
- Kimlik grubu 9→8.
- Adres/şube grubu 22→23 (Kör Agop).
- İşletmeci ve bağımsız kaynak eksiği grubu 40→41 (Grandma's Wonderland).

**Canlı taban:** 876 toplam / 841 aktif (716 restoran, 114 kafe, 11 bar) / 35 kapalı. Bu işte değişmedi.

## Test

| Test | Ortam | Sonuç |
|---|---|---|
| `npm run test:guncel-durum`: eski dosyalar, kabul raporları ve data/real değişmedi; yalnız iki kaydın durumu ve canlı bağı değişti; Kör Agop'un eski bağ izi ve canlı kaydı yerinde; Liman tek bağ; Grandma ve 8 belirsiz doğru grupta; sayımlar ve canlı taban güncel katalogdan yeniden hesaplandı; günlük tam | yerel, GUNCEL `2b43757` | Geçti 27/27 |
| Önceki ek testleri (ek 2, 3, 4, 5, engel planı) | yerel | Geçti (25, 27, 23, 19, 18) |
| `tsc --noEmit` | yerel | Geçti |
| Preview / Production | — | Çalıştırılmadı (yayın yok) |
