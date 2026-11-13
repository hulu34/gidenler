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
