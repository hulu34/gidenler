# Toplu teslim eki 5 — kimlik uzlaştırması (16 Kasım 2026)

Ek: `data/arastirma/toplu-teslim/ek-5-kimlik-uzlastirma.json` · Test: `npm run test:toplu-teslim-ek5`

**Nasıl yapıldı:**
- Yalnız yerel dosyalar okundu: Production `2b43757`, `katalog/gece-2000` `ac9aee9`, `feature/bin-mekan` `fde27dd`, `arastirma/gm2026-kanitli-aday` `77bc434`.
- Yeni web araştırması, ücret ve dış iletişim yok.
- Ad benzerliği tek başına birleştirme gerekçesi sayılmadı.

**Sınırlar:**
- Hiçbir kayıt yayına hazır ilan edilmedi; kaynak ve faaliyet eksikleri ayrı kalıyor.
- İki düzeltme önerisi uygulanmadı.

## 9 kimlik kaydı: 1 güvenli eşleşme, 8 belirsiz

| Kayıt | Karşılaştırılan | Sonuç |
|---|---|---|
| Grandma's Wonderland (Silivri) | #48 hattı Overture önerisi `b1226550`: aynı ad, Akören Cad. No:114 | **Güvenli eşleşme.** Eşi canlı değil. Overture kategorisi "hotel" (harita verisi). Kanıt eksiği ayrı: yalnız yemek.com var |
| The Red Balloon (Sarıyer) | Canlı `the-red-balloon-beyoglu`: aynı telefon, adres İstiklal 153/4 | Belirsiz: taşınma mı ikinci şube mi ayrılamıyor. Canlı adresin güncelliği ayrıca incelenmeli |
| Masa Restaurant (Sarıyer) | #48 "Masa İstanbul" `efce4963` | Belirsiz: yerel kayıtta adres ve telefon değeri yok |
| Natolia (Başakşehir) | Manifestteki "Natolia İstanbul": aynı AVM, kapı no yok | Belirsiz: olası manifest-içi mükerrer, kanıtlanmadı |
| Sahil Cafe 1A, Fes Cafe | — | Belirsiz: #50'nin iddia ettiği eş dört yerel dalda bulunamadı |
| Pierre Loti Tepesi Tesisleri | Canlı "Pierre Loti Kahvehanesi" (kafe, adres yok) | Belirsiz: kompleks ile içindeki birim ayrılamıyor |
| Şırdancı Remzi (Esenyurt) | #48 "Şırdancı Paçacı Remzi" `ac5af56a` | Belirsiz: yerel kayıtta adres yok |
| Seraf Restaurant (Bağcılar) | MICHELIN listesindeki "Seraf Mahmutbey" | Belirsiz: yerel listede adres yok. Canlı Seraf Vadi ayrı şube |

**Ayrı çıkan karşılaştırmalar (4):** Grandma Suadiye, Anatolia (Beyoğlu), Remzi Et Mangal, Seraf Vadi. Bunlar mükerrer değil.

## #63 için düzeltme önerileri (uygulanmadı)

| Kayıt | #63'teki durum | Öneri | Dayanak |
|---|---|---|---|
| Kör Agop Restaurant (Fatih) | Canlı `kor-agop-beyoglu` ile "yayımlandı" | Yayımlanmış sayılmasın; kanıt bekliyor, şube ilişkisi belirsiz | Manifest: Fatih, Ördekli Bakkal Sok., +90 212 517 23 35. Canlı: Asmalı Mescit No:55, +90 212 249 51 33. Adres, ilçe ve telefon farklı |
| Liman İstanbul (Beyoğlu) | İki canlı slug, "olası çift kayıt" notu | Yalnız `liman-istanbul-beyoglu`'ya bağlansın; not geri çekilsin | Galataport kaydıyla sokak, blok ve telefon (+90 212 877 09 48) aynı. `liman-karakoy-beyoglu` Fermeneciler Cad., ayrı OSM kimliği: ayrı işletme, mükerrer değil |

**Uygulansaydı #63 sayılarına etkisi:**
- Kör Agop: yayımlanan 153 → 152; kanıt bekleyen 708 → 709 (restoran 537 → 538).
- Liman: yayımlanmış slug sayısı 154 → 153.

## Değişmeyenler ve testler

**Değişmeyenler:** kabul standardı, canlı katalog, veritabanı, Preview, Production, Pilot'un birleşik dalı, Hamdi, Az Çok Thai ve kullanıcı beklemeleri.

**Testler** (yerel):
- `test:toplu-teslim-ek5`: Geçti 19/19.
- `tsc`: Geçti.
- Preview ve Production: Çalıştırılmadı.
