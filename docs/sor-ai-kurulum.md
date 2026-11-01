# Sor Gidenler: gerçek AI kurulumu (yalnız Preview)

Anahtar sohbete, GitHub'a ya da bir dosyaya yazılmaz.

1. console.anthropic.com → hesap aç, ödeme yöntemi ekle.
2. Billing: 10 USD kredi al. **Auto-reload kapalı kalsın.** Kredi bitince API durur; gerçek üst sınır budur.
3. Limits: aylık harcama sınırını ve e-posta uyarılarını kontrol et.
4. API Keys → "gidenler-sor-preview" adıyla anahtar oluştur, kopyala.
5. Vercel → gidenler → Settings → Environment Variables → Add:
   - Key: `ANTHROPIC_API_KEY`, Value: anahtar, **Sensitive** açık
   - Environments: yalnız **Preview**; Git Branch: `gorsel/restoran-profil-v1`
6. Production ve "All Preview Branches" seçme. Yatırımcı demosu ve canlı site anahtarı görmez.

Dalın diğer ayarları (sağlayıcı, model) kodla değil bu dala özel ortam değişkenleriyle verilir.
Kod tarafı sınırlar: aylık 10 USD (Preview 2 USD, örnek içi), günlük %10, soru başına 220 + 600 çıkış tokenı, 12 aday, 15 sn. `SOR_MONTHLY_BUDGET_USD` yalnız aşağı çeker.
