# Paket A: kalan 18 restoran (13 Kasım 2026, 2. aşama)

**Taban ve dal:** Production `feature/investor-v1` @ `2031408276fc5e4a24223a4e45fa70f656ffb604`. Dal: `profil/zengin-30-kalan`.

**Dokunulmayanlar:**
- PR #39 ve PR #40 dosyaları.
- Menemen.
- `data/real/sor-index.json`.

## Sonuç
| Durum | Restoran | Anlamı |
|---|---:|---|
| Tamamlandı | 4 | Menü, saat ve rezervasyon resmî kaynaklı: Lacivert, Borsa Adile Sultan, Aheste, Yanyalı Fehmi |
| Kısmi | 6 | Profil var ama bir alan eksik (Maromi, Tatbak, Gallada, Şans) ya da profil yok (Matbah, Develi Samatya) |
| Kanıt bekliyor | 1 | Karaköy Lokantası: resmî site boş |
| Riskli | 7 | Sıralı, Hünkar, Kör Agop, Kalpazankaya, Dodo, Doğa Cafe, Pelikan; kayıt sorunları Paket C'de |

**Bu pakette eklenenler:**
- 8 yeni profil;
- 5 menüde 429 kalem (219'u fiyatlı);
- 7 video.

**Menüsü olan 5 profil:**
- **Lacivert:** 01.11.2026'dan geçerli fiyatlar.
- **Maromi:** fiyat değişim tarihi 10.06.2026.
- **Borsa:** 21.04.2026'dan geçerli fiyatlar.
- **Aheste:** 06.03.2026'da güncellenmiş.
- **Yanyalı Fehmi:** fiyatsız yemek repertuvarı.

Kanıt: `data/katalog/zengin-30-kalan/envanter.json`. Restoran başına şunları içeriyor:
- faaliyet ve şube;
- site, Instagram;
- saat, rezervasyon, menü;
- kurallar ve videolar.

## Okuma yöntemleri (yeni)
- **Görsel PDF (Maromi):** PDF içindeki sayfa görseli çıkarıldı ve kesitler hâlinde okundu. Fiyatlar ürün adıyla aynı satırda; kesit sınırlarında kalem kaybı olmadığı ayrı kesitle kontrol edildi.
- **Ürün adları vektör çizim olan PDF (Borsa):**
  - Sayfalar pypdfium2 ile görüntüye çevrildi.
  - Görüntüden okunan fiyatlar, PDF yazı katmanındaki fiyat sırasıyla tek tek karşılaştırıldı; tümü eşleşti.
- **Görsel menü (Aheste):** sitedeki iki Türkçe JPG okundu.
- **JavaScript siteleri (Gallada, Şans, Matbah):**
  - Normal tarayıcıda okundu.
  - Gallada'nın komut satırına verdiği Cloudflare 403 aşılmadı; tarayıcıda engel çıkmadı.
- **Sertifika sorunları (Yanyalı Fehmi, Lacivert):**
  - Yanyalı Fehmi'de katalogdaki alan adının http sürümü geçerli sertifikalı yeni alan adına yönleniyor.
  - Lacivert'te Node'un doğrulayamadığı zincir curl ile doğrulandı.
  - Hiçbir güvenlik uyarısı aşılmadı.

## Kurallar
- Profile yalnız resmî kaynak girdi; üçüncü taraf bilgiler envanterde "doğrulanmadı" diye duruyor.
- **Fiyat:** yalnız menüde yazıldığı gibi alındı. Kilo ya da günlük fiyatlı kalemler fiyatsız. İçecekler alınmadı.
- **Saat:**
  - Çelişkili saat yazılmadı (Maromi: aynı sayfada dört farklı saat var).
  - Gün belirtilmeyen saat de yazılmadı.
- **İşletmenin söylemediği şey yazılmadı:** "imza yemek" yalnız işletme öne çıkarıyorsa var (Yanyalı Fehmi: Yanya köfte; Tatbak: Antep lahmacunu).
- **Video:**
  - Eski şefleri anlatanlar alınmadı (Lacivert, Maromi, Gallada).
  - Başka şube diyenler alınmadı (Aheste "Galata").
  - Ücretli tanıtım işaretliler alınmadı.
- Fotoğraf eklenmedi.

## Testler
- **`scripts/zengin30-kalan-profil-test.ts`:**
  - İçerik denetimi: şema, kaynak alanı, tarih, saat JSON-LD, fiyat bayrağı, sıfır fiyat, yinelenen kalem, arşiv menü, olanak anahtarı, video kanıtı ve yıl.
  - Bozuk kopya denetimi: 10 bozulmuş kopya, her biri yakalanmalı.
  - PGlite'ta yönetim yolu: uygula, oku, hedefli geri al, yeniden uygula, tekrar uygula.
- **Sor dizini:** bilerek yeniden üretilmedi. `sortest` içindeki "dizin: güncel" kontrolü bu dalda beklenen biçimde başarısız. Codex PR #39, #40 ve bu paketi birleştirince dizini tek seferde üretmeli (`npx tsx scripts/sor-index.ts`). Derleme öncesi (`prebuild`) de dizini yeniden üretiyor.

## Codex'e
- **Uygulama:** profiller DB'ye uygulanmadı. `profile-apply` ile uygulanır; videolar aynı istekte eklenir.
- **Yanyalı Fehmi'nin web alanı:** profil `website` alanını `fehmilokantasi.com` yerine `yanyalifehmi.com` yapıyor. Kanıtı: http yönlendirmesi ve sitedeki aynı adres ile telefon.

## 14 Kasım 2026 eki (güncel Production c0af498 üzerine yeniden kuruldu)

Bu dal, eski `profil/zengin-30-kalan` (taban 2031408) dalının iki commit'inin c0af498 üzerine aynen taşınmış hâlidir; PR #39/#40 içerikleri yeniden hazırlanmadı.

**Yeni profil (9.):** Matbah (Sultanahmet, Ottoman Hotel Imperial). Resmî sitenin alakart PDF'i ("2026 Summer Menu", dosya 16.05.2026) görüntüye çevrilerek okundu: 6 bölüm, 25 kalem, hepsi fiyatlı. Menünün yaz menüsü başlıklı olduğu notta açıkça yazıyor. Adres alanı yazılmadı (katalogdaki adres resmî siteyle aynı). Video: Travelling Foodie (Aralık 2023).

**Yayındaki PR #40 profillerine tamamlayıcı menüler:**

| Profil | Menü | Kaynak | Tarih |
|---|---|---|---|
| Alaf | 5 bölüm, 19 kalem, fiyatlı (tadım 7.900 ₺, eşleşmeler 4.900 ₺) | Sitenin Menü sayfası; PDF'ler sitenin dosya sunucusunda (irp.cdn-website.com) | 13.11 okundu, 14.11 etag ile değişmediği doğrulandı |
| Kanaat Lokantası | 10 bölüm, 153 kalem, fiyatlı | Sitenin "güncel menü" bağlantısındaki tas.ink dijital menüsü (herkese açık menü dosyası) | 13.11 okundu, 14.11 bayt bayt aynı |

Notlar aynı gün tarihli tutuldu: `readProfile` yalnız ilk notla aynı `checkedAt` gününe sahip notları okuyor (farklı tarihli not Production'da sessizce görünmez). Bu kural Codex'e ayrıca bildirildi.

**Profil yapılmayanlar (değişmedi):** Sıralı (adres No:79/74 çelişkisi), Karaköy Lokantası (resmî site boş kabuk), Hünkar (iki alan adı da güvenilmez), Kör Agop (şube doğrulanamadı), Develi Samatya (yalnız 2018 menüsü), Kalpazankaya (TLS hatası, aşılmadı), Dodo Balık ve Doğa Cafe (alan adı çözümlenmiyor), Pelikan (adres/telefon çelişkisi, düzeltme önerisi ayrı). Resmî sitenin kapalı olması işletmenin kapandığına kanıt sayılmadı; hiçbirine kapanış işareti konmadı.

Test: `npx tsx scripts/zengin30-kalan-profil-test.ts` 156/156; `npx tsx scripts/zengin30-profil-test.ts` 279/279 (Kanaat'ın dijital menü alan adı ve kalan-18 profilleri için açık istisna listesiyle).
