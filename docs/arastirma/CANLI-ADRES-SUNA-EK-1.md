# Suna'nın Yeri — ek not (#60'a ek, 15 Kasım 2026)

Ek: `data/arastirma/canli-adres-celiski/suna-ek-1.json` · Test: `scripts/arastirmasunaek1test.ts` · Temel: #60 `4bc4810`

#60 teslim dosyası değiştirilmedi. Canlı adres düzeltilmedi, veritabanına yazılmadı, yayın yok. İşletmeye mesaj, ücretli kaynak ve genel araştırma yok.

## OSM geçmişi (node/2383708227)

| Sürüm | Tarih | Değişiklik |
|---:|---|---|
| 1 | 13.07.2013 | Yalnız ad ve "restoran" |
| 2 | **15.11.2014** | **Kapı No:17 ve telefon 0216 332 32 41 bu sürümde girildi**; web sitesi de |
| 3 | 10.01.2023 | Kapı no ve telefon değişmedi |
| 4 | 13.12.2025 | Yalnız şehir alanı değişti |
| 5 | **10.06.2026** (son düzenleme) | Otomatik telefon biçimi düzeltmesi (bot, changeset 183907902); numara aynı |

Düğümde yerinde kontrol etiketi (`check_date` / `survey:date`) yok. Canlı kayıttaki kapı no ve telefon, 2014'te girilmiş ve o günden beri yerinde doğrulanmamış veriye dayanıyor.

## Bilinen kaynaklar

| Kaynak | Tarih | Kapı | Telefon |
|---|---|---|---|
| OSM (canlı kaydın kaynağı) | 2014 girişi | 17 | 216 332 32 41 |
| Gault&Millau | 07.12.2023 ve 23.12.2025 | 4 / 4A | 216 308 45 12 |
| Resmî site (sunaninyeri.com) | — | alan adı kapalı | — |
| Production kalite raporu | — | yalnız Google eşleşmesi; kanıt sayılmadı | — |

Aynı rehberin iki yılı tek kaynak sayıldı. Repoda ve yerel anlık görüntülerde başka işletmeci ya da bağımsız kaynak yok; yeni kaynak aranmadı.

## Sonuç: açık (`ACIK_EKSIK_KANIT`) — burada durdum

- **Canlı değerler:** No:17 ve 216 332 32 41'i güncel bir kaynak doğrulamıyor. OSM verisi 2014'ten kalma, yani eskimiş olabilir.
- **Alternatif değerler:** No:4A ve 216 308 45 12 yalnız Gault&Millau'da var. Tek kaynak canlı alanı değiştirmeye yetmez.
- **Öneri:** `address` ve `phone` değişmesin. #60'taki koşullu öneri geçerli: G&M dışında güncel bir işletmeci kaynağı ya da tarihli bağımsız bir kaynak kapı no ve telefonu verirse yeniden değerlendirilir.

## Test

| Test | Ortam | Sonuç |
|---|---|---|
| `npm run test:suna-ek1`: #60 dosyası değişmedi; canlı alanlar Production `d4aa855` ile aynı; OSM geçmişi tarihli; aynı rehber tek kaynak; sonuç açık, değişiklik yok | yerel | Geçti 6/6 |
| Preview / Production | — | Çalıştırılmadı |
