import type { Observation, RatingSource, SourceResult } from "../core";

/* ──────────────────────────────────────────────────────────────────────────
   GEÇİCİ KAYNAK ADAPTÖRÜ — Google Maps'in herkese açık mekân sayfasında görünen puan ve değerlendirme sayısı.
   ⚠ Google'ın hizmet şartları otomatik okumayı (scraping) ve bu verinin saklanmasını kısıtlar. Bu adaptör yatırım
     öncesi geçici çözümdür ve tek dosyadır: yerine başka bir RatingSource konduğunda sitenin geri kalanı değişmez.
   Kurallar:
   · Yalnız mevcut doğrulama kaydındaki place ID'nin sayfası açılır; arama yapılmaz, aday seçilmez.
   · Tarayıcı kimliği gizlenmez/taklit edilmez; CAPTCHA, "olağandışı trafik" ve giriş sayfası "blocked" döner, aşılmaz.
   · Çerez/izin ekranında yalnız "Tümünü reddet" seçilir (en az veri paylaşan seçenek); başka seçenek yoksa "blocked".
   · Sıralı, tek sekme, istekler arası sabit bekleme (çalıştıran taraf belirler).
   · Ağ dışında Playwright gerekir; uygulama paketine girmez (yalnız GitHub Actions'ta kurulur).
   ────────────────────────────────────────────────────────────────────────── */
export const MAPS_PAGE_LABEL = "Google Maps herkese açık sayfa (geçici)";

type Page = {
  goto(u: string, o: object): Promise<unknown>; url(): string; waitForTimeout(ms: number): Promise<void>;
  waitForSelector(s: string, o: object): Promise<unknown>; evaluate<T>(f: () => T): Promise<T>;
  locator(s: string): { first(): { isVisible(o?: object): Promise<boolean>; click(o?: object): Promise<void> } };
};

const num = (s: string | null | undefined) => {
  if (!s) return null;
  const m = s.replace(/ /g, " ").match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(",", ".")) : null;
};
const int = (s: string | null | undefined) => {
  if (!s) return null;
  const d = s.replace(/[^\d]/g, "");
  return d ? Number(d) : null;
};

/** Sayfa adresinden koordinat: önce mekân işaretçisi (!3d…!4d…), yoksa görünüm merkezi (@lat,lng). */
export function coordsFromUrl(u: string): { lat: number; lng: number } | null {
  const pin = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pin) return { lat: Number(pin[1]), lng: Number(pin[2]) };
  const at = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+),/);
  return at ? { lat: Number(at[1]), lng: Number(at[2]) } : null;
}

export function classifyUrl(u: string): "consent" | "sorry" | "login" | "ok" {
  if (/consent\.google\./.test(u)) return "consent";
  if (/google\.[a-z.]+\/sorry\//.test(u)) return "sorry";
  if (/accounts\.google\./.test(u)) return "login";
  return "ok";
}

/** Sayfadan ayrıştırılmış ham alanlar → gözlem (test edilebilir saf kısım). */
export function parseRaw(raw: { name: string; ratingLabel: string | null; ratingText: string | null; reviewsLabel: string | null; reviewsText: string | null; address: string | null; closed: boolean }, url: string): Observation {
  const rating = num(raw.ratingLabel) ?? num(raw.ratingText);
  const reviews = int(raw.reviewsLabel) ?? int(raw.reviewsText);
  const c = coordsFromUrl(url);
  return { name: raw.name.trim(), address: (raw.address ?? "").replace(/^(Address|Adres):\s*/i, "").trim(), rating, reviews, lat: c?.lat ?? null, lng: c?.lng ?? null, closed: raw.closed };
}

export async function mapsPageSource(): Promise<RatingSource> {
  const mod = "playwright";
  const { chromium } = (await import(/* webpackIgnore: true */ mod)) as { chromium: { launch(o: object): Promise<{ newContext(o: object): Promise<{ newPage(): Promise<Page> }>; close(): Promise<void> }> } };
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ locale: "en-US", timezoneId: "Europe/Istanbul", viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  async function handleConsent(): Promise<boolean> {
    const reject = page.locator('form[action*="consent"] button:has-text("Reject all"), button[aria-label="Reject all"], button:has-text("Reject all")').first();
    if (await reject.isVisible({ timeout: 3000 }).catch(() => false)) { await reject.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(2500); return classifyUrl(page.url()) === "ok"; }
    return false;
  }

  async function fetchOne(t: { placeId: string }): Promise<SourceResult> {
    const url = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(t.placeId)}&hl=en`;
    try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }); }
    catch { return { kind: "error", reason: "Sayfa 30 sn içinde açılmadı" }; }
    let cls = classifyUrl(page.url());
    if (cls === "consent" && (await handleConsent())) cls = "ok";
    if (cls === "consent") return { kind: "blocked", reason: "Çerez/izin ekranı reddedilemedi" };
    if (cls === "sorry") return { kind: "blocked", reason: "Google 'olağandışı trafik' / CAPTCHA sayfası" };
    if (cls === "login") return { kind: "blocked", reason: "Google giriş istiyor" };
    const captcha = await page.evaluate(() => !!document.querySelector('iframe[src*="recaptcha"], #captcha-form') || /unusual traffic/i.test(document.body?.innerText ?? ""));
    if (captcha) return { kind: "blocked", reason: "CAPTCHA görüntülendi" };
    const ok = await page.waitForSelector('div[role="main"] h1', { timeout: 15000 }).then(() => true).catch(() => false);
    if (!ok) {
      const list = await page.evaluate(() => !!document.querySelector('div[role="feed"]'));
      return { kind: "not_found", reason: list ? "Place ID tek mekâna açılmadı (sonuç listesi geldi)" : "Mekân sayfası yüklenmedi" };
    }
    await page.waitForTimeout(1500); // adres çubuğu mekân koordinatına güncellensin
    const raw = await page.evaluate(() => {
      const main = document.querySelector('div[role="main"]') as HTMLElement | null;
      const q = (s: string) => main?.querySelector(s) as HTMLElement | null;
      const star = q('span[role="img"][aria-label*="star" i]');
      const rev = q('span[aria-label*="review" i]') ?? q('button[aria-label*="review" i]');
      const box = q("div.F7nice");
      const spans = box ? Array.from(box.querySelectorAll("span")).map((s) => s.textContent ?? "") : [];
      return {
        name: (q("h1")?.textContent ?? "").trim(),
        ratingLabel: star?.getAttribute("aria-label") ?? null,
        ratingText: spans.find((s) => /^\d[.,]\d$/.test(s.trim())) ?? null,
        reviewsLabel: rev?.getAttribute("aria-label") ?? null,
        reviewsText: spans.find((s) => /^\(\d[\d.,]*\)$/.test(s.trim())) ?? null,
        address: q('button[data-item-id="address"]')?.getAttribute("aria-label") ?? null,
        closed: /permanently closed/i.test(main?.innerText ?? ""),
      };
    });
    const seen = parseRaw(raw, page.url());
    if (!seen.name) return { kind: "not_found", reason: "Sayfada mekân adı yok" };
    return { kind: "ok", seen };
  }

  return { id: "maps-sayfa", label: MAPS_PAGE_LABEL, fetch: fetchOne, close: () => browser.close() };
}
