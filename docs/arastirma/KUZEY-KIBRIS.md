# Kuzey Kıbrıs toplu restoran araştırması: İskele → Girne → Lefkoşa (18 Kasım 2026)

Bu dal bir **araştırma ve yayın hazırlık paketidir**. Kataloğa kayıt eklenmedi; hiçbir aday canlıda sayılmaz.

Değişmeyenler:
- Production, DB, Preview, Google otomasyonu (06.00 / 08.30 zamanlaması, Excel geçmişi, şifreli yedekler), Sor ve güvenlik dosyaları.
- PR #52 (Güney Kıbrıs pilotu).

**Taban:** Production `feature/investor-v1` @ `f4ebf2fe` = 879 kayıt / 844 aktif / 719 aktif restoran. Görevdeki `b83883b` (833/798) eskimişti; güncel taban yeniden doğrulandı. Codex'in açık işi PR #72 (879 tabanında beş İstanbul restoranı, Preview bekliyor) ve PR #64; ikisine de dokunulmadı.

## Teslim tablosu

| Bölge | Araştırılan | Doğrulanan | İncelemede | Reddedilen |
|---|---:|---:|---:|---:|
| İskele | 27 | 2 | 23 (1 koşullu + 22 inceleme) | 2 |
| Girne | 53 | 3 | 44 (5 koşullu + 39 inceleme) | 6 |
| Lefkoşa | 20 | 0 | 20 (0 koşullu + 20 inceleme) | 0 |
| **TOPLAM** | **100** | **5** | **87 (6 koşullu + 81 inceleme)** | **8** |

**Beklenen yeni aktif restoran:** 5. Koşullu 6 kayıt kabul edilmiş sayılmadı; açık kararlar kapanırsa en fazla 11'e çıkar.

Bu 5 kayıt İstanbul sayısına eklenmemeli; ayrı şehir olarak raporlanmalı. Yalnız bu paket uygulanırsa katalog toplamı 879 → 884 olur (aktif 849, aktif restoran 724). PR #72 önce birleşirse tabanı yeniden hesaplamak gerekir.

**Sonuç neden düşük:** Kuzeyde tarihli, adresli bağımsız editoryal kaynak çok seyrek.
- Kullanılabilen tarihli yayınlar: yemek.com'un üç yazısı (2025-12, 2026-07, 2026-10) ve cyprus-faq.com'un dört yazısı (2026-04 → 2026-10).
- cyprus-faq hiçbir mekâna adres vermiyor.
- Petit Futé 403 verdi (aşılmadı).
- Kuzeyde çalışan, erişilebilir bir sipariş platformu bulunamadı. Bitayka artık geri bildirim sitesi; Wolt ve Foody güneyde.
- Bulunan kayıtların çoğu toplayıcı sitelerde (tripaligner, wanderlog, airbnb, foursquare); bunlar kaynak sayılmadı.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `data/arastirma/kuzey-kibris/manifest.json` | 100 tekilleştirilmiş kayıt. Her birinde bölge, işletmeci kaynağı, bağımsız kaynaklar ve tarih türü, adres düzeyi, OSM koordinatı (lisanslı), mükerrerlik ve durum |
| `data/arastirma/kuzey-kibris/kabul.json` | Tek toplu kabul dosyası: yalnız doğrulanan 5 kayıt, `isletme.json` satırına yakın biçimde. `city` ve `region` alanları önerilir. Uygulanmadı |
| `data/arastirma/kuzey-kibris/kosullu.json` | 6 koşullu kayıt; her birinde koşul ve konum önerisi |
| `lib/bolge/kibris.ts` | Bölge modeli: ilçe/yerleşim eşanlamlıları, belirsiz ad kuralı, filtre, arama, slug. Henüz hiçbir sayfaya bağlı değil |
| `scripts/kuzeykibristest.ts` | Kalite, tekillik, kuzey/güney ayrımı, İstanbul koruması ve bölge modeli testi |
| `docs/arastirma/KUZEY-KIBRIS-TEKNIK.md` | Kıbrıs'ı desteklemek için gereken kod değişiklikleri ve Codex sınırı |

**Test:** `npx tsx scripts/kuzeykibristest.ts` → **101/101**. `lib/bolge/kibris.ts` `tsc --strict` ile tip denetiminden geçti. Projenin tam tip ve derleme denetimi çalıştırılmadı.

## Kanıt standardı (değiştirilmedi)

