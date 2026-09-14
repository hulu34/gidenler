# Gidenler Intelligence Layer — mimari ve işletme notu

Sürüm: v1 (dal: `feature/gidenler-ai-v1`). Amaç: "Gidenler AI'a Sor" için sağlayıcı-bağımsız, güvenli, ölçülebilir bir zekâ katmanı. Mevcut deterministik karar motoru (`lib/decisionEngine.ts`) silinmedi; modelin **aracı** ve her hata yolunun **güvenli düşüşü** oldu.

## 1. Mimari

```
Tarayıcı (components/home/AskAI.tsx)
   │  yerel deterministik motor → anında yanıt (her ortamda)
   │  POST /api/ai (yalnızca sunucu modunda var; yoksa sessizce yerel motor)
   ▼
Gidenler AI API  (app/api/ai/route.api.ts)            ← HTTP kabuğu, hata→kod eşlemesi
   ▼
Orkestratör  (lib/ai/orchestrator.ts)
   doğrula → PII temizle → rate limit → cache → bütçe kapısı
   → niyet (yerel parseIntent; belirsizse hızlı model)
   → deterministik motor adayları (askAI, limit 8)  ── VERİ bloğu olarak modele
   → birincil model: JSON "araç çağrısı | nihai yanıt" döngüsü (≤ AI_MAX_TOOL_CALLS)
   → zod doğrulama → entityId kapısı (yalnızca araçların döndürdüğü, veri kümesinde olan, regüle olmayan)
   → (her hata) deterministik motor → örneklemeli yargıç (yanıttan sonra) → anonim telemetri
   ▼
AI Router / Gateway  (lib/ai/router.ts)              ← rol → (sağlayıcı, model), yedek zincir, bütçe, kayıt
   ▼
Sağlayıcılar (lib/ai/providers/*)                    ← fetch tabanlı, SDK yok: Anthropic · OpenAI · Mistral · Gemini
                                                        *_BASE_URL ile self-hosted / OpenAI uyumlu uç
   ▼
Gidenler araçları (lib/ai/tools.ts) — SALT OKUNUR
   search_places · get_place_candidates · rank_candidates · get_place_details ·
   get_category_results · get_context_fit · get_experience_signals
```

Model rolleri (env, koda gömülü ad yok): `primary` (karar/gerekçe), `fast` (niyet), `judge` (örneklemeli kalite), `grounding` (Gemini Search; `geminiGround()` hazır, akışa henüz bağlı değil).

Araç protokolü sağlayıcıya özgü "native tool calling" değil, düz JSON'dur (`{"toolCall":{tool,args}}` ya da nihai şema). Böylece dört sağlayıcı ve gelecekteki self-hosted model aynı davranır; şema `lib/ai/schema.ts` içinde tek yerde.

### İki dağıtım modu, tek kod tabanı
- **GitHub Pages (statik)**: workflow `NEXT_OUTPUT=export` + `NEXT_BASE_PATH=/gidenler` verir. `pageExtensions` export modunda `api.ts` içermediği için `app/api/**/route.api.ts` derlemeye girmez; site bugünkü gibi çalışır, AskAI yerel motoru kullanır ("Gidenler motoru" rozeti).
- **Vercel (sunucu)**: env boş → route handler'lar etkin, anahtarlar yalnızca sunucu ortamında. Rozet "Gidenler AI · <sağlayıcı>".

## 2. Değişen / eklenen dosyalar

