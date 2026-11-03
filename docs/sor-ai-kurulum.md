# Sor Gidenler: ücretsiz gerçek AI kurulumu (yalnız Preview)

Hedef harcama 0 USD. Sağlayıcı: Groq, ücretsiz plan (Free). Anahtar sohbete, GitHub'a ya da bir dosyaya yazılmaz.

1. https://console.groq.com → hesap aç (e-posta ya da Google/GitHub ile giriş). **Ödeme yöntemi ekleme.**
2. Settings → Billing: plan **Free** görünmeli. "Upgrade to Developer" seçme; Developer planı kartla açılır ve kullanım başına ücretlidir.
3. Settings → Data Controls: **Zero Data Retention** seçeneği varsa aç (istek ve yanıtlar saklanmaz).
4. API Keys → Create API Key → ad: `gidenler-sor-preview` → kopyala. Anahtarın ayrı bir yetki ayarı yoktur; organizasyonun ücretsiz kotasını kullanır.
5. Vercel → gidenler → Settings → Environment Variables → Add:
   - Key: `GROQ_API_KEY`, Value: anahtar, **Sensitive** açık
   - Environments: yalnız **Preview**; Git Branch: `gorsel/restoran-profil-v1`
6. Production ve "All Preview Branches" seçme. Yatırımcı demosu ve canlı site anahtarı görmez.

Dalın modeli bu dala özel ortam değişkenleriyle verilir: `AI_PRIMARY_PROVIDER=groq`, `AI_PRIMARY_MODEL=openai/gpt-oss-120b`,
`AI_FAST_PROVIDER=groq`, `AI_FAST_MODEL=openai/gpt-oss-20b`.

Ücretli kullanıma geçişin önündeki engeller:
- Groq Free planında ödeme yöntemi yoktur; sınır aşılırsa istek 429 ile reddedilir, ücret yazılmaz.
- Kod yalnız ücretsiz sağlayıcıyı çağırır (`lib/sor/kota.ts`); ücretli sağlayıcı `SOR_ALLOW_PAID=evet` olmadan çağrılmaz ve yedek zincir ücretsizin dışına çıkmaz.
- Kod, Groq'un ücretsiz dakika/gün istek ve token sınırlarının %90'ında durur; sınırlar kodda sabittir, ortam değişkeniyle yükseltilemez.
- Kota dolunca kayıtlı verilerle kurallı öneri gösterilir ve "AI desteği şu an geçici olarak sınırlı" yazar.

Ücretsiz sınırlar (Groq Free Plan, 2026-11-03): gpt-oss-120b ve gpt-oss-20b için dakikada 30 istek, 8.000 token; günde 1.000 istek, 200.000 token.
Bir AI yanıtı yaklaşık 3.000 token (120b) + 1.500 token (20b): günde en çok ~60 AI yanıtı, dakikada ~2.