**Doğrulanan:**
- **Kimlik:** iki bağımsız kaynak. Ya işletmeci kaynağı (resmî site ya da restoranı adıyla tanımlayan otel sayfası) + ≤24 ay içinde tarihli bağımsız editoryal kaynak, ya da iki farklı yayıncıdan ≤36 ay içinde tarihli editoryal kaynak (bu yol `orta` güven sayılır).
- **Faaliyet:** ≤24 ay içinde tarihli bağımsız kaynak.
- **Adres:** sokak düzeyinde adres en az bir kaynakta ve çelişkisiz.
- **Konum:** ikinci kaynakta aynı sokak ya da aynı adlı OSM kaydının ilçe alanı içindeki koordinatı.
- Kapı farkı engel değildir.

**Koşullu:** kimlik ve faaliyet karşılanıyor, ama adres yer tarifi ya da köy düzeyinde, sokak çelişkisi, şube belirsizliği, tek kaynaklı adres ya da kategori kararı var. Kabul edilmiş sayılmaz.

**İnceleme:** tek uygun kaynak var, işletmeci kaynağı yalnız sosyal hesap, tarih eşiği aşılmış ya da kimlik belirsiz.

**Ret:** kapanmış, restoran kapsamı dışında (bar, pub, otel gala programı) ya da başka kayıtla aynı.

**Kaynak sayılmayanlar:**
- Google puanı, yorumu ve harita verisi; plus code dâhil. yemek.com 2024 yazısındaki adresler plus code olduğu için adres sayılmadı.
- Toplayıcı siteler.
- northcypruseducation.com'un toplu üretilmiş rehber metinleri (hepsi aynı zaman damgası).
- Tek başına Instagram.
- Aynı yayıncının iki yazısı tek kaynaktır (cyprus-faq).

**Tarih türü:** bütün bağımsız tarihler yazı düzeyindedir (liste yazısı, okur oylaması, haber); mekâna özel ziyaret tarihi değildir. cyprus-faq tarihleri site haritasındaki son değişiklik tarihidir.

**Platform yolu:** oturumdaki kullanıcı mesajı (18.11.2026) editoryal kaynak + güncel sipariş platformu eşleşmesine izin veriyor. Kuzeyde uygun platform bulunamadığı için bu yolla kabul edilen kayıt yok.

## Doğrulanan 5 kayıt

| Slug | Ad | İlçe / yerleşim | Tür | Adres | Konum | Kaynaklar | Güven |
|---|---|---|---|---|---|---|---|
| `fogo-steak-brasserie-bar-iskele-kibris` | Fogo Steak & Brasserie & Bar | İskele / Long Beach | Steakhouse | Cevizli Mah., Makenzi Sk. / Güven Sk. No:1 (Grand Sapphire Resort) | OSM `way/1488499475` | Otelin restoran sayfası + cyprus-faq (2026-10-20) | güçlü |
| `epic-burger-iskele-kibris` | Epic Burger İskele | İskele / Yeni İskele | Burger | Park Residence, Yeni İskele | OSM `node/14324323772` | yemek.com (2026-07-24) + cyprus-faq (2026-10-20); işletmeci yalnız Instagram | **orta** |
| `niazis-restaurant-girne-kibris` | Niazi's Restaurant | Girne / merkez | Kebapçı / Ocakbaşı | Ziya Rızkı Cd. No:3 (Sıdıka Ersoy Apt.) | yok (A-konumsuz) | Resmî şube sayfası + yemek.com (2025-12-25) aynı cadde; cyprus-faq (2026-07, 2026-04) | güçlü |
| `silver-rocks-restaurant-girne-kibris` | Silver Rocks Restaurant | Girne / Lapta | Balık restoranı | Fevzi Çakmak Cd., Lapta | OSM `node/2172301342` (2013 kaydı) | Resmî site (güncel menü) + yemek.com (2026-10-07) | güçlü |
| `archway-restaurant-girne-kibris` | Archway Restaurant | Girne / Zeytinlik | Geleneksel mutfak | Dereboyu Sk. No:7, Zeytinlik | OSM `node/2334714575` (check_date 2026-08-22) | Resmî site + cyprus-faq (2026-07-18, 2026-10-20) | güçlü |

**Satır notları (tek kaynaklı unsurlar):**
- **Fogo:** sokak yalnız otel sayfasında; otel içi restoranın halka açık olup olmadığı yazmıyor.
- **Epic Burger İskele:** işletmeci kaynağı yok. Girne şubesi ayrı tutuldu (inceleme).
- **Niazi's:** kapı no yalnız yemek.com'da. OSM'deki "Niazi's Take Away" ayrı birim olduğu için koordinat kullanılmadı. PR #52'deki şube koşulu, resmî şube sayfasıyla kapandı.
- **Silver Rocks:** sokak yalnız yemek.com'da. OSM düğümü eski; yerinde ya da harita kontrolü önerilir.
- **Archway:** sokak yalnız resmî sitede. yemek.com yılbaşı yazısı "Archway Restaurant"ı Lefkoşa Surlariçi'nde veriyor. Bu satır ayrı işletme ya da hata olabilir; Lefkoşa'da inceleme olarak tutuldu.

