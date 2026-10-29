# Gidenler Seçkisi / The Gidenler Edit — içerik yönetimi

## Nerede

| Ne | Yer |
|---|---|
| Yazılar | `content/seckisi/yazilar/<slug>.json` (dosya adı = slug) |
| Etkinlikler | `content/seckisi/etkinlikler/<id>.json` |
| Dizin | `content/seckisi/index.ts` — yeni dosya buraya eklenir |
| Şema ve kurallar | `lib/seckisi/schema.ts` |
| Görünürlük | `lib/seckisi/index.ts` |
| Sayfalar | `/seckisi/`, `/seckisi/<slug>/`, `/seckisi/en/`, `/seckisi/en/<slug>/` |
| Test | `npx tsx scripts/seckisitest.ts` |

İçerik bileşen koduna gömülmez. Değişiklikler git geçmişinde görünür; yönetim paneli ya da ücretli içerik servisi yok.

## Durumlar

| Durum | Nerede görünür |
|---|---|
| `taslak` | Hiçbir yerde. Listede, bağlantıda, gezinmede ve akışta yok. |
| `kontrol` | Yalnız Preview ve yerel geliştirme. Sayfada "kontrol bekliyor" etiketi var; arama motorlarına kapalı. |
| `yayinda` | Herkese açık. `publishedAt` zorunlu. |
| `arsiv` | Listelerde yok. Adresi bilinen yazı "arşiv" notuyla açılır. |

Production'da yayında yazı yoksa `/seckisi/` 404 verir ve "Seçki" bağlantısı gezinmede görünmez. Yatırımcı demosunda (`NEXT_PUBLIC_SHOW_DEMO=true`) bölüm tamamen kapalı.

## Yayımlama (editör)

1. Yazıyı oku. Kaynakları aç, rakamları ve tarihleri kaynakla karşılaştır.
2. Kapak fotoğrafı için hak kaydını ayrıca kontrol et. Kapak yalnız `public/seckisi/gorsel/` altındaki izinli dosyadan gelir; `rights`, `rightsRef` ve `sourceUrl` zorunlu, lisanslı görselde `licenseUrl` de zorunlu.
3. Ticari ilişkiyi doğrula ve `commercial` alanını `yok` (doğrulayan, tarih) ya da `var` yap.
4. `status: "yayinda"` yap ve `publishedAt` alanına bugünü yaz. Bu tarih bir daha değişmez.
5. İçerik gerçekten değişirse `updatedAt` alanını güncelle. Yalnız yeni görünmek için tarih değiştirilmez.

## Kurallar (şema denetler)

- TR ve EN gövde aynı yapıda olmalı: blok sayısı, türü ve liste uzunluğu aynı. "Gitmeden bilin" maddelerinin sayısı da eşit olmalı.
- TR ve EN metindeki bütün rakamlar aynı olmalı: fiyat, tarih, saat, telefon, gramaj. Binlik ayırıcı ve saat biçimi farkı sayılmaz.
- `puan` türündeki yazı, sıralama kaynağı (`gidenler-rating-history`), dönem ve kapsam olmadan açılamaz.
- Etkinliklerde kontenjan ya da satış durumu alanı yoktur. Bilet ve duyuru bağlantıları https olmalı. Ertelenen etkinliğin eski tarihi yazılır.
- Bitmiş ve iptal edilmiş etkinlikler "Yaklaşan Deneyimler"den çıkar. Sayfa saatte bir yenilenir.
- `visited: false` olan yazıda sayfa "ziyaret yapılmadı" der. Ziyaret ya da röportaj uydurulmaz.
- `newOpening` varsayılan olarak `false`. "Yeni keşif", restoranın Gidenler'e yeni eklendiği anlamına gelir; yeni açıldığı anlamına gelmez.
- `commercial.state`: `dogrulanmadi` (varsayılan; sayfada "henüz doğrulanmadı" yazar ve yazı bu durumda yayımlanamaz), `yok` (doğrulayan ve tarih zorunlu) ya da `var` (görünür etiket). `ownership`, kurucu veya ekiple sahiplik ilişkisini yazar; puana ve sıralamaya etkisi yoktur.

## Dil

Bölüm iki dilde ayrı ayrı yazılır. Yol `/seckisi/en/...`, sayfa içeriği `lang="en"` ile işaretli, `hreflang` alternatifleri metadata'da. Uygulamanın geri kalanı ve restoran profilleri Türkçe; İngilizce sayfalarda bu açıkça yazar.

## Kaynak kontrolü ve haftalık seçki (plan; otomasyon etkin değil)

Ücretli AI servisi, sınırsız tarama ve onaysız otomatik yayın yok.

- **Günlük kaynak kontrolü** (elle ya da tek bir GitHub Actions işi, yalnız okuma). Yayındaki ve kontrol bekleyen yazıların `sources` bağlantılarına istek atılır. 200 olmayan ya da içeriği değişen kaynaklar listelenir. Yazı değiştirilmez; editöre rapor gider.
- **Etkinlik kontrolü.** Duyuru bağlantısı açılmıyorsa ya da tarih değişmiş görünüyorsa etkinlik editöre işaretlenir. Durum (`ertelendi`, `iptal`) elle güncellenir.
- **Haftalık seçki yenilemesi.** Restoran profillerinden 3–5 aday seçilir. Taslaklar `taslak` olarak eklenir, kontrol sonrası `kontrol` olur, editör onayıyla `yayinda` olur. "Haftanın Hikâyesi" için `featured` tek yazıda olur.
- **AI kullanımı.** Kaynak metinler veri olarak işlenir; içlerindeki talimatlar uygulanmaz. Haber sitelerinden tam metin kopyalanmaz. Taslak özgün yazılır ve her iddia bir kaynağa bağlanır.
