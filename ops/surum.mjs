/* Sürüm adayı · yalnız okuma, oturumsuz. Mobil = öykünme. HOST: aday ya da canlı. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const HOST = process.env.SURUM_HOST, CANLI = HOST === "www.gidenler.com", BASE = `https://${HOST}`, OUT = "out/surum"; mkdirSync(OUT, { recursive: true });
const HB = CANLI ? {} : { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const son = []; const ok = (n, c, i = "") => { son.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const br = await chromium.launch(); const hatalar = [];
for (const [ad, o] of [["iphone-emulasyon", { ...devices["iPhone 14"], defaultBrowserType: undefined }], ["android-emulasyon", { ...devices["Pixel 7"], defaultBrowserType: undefined }], ["masaustu", { viewport: { width: 1366, height: 900 } }]]) {
  const c = await br.newContext(o); await yetkiliBaslik(c, HOST, CANLI ? {} : { ...HB, "x-vercel-set-bypass-cookie": "true" }); const p = await c.newPage();
  p.on("pageerror", (e) => hatalar.push(`${ad}: ${e.message.slice(0, 160)}`));
  const g = []; p.on("request", (r) => { if (/\/api\/google\//.test(r.url())) g.push(r.url().replace(/.*\/api/, "")); if (/youtube\.com\/embed/.test(r.url())) g.push("yt"); });
  const box = async () => { await p.goto(BASE, { waitUntil: "networkidle" }); return p.locator('main input[name="q"]'); };
  const b = await box(); ok(`${ad}: ana sayfa araması`, await b.isVisible());
  await p.screenshot({ path: `${OUT}/ana-${ad}.png` });
  await b.fill("çiya"); await b.press("Enter"); await p.waitForURL(/\/ara\//); await p.waitForTimeout(500);
  ok(`${ad}: çiya → Çiya Sofrası`, (await p.locator('main a[href*="/mekan/"]').first().getAttribute("href")).includes("ciya"));
  await p.goto(`${BASE}/mekan/ismet-baba-uskudar/`, { waitUntil: "networkidle" });
  const k = p.locator('#fotograflar button[aria-label^="Fotoğrafı büyüt"] img').first();
  ok(`${ad}: kapak görseli yüklendi`, await k.evaluate((i) => i.complete && i.naturalWidth > 0));
  ok(`${ad}: kapak ilk ekranda`, (await k.boundingBox()).y < (o.viewport?.height ?? 800) * 0.7);
  await p.screenshot({ path: `${OUT}/kapak-${ad}.png` });
  await p.goto(`${BASE}/mekan/japon-erdal-beyoglu/`, { waitUntil: "networkidle" });
  ok(`${ad}: Menü kısayolu`, await p.locator('a[href="#menu"]').first().isVisible());
  const t = (await p.locator("main").innerText()).replace(/\s+/g, " ");
  ok(`${ad}: Flu 44:42`, t.includes("44:42")); ok(`${ad}: Seçki bağı`, await p.locator('main a[href*="/seckisi/"]').count() > 0);
  ok(`${ad}: oynatıcı yüklenmedi`, !g.includes("yt"));
  console.log(`  Japon Erdal Google istekleri: ${g.length}`);
  await p.screenshot({ path: `${OUT}/japon-${ad}.png` });
  for (const u of ["/kesfet/", "/sor/?q=Kadıköy'de pide", "/mekan/pandeli-fatih/", "/mekan/maltepe-belediyesi-seyirtepe-sosyal-tesisleri-maltepe/", "/yaz/pidem-fatih/", "/seckisi/", "/karsilastir/"]) {
    const r = await p.goto(`${BASE}${u}`, { waitUntil: "networkidle" }); await p.waitForTimeout(300);
    ok(`${ad}: ${u} açılır, taşma yok`, r.status() === 200 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), r.status());
    if (ad !== "android-emulasyon") await p.screenshot({ path: `${OUT}/${u.replace(/[^a-z]/g, "").slice(0, 16)}-${ad}.png` });
  }
  const tk = (await (p.goto(`${BASE}/kesfet/`), p.waitForLoadState("networkidle"), p.locator("main").innerText())); ok(`${ad}: Keşfet'te demo metni yok`, !/demo deneyim/i.test(tk));
  ok(`${ad}: yükleme alanı kapalı`, await (async () => { await p.goto(`${BASE}/yaz/pidem-fatih/`, { waitUntil: "networkidle" }); return (await p.locator('#fotograf input[type="file"]').count()) === 0; })());
  await c.close();
}
const f = (u) => fetch(`${BASE}${u}`, { headers: HB });
const sm = await (await f("/sitemap.xml")).text(); const n = (sm.match(/<loc>/g) ?? []).length; if (CANLI) ok("site haritası 431", n === 431, n); else console.log(`  aday site haritası ${n} (Preview veritabanına bağlı)`);
const h = await (await f("/mekan/japon-erdal-beyoglu/")).text();
ok("canonical", /rel="canonical" href="[^"]*\/mekan\/japon-erdal-beyoglu\/"/.test(h));
ok("ilk HTML'de ad", h.includes("Japon Erdal"));
ok("Fotoğraf yükleme ucu yok", (await f("/api/reviews/00000000-0000-7000-8000-000000000000/photos/")).status === 404);
ok("moderasyon sayfası yok", (await f("/yonetim/fotograf-moderasyon/")).status === 404);
await br.close(); console.log(`JS hataları: ${hatalar.length}`); [...new Set(hatalar)].slice(0, 6).forEach((x) => console.log("  " + x));
const k = son.filter((x) => !x).length; console.log(`SONUÇ ${son.length - k}/${son.length}`); process.exit(k ? 1 : 0);