## Koşullu 6 kayıt (kabul edilmiş sayılmaz)

| Kayıt | Koşul |
|---|---|
| Pera Mackenzie (İskele, Long Beach) | Adres yer tarifi. Bağımsız kaynaktaki ad "Pera Beach Club". Kategori: beach club, restoran ve etkinlik alanı. OSM konum önerisi var |
| Calamari (Girne, Lapta) | Üç kaynak aynı yer tarifini veriyor ("Lapta Oteller Bölgesi, Hacı Ali Hotel yanı"). OSM konum önerisi 2012'den. Yer tarifli adres kararı bekliyor (PR #52'den açık) |
| Bellapais Gardens (Girne, Beylerbeyi) | Resmî site "Crusader Road", yemek.com ve Petit Futé "Şehit Fuat Niyazi Sokak" diyor. Aynı yolun iki adı olduğu kanıtlanmadı |
| Peri's Fish Restaurant (Girne, Karaoğlanoğlu) | İki yayıncı var, ama OSM'de ayrı bir "Peri's Liman" var ve cyprus-faq şube belirtmiyor. İşletmeci alan adı satışta |
| De Niro's Bistro Cafe (Girne, Park AVM) | Adres yalnız işletmecinin sipariş sayfasında; koordinat yok. Kategori: bistro / kafe |
| Gillham Tapas & Wine Bar (Girne, Ilgaz) | Adres köy düzeyinde. Kategori: şarap barı / restoran |

## Tür ve mutfak dağılımı

- **Doğrulanan (5):** Steakhouse, Burger, Kebapçı / Ocakbaşı, Balık restoranı, Geleneksel mutfak (birer).
- **Koşullu (6):** Akdeniz mutfağı 3, Balık restoranı 2, Uluslararası mutfak 1.
- **Bütün aday havuzu (92, ret hariç):** Restoran 19, Uluslararası 13, Balık 9, Kahvaltı 7, Burger 6, İtalyan 6, Geleneksel 6, Akdeniz 5, Kebapçı / Ocakbaşı 5, Steakhouse 3, Asya 3, Dünya 2, Pizza 2, Lokanta 2, Meyhane 2, Pideci 1, Türk mutfağı 1.
- "Kıbrıs mutfağı" ayrı tür olarak açılmadı (PR #52'den açık sahip kararı); şimdilik "Geleneksel mutfak" kullanıldı.

## Tekilleştirme ve kuzey/güney ayrımı

- Ad + ilçe tekil. Türkçe, İngilizce ve yerel yazımlar katlandı (ör. Peri's / Peris, Niazi's / Niazis); ad varyantları başka kayda çakışmıyor.
- **PR #52'nin 7 kuzey kaydı** `pr52Id` ile bağlandı, yeniden eklenmedi.
  - Niazi's ve Silver Rocks doğrulandı.
  - Calamari ve Bellapais koşullu kaldı.
  - Salut Marin, Lagoon ve Archway (Surlariçi) incelemede.
- **PR #52'nin 19 güney kaydı** bu pakette yok. Larnaka'daki "Lush" ile kuzeydeki "Lush Cafe & Bar" (Lefkoşa) ve "Lush Beach Club" (İskele) ayrı işletme olarak işaretlendi.
- İstanbul kataloğunda Kıbrıs kaydı ya da adı yok. Kabul slug'ları (`<ad>-<ilçe>-kibris`) İstanbul slug'larıyla çakışmıyor.
- **Ayrı tutulan şubeler:**
  - Epic Burger İskele ile Girne.
  - Niazi's Girne ile Lefkoşa / Mağusa şubeleri.
  - Peri's Karaoğlanoğlu ile Liman.
  - Archway Girne ile Lefkoşa.

## Eksik kalan bölgeler

**İskele:**
- Bafra'daki otel restoranları kaynakta yalnız gala programı olarak geçiyor. Otel içi à la carte restoranlar misafire özel olduğu için restoran kaydı açılmadı.
- Karpaz ve Boğaz balıkçıları için tarihli bağımsız kaynak yok: Kemalin Yeri, Kıyı, İskele Balık, Hilltop, Yannagis, Alevkayalı.
- Long Beach'te yeni işletmelerin (Komo Burger, Hacı'nın Yeri, Lokkum) yalnız işletmeci kaynağı var.