| Dosya | Ne |
|---|---|
| `next.config.ts` | export/sunucu modu anahtarı, `route.api.ts` uzantı hilesi, `NEXT_PUBLIC_BASE_PATH` |
| `.github/workflows/pages.yml` | `NEXT_OUTPUT=export` (statik yayın kırılmaz) |
| `package.json` | `zod` |
| `lib/ai/types.ts` | sağlayıcı-bağımsız sözleşme (ChatRequest/Response, ModelProvider, CallRecord) |
| `lib/ai/config.ts` | env → yapılandırma; tarayıcıda yüklenirse patlar; fiyat tablosu |
| `lib/ai/providers/{http,anthropic,openai,gemini,index}.ts` | fetch tabanlı istemciler, zaman aşımı, hata sınıfı, `*_BASE_URL` |
| `lib/ai/router.ts` | rol yönlendirme, yedek zincir, bütçe kapısı, telemetri, tolerant JSON çıkarımı |
| `lib/ai/budget.ts` | bütçe defteri (bellek/dosya; KV için arayüz), seviyeler, admin analitiği |
| `lib/ai/sanitize.ts` | prompt injection filtresi, kontrol karakteri, `dataBlock()` veri sarmalayıcı |
| `lib/ai/privacy.ts` | PII temizleme, profil özeti, istek kimliği, karma anahtar |
| `lib/ai/schema.ts` | zod şemaları: model turu, niyet, yargıç, API istek/yanıt, geri bildirim |
| `lib/ai/tools.ts` | salt okunur araçlar + entity kapısı yardımcıları |
| `lib/ai/cache.ts` | TTL önbellek; zaman duyarlı sorgular kısa TTL |
| `lib/ai/ratelimit.ts` | IP + oturum, dakika + gün pencereleri (karma anahtar) |
| `lib/ai/feedback.ts` | anonim olaylar, sorgu meta kaydı, gözlemlenebilirlik veri modeli |
| `lib/ai/orchestrator.ts` | ana akış (`ask`, `status`) |
| `lib/ai/client.ts` | tarayıcı köprüsü (anahtar/ayar yok), 404 → "API yok" işareti |
| `app/api/ai/route.api.ts` | POST sor · GET durum |
| `app/api/ai/feedback/route.api.ts` | POST anonim geri bildirim |
| `app/api/ai/admin/route.api.ts` | GET gözlemlenebilirlik (Bearer `AI_ADMIN_TOKEN`) |
| `components/home/AskAI.tsx` | sunucu katmanıyla zenginleştirme, mod rozeti, geri bildirim satırı |
| `lib/decisionEngine.ts` | niyet ayrıştırıcı: "bu akşam", "pahalı olmayan", sosyal bağlam sözcükleri (eval bulguları) |
| `eval/gidenler-eval-set.json`, `scripts/aieval.ts` | değerlendirme seti ve hattı |
| `scripts/aisec.ts`, `scripts/ai-mock-provider.mjs` | güvenlik/dayanıklılık testleri + sahte sağlayıcı (yalnızca test) |
| `.env.example`, `.gitignore` | env şablonu; gizli dosyalar dışarıda |

## 3. Önerilen sağlayıcı / model kombinasyonu

Demo aşaması (kalite öncelikli, ~100 USD/ay):
- `primary`: Anthropic Claude Sonnet sınıfı (Türkçe gerekçe kalitesi, JSON disiplini). Yedek: Gemini Pro sınıfı, sonra OpenAI 4.1 sınıfı.
- `fast`: Gemini Flash sınıfı (ucuz, hızlı; yalnızca belirsiz sorgularda çağrılır — `AI_INTENT_MODE=hybrid`).
- `judge`: OpenAI 4.1-mini sınıfı ya da Gemini Flash (birincilden farklı aile → bağımsız denetim).
- `grounding`: Gemini (Search grounding) — açık/kapalı doğrulaması için ileride; bugün `none`.

Maliyet düşürme modu: `primary`'yi Gemini Flash'a çekmek sorgu başına maliyeti ~8× düşürür; kalite eval ile karşılaştırılıp insan onayıyla değiştirilir (env değişikliği, kod değişikliği değil).

## 4. Eklenecek ortam değişkenleri

Tam liste ve açıklamalar `.env.example` içinde. Zorunlu asgari: bir sağlayıcı anahtarı + `AI_PRIMARY_PROVIDER` + `AI_PRIMARY_MODEL`. Önerilen: `AI_FAST_*`, `AI_JUDGE_*`, `AI_FALLBACK_CHAIN`, `AI_FALLBACK_MODEL_PRIMARY_*`, `AI_MONTHLY_BUDGET_USD`, `AI_ADMIN_TOKEN`.

## 5. Vercel'de yapılacaklar

1. Repo'yu Vercel'e bağla (Framework: Next.js). Build komutu varsayılan (`next build`); **`NEXT_OUTPUT` ve `NEXT_BASE_PATH` tanımlama** (boş kalsın → sunucu modu, kök dizin).
2. Settings → Environment Variables: `.env.example`'daki değerleri **Production** (ve istenirse Preview) için gir. Anahtarları "Sensitive" işaretle. Repoya `.env*` dosyası koyma.
3. Function region: `fra1` (Frankfurt) — Türkiye'ye yakın gecikme. Node.js runtime (route'larda `runtime = "nodejs"` zaten var).
4. İlk kontrol: `GET https://<domain>/api/ai/` → `configured: true` görünmeli. Ana sayfada bir soru sor; rozet "Gidenler AI · anthropic" (ya da seçilen sağlayıcı) olmalı.
5. Gözlemlenebilirlik: `curl -H "Authorization: Bearer $AI_ADMIN_TOKEN" https://<domain>/api/ai/admin/`.
6. Üretimde çok örnekli çalışma için `LedgerStore` / `CacheStore` / `RateStore` / `FeedbackStore` arayüzlerini Vercel KV (Upstash) ile uygula (`setLedger`, `setCache`, `setRateStore`, `setFeedbackStore`). Bellek içi depolar demo için yeterlidir; yeniden dağıtımda sıfırlanır.
7. GitHub Pages yayını değişmeden devam eder; Vercel ek bir hedeftir.

