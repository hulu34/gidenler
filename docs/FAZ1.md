# Faz 1 — Gerçek içerikle büyüme

Hedef: İstanbul'da **en az 1.000 gerçek restoran** (OSM `amenity=restaurant`). Kafe, bar ve pub
kayıtları eklenebilir ama hedefe sayılmaz. Dalgalar: 148 → 400 → 700 → 1.000; her dalga önce
Preview'da, Production veri değişikliği yalnız onayla.

## 1. Kayıt sayıları — 1.602 ile 148 arasındaki fark

Sitedeki mekân listesi üç kaynaktan değil iki kaynaktan oluşur (`data/entities.ts`):

| Tür | Sayı | Kaynak | Puan / deneyim |
|---|---:|---|---|
| Demo — elle yazılmış | 11 | `data/entities.ts` | sentetik, "Demo kayıt" etiketli |
| Demo — üretilmiş evren | 1.443 | `data/universe.ts` (deterministik üreteç) | sentetik, "demo" etiketli |
| Gerçek (OSM) | 148 | `data/real/venues.json` → Neon `places` | yok; "Gerçek mekân · ilk deneyim bekliyor" |
| Statik ama gerçek olmayan başka kayıt | 0 | — | — |
| **Toplam** | **1.602** | | |

- Neon'a yalnız **gerçek** kayıtlar aktarılır (148). Demo kayıtlar veritabanına hiç yazılmaz.
- Gerçek 148'in dağılımı: 106 restoran kategorisi, 38 kafe, 4 bar. OSM türüne göre restoran hedefine
  sayılanlar Dalga 1 raporunda ayrıca verilir (bazı "Kahvaltı" kayıtları OSM'de kafedir).
- Demo kayıtlar: her kartta "demo · N deneyim", detay sayfasında "Demo kayıt" rozeti ve sayfa altında
  demo uyarısı. Gerçek mekân sayfalarında demo uyarısı artık gösterilmez; altbilgi iki türü ayrı anlatır.
- Demo dış kaynak puanları (1.095 adet "Google Haritalar (demo)", "Tripadvisor (demo)") yalnız demo
  kayıtlarda ve "demo" ibaresiyle görünür; gerçek mekânlara hiçbir dış puan yazılmaz.

## 2. Redis — Production / Preview ayrımı

- **Altyapı:** `gidenler-redis` (Upstash, ücretsiz) bağlantısı yalnız **Production** ortamına daraltıldı
  (KV_* değişkenleri artık Preview'da yok). Production değerleri değişmedi.
- **Preview:** Upstash'te ikinci ücretsiz veritabanı açılamıyor (hesap başına bir ücretsiz DB); seçenekler
  yalnız ücretli. Bu yüzden Preview şu an Redis'siz: ücretli Google çağrıları "çalışmazsa durdur" kuralıyla
  otomatik reddedilir, hız sınırı bellek içi çalışır. Ayrı Preview Redis'i için karar sizde
  (Upstash "Pay As You Go": 100 bin komut başına $0,2; Preview hacminde aylık ~$0).
- **Kod (savunma katmanı):** tüm anahtarlar ortam önekli — `prod:usage:…`, `preview:rl:…`, `dev:…`.
  Aynı Redis'e yanlışlıkla bağlansalar bile sayaçlar karışmaz.
- **Google kotası:** iki ortam aynı Google projesini kullanır. Preview'un ücretli çağrı payı Production'ın
  %10'u ile sınırlı; toplam ücretsiz kotanın altında kalır (Text Search 4.500 + 450 < 5.000; Details/Photo
  880 + 88 < 1.000).

## 3. Zorunlu alanlar ve kimlik

Her kayıt için: ad, konum (lat/lng İstanbul sınırı içinde + semt), kategori, kaynak (OSM `node|way/ID`),
tekrarsız slug. Gidenler ID = Neon `places.id` (UUIDv7), ilk eklemede üretilir, sonra değişmez.
Zorunlu alanı bozuk tek kayıt varsa tohum hiçbir şey yazmaz (`invalid_records`).

## 4. Google Places — kurulumun son adımları

Kod hazır (`lib/providers/google.ts`): bir kerelik Text Search ile eşleştirme; skor ≥ 0,90 otomatik,
0,60–0,90 manuel onay kuyruğu, altı ret. **Saklanan tek Google verisi `place_id`**; puan, yorum ve fotoğraf
saklanmaz, her gösterimde canlı çekilir ve Google atfıyla, Haritalar bağlantısıyla gösterilir.
Preview'da ücretli çağrılar kapalıdır (`GOOGLE_PLACES_PREVIEW=true` olmadan açılmaz).

Hesap sahibi adımları (Google Cloud, proje "gidenler"):
1. Faturalandırma hesabı bağla (Maps Platform ücretsiz kotalar için de zorunlu).
2. **Places API (New)**'i etkinleştir.
3. API anahtarı oluştur → API kısıtlaması: yalnız Places API (New). Anahtar yalnız sunucuda kullanılır.
4. Kotalar (ikinci fren): Text Search Pro günlük 150; Place Details (Atmosphere) günlük 29; Place Photo günlük 29.
5. Bütçe uyarısı: aylık $1 (aşılırsa e-posta).
6. Anahtarı Vercel'e **yalnız Production** kapsamında `GOOGLE_PLACES_API_KEY` olarak ekle (formu ben hazırlarım,
   değeri sen yapıştırırsın).