**Girne:**
- Esentepe, Çatalköy köy restoranları ve Ozanköy için bağımsız kaynak yok.
- cyprus-faq'ta anılan 30'a yakın işletmenin işletmeci kaynağı yalnız Instagram. Sosyal hesap kaynak kararı Harun'da açık.

**Lefkoşa:**
- Surlariçi, Dereboyu, Köşklüçiftlik, Gönyeli ve Hamitköy için ≤24 ay içinde tarihli bağımsız kaynak bulunamadı.
- yemek.com'un Lefkoşa yazısı 2024-02 tarihli (33 ay) ve adresleri plus code biçiminde.
- T-Vine yazıları 2021 tarihli. Lonely Planet sayfalarında tarih yok.

**Kapsam dışı:** Gazimağusa, Güzelyurt ve Lefke (görev kapsamında değil).

## Standardı düşürmeden açılabilecek kaldıraçlar (Harun kararı)

1. **Yer tarifli adres + OSM konumu** kabul edilsin mi? Calamari, Pera Mackenzie ve Gillham açılır (+3).
2. **İşletmecinin resmî sosyal hesabı + tarihli bağımsız editoryal** iki kaynak sayılsın mı? Bu iş için yeniden kontrol gerekir; yaklaşık 25 Girne / İskele kaydı aday olur.
3. **Bağımsız tarih eşiği** Lefkoşa için 36 aya çıkarılsın mı? yemek.com 2024 + ikinci bir kaynak gerekir; şu an ikinci kaynak yok.
4. **Kuzeyin yerel basını** (Kıbrıs Postası, Yenidüzen, Kıbrıs Gazetesi) mekân bazında taranabilir. Arama motoru üzerinden verim düşük kaldı.

## Codex teknik kabulü için

Gerekenler:
- `kabul.json` (5 kayıt) ve `manifest.json` (gerekçe ve kaynaklar).
- `scripts/kuzeykibristest.ts`.
- `KUZEY-KIBRIS-TEKNIK.md`; ön koşul kod değişiklikleri orada.

**Engel:** mevcut `invalidRecord` yalnız İstanbul koordinat kutusunu kabul ediyor. Koordinatlı 4 Kıbrıs kaydı `"location"` hatasıyla düşüyor; test bunu ölçüyor. Koordinatsız Niazi's kaydı mevcut şemadan geçiyor. Veri, teknik plandaki ön koşullar uygulanmadan kataloğa eklenmemeli. Özellikle:
- şehir alanı;
- Google otomasyonundan hariç tutma;
- JSON-LD ülke alanı.

## Toplu Preview kabulü ve geri dönüş planı (Codex'e)

1. Teknik plandaki ön koşullar tek dalda uygulanır. Kıbrıs kayıtları bir bayrakla (`NEXT_PUBLIC_KIBRIS=1`) yüklenir; Production'da bayrak kapalı kalır.
2. İzole Preview'da 5 kayıt tek işlemle eklenir: `appendRealVenues`, taban 879 ya da güncel toplam. Kontrol edilecekler:
   - `/kibris/iskele`, `/kibris/girne`, `/kibris/lefkosa` sayfaları;
   - aramada "Kyrenia fish", "Lapta balık", "Boğaz balık" (İstanbul sonucu vermeli);
   - mekân sayfası, harita merkezi ve sitemap;
   - İstanbul ana sayfası ve sıralamalarında değişiklik olmaması;
   - Google iş listesinde Kıbrıs slug'ı olmaması.
3. **Geri dönüş:** yalnız bu 5 slug kaldırılır (hedefli). İstanbul kayıtları alan alan aynı kalır. Bayrak kapatılınca Kıbrıs sayfaları 404 verir.
4. Neon Preview veritabanı sınırı önceki işlerde engel olmuştu. Bu veri DB'ye yazmadığı için statik Preview yeterli olabilir; yorum ve kayıt gibi DB işlevleri Kıbrıs slug'ları için seed gerektirir.

## Kullanıcı onayına sunulacak tek yayın paketi

Paket bu dalın son SHA'sı + `kabul.json`'daki 5 kayıt + teknik plandaki ön koşul değişiklikleri (Codex uygular).

Production yalnız iki koşulla açılır: Harun'un bu paketi kesin SHA ile açık onayı ve Codex yayın kapısı. Bu dal hiçbir şeyi yayımlamaz.