## 6. Tahmini maliyet / sorgu

Bir sorgu: sistem istemi (~900 token) + aday veri bloğu (8 aday ≈ 2.500 token) + profil ≈ **3.5k giriş / 0.5k çıkış**; araç turu başına +1.5–3k giriş.

| Kurulum | Sorgu başına | 100 USD ile |
|---|---|---|
| Sonnet sınıfı primary (3/15 USD/M) + hybrid Flash niyet + %10 mini judge | ≈ 0,02 USD (araç turlarıyla 0,03) | ≈ 3.500–5.000 sorgu/ay |
| Gemini Flash sınıfı primary (0,3/2,5 USD/M) | ≈ 0,0025 USD | ≈ 35.000+ sorgu/ay |

Önbellek (aynı/benzer sorgu, 1 saat; zaman duyarlı 5 dk) ve deterministik ön süzme bu sayıları yukarı çeker. Bütçe seviyeleri: %70 uyarı → %90 judge kapanır → %100 primary kapanır, deterministik motor sürer (site hiç durmaz).

## 7. Kalan güvenlik riskleri (dürüst liste)

- **Bellek içi depolar**: rate limit, bütçe, önbellek ve geri bildirim serverless örnekleri arasında paylaşılmaz; soğuk başlatmada sıfırlanır. Bütçe kapısı bu yüzden "en iyi çaba"dır → **KV'ye taşınmadan** yüksek trafiğe açılmamalı. Ek emniyet: sağlayıcı panelinde sert harcama limiti koy.
- **IP tabanlı rate limit** paylaşılan NAT arkasındaki kullanıcıları birlikte kısıtlar; oturum kimliği istemcide üretilir (taklit edilebilir). Kötüye kullanım için Vercel WAF / Turnstile eklenmeli.
- **Prompt injection** filtresi kalıp tabanlıdır; asıl savunma yetki modeli (araçlar salt okunur, entityId kapısı, çıktı şeması). Model yanlış gerekçe yazabilir; yargıç ve geri bildirim bunu ölçer, engellemez.
- **Admin uç noktası** tek statik bearer token; döndürülen veri anonimdir ama token sızarsa maliyet/trafik görünür. Rotasyon env üzerinden.
- **`after()` ile yargıç**: Vercel'de yanıt sonrası çalışır; bazı ortamlarda kesilebilir (yalnızca telemetri kaybı).
- **Grounding** bağlı değil: "şu an açık mı" türü canlı iddialar hâlâ üretilmez (bilinçli; UI "doğrulanmadı" der).
- **Model çıktısındaki metin** kullanıcıya gösterilir: sanitize + uzunluk sınırı var, fakat yanlış/uygunsuz ifade riski sıfır değildir; "Yanlış bilgi var" geri bildirimi bunun için.

## 8. Nasıl test edilir

```bash
npm run typecheck                          # TS
NEXT_OUTPUT=export NEXT_BASE_PATH=/gidenler npx next build   # statik mod (GitHub Pages)
npx next build                             # sunucu modu (API route'lar derlenir)
npx tsx scripts/aisec.ts                   # 21 güvenlik/dayanıklılık testi (sahte sağlayıcıyla; anahtar gerekmez)
npx tsx scripts/aieval.ts                  # 8 sorguluk eval (deterministik); --llm ile gerçek sağlayıcı
npx tsx scripts/searchqa.ts && npx tsx scripts/semqa.ts      # mevcut QA
# canlı sunucu modu, anahtarsız:
npx next start -p 4455 &
curl -s localhost:4455/api/ai/                                # configured:false
curl -s -X POST localhost:4455/api/ai/ -H 'content-type: application/json' -d '{"query":"Kadıköy'\''de sakin kahve"}'
#   → mode:"deterministic", fallbackReason:"not_configured", öneriler dolu (sahte AI yok)
```

Değerlendirme döngüsü (değişiklik → yayın): sorgu → yanıt → anonim geri bildirim → `/api/ai/admin` + `aieval` → hata sınıflandırma (niyet / getirme / halüsinasyon / açıklama / gecikme / maliyet) → öneri → `aisec` + `aieval` çevrimdışı → benchmark karşılaştırması → **insan onayı** → env/prompt değişikliği yayını. AI kendi başına deploy, commit, veri/puan/kullanıcı değişikliği yapamaz; bu katmanda buna izin veren hiçbir kod yolu yoktur.
