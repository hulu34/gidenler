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
  waitForSelector(s: string, o: object): Promise<unknown>; evaluate<T>(f: string): Promise<T>;
  screenshot(o: { path: string }): Promise<unknown>;
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

/** Google Maps bağlantısındaki işletme kimliğinden ("!1s0x…:0x…") Place ID: ikisi aynı kimliğin iki yazımıdır
    (Place ID = protobuf{ fixed64 ×2 } base64url). Ağ yok, ücretli çağrı yok. */
export function placeIdFromFtid(ftid: string): string | null {
  const m = ftid.match(/^0x([0-9a-f]{1,16}):0x([0-9a-f]{1,16})$/i);
  if (!m) return null;
  const b = Buffer.alloc(20); b[0] = 0x0a; b[1] = 0x12; b[2] = 0x09; b.writeBigUInt64LE(BigInt(`0x${m[1]}`), 3); b[11] = 0x11; b.writeBigUInt64LE(BigInt(`0x${m[2]}`), 12);
  return b.toString("base64url"); // "ChIJ…" ile başlar
}
export const ftidFromUrl = (u: string) => (decodeURIComponent(u).match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i) ?? [])[1] ?? null;

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
export function parseRaw(raw: { name: string; ratingLabel: string | null; ratingText: string | null; reviewsLabel: string | null; reviewsText: string | null; address: string | null; closed: boolean; limited?: boolean; category?: string; phone?: string | null; website?: string | null }, url: string): Observation {
  const rating = num(raw.ratingLabel) ?? num(raw.ratingText);
  /* sınırlı görünümde sayı okunmaz (Google göstermez; okunan sayı başka bir alana ait olur) */
  const reviews = raw.limited ? null : int(raw.reviewsLabel) ?? int(raw.reviewsText);
  const c = coordsFromUrl(url);
  return { name: raw.name.trim(), address: (raw.address ?? "").replace(/^(Address|Adres):\s*/i, "").trim(), rating, reviews, lat: c?.lat ?? null, lng: c?.lng ?? null, closed: raw.closed, category: (raw.category ?? "").trim(), limited: !!raw.limited,
    phone: (raw.phone ?? "").trim() || undefined, website: (raw.website ?? "").trim() || undefined };
}

/* Sayfa içinde çalışan kod DÜZ METİN olarak gönderilir: derleyicinin (tsx/esbuild) eklediği yardımcılar tarayıcıda tanımsızdır. */
const CAPTCHA_JS = `!!document.querySelector('iframe[src*="recaptcha"], #captcha-form') || /unusual traffic/i.test(document.body ? document.body.innerText : "")`;
const READ_JS = `(() => {
  const main = document.querySelector('div[role="main"]') || document.body;
  const h1 = main.querySelector("h1");
  const after = (el) => !h1 || (h1.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  const leaves = Array.from(main.querySelectorAll("span, div")).filter((el) => el.children.length === 0 && after(el)).slice(0, 400);
  const star = Array.from(main.querySelectorAll('[role="img"][aria-label]')).find((el) => /\\d[.,]\\d\\s*(star|yıldız)/i.test(el.getAttribute("aria-label") || ""));
  const ratingLeaf = leaves.find((el) => /^[1-5][.,]\\d$/.test((el.textContent || "").trim()));
  /* Değerlendirme sayısı YALNIZ puanın yanındaki başlık kutusundan okunur ("4,5 ★★★★★ (6.764)").
     Sayfanın başka yerindeki sayılar (yorum yazarının "12 yorum"u, sekme sayıları) alınmaz. */
  let box = ratingLeaf || (star && star.parentElement), revLeaf = null, revLabel = null;
  for (let i = 0; box && i < 4 && !revLeaf; i++) {
    box = box.parentElement; if (!box) break;
    revLeaf = Array.from(box.querySelectorAll("span, div")).find((el) => el.children.length === 0 && /^\\(\\d[\\d.,]*\\)$/.test((el.textContent || "").trim())) || null;
    revLabel = Array.from(box.querySelectorAll("[aria-label]")).map((el) => el.getAttribute("aria-label") || "").find((l) => /^\\s*[\\d.,]+\\s*(reviews?|yorum|değerlendirme)\\s*$/i.test(l)) || null;
  }
  const addr = main.querySelector('button[data-item-id="address"]') || Array.from(main.querySelectorAll("[aria-label]")).find((el) => /^(Address|Adres):/i.test(el.getAttribute("aria-label") || ""));
  return {
    name: ((h1 && h1.textContent) || "").trim(),
    ratingLabel: star ? star.getAttribute("aria-label") : null,
    ratingText: ratingLeaf ? ratingLeaf.textContent : null,
    reviewsLabel: revLabel || null,
    reviewsText: revLeaf ? revLeaf.textContent : null,
    address: addr ? addr.getAttribute("aria-label") : null,
    closed: /permanently closed|kalıcı olarak kapalı/i.test(main.innerText || ""),
    limited: /limited view|sınırlı görünüm/i.test(document.body.innerText || ""),
    category: (() => { const c = main.querySelector('button[jsaction*=".category"]'); return c ? (c.textContent || "").trim() : ""; })(),
    /* kimlik kanıtı (eşleştirme için; siteye yazılmaz): işletmenin telefonu ve web sitesi */
    phone: (() => { const b = main.querySelector('[data-item-id^="phone:tel:"]'); return b ? (b.getAttribute("data-item-id") || "").slice(10) : null; })(),
    website: (() => { const a = main.querySelector('a[data-item-id="authority"]'); return a ? a.getAttribute("href") : null; })(),
  };
})()`;

