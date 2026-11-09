# Aşama 0 raporu — 9 Kasım 2026

Dal: `guvenlik/asama0` (commit `0b7cb50` ve belge eki), taban: `feature/investor-v1` (`e49e43a`, Production dalı)
Preview: `https://gidenler-git-guvenlik-asama0-hulu34.vercel.app` (Vercel korumalı)
**Production'a henüz alınmadı.** gidenler.com'da eski Google puanları, birleştirme ve dağıtım yapılana kadar görünmeye devam ediyor.

## 1. Yapılanlar

| # | İstek | Durum | Nasıl |
|---|---|---|---|
| 1 | Playwright ile günlük Google okumasını durdur | **Production'da etkin** | GitHub'da `Google puan gunluk` (her gün 06:00 TR) ve `aday dogrula` (Maps aday doğrulama) iş akışları **devre dışı** bırakıldı. Kod düzeyinde de üç betik ve Maps sayfa adaptörü istek yapmadan çıkıyor. Yönetim ve moderasyon yazma uçları `410` dönüyor. |
| 2 | Eski geçmişi gösterim ve sıralamadan çıkar | Preview'da doğrulandı | `lib/gpuan/policy.ts` sabiti ortam değişkeniyle açılamaz. `googleRatingMap()` veritabanına gitmeden boş döner. Puan geçmişi Yükselen/Düşen hesabına girmez. Top 10 "Google puanına göre", Düşenler ve Google'a dayalı yedek listeler kalktı. Mekân, arama, harita ve karşılaştırma sayfalarına saklanan puan gelmiyor. Önbellek anahtarları değişti, eski önbellek sızmıyor. |
| 2b | Hukuki inceleme ve temizleme planı | Plan hazır | `docs/asama0/google-temizlik-plani.md`. **Veri silinmedi.** |
| 3 | Places UI Kit lisans, teknik ve maliyet planı | Plan hazır | `docs/asama0/places-ui-kit-plani.md` (resmî fiyat: UI Kit Query 10.000 ücretsiz + 1 USD/1.000; Pro 5.000 + 5 USD/1.000) |
| 4 | Gidenler puanını koru | Değişmedi | `lib/score/*` dosyalarına dokunulmadı. Test, bu dosyaların hiçbir Google modülünü içe aktarmadığını doğruluyor. |
| 5 | İşletme paneli yetkisiz erişim | Preview'da doğrulandı | Panel yalnız yatırımcı demosunda (sahte veri) üretiliyor. Diğer bütün ortamlarda sayfa üretilmiyor ve `404` dönüyor. Ara katman yönlendirmesine güvenilmiyor. Mekân sayfasındaki panel bağlantısı gizlendi. Tek karar noktası: `lib/business/access.ts`. |
| 6 | İletilmeyen rezervasyon başarılı görünmesin | Preview'da doğrulandı | Başarı (`201`, `forwarded:true`) yalnız alıcı 2xx döndürünce. Kanal yoksa `503`; hata, zaman aşımı veya yönlendirmede `502`. Arayüz yalnız `forwarded:true` geldiğinde "iletildi" diyor. Ağ hatasında kayıt tutulmuyor. |
| 7 | Üç domain için ortak 100 USD Google bütçesi | Tasarım hazır | Tek Google Cloud projesi, tek Redis sayacı (mevcut 100 USD tavanı genişletilir), domain payları 70/20/10 USD. Asıl fren Cloud Console günlük kotası. |

## 2. Test sonuçları

**Yeni güvenlik testleri** (`npm run test:asama0`, `scripts/asama0test.ts`): **40/40 geçti.**

- Google: politika sabitleri; `googleRatingMap`/`googleRatingOf` boş dönüyor (sahte bir veritabanı adresi verilse bile bağlantı denenmiyor); adaptör hata veriyor; üç betik kod 3 ile ağ isteği yapmadan çıkıyor; yönetim aktarımı 410.
- Panel: demo dışında izin yok, hiçbir sayfa üretilmiyor, istek notFound (404) veriyor.
- Rezervasyon: tanımsız, http veya geçersiz webhook → kullanılamıyor; 2xx → iletildi; 500, 3xx, ağ hatası ve zaman aşımı → başarısız. 503/502/201 eşlemesi doğru; hata metinleri "iletildi" demiyor; ortak olmayan gerçek mekân 409 alıyor.
- Puan: `lib/score` dosyaları Google modülü içe aktarmıyor.
- Not: Zaman aşımı testi ilk yazıldığında Node süreci erken bitip yanlışlıkla 0 kodu döndürüyordu. Test düzeltildi ve erken çıkış artık başarısızlık sayılıyor.

