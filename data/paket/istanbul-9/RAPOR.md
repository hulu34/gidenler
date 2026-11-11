# İstanbul zincir şube paketi 9 (dalga 9) — 2026-11-11

Paketteki şubeler markaların resmî şube listelerinden geliyor. Her şube ayrı kimlik aldı; slug'da marka, mahalle (ya da sokak) ve ilçe var. **Kayıtlar kataloğa eklenmedi:**
- `kayitlar.json` yayın paketinde `venues.json`'a eklenir.
- `isletme-kayitlari.json` yayın paketinde `isletme.json`'a eklenir.

| Kalem | Sayı |
|---|---:|
| **A — doğrulanmış zincir şubesi** | **25** |
| ↳ OSM'de bulunan şube (kimlik OSM kaydı, adres resmî listeden) | 9 |
| ↳ OSM'de olmayan şube (işletme kaydı; konum OSM adres noktası) | 16 |
| Elenen | 30 |

**Elenme nedenleri:** tür kaynakta yok 1, katalogda ya da havuzda yok 1, kapı no OSM adresinde yok 12, OSM sokağı listedekiyle uyuşmuyor 1, markanın OSM şubelerinde ortak tür yok 15.

**Markalar:** Burger Yiyelim 10, HD İskender 7, Cookshop 3, Etiler Marmaris 2, Pidem 1, Bursa Kebap Evi 1, Usta Dönerci 1.

**İlçeler:** Bakırköy 4, Başakşehir 3, Ataşehir 2, Kadıköy 2, Maltepe 2, Beşiktaş 2, Eyüpsultan 2, Esenyurt 1, Avcılar 1, Sultangazi 1, Ümraniye 1, Üsküdar 1, Zeytinburnu 1, Bayrampaşa 1, Beyoğlu 1.

**Türler:** Kebapçı / Ocakbaşı 10, Türk mutfağı 2, Dünya mutfağı 3, Burger 10.

## Yöntem
1. **Adres çıkarma:** markanın resmî sitesindeki şube sayfaları okundu (elle doğrulanmış kökler: `data/katalog/zincir-siteleri.json`). İstanbul ilçesi ve kapı numarası olan adres satırları çıkarıldı. Sayfa içeriği saklanmadı; yalnız şube adresi tutuldu.
2. **Konum:** adres OSM'nin arama servisiyle (Nominatim; sokak + kapı no + ilçe, saniyede ≤1 istek) konuma çevrildi.
3. **OSM'de bulunan şube:** markanın OSM şubesiyle eşleşmesi için aynı ilçe ve aynı sokak şartı aranır. Mesafe kapı numarası bulunduysa 150 m, bulunamadıysa en çok 400 m.
4. **OSM'de olmayan şube:** konum yalnız kapı numarası ve sokak birebir tutan OSM adres noktasından alınır (`location.provider: "osm"`). Kayıt katalogda 400 m içindeki aynı marka şubesiyle karşılaştırıldı.
5. **Tür:** OSM şubesinde kendi etiketi kullanılır. İşletme kaydında markanın OSM'deki şubelerinin ortak etiketi kullanılır (en az 2 şube). Ad tür üretmez.
6. **Mükerrer kontrolü:** Production + PR #4, 906 dalı, seyrek paketi, paket 7 ve B1 ile karşılaştırıldı; çakışma 0.
   - Farklı markaların aynı AVM'deki şubeleri (ör. Mall of Istanbul) ayrı kayıttır.
   - Aynı markanın 150 m içindeki ikinci kaydı elenir.

## Kapsam dışı
- Köfteci Yusuf: Cloudflare 403; atlatılmadı.
- Global hızlı servis ve çiğ köfte büfesi zincirleri: sahip kararı.
- Pidem ve Happy Moon's'un çoğu şubesi listede ama OSM şubelerinde ortak tür yok. Tür kaynaksız kalacağı için eklenmedi.