export type MapsSource = RatingSource & { search(query: string, max?: number): Promise<{ kind: "ok"; candidates: Array<{ placeId: string; seen: Observation }> } | { kind: "blocked" | "error"; reason: string }> };
export async function mapsPageSource(): Promise<MapsSource> {
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

  let shots = 0;
  async function fetchOne(t: { placeId: string }): Promise<SourceResult> {
    const url = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(t.placeId)}&hl=en`;
    try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }); }
    catch { return { kind: "error", reason: "Sayfa 30 sn içinde açılmadı" }; }
    let cls = classifyUrl(page.url());
    if (cls === "consent" && (await handleConsent())) cls = "ok";
    if (cls === "consent") return { kind: "blocked", reason: "Çerez/izin ekranı reddedilemedi" };
    if (cls === "sorry") return { kind: "blocked", reason: "Google 'olağandışı trafik' / CAPTCHA sayfası" };
    if (cls === "login") return { kind: "blocked", reason: "Google giriş istiyor" };
    const captcha = await page.evaluate<boolean>(CAPTCHA_JS);
    if (captcha) return { kind: "blocked", reason: "CAPTCHA görüntülendi" };
    const ok = await page.waitForSelector('div[role="main"] h1', { timeout: 15000 }).then(() => true).catch(() => false);
    if (!ok) {
      const list = await page.evaluate<boolean>(`!!document.querySelector('div[role="feed"]')`);
      return { kind: "not_found", reason: list ? "Place ID tek mekâna açılmadı (sonuç listesi geldi)" : "Mekân sayfası yüklenmedi" };
    }
    /* adres çubuğu mekân koordinatına güncellensin (en çok 5 sn) */
    for (let i = 0; i < 10 && !/!3d-?\d/.test(page.url()); i++) await page.waitForTimeout(500);
    const raw = await page.evaluate<Parameters<typeof parseRaw>[0]>(READ_JS);
    const seen = parseRaw(raw, page.url());
    /* isteğe bağlı tanı: ilk birkaç sayfanın ve puanı okunamayan sayfaların görüntüsü (yalnız şifreli çıktıya) */
    const dir = process.env.GPUAN_EKRAN;
    if (dir && (shots < 3 || (seen.rating == null && shots < 8))) {
      shots++; await page.screenshot({ path: `${dir}/${shots}-${t.placeId.slice(-8)}.png` }).catch(() => {});
      const html = await page.evaluate<string>(`(document.querySelector('div[role="main"]') || document.body).outerHTML.slice(0, 400000)`).catch(() => "");
      if (html) (await import("node:fs")).writeFileSync(`${dir}/${shots}-${t.placeId.slice(-8)}.html`, `<!-- ${page.url()} -->\n${html}`);
    }
    if (!seen.name) return { kind: "not_found", reason: "Sayfada mekân adı yok" };
    return { kind: "ok", seen };
  }

  /* ARAMA (eşleşmesi olmayan mekân için aday bulma): Maps'in herkese açık arama sayfası. Tek sonuçsa doğrudan mekân sayfası açılır;
     liste gelirse ilk birkaç sonucun bağlantısındaki işletme kimliği ve koordinatı alınır, sonra her aday kendi sayfasından okunur.
     Engel/CAPTCHA aşılmaz; ücretli çağrı yok. Karar VERMEZ: adayları kontrol için döndürür. */
  async function search(query: string, max = 3): Promise<{ kind: "ok"; candidates: Array<{ placeId: string; seen: Observation }> } | { kind: "blocked" | "error"; reason: string }> {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
    try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }); } catch { return { kind: "error", reason: "Arama sayfası açılmadı" }; }
    let cls = classifyUrl(page.url());
    if (cls === "consent" && (await handleConsent())) cls = "ok";
    if (cls !== "ok") return { kind: "blocked", reason: `Google ${cls} sayfası` };
    if (await page.evaluate<boolean>(CAPTCHA_JS)) return { kind: "blocked", reason: "CAPTCHA görüntülendi" };
    await page.waitForSelector('div[role="feed"], div[role="main"] h1', { timeout: 15000 }).catch(() => {});
    for (let i = 0; i < 12; i++) { if (/!1s0x/.test(decodeURIComponent(page.url())) || (await page.evaluate<boolean>(`!!document.querySelector('div[role="feed"]')`))) break; await page.waitForTimeout(500); }
    const links = await page.evaluate<string[]>(`Array.from(document.querySelectorAll('div[role="feed"] a[href*="/maps/place/"]')).map((a) => a.href).slice(0, ${max})`);
    const targets = links.length ? links : [page.url()];
    const out: Array<{ placeId: string; seen: Observation }> = [];
    for (const href of targets) {
      const ftid = ftidFromUrl(href); const pid = ftid ? placeIdFromFtid(ftid) : null;
      if (!pid) continue;
      const r = href === page.url() && !links.length ? null : await fetchOne({ placeId: pid });
      if (r === null) {
        for (let i = 0; i < 10 && !/!3d-?\d/.test(page.url()); i++) await page.waitForTimeout(500);
        const raw = await page.evaluate<Parameters<typeof parseRaw>[0]>(READ_JS);
        const seen = parseRaw(raw, page.url()); if (seen.name) out.push({ placeId: pid, seen });
      } else if (r.kind === "ok") out.push({ placeId: pid, seen: r.seen });
      else if (r.kind === "blocked") return { kind: "blocked", reason: r.reason };
      await page.waitForTimeout(2500);
    }
    return { kind: "ok", candidates: out };
  }

  return { id: "maps-sayfa", label: MAPS_PAGE_LABEL, fetch: fetchOne, search, close: () => browser.close() };
}