Sonra (kod tarafı, onayla): toplu eşleştirme işi — günlük 150 sınırla 1.000 restoran ~7 günde, ücretsiz kotada.
Kota ve maliyet: Text Search Pro 5.000/ay ücretsiz (sınırımız 4.500), Details ve Photo 1.000/ay ücretsiz
(sınırımız 880). Sınırlar ücretsiz kotanın altında olduğu için beklenen maliyet **$0**.

## 4b. Demo ayrımı

- Arama (`/ara`): varsayılan sonuçlarda demo kayıt yok; "Demo kayıtları da göster" kutusu, `?demo=1` ya da sunum
  modu ile açılır.
- Gidenler 100: yalnız gerçek kayıtlardan; şu an koşulu karşılayan gerçek mekân yok. Demo sıralama
  `/gidenler-100/onizleme/` adresinde, "gerçek sıralama değildir" uyarısıyla ve arama motorlarına kapalı.
- Demo veriler silinmedi; geliştirme ve sunum için duruyor.

## 5. Veri tamlığı

Anahtarlar (`lib/completeness.ts`): Google bilgisi, fotoğraf, Gidenler deneyimi, menü, video,
online rezervasyon, açılış saatleri, iletişim, adres. Yalnız kaynağı olan veri "var" sayılır.
- Detay sayfası: gerçek mekânlarda "Profil tamlığı N/9" bloğu.
- Toplu rapor: `/api/admin/db` (korumalı) → `quality.restaurantFields` (sayı ve yüzde).

## 6. Google OAuth — "Testing" → "In production" koşulları (yayın durumu değiştirilmedi)

1. Gizlilik politikası sayfası (`/gizlilik/`) — **henüz yok**; KVKK aydınlatma metni dahil, metin onayınızla.
2. Kullanım şartları sayfası (önerilir).
3. OAuth onay ekranı: uygulama adı "Gidenler", destek e-postası, ana sayfa `https://www.gidenler.com`,
   gizlilik bağlantısı, yetkili alan adı `gidenler.com`.
4. Kapsamlar yalnız `openid email profile` (hassas değil) → Google doğrulaması gerekmez; logo
   eklenirse marka doğrulaması gerekir (Search Console'da alan adı sahipliği).
5. Hesap silme yolu (KVKK): "Hesabımı sil" → `user` satırı ve bağlı veriler (cascade).
6. Production istemcisinin yönlendirme adresi yalnız `https://www.gidenler.com/api/auth/callback/google`.
Bu maddeler tamamlanınca "Publish app" yalnız sizin onayınızla yapılır.

## 7. Hesap verisi (Gittim, Gitmek istiyorum, Favoriler, koleksiyonlar, deneyimler)

Bugün tümü tarayıcıda (`lib/store.ts`, localStorage). Tablolar Faz 0'da hazır:
`user_place_status` (want_to_go / visited / favorite / visit_count), `lists` + `list_items`, `reviews`.
Plan:
1. `/api/me/places` (GET, PUT), `/api/me/lists`, `/api/me/reviews` — oturum zorunlu, yalnız gerçek mekân
   (DB'de `places.id` olan) yazılabilir; demo kayıtlar tarayıcıda kalır.
2. `lib/store.ts` gövdesi: oturum varsa sunucuya yaz, yoksa localStorage (arayüz aynı).
3. İlk girişte tarayıcıdaki gerçek-mekân kayıtlarını hesaba bir kez taşı (çakışmada sunucu kazanır).
4. Deneyim yazma: `reviews` + `visit_verifications`; puan formülü değişmez (Faz 0 testleri).
5. Rollback güvenliği: kullanıcı verisi bağlı mekân varken tohum geri alma zaten durur.
