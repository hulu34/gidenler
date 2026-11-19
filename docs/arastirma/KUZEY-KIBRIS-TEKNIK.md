# Kuzey Kıbrıs desteği: teknik değişiklik planı

Amaç: İstanbul verisini ve beğenilen tasarımı koruyarak İskele, Girne ve Lefkoşa restoranlarını göstermek. Büyük yeniden tasarım yok.

**Bu dalda yapılan:** yalnız bağımsız ve hiçbir yere bağlanmamış bölge modeli (`lib/bolge/kibris.ts`) ve testi. Aşağıdaki değişiklikler **uygulanmadı**.

**Codex'e bırakılan kritik dosyalar:**
- Sor: `lib/sor/*`, `app/api/sor`, `app/api/ai`.
- Google: `lib/gpuan/*`, `app/api/cron/puan`, `scripts/gpuan-*`.
- DB ve güvenlik.

Bu dosyalarda çakışma yaratılmadı.

## 1. Veri modeli (ön koşul)

| Değişiklik | Dosya | Neden |
|---|---|---|
| `RealVenueRecord`'a `city?: "İstanbul" \| "Girne" \| "İskele" \| "Lefkoşa"` ve `region?: { ada: "Kıbrıs"; operasyonelBolge: "kuzey" \| "güney"; ilce: string }` | `data/real/index.ts` | Şu an `toEntity` şehri sabit `"İstanbul"` yazıyor (satır 166) |
| `invalidRecord` koordinat kontrolünü şehre göre yap: İstanbul kutusu ya da Kıbrıs adası kutusu + `region.ilce` + OSM ilçe alanı kanıtı | `data/real/index.ts` | Mevcut kural yalnız 40.8–41.6 / 27.9–29.95 kutusunu kabul ediyor. Koordinatlı 4 Kıbrıs kaydı `"location"` ile düşüyor (test ölçüyor) |
| `location.precision` için `"poi"` değeri, ya da POI düğümlerini `"address"` sayma kararı | `data/real/index.ts` | OSM restoran düğümü bina değil |
| Türkiye il/plaka modeli kullanılmaz; PR #5'teki `plaka` alanı Kıbrıs'a taşınmaz | — | Kuzeyde 6 ilçe var; il/plaka yok |
| Telefon, saat ve fiyat alanları Kıbrıs kayıtlarında boş kalır | — | Kaynaklarda doğrulanmadı; numara saklanmaz |

## 2. Yayın öncesi zorunlu korumalar

