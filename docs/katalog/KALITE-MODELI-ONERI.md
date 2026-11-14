# Kalite modeli revizyonu (öneri, 2026-11-11)

Durum: **öneri.** A sınıfının anlamı değiştirilmedi. Bu belge sahip onayı ve Codex'in teknik değerlendirmesi için yazıldı.

## Sorun
Bugünkü A şartı beş şeyi tek sınıfta topluyor: kimlik, faaliyet, adres, tür ve **OSM koordinatı**. Koordinat OSM'de yoksa restoran A olamıyor ve kataloğa hiç girmiyor.

Bunun sonucu: Michelin'in 9 yıldızlısından 5'i, Production'da desteklenen bir kayıt türü varken dışarıda kaldı (Arkestra, Araka, Araf, Sankai by Nagaya, Casa Lavanda).

OSM'de bulunmamak, tek başına bir restoranın Gidenler'de bulunmaması için gerekçe olmamalı. Koordinat bir **gösterim** özelliğidir: harita, "yakınımda", mesafe. Kimlik ve adres güvenini belirlemez.

## Öneri: ayrı eksenler
Her kayıt beş eksende ayrı değerlendirilir. Her eksenin değeri ve kaynağı kayıtta durur (`kalite` alanı; paket 15'te kullanıldı).

| Eksen | Düzeyler |
|---|---|
| **Kimlik** | K1: resmî site ya da şube sayfasında ad + (telefon \| sokak). K2: resmî liste (Michelin, İBB) + resmî site. K3: yalnız rehber, resmî site yok → inceleme. |
| **Faaliyet** | F1: güncel kanıt (Michelin 2026, resmî sitede güncel iletişim, OSM yerinde kontrol ≥ 2025). F0: yok → inceleme. |
| **Adres** | AD1: kapı numaralı (resmî kaynak ya da OSM). AD2: sokak + mahalle (bugünkü B1). AD0: yok. |
| **Tür** | T1: kaynaklı; düzeyi şube ya da marka. T0: kaynakta yok. |
| **Koordinat** | KO1: restoranın kendi OSM kaydı. KO2: OSM bina ya da adres noktası. KO3: izinli açık POI kaynağı + bağımsız uyum (öneri; şema gerekir). KO0: yok. |

## Sınıflar

| Sınıf | Tanım | Gösterim |
|---|---|---|
| **A** (değişmedi) | K1/K2 + F1 + AD1 + T1 + KO1/KO2 | profil, arama, sitemap, harita, mesafe |
| **A-konumsuz** (yeni, paket 15 pilotu) | K1/K2 + F1 + AD1 + T1, **KO0** | profil (adresli), arama, sitemap. **Harita noktası yok**, mesafeye girmez. |
| **A-dış-konum** (öneri; şema değişikliği gerekir) | K1/K2 + F1 + AD1 + T1 + **KO3** | A gibi; konum atfı kaynağa göre yazılır |
| **B1** (değişmedi) | AD2, diğerleri A | profil, arama; sokak düzeyi |
| **B / C** | bir ya da daha çok eksen eksik | inceleme |

Kurallar:
- **A-konumsuz A değildir.** Paket satırında `sinif: "A-konumsuz"` yazar, kayıtta `kaliteSinifi: "A-konumsuz"` ve `kalite.koordinat: "yok"` durur. Test bunu ayrıca doğrular.
- **Sahte koordinat üretilmez.** Kayıtta `lat/lng` ve `location` hiç yazılmaz.
- Bugünkü uygulama bu durumu zaten karşılıyor:
  - Konum bölümü "harita noktası henüz yok; yerini adresle ara" der.
  - Harita bileşeni koordinatsız kaydı göstermez.
- Rehber (Michelin) koordinatı, Google verisi ve kaynağı belirsiz koordinat (ör. Wikidata) **KO3 sayılmaz.**

## KO3 için önerilen kaynak: Overture Maps Places
**Lisans:** veri kaynağa göre lisanslı (Meta ve Microsoft: CDLA Permissive 2.0; Foursquare: Apache 2.0; AllThePlaces: CC0). Atıf gerekir.

**KO3 kabul ölçütü** (dördü birlikte):
1. Overture kaydındaki telefon, resmî sitedeki telefonla aynı.
2. Nokta, kaydın ilçe sınırında.
3. İkinci bağımsız kaynakla en çok 100 m uyum. Bu kaynak yalnız ölçüm için kullanılır, kayda yazılmaz.
4. Overture güveni ≥ 0,9.

**Paket 15'teki deneme:** 18 restorandan 16'sı dört ölçütü geçti (`data/paket/istanbul-15/overture-oneri.json`).
- Ruby'nin güveni 0,77; geçmedi.
- The Red Balloon'da telefonla eşleşen kayıt yok.

**Ölçek** (İstanbul, sürüm 2026-10-21):
- 41.682 yeme-içme kaydı;
- güveni ≥ 0,9 olan 13.932;
- bunlardan web sitesi olan 7.929.

Bu kayıtlar ayrıca resmî site keşfi için de güçlü bir aday havuzu: site ve telefon hazır gelir, doğrulama yine resmî sitede yapılır.

## Önerilen karar sırası
1. **A-konumsuz sınıfı ve paket 15 pilotu:** sahip onayı.
2. **Profil metni düzeltmesi** (ayrı dal, Codex incelemesi): koordinatsız işletme kaydında OSM konum atfı yazılmasın.
3. **KO3 (Overture) şema desteği:** Codex teknik değerlendirmesi (`docs/katalog/CODEX-KOORDINAT-ONERISI.md`).
4. **Overture adaylarıyla büyük ölçekli resmî site doğrulaması:** ayrı paketlerde.
