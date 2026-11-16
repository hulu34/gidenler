# Toplu teslim eki 2 — yayın durumu uzlaşması (16 Kasım 2026)

Ek: `data/arastirma/toplu-teslim/ek-2-yayin-uzlasma.json` · Test: `scripts/arastirmatopluteslimek2test.ts` (`npm run test:toplu-teslim-ek2`)
Temel: #56 `4fbd882` manifesti + #58 `1269682` eki · Canlı taban: #62 `2b437577f4a02197482fb90e46b5f75a3f0b96df`

**Ayrı araştırma teslimi.**
- Yalnız repo ve git nesneleri okundu.
- Yeni web araştırması yok, ücretli kaynak yok.
- Uygulama kataloğu, veritabanı ve Production değişmedi.
- #56/#58/#60/#61 ve Codex kabul SHA'ları değişmedi.
- Suna'nın Yeri belirsizliği yeniden araştırılmadı. Maderia incelenmedi.

## Canlı taban (#62)

| | Toplam | Aktif | Aktif restoran | Kafe | Bar | Kapalı |
|---|---:|---:|---:|---:|---:|---:|
| Production `2b43757` | 876 | 841 | 716 | 114 | 11 | 35 |

Hesap:
- Toplam = `venues.json` + `isletme.json`.
- Aktif = toplam − `kapanis.json` içindeki `closed_confirmed` kayıtları.

## Manifestin 883 kaydı — durum × kategori

| Durum | Restoran | Kafe | Bar | Belirsiz | Toplam |
|---|---:|---:|---:|---:|---:|
| Yayımlandı (hepsi aktif) | 151 | 1 | 1 | 0 | **153** |
| Kabul adayı | 0 | 0 | 1 | 0 | **1** |
| Kanıt bekliyor | 537 | 151 | 0 | 20 | **708** |
| Mükerrer (şüphe; karar değil) | 6 | 0 | 0 | 0 | **6** |
| Kullanıcı beklemesi | 1 | 0 | 0 | 0 | **1** |
| Kapsam dışı / ret önerisi | 4 | 0 | 10 | 0 | **14** |
| **Toplam** | 699 | 152 | 12 | 20 | **883** |

**Manifestten yayımlanan 153 kaydın girdiği paket:**

| ≤793 taban | #49 | #51 | #53 | #54 | #55 | #57 | #59 | #62 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 70 | 8 | 17 | 15 | 9 | 6 | 12 | 10 | 6 |

- **#56'dan sonra canlıya girenler (28):** #57'den 12, #59'dan 10, #62'den 6.
- **#56'nın kaçırdığı kayıt (1):** Lokanta by Divan #48 öncesinden beri canlıda.
- **Manifest dışındaki canlı kayıtlar:** 876 canlı kaydın 722'si manifestte yok.

## Önemli bulgular

- **Restoran kabul adayı kalmadı.**
  - #56 paketinin 14 restoranından 12'si #57 ile yayımlandı.
  - #58'in iyi kanıtlı 12 kaydından 10'u #59 ile yayımlandı.
  - Kalan tek kabul adayı The Townhouse. Bu bir bar; Codex onu restoran paketi dışında tutuyor (`AYRI_KATEGORI`).
  - #62'nin 6 kaydı #56'da sorunlu havuzdaydı; kanıtları Pilot'un kendi kabulünde tamamlandı.
- **Kullanıcı beklemesi:** yalnız Maderia Sushi Bar. #59 ve #62 kabul dosyalarında durumu `SAHIP_TALIMATIYLA_BEKLIYOR`.
- **Platform + editoryal istisnası (3 kayıt):**
  - Kayıtlar: Alaçatı Gurme-i ALA, Meşhur Yayla Kokoreçcisi, Pita Cafe.
  - #58'de istisna `DOGRULANMAMIS` olarak işaretli. Bu yüzden üçü kabul adayı değil, kanıt bekliyor durumunda; `kullaniciTeyidiGerekir: true`.
  - Pita bir kafe; kafe yayın politikası kararı ayrıca açık.
