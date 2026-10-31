/* Önce/sonra ekranları · yalnız okuma, oturumsuz. ETIKET=once|sonra. Mobil = Chromium öykünmesi, gerçek cihaz değil. */
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const HOST = process.env.PREVIEW_HOST, E = process.env.ETIKET ?? "once", OUT = `out/ekran/${E}`; mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "x-vercel-set-bypass-cookie": "true" };
const S = [["ana", "/"], ["ana-ara", "/ara/?q=pide"], ["kesfet", "/kesfet/"], ["japon", "/mekan/japon-erdal-beyoglu/"], ["pandeli", "/mekan/pandeli-fatih/"], ["pidem", "/mekan/pidem-fatih/"], ["yaz", "/yaz/pidem-fatih/"], ["galeri", "/mekan/japon-erdal-beyoglu/fotograflar/"], ["bos-ara", "/ara/?q=zzzqqq"], ["uzun-ad", "/mekan/maltepe-belediyesi-seyirtepe-sosyal-tesisleri-maltepe/"]];
const br = await chromium.launch();
for (const [cihaz, o] of [["mobil", { ...devices["iPhone 14"], defaultBrowserType: undefined }], ["masaustu", { viewport: { width: 1366, height: 900 } }]]) {
  const ctx = await br.newContext(o); await yetkiliBaslik(ctx, HOST, HB); const p = await ctx.newPage();
  for (const [ad, u] of S) {
    const err = []; const h = (e) => err.push(e.message.slice(0, 120)); p.on("pageerror", h);
    const t0 = Date.now(); await p.goto(`https://${HOST}${u}`, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
    const m = await p.evaluate(() => { const lcp = new Promise((r) => { new PerformanceObserver((l) => r(l.getEntries().at(-1)?.startTime ?? 0)).observe({ type: "largest-contentful-paint", buffered: true }); setTimeout(() => r(0), 400); }); const small = [...document.querySelectorAll("a,button")].filter((x) => { const b = x.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.height < 32 && getComputedStyle(x).display !== "inline"; }).length; return lcp.then((l) => ({ lcp: Math.round(l), js: performance.getEntriesByType("resource").filter((r) => r.initiatorType === "script").reduce((n, r) => n + r.encodedBodySize, 0), over: document.documentElement.scrollWidth - innerWidth, small, h: document.documentElement.scrollHeight })); });
    console.log(`${cihaz} ${ad} ${Date.now() - t0}ms lcp=${m.lcp} jsKB=${Math.round(m.js / 1024)} tasma=${m.over} kucuk=${m.small} boy=${m.h} hata=${err.length}`);
    await p.screenshot({ path: `${OUT}/${ad}-${cihaz}.png` });
    if (ad === "japon" || ad === "ana") await p.screenshot({ path: `${OUT}/${ad}-${cihaz}-tam.png`, fullPage: true });
    p.off("pageerror", h);
  }
  await ctx.close();
}
await br.close();