| Değişiklik | Dosya | Neden |
|---|---|---|
| Google puan işlerinden İstanbul dışı kayıtları hariç tut (`city !== "İstanbul"` ise atla) | `lib/gpuan/venues.ts`, `lib/gpuan/excel.ts` (Codex) | İkisi de `realVenueRecords`'ın tamamını alıyor. Kıbrıs kaydı eklenirse günlük 06.00 / 08.30 işine ve Excel'e kendiliğinden girer. Görev "Kıbrıs için Google entegrasyonunu otomatik etkinleştirme" diyor |
| JSON-LD adresini şehre göre yaz | `lib/seo.ts:77` | Şu an her mekânda `addressRegion: "İstanbul"` ve `addressCountry: "TR"` sabit. Kuzey Kıbrıs için `addressRegion = ilçe`, `addressLocality = yerleşim`. **Ülke alanı sahip kararı:** önerim alanı boş bırakmak ("TR" yanlış; "CY" tartışmalı) |
| Saat dilimi | `lib/seckisi/index.ts`, "şimdi açık" hesapları | `Europe/Istanbul` sabit. Kuzey Kıbrıs `Asia/Famagusta` (kış aylarında İstanbul'dan 1 saat geri). Kıbrıs kayıtlarında saat olmadığı için bugün etkisi yok; saat eklenirse gerekir |

## 3. Şehir ve bölge seçimi, keşif sayfaları

**Mevcut yapı zaten ayırıyor:** `lib/api.ts:531` `inIstanbul`, `lib/rankings.ts`, `lib/pulse.ts` ve ana sayfa filtreleri `location.city`'ye dayanıyor. Kıbrıs kayıtları ana sayfaya, İstanbul sıralamalarına ve nabız sayfasına kendiliğinden girmez. Bu istenen davranış; değiştirilmemeli.

**Yeni sayfalar (önerilen, tasarım bileşenleri mevcut olanlar):**
- `/kibris/`: bölge giriş sayfası. Üç ilçe kartı ve kısa kaynak notu ("kaynaklı kayıtlar; liste kısa ve büyüyor").
- `/kibris/[ilce]/`: `iskele`, `girne`, `lefkosa`. Mevcut `CategoryList` ve `EntityCardRow` ile; yerleşim çipleri (Lapta, Long Beach, Zeytinlik…).
- Üst gezinmede küçük bir şehir seçici (İstanbul / Kıbrıs). Seçim çerez ya da URL'de tutulur; varsayılan İstanbul.

`/kategori/[slug]` ve `/ara` için `?sehir=girne` parametresi eklenir. Parametre yoksa İstanbul davranışı aynen korunur.

## 4. Arama ve Sor Gidenler

**Arama (`app/api/ara`, `app/ara`):** `bolgeBul` ve `aramaNormalize` bağlanır.
- "Kyrenia", "Lapithos", "Trikomo" Türkçe ilçe ve yerleşime çevrilir.
- **Belirsiz adlar** yalnız Kıbrıs bağlamında eşlenir: Boğaz, İskele, Girne, Beylerbeyi, Esentepe, Zeytinlik, Dereboyu, Long Beach. Böylece "Boğaz balık" İstanbul sonucu, "Çengelköy İskele" İstanbul, "Girne Pilavcısı" İstanbul kalır. Test bu durumları kapsıyor.

**Sor (`lib/sor/engine.ts`, Codex alanı):** `OTHER_CITY_WORDS` listesinde Kıbrıs adları yok. "Girne'de balık" sorusu bugün İstanbul önerisi döndürebilir.

Öneri: `kibrisBaglami(soru)` doğruysa yanıt yalnız Kıbrıs kayıtlarıyla kurulsun. Lefkoşa gibi doğrulanmış kayıt yoksa açık bir "bu bölgede henüz kaynaklı kayıt yok" yanıtı verilsin. Bu dalda Sor'a dokunulmadı.

## 5. Harita

- `app/harita/page.tsx:21` `BOUNDS` ve `components/map/RealMap.tsx` İstanbul'a (Boğaz çizgisi) sabit.
- Şehir seçimine göre sınır gerekir: Kıbrıs için ilçe kutusu ve Boğaz çizgisi olmadan.
- A-konumsuz kayıt (Niazi's) haritada görünmez; listede görünür.
- Koordinatlar yalnız OSM'den (ODbL atfı sayfada gösterilmeli; İstanbul'da da aynı).

## 6. SEO ve URL

- **Slug:** `<ad>-<ilçe>-kibris` (ör. `niazis-restaurant-girne-kibris`). İstanbul'daki "Girne Pilavcısı" gibi adlarla çakışmaz; mevcut `/mekan/[slug]` yapısı değişmez.
- **Sitemap:** `/kibris/` ve üç ilçe sayfası eklenir; mekân URL'leri mevcut üreticiden gelir.
- **Başlık ve açıklama:** "Girne, Kıbrıs" biçimi. "İstanbul" geçen sabit metinler (keşfet sayacı, mekân sayfası kırıntısı) şehirden okunur.

## 7. Restoran profili, mobil, kaynak doğruluğu

- **Profil:** mevcut profil sayfası yeterli. Kaynak satırında "işletmeci kaynağı + bağımsız kaynak (tarih türü)" gösterilir. "Orta güven" kayıtlarında (Epic Burger İskele) kısa not.
- **Mobil:** yeni bileşen yok. Şehir seçici ve yerleşim çipleri mevcut çip stilini kullanır.
- **Adres doğruluğu:** yer tarifli ya da köy düzeyli adres, sahip kararı çıkana kadar yayımlanmaz (koşullu listede).

## 8. Test ve yayın sırası (önerilen)

1. Ön koşullar (1 ve 2) tek dalda uygulanır: Codex, Google dosyaları dâhil.
2. `scripts/kuzeykibristest.ts` genişletilir: "BİLİNEN ENGEL" kontrolü tersine döner (koordinatlı kayıtlar geçmeli); Google iş listesinde Kıbrıs slug'ı olmadığı kontrol edilir.
3. Arama ve bölge sayfaları bayrakla (`NEXT_PUBLIC_KIBRIS`) eklenir; İstanbul ekran görüntüleri değişmeden kalmalı.
4. İzole Preview'da 5 kayıt tek işlemle eklenir ve hedefli geri dönüş denenir.
5. Harun'un kesin SHA onayı ve Codex yayın kapısı.