- **Mükerrer şüphesi (6):** hiçbiri birleştirilmedi; hepsi kimlik incelemesi ister.
  - Mikla Bar, canlıdaki Mikla kaydıyla aynı slug'a bağlı.
  - Aynı ilçede canlı adı kapsayan 5 kayıt: Pizza V Bostancı, Nizam Pide Galatasaray, Namlı Kebap, Hacıbaşar Bostancı, Basta Kuşdili. Bunların ayrı şube olup olmadığı kanıtlanmadı.
- **Yayımlanmış kayıtlarda notlar** (hiçbiri düzeltilmedi):
  - Liman İstanbul iki canlı slug'la eşleşiyor (`liman-istanbul-beyoglu`, `liman-karakoy-beyoglu`); canlıda olası çift kayıt.
  - Kör Agop'ta ilçe farkı var: manifest Fatih, canlı Beyoğlu.
  - Nappo Pizza'nın ilçesi #58 düzeltmesiyle boş; Production değeri ayrı alanda.
  - Suna'nın Yeri'nin belirsizliği açık (#60/#61).
  - Eleos ve Deraliye'nin canlı adresleri korunuyor.

**Kanıt bekleyen 708 kaydın alt dağılımı:**

| Alt durum | Kayıt |
|---|---:|
| Bağımsız kaynak yok | 561 |
| Eksik faaliyet kanıtı | 46 |
| #58 belirsiz — öncelik 1 / 2 / 3 | 14 / 21 / 12 |
| Önceki Codex bekletmesi | 19 |
| Codex bekletmesi (#57/#59/#62)* | 12 |
| Eski kayıt kanıtı | 6 |
| Tek kaynak | 6 |
| Adres çelişkisi | 4 |
| Eksik kimlik | 3 |
| Kanıt politikası doğrulanmamış | 3 |
| Eksik kapanış işareti | 1 |

\* #62'nin bekletmeleri (Az Çok Thai, Chalet, Morini/Parlé, Maromi, Bado) kayıtlarda `codexBekletme` alanında duruyor. #58 belirsiz kaydı da olanlar #58 önceliğiyle sayıldı.

## Pilot ile çakışma

- Pilot'un 876/841 tabanındaki sonraki paket dalı origin'de görünmüyor.
- En yeni Pilot dalı `inceleme/pr62-preview-kabul-20261116` (`b31e6a6`). Yalnız `.github/workflows/pr62-cloud-once.yml` ve `scripts/pr62-cloud-*` dosyalarını değiştiriyor; bu ekle dosya çakışması yok.
- Kabul adayı ve kanıt bekleyen kayıtlar Pilot'un mevcut seçimiyle örtüşebilir; bunlar için yeniden araştırma açılmadı.
- #58'in kendi testi güncel Production'a karşı 145/153 veriyor (8 KALDI), çünkü iyi kanıtlı kayıtlarının 10'u #59 ile yayımlandı. Kendi teslim tabanı `d4aa855`'e karşı 153/153 geçiyor. #58 dalı değiştirilmedi.

## Test

| Test | Ortam | Sonuç |
|---|---|---|
| `npm run test:toplu-teslim-ek2` — #56/#58/data/real değişmedi; canlı 876/841/716 yeniden hesaplandı; yayımlanan slug'lar canlıda ve ekleyen PR ilk görünüşle aynı; yayımlanmamış kayıt canlıya bağlı değil; #57/#59/#62'nin 28 kaydı yayımlandı; Maderia ve Suna; sayım tutarlı; puan ve koordinat yok | yerel, GUNCEL `2b43757` | Geçti 25/25 |
| `npm run test:toplu-teslim` (#56, TABAN `4fbd882`) | yerel | Geçti 2719/2719 |
| `npm run test:toplu-teslim-ek1` (#58) | yerel, GUNCEL `d4aa855` | Geçti 153/153 |
| `npm run test:toplu-teslim-ek1` (#58) | yerel, GUNCEL `2b43757` | Başarısız 145/153 — beklenen; ayrıntı yukarıda |
| `tsc --noEmit` | yerel | Geçti |
| Preview / Production | — | Çalıştırılmadı (yayın yok) |
