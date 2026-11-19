# Üç canlı adres çelişkisi — kanıt çözümlemesi (15 Kasım 2026)

Dal: `arastirma/canli-adres-celiski-3` · Taban: Production `d4aa855` · Veri: `data/arastirma/canli-adres-celiski/uc-kayit.json` · Test: `scripts/arastirmaadresceliski3test.ts`

**Ayrı teslim.**
- #58 kabul paketine katılmadı; #58 dalı ve kabul SHA'sı değişmedi.
- Canlı adres düzeltilmedi, veritabanına yazılmadı, yayın yok.
- Genel araştırma açılmadı. Yalnız kayıtlarda zaten bulunan kaynak URL'leri birer kez yeniden açıldı. Tek istisna Suna'nın Yeri: aynı rehberin 2023 tarihli eski sayfası da açıldı.
- **Girdiler:**
  - YorumS devir listesi (`devir-listesi.json`; yalnız Eleos'u kapsıyor);
  - #56 manifestinin kaynak adresleri;
  - Codex kabul kayıtları;
  - `data/real` canlı alanları.

## Kanıt tablosu

| Kayıt | Canlı alan | Resmî kaynak | MICHELIN 2026 | Gault&Millau | Sonuç |
|---|---|---|---|---|---|
| **Eleos Yeşilköy** | Yeşilbahçe Sk. **No:9** · 212 663 39 11 | Şube sayfası (bugün açık): Yeşilbahçe Sk. **No.9** · 212 663 39 11 | (04.12.2025) Yeşilbahçe Sk. **No:9** · 212 663 39 11 | (23.12.2025) Yeşilbahçe Sok. **No:5** · 212 663 39 11 | **Destekleniyor.** No:9 iki kaynakta, No:5 tek kaynakta |
| **Suna'nın Yeri** | Kandilli İskele Cad. **No:17** · 216 332 32 41 (yalnız OSM) | Alan adı kapalı (DNS yok; 05.11 ve 15.11) | — | (23.12.2025) **No:4A** · 216 308 45 12 · (07.12.2023) **No:4** · 216 308 45 12 | **Açık.** Canlı adres ve telefon doğrulanmadı |
| **Deraliye** | Ticarethane Sk. **No:10** · 212 520 77 78 | Site (JSON-LD + iletişim, bugün): Ticarethane Sk. **No:10** · 212 520 77 78 | (04.12.2025) Ticarethane Sk. **No:10** · 212 520 77 78 | (23.12.2025) Ticaret Hane Sok. **No:13** · 539 593 77 97 | **Destekleniyor.** No:10 iki kaynakta, No:13 tek kaynakta |

## Ayrı sorular

| | Aynı şube mi? | Kaynak eskimiş mi? | Sokak / dış / iç kapı ayrımı mı? |
|---|---|---|---|
| Eleos | Evet; üç kaynakta aynı ad, sokak ve telefon | Belirlenemedi; G&M daha yeni ama resmî sayfa bugün de No.9 | Kanıt yok; No:5'i ayrı giriş olarak tanımlayan kaynak yok |
| Suna'nın Yeri | Olası, doğrulanmadı; ad ve sokak aynı, kapı no ve telefon farklı | Canlı kayıt eskimiş olabilir: G&M'nin iki yılı da No:4/4A ve aynı telefonu veriyor; canlı alanlar yalnız OSM'de. Taşınma kanıtlanmadı | 4 ve 4A aynı yapının kapıları olabilir; 17 ile ilişkisi hiçbir kaynakta yok |
| Deraliye | Resmî site ve MICHELIN aynı şube. G&M girişinin aynı şube olduğu kanıtlanmadı (kapı no ve telefon farklı) | Hayır; canlı alanlar güncel iki kaynakla aynı | Kanıt yok. Yalnız gözlem: aynı sokakta No:13, #57'de yayımlanan Galeyan'ın adresi; ilişki çıkarılmadı |

## Önerilen alan değişikliği ve eksik kanıt

Hiçbir öneri uygulanmadı.

**Eleos Yeşilköy — `COZULDU_DEGISIKLIK_YOK`**
- `address`: değişiklik yok.
- `verification` (isteğe bağlı): "Resmî şube sayfası da Yeşilbahçe Sk. No.9 ve aynı telefonu gösteriyor (15.11.2026)." Codex kabulünde resmî iletişim sayfası alınamamıştı; bu eksik artık kapalı.
- **Eksik kanıt:** G&M'nin No:5 yazmasının nedeni bilinmiyor.
- **Not:** Resmî sayfada mahalle "Ümraniye Mahallesi" yazıyor; canlı kayıt ve MICHELIN "Yeşilköy" diyor. Mahalle alanı değiştirilmemeli.

**Suna'nın Yeri — `ACIK_EKSIK_KANIT`**
- `address` ve `phone`: şimdilik değişiklik yok.
- **Koşullu öneri:** G&M dışında bağımsız ve tarihli bir kaynak ya da güncel bir işletmeci kaynağı G&M ile eşleşirse:
  - `address` → "Kandilli İskele Caddesi No:4A, Üsküdar";
  - `phone` → "+90 216 308 45 12".
- **Eksik kanıt:**
  1. Güncel işletmeci kaynağı ya da G&M dışında tarihli bir bağımsız kaynak; kapı no ve telefon içermeli.
  2. OSM node/2383708227'nin son düzenleme tarihi.
- **Not:** İki G&M girişi aynı rehberin iki yılı olduğu için birbirinden bağımsız sayılmaz.
- **URL notu:** #50'de kayıtlı G&M adresinin slug'ı başka bir restoranın adını taşıyor (`balikci-sabahattin-2`). Sayfa içeriği Suna'nın Yeri'ne ait, yani kayıt doğru.

**Deraliye — `COZULDU_DEGISIKLIK_YOK`**
- `address`: değişiklik yok.
- `verification` (isteğe bağlı): "Resmî site kapı numarasını da gösteriyor (Ticarethane Sk. No:10, 15.11.2026)." Paket 10'da resmî site yalnız "ad + telefon + sokak" olarak kaydedilmişti.
- **Eksik kanıt:** G&M'deki No:13 ve +90 539 593 77 97'nin neye ait olduğu (ikinci şube, rezervasyon hattı ya da rehber hatası) bilinmiyor.

## Test

| Test | Ortam | Sonuç |
|---|---|---|
| `npm run test:adres-celiski-3`: `data/real` değişmedi; canlı alanlar katalogla birebir; her kayıtta en az üç kanıt; "destekleniyor" sonucunda canlı kapı no ve telefon en az iki OSM dışı kaynakta; açık kayıtta eksik kanıt listeli; hiçbir öneri uygulanmamış; puan ve koordinat yok | yerel, taban d4aa855 | Geçti 24/24 |
| Preview / Production | — | Çalıştırılmadı (yayın yok) |
