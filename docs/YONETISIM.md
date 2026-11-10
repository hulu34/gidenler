# Gidenler — depo ve yayın yönetişimi (öneri)

Durum: **öneri**. Bu belge hiçbir ayarı değiştirmez. Uygulanacak her adım depo sahibinin kararıdır.
Tarih: 10 Kasım 2026.

## 1. Olay ve kök neden

10 Kasım gecesi iki yapay zekâ ajanı (Claude ve Codex) aynı depoda çalıştı. Biri Production dalına (`feature/investor-v1`)
güvenlik düzeltmesi gönderdi. O düzeltme Google Maps okumasını da kapatıyordu. Değişiklik geri alındı (`571d544`, `d3cf21e`)
ve ayrıştırılmış hâliyle (`b59589f`) yeniden yayına alındı. Arada sitede Google puanları bir süre görünmedi.

Salt okunur denetimde (10 Kasım) bulunanlar:

| Bulgu | Sonuç |
|---|---|
| `feature/investor-v1` ve `main` için dal koruması yok (`Branch not protected`) | Herkes doğrudan push edebiliyor; zorla push (force push) da engelli değil. |
| Depoda kural seti (ruleset) yok | Kritik dosyalar için inceleme zorunluluğu yok. |
| Pull Request'te çalışan CI yok (yalnız `pages.yml` ve `gpuan-gunluk.yml`) | Test geçmeden birleştirme engellenmiyor. |
| İki ajan da aynı GitHub kimliğiyle (`hulu34`) push ediyor | Kim neyi değiştirdi ayrılamıyor; CODEOWNERS ve "inceleme zorunlu" kuralları ajanları birbirinden ayıramaz. |
| Production iki yoldan güncellenebiliyor: Production dalına git push ve Vercel CLI (`vercel deploy --prod`, `vercel promote`) | Git'te kaydı olmayan bir Production durumu oluşabilir. |
| `vercel.json` `deploymentEnabled` listesini her dal değiştirebiliyor (ör. `guvenlik/**` eklendi) | Yeni bir dal öneki, sahibi fark etmeden derlenip yayına hazır hâle gelebilir. |

Kök neden tek bir hata değil. Kimlik ayrımı yok, alan sahipliği yazılı değil ve Production'a giden yolda zorunlu bir kapı yok.

## 2. Alan sahipliği (tek sorumlu)

Her alanın tek bir sorumlu ajanı var. Diğer ajan o alanın dosyalarını **yalnız okur**. Bir değişiklik gerekiyorsa sorumluya
not bırakır (PR yorumu ya da `calisma/` notu).

| Alan | Yollar | Sorumlu | Diğer ajan |
|---|---|---|---|
| Google günlük puan sistemi | `.github/workflows/gpuan-*.yml`, `lib/gpuan/**`, `scripts/gpuan*`, `app/api/admin/google-puan/**`, `app/api/cron/puan/**`, `app/api/google/**`, `lib/google*` | **Codex** | Salt okunur |
| İşletme paneli ve rezervasyon güvenliği | `app/api/rezervasyon/**`, `lib/reservationDelivery.ts`, `lib/business/**`, `components/reservation/**`, `app/isletme/**`, `scripts/panel-rezervasyon-test.ts` | **Codex** | Salt okunur |
| Deneyim akışı, kampanya, mekân öner, ana sayfa, profil görünümü, SEO | `app/nerede-yedin/**`, `app/yaz/**`, `components/deneyim/**`, `lib/kampanya/**`, `lib/oneri/**`, `lib/inapp.ts`, `app/page.tsx`, `components/home/**`, `app/seckisi/**`, `app/sitemap.ts` | **Claude** | Salt okunur |
| Veritabanı geçişleri | `drizzle/**`, `lib/db/schema.ts`, `lib/db/migrations.generated.ts` | **Tek kişi: depo sahibi onaylar**; ajan yalnız *eklemeli* geçiş önerir | — |
| Google OAuth ve Production ortam değişkenleri | Google Cloud, Vercel Production env | **Yalnız depo sahibi** | Ajanlar değiştirmez |
| Yatırımcı demosu | `demo/yatirimci` dalı, `demo-yatirimci-v1` etiketi | Dondurulmuş | Dokunulmaz |

Ortak dosyalar (`app/layout.tsx`, `app/mekan/[slug]/page.tsx`, `package.json`, `vercel.json`) iki alanı da etkiler. Bu dosyalara
dokunan PR'a diğer alanın sahibi de bakar.

