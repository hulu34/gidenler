# Gidenler — Frontend v2

**Deneyim Ağı / Karar Platformu.** Google bilgi verir; Gidenler karar vermene yardım eder.

Bu depo statik tasarım değil, çalışan bir frontend'dir. Backend bağlandığında yayına
çıkabilecek şekilde kuruldu: veri sözleşmesi, uyum kuralları ve tasarım sistemi kodda.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # statik export → out/
npm run typecheck
```

Hazır build ile bakmak için: `npx serve out`

---

## 1. Ne teslim edildi

| | |
|---|---|
| **Foundation** | Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 |
| **Design system** | `src/app/globals.css` içindeki token katmanı + `src/components/**` |
| **Veri modeli** | `src/lib/types.ts` — Experience Graph, tam tipli |
| **Sahte API** | `src/lib/api.ts` — sayfalar veriye asla doğrudan dokunmaz |
| **Ekranlar** | Home · Topic · **Creator Profile** · **Liste** · **Deneyim yaz** · **İşletme paneli** · Search |
| **Mobil** | Gerçek mobil düzen; desktop'ın küçültülmüşü değil |

**v2 ile gelen katmanlar:** Reputation Graph · Expertise Graph · Creator Network ·
Consensus & Confidence · Experience Market (trend / momentum / hacim / endeks) ·
Community Expectation · Commercial Disclosure.

Demo döngüsü uçtan uca çalışır — 31 iç bağlantı, ölü link yok:
`Home → Topic → Uzman deneyimi → Creator Profile → Liste → Topic`,
`Topic → Deneyim yaz`, `Topic → İşletme paneli`.

---

## 2. Mimari

```
src/
  app/                       Next.js App Router
    layout.tsx               fontlar (self-host), header, footer
    page.tsx                 Home — gündem, Pulse, endeksler, uzman katmanı
    ara/page.tsx             Search v2 — mekân + uzman + liste
    mekan/[slug]/page.tsx    Topic — ürünün kalbi
    [username]/page.tsx      Creator/kullanıcı profili → /@denizyer
    liste/[slug]/page.tsx    Küratörlü liste + paylaşım kartı
    yaz/[slug]/page.tsx      Deneyim yazma (arz tarafı)
    isletme/[slug]/page.tsx  İşletme paneli (SaaS)
  components/
    ui/                   Button, Badge, DemoNotice, ComplianceNotice,
                          SponsoredSlot, Skeleton/Empty/Error
    creator/              SocialAuthority, ExpertiseBlock, ReputationChip/Signals
    topic/                Perspectives, ConsensusSignal
    market/               TrendModule, ExpectationModule, IndexStrip
    score/                ScoreBlock, RatingDimensions, ExternalScores,
                          TrendIndicator
    insight/              AISummaryBlock, TrendTimeline, ThemeSignals
    experience/           ExperienceCard, EntityCardRow
    layout/               Header (canlı arama), Footer
  lib/
    types.ts              Experience Graph — veri sözleşmesi
    api.ts                erişim + hesaplama katmanı
    format.ts             Türkçe tarih/sayı biçimleme
  data/                   mock veri, API'den gelecekmiş gibi modellenmiş
    categories.ts entities.ts experiences.ts users.ts lists.ts
    externalSources.ts timelines.ts insights.ts market.ts
```

**Kural:** hiçbir bileşen `src/data`'dan doğrudan okumaz. Her şey `lib/api.ts`
üzerinden geçer. Gerçek backend geldiğinde yalnızca o dosyanın gövdesi `fetch`'e
döner; imzalar ve sayfalar aynı kalır.

---

## 3. Ürün kararları — koda gömülü olanlar

### Gidenler puanı ≠ dış kaynakların ortalaması
`scoreOf()` yalnızca Gidenler'e yazılmış deneyimleri kullanır. Dış kaynaklar
hesaba **hiç girmez**; yan yana yalnızca karşılaştırma sinyali olarak durur.
Manşet puan, sürdürülen aylık toplamın son değeridir; alt puanlar
doğrulanmış ziyaret (×1,35) ve yakınlık ağırlığıyla hesaplanır.

### Puan bir çıktı, girdi değil
Kullanıcı yıldıza tıklamaz. Alt puanlar deneyimlerden gelir. Satın alınacak
bir düğme olmadığı için puan satın alınamaz.

### Kategori sürücülü rating şeması
`restaurantRating` gibi bir alan yoktur. Her kategori bir `RatingSchema`
taşır, UI ondan render edilir. Otel eklemek için tek satır veri yeter.

### Compliance mode
`Category.compliance` beş şeyi kategori düzeyinde açıp kapatır: puan görünürlüğü,
AI özeti, reklam, işletme tanıtımı, ücretsiz sahip cevabı.

`regulated` modda (hekim, avukat) platform **puan üretmez, özet cümlesi kurmaz,
reklam göstermez**. Gerekçe arayüzde kullanıcıya yazılır (`ComplianceNotice`).
Sebep: adı geçen bir hekim hakkında hüküm veren bir puan ya da cümle, platformu
5651 sayılı kanundaki *yer sağlayıcı* konumundan *içerik sağlayıcı* konumuna
taşır. Orada yalnızca nötr konu sayımı gösterilir.

### AI kaynağını gizlemez
Her özet kaç deneyime dayandığını taşır (`basedOnCount`) ve hangi deneyimlerden
çıktığını tutar (`sourceExperienceIds`). AI insan yerine deneyim yazmaz.

### Sahte aktivite yok
"Şu anda 248 kişi bakıyor" tarzı gerçek telemetriye dayanmayan hiçbir sayı yok.
Tüm demo veriler arayüzde **demo** olarak işaretli.

### Sponsorlu içerik
`SponsoredSlot` deneyim tipografisinden ayrıdır, "Sponsorlu" etiketi taşır,
puanı ve sıralamayı etkilemez, `allowAdvertising: false` kategorilerde hiç
render edilmez.

### Reputation ≠ popülerlik
`User.reputation` Gidenler içi davranıştan gelir (katkı, doğrulanmış ziyaret,
faydalı bulunma, şeffaflık, moderasyon geçmişi). Dış takipçi sayısı ağırlığı
%10'u geçmeyen **bir sinyaldir**. Arayüzde ikisi ayrı bloklarda gösterilir ve
asla toplanmaz.

Bunun kanıtı veride duruyor: `@nazli-ada` Instagram'da 512 takipçili, ama 268
deneyim ve %80 doğrulama oranıyla Japon mutfağında "uzman". `@denizyer` 482 bin
takipçili ve o da uzman — ama aynı sebepten, takipçiden değil.

### Expertise ≠ Reputation
`Reputation` genel güven, `ExpertiseArea` konu bazlı otoritedir; kategori, alan
(facet), konum veya bunların kombinasyonunda oluşur. Topic sayfasındaki "Uzmanlar"
perspektifi, o mekânın facet/ilçe bilgisiyle kullanıcının uzmanlık alanlarını
eşleştirerek hesaplanır.

### Visit ≠ Experience
Aynı kullanıcı aynı mekâna birden çok kez gidebilir; `Visit` ayrı bir kayıttır ve
her deneyim `visitedAt` taşır. Trend sistemi ziyaret zamanına dayanır, yazma
zamanına değil.

### Ticari ilişki veri modelinde
Her deneyim bir `Disclosure` taşır (none / invited / gifted / sponsored /
employee / owner_related / unknown). Beyan edilen deneyimler **yayımlanır ve
etiketlenir**, ama `weightOf()` içinde puan ağırlığı yarıya iner. Gizlenmez,
görmezden de gelinmez.

### Experience Market katmanı
`TopicIntelligence` artık `momentum`, `periodChanges` (30G/90G/6A/1Y/Tümü),
`volume` (deneyim hacmi) ve `expectation` taşır. Topic sayfasındaki **Gidenler
Trend** modülü dönem değiştirilebilir bir zaman serisidir; ana sayfada **Pulse**
ve **Endeksler** aynı verinin ağ ölçeğindeki hâlidir.

Tasarım kuralı: bu bir finans terminali değildir. Mum grafiği yok, neon yok,
canlı tik yok. Editoryal tipografi + ciddi veri.

### Beklenti ≠ puan (KİLİTLİ)
Deneyim yazarları puanı **oluşturur**; beklenti katılımcıları puanın gelecekteki
**yönü** hakkında görüş bildirir. İki sistem ayrıdır:
`CommunityExpectation` hiçbir koşulda `overallScore`'u etkilemez.
Para, jeton, cüzdan, oran, bahis **yoktur** ve mimaride yeri de yoktur.

### Para itibar satın alamaz (KİLİTLİ)
- `BusinessLink.subscription` yalnızca araç açar; skor ve sıralamaya erişimi yoktur.
- Sponsorlu içerik ayrı bileşendir, deneyim tipografisini taklit edemez.
- Creator ödeme aldığı için uzmanlık kazanamaz — `Disclosure` ağırlığı düşürür.
- Tahmin isabeti satın alınamaz ve Gidenler puanını etkilemez.

---

## 4. ⚠️ Canlıya çıkmadan çözülecek: dış kaynak lisansları

Dış kaynak puanları prototipte **demo veridir** ve provider tabanlı yazılmıştır
(`enabledProviders` dizisinden tek satırla kapatılır). Gerçek entegrasyon
açılmadan önce her sağlayıcının kendi gösterim şartı vardır; bunlar kodun içinde
`ExternalSource.licensingNote` alanında taşınır:

- **Google Places** — yorum gösterirken yorumcunun adı, avatarı ve profil
  bağlantısı, Google atıfı ve önbellek sınırları zorunlu.
- **Tripadvisor Content API** — kendi puan simgeni kullanamazsın; Tripadvisor'ın
  kendi baloncuk grafiği ve en az 20px logosu içeriğe yakın gösterilmeli.
- **Yandex Maps** — kullanım şartları ve atıf zorunluluğu.
- **Şikayetvar** — şikayet sayısını üçüncü taraf olarak göstermek ayrı bir
  anlaşma gerektirir; itibar riski nedeniyle hukuk onayı olmadan açılmamalı.

Tasarım bu şartlar altında da çalışacak şekilde kuruldu: dış kaynaklar kompakt bir
şeritte durur, sağlayıcı bazlı render'a izin verir ve Gidenler puanının görsel
üstünlüğünü bozmaz.

---

## 5. Tasarım sistemi

**Renk.** Tek kaynak `globals.css` içindeki token katmanı. Bileşenler ham hex
kullanmaz. Renk yalnızca dört iş için: `accent` (Gidenler'in kendi sesi),
`pos`/`neg` (anlam), `warn` (dikkat), `ink-*` (metin hiyerarşisi). AI ve sponsorlu
içeriğin kendi rengi **yoktur** — etiketle ayrılır. Açık ve koyu tema ayrı ayrı
tasarlandı (otomatik ters çevirme değil); tüm metin/zemin çiftleri WCAG AA'yı,
grafik işaretleri 3:1'i geçer.

**Zemin.** Beyaz (`#ffffff`), tek elektrik indigo vurgu (`#2b2ac4`), kalibre
edilmiş gri çizgi seti. Koyu tema kaldırıldı — ürün tek, tutarlı bir açık temada
çalışıyor.

**Tipografi.** Üçü de npm üzerinden self-host (üçüncü taraf CDN'e istek gitmez —
hız ve KVKK):
- **Schibsted Grotesk** — arayüz, başlıklar, sayılar. Türkçe karakterleri güçlü,
  tabular rakamları var.
- **Newsreader** — deneyim metinleri. Uzun okuma için.
- **Instrument Serif** — yalnızca marka: wordmark ve tek bir vurgu kelimesi.

**Trend.** Yön her zaman renk + ok ile birlikte verilir; renk körlüğünde de okunur.
Yetersiz veride ("her iki dönemde en az üç ölçüm") trend iddiası yapılmaz.

**Kart yok.** Ürün içerik yoğun. Her şeyi karta koymak yerine kural çizgileri,
tipografik hiyerarşi ve boşluk kullanılıyor.

---

## 6. Sıradakiler

1. **Moderasyon arayüzü** — tipler hazır (`Report`, `ModerationDecision`, `Appeal`,
   `AuditLog`, `ExperienceState`); SLA kuyruğu yazılacak. 5651 m.9 için 48 saat,
   m.9/A için 4 saat yanıt süresi işliyor. **En yüksek operasyonel risk burada.**
2. **Creator onboarding** — sosyal hesap bağlama → doğrulama → uzmanlık seçimi →
   geçmiş mekânlar → ilk deneyimler. `SocialIdentity` ve `ExpertiseArea` bunu taşıyor.
3. **Creator import** — sosyal içerikten geçmiş ziyaret önerisi ("Bu paylaşımın
   Moda Lokantası deneyimi miydi?"). Mimari engel değil; API entegrasyonu gerekli.
4. **ExperienceIndex hesabı** — endeksler bugün demo; gerçek toplu hesaplama backend'de.
5. **Prediction çözümü** — 30 gün sonra sonucun kapanması ve `PredictionReputation`
   güncellemesi. Bugün UI state.
6. **Backend** — Postgres/PostGIS, telefon doğrulamalı kayıt, varlık birleştirme,
   Türkçe arama, trafik kaydı (5651).

---

Demo veri uyarısı: bu depodaki işletme, hekim, deneyim ve dış kaynak puanlarının
tamamı prototip için üretilmiştir. Gerçek hiçbir işletmeye veya kişiye ait değildir.