**Mevcut test paketleri** (aynı dal):

| Paket | Sonuç |
|---|---|
| typecheck, test:seo, test:anasayfa, test:gpuan, test:db (normal + demo), test:sor, test:arama, test:seckisi, test:medya | geçti |
| qa (arama/AI kalite) | **23 hata**. Değişiklik öncesi Production kodunda da aynı 23 hata var (off-topic 13, normalization 1, ai-empty 8, ai-monotone 1). Bu değişiklikten kaynaklanmıyor. |

**Preview'da canlı kontrol** (production ile karşılaştırmalı):

| Kontrol | Production (bugün) | Preview |
|---|---|---|
| Ana sayfa "Google puanı" ifadesi, Top 10 Google, `#h-eniyiler` | 52 kez geçiyor, var | Yok. Hero: "gidenlerin kendi deneyimleri, Gidenler puanı ve gerçek etkileşimden doğan listeler" |
| `/mekan/aga-ocakbasi-beyoglu/` | "Google puanı 4,9 /5" | Rozet yok |
| `/isletme/<gerçek mekân>/` | — | 404 |
| `POST /api/rezervasyon/` (ortak olmayan gerçek mekân) | — | 409 `not_partner` |
| `POST /api/admin/google-puan/` | — | 410 `google_ratings_disabled` |

## 3. Yedek ve geri dönüş

- Değişiklik veritabanına **yazmıyor**: göç yok, veri değişikliği yok.
- **Production veritabanı yedeği alınamadı.** Production bağlantı bilgilerini yerel diske indirme izni reddedildi ve bu kısıt aşılmaya çalışılmadı. Birleştirmeden önce Neon panelinde `yedek-asama0-20261109` dalını açmanız gerekiyor (adımlar `docs/asama0/geri-donus.md`).
- Kod geri dönüşü: Vercel Instant Rollback ile önceki Production dağıtımına (`gidenler-qhete9i0l`) ya da `git revert` ile.

## 4. Kalan riskler

1. **Production'a alınmadı.** Birleştirmeye kadar gidenler.com eski Google puanlarını göstermeye devam ediyor. `feature/investor-v1`'e hızlı ileri alma (fast-forward) ile geçilebilir; dal bu çalışma süresince ilerlemedi.
2. **Eski veri duruyor:** Google tabloları, Neon Preview dalları ve GitHub'daki şifreli eserler. Temizlik hukuk görüşüne bağlı.
3. **Resmî Places API yolu açık:** Mekân sayfasındaki Google yorumları ve fotoğrafları sunucudan, saklanmadan alınıyor. Mevcut 100 USD sayacının altında çalışıyor ve otomatik okuma değil. Yine de §3'teki UI Kit lisans incelemesinin içinde yeniden değerlendirilmeli.
4. **Yönetim veritabanı ucu (`/api/admin/db`)** hâlâ yalnız Vercel koruması ve "EVET" metnine dayanıyor. Bu Aşama 0 listenizde yoktu ve düzeltilmedi.
5. **Gerçek işletme paneli yok.** Oturum ve sahiplik doğrulaması Gidenler kurumsal v2'de yapılacak. Bugünkü çözüm paneli tamamen kapatmak.
6. **Rezervasyon:** Production'da webhook tanımlı değil, yani gerçek ortak olsa çevrim içi rezervasyon alınamaz ve kullanıcıya bu dürüstçe söylenir. Tekrarlanan isteği tek sayma (idempotency), outbox ve işletme onay durumları hâlâ yok.
7. **Arama motoru önbelleği:** Daha önce gösterilen Google puanları bir süre arama sonuçlarında görünebilir.
8. **`ops/olcum` dalındaki `Olcum ve pilot` iş akışı** açık. Bu iş Places API ile ölçüm ve eşleştirme yapıyor, Maps sayfası okumuyor. Google'ı okuyan aday işi ise kapalı.
9. `qa` paketindeki 23 eski hata ayrıca ele alınmalı.

**RestoranYorum ve YemekYorum kapalı kalıyor:** iki domain hâlâ GoDaddy park sayfasında, hiçbir şey yayımlanmadı. Bu riskler kapanmadan yayın yapılmayacak.