## 3. Dal ve yayın kuralları

1. **Dal önekleri ajana göre:** `claude/*` ve `codex/*`. Mevcut `gece/*`, `feature/*` ve `guvenlik/*` dalları olduğu gibi kalır;
   yeni işler bu öneklerle açılır.
2. **Production dalına doğrudan push yok.** `feature/investor-v1` yalnız PR birleştirmesiyle ilerler. Birleştirmeyi depo sahibi yapar.
3. **Vercel CLI ile Production yayını yok.** `vercel deploy --prod`, `vercel promote` ve alan adı işlemleri yalnız depo sahibinin açık
   onayıyla ve geri dönüş kimliği yazılarak yapılır. Ajanlar Preview dağıtımı yapabilir.
4. **Geçişler yalnız eklemeli olur** (yeni tablo, sütun, dizin). Silme ve yeniden adlandırma ayrı onay gerektirir. Production'da
   geçişi yalnız yayın işi uygular, bekleyen liste beklenenle aynı değilse durur (`ops/yayin-gece3.mjs`).
5. **Eş zamanlı çalışma kilidi:** bir ajan işe başlarken açtığı taslak PR'ın başlığına dokunacağı alanları yazar
   (ör. `[claude] deneyim akışı · app/yaz, components/deneyim`). Diğer ajan aynı yollara dokunan iş açmadan önce açık taslak
   PR'lara bakar (`gh pr list --draft`).

## 4. GitHub ayarları (sahibin uygulayacağı sıra)

Bu ayarlar bu gece **değiştirilmedi**.

1. **Ayrı kimlikler.** Her ajan için ayrı bir GitHub hesabı (makine kullanıcısı) ya da GitHub App kullanılır. Her kimlik yalnız
   bu depoya ve yalnız `contents: write` + `pull_requests: write` izniyle erişir. Kimlikler ayrılmadan 2–4. adımlar ajanları
   birbirinden ayıramaz.
2. **Kural seti: `feature/investor-v1` ve `main`.**
   - PR zorunlu, en az 1 onay; onayı depo sahibi (`hulu34`) verir.
   - Zorla push ve dal silme yasak.
   - Zorunlu durum denetimi: `pr-kontrol` (aşağıda).
   - Atlama (bypass) izni yalnız depo sahibinde.
3. **CODEOWNERS** (`.github/CODEOWNERS`). Öneri metni: `docs/oneri/CODEOWNERS`. Kritik yollarda sahibin incelemesi zorunlu olur.
4. **PR denetimi.** Öneri: `docs/oneri/pr-kontrol.yml`. Şunları çalıştırır: tür denetimi, birim testleri, derleme ve
   "kritik yol bekçisi". Bekçi, PR kritik bir yola dokunuyorsa `alan-sahibi-onayi` etiketi olmadan başarısız olur.
5. **Vercel.**
   - Production dağıtımı yalnız `feature/investor-v1` git derlemesinden.
   - Ajanların Vercel belirteci (token) Production'a yayın yapamayan bir rolde olur; bu rol önce Vercel ekip ayarlarında doğrulanmalı.
   - `vercel.json` `deploymentEnabled` değişikliği CODEOWNERS ile sahibin onayına bağlanır.

## 5. Geri dönüş prosedürü

1. Son üç Production dağıtımının kimliği her yayında rapora yazılır (ör. 10 Kasım: `kwm68b414` = `b59589f`, öncesi `qhete9i0l` = `e49e43a`).
2. Kod sorunu: `vercel promote <önceki-dağıtım>`; ardından `git revert` ile Production dalı aynı duruma getirilir. Git ile canlı
   arasında fark bırakılmaz.
3. Veri sorunu: geçişler eklemeli olduğu için kod geri dönüşünde tablo kalabilir. Veri silme yoktur, `audit_log` silinmez.
4. Google puan sistemi: geri dönüş kararını alanın sahibi verir. Diğer ajan yalnız salt okunur durum raporu hazırlar.

## 6. Her PR'da kontrol listesi

- [ ] Hangi alana dokunuyor? Sahibi kim?
- [ ] Kritik yol değişti mi? (`git diff --name-only origin/feature/investor-v1`)
- [ ] Testler ve derleme geçti mi?
- [ ] Preview'ın veritabanı izole mi? (`/api/admin/db` → `env=preview`, `writeGuard.ok=true`)
- [ ] Production'a veri yazacak bir adım var mı? Varsa ayrı onay.
- [ ] Geri dönüş: hangi dağıtıma `promote` edilir?
