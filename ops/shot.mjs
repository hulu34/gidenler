/* GÖRSEL KONTROL — pilot sayfalarının ekran görüntüsü (mobil + masaüstü), farklı ağdan.
   Bypass başlığı yalnız pilot alan adına giden isteklere eklenir (üçüncü taraflara gitmez).
   Görüntüler out/shots/ altına yazılır; iş akışı tümünü şifreler. Log: yalnız sayılar ve doğru/yanlış. */
import { mkdirSync, writeFileSync } from "node:fs";

const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.PILOT_HOST;
const SLUGS = (process.env.SHOT_SLUGS ?? "").split(",").filter(Boolean);
if (!BYPASS || !HOST || !SLUGS.length) { console.error("VERCEL_BYPASS / PILOT_HOST / SHOT_SLUGS eksik"); process.exit(2); }

const puppeteer = await import("puppeteer-core");
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"], headless: true });
const VIEWS = { mobil: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, masaustu: { width: 1280, height: 900, deviceScaleFactor: 1 } };
const UA = { mobil: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  masaustu: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" };
mkdirSync("out/shots", { recursive: true });
const rows = [];
for (const [i, slug] of SLUGS.entries()) for (const [v, vp] of Object.entries(VIEWS)) {
  const page = await browser.newPage();
  await page.setUserAgent(UA[v]);
  await page.setViewport(vp);
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    const own = new URL(r.url()).host === HOST;
    r.continue(own ? { headers: { ...r.headers(), "x-vercel-protection-bypass": BYPASS } } : undefined);
  });
  await page.goto(`https://${HOST}/mekan/${slug}/`, { waitUntil: "networkidle2", timeout: 30000 });
  /* Google bölümü yalnız ekrana girince yüklenir: oraya kaydır, yüklenmesini bekle */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  const ok = await page.waitForSelector("#h-google", { timeout: 15000 }).then(() => true).catch(() => false);
  if (ok) { await page.$eval("#h-google", (e) => e.closest("section").scrollIntoView({ block: "start" })); await new Promise((r) => setTimeout(r, 2500)); }
  const dom = await page.evaluate(() => ({
    google: !!document.querySelector("#h-google"),
    osmMap: !!document.querySelector(".leaflet-container, .maplibregl-map, iframe[src*='openstreetmap']"),
    photos: document.querySelectorAll("#h-google ~ * img, section[aria-labelledby='h-google'] ul img").length,
  }));
  await page.screenshot({ path: `out/shots/${i + 1}-${v}-google.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `out/shots/${i + 1}-${v}-ust.png` });
  rows.push({ i: i + 1, v, ...dom });
  await page.close();
}
await browser.close();
writeFileSync("out/shots/sonuc.json", JSON.stringify(rows.map((r, k) => ({ ...r, slug: SLUGS[r.i - 1] })), null, 1));
console.table(rows);
