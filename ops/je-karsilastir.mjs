/* Japon Erdal profili · eski/yeni canlı sürümler (yalnız okuma). Google istekleri tarayıcıda kesilir. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const OUT = "out/je"; mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const SURUM = (process.env.SURUMLER ?? "").split(",").filter(Boolean); /* etiket=host */
const SLUG = process.env.SLUG ?? "japon-erdal-beyoglu";
const b = await chromium.launch(); const ozet = {};
for (const s of SURUM) {
  const [et, host] = s.split("=");
  for (const [dev, o] of [["masaustu", { viewport: { width: 1440, height: 900 } }], ["mobil", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }]]) {
    const ctx = await b.newContext(o); await yetkiliBaslik(ctx, host, HB);
    let g = 0; await ctx.route(/googleapis\.com|\/api\/google/, (r) => { g++; return r.abort(); });
    const p = await ctx.newPage();
    const r = await p.goto(`https://${host}/mekan/${SLUG}/`, { waitUntil: "networkidle" }).catch(() => null);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${et}-${dev}-ilk.png` });
    await p.screenshot({ path: `${OUT}/${et}-${dev}-tam.png`, fullPage: true });
    const info = await p.evaluate(() => {
      const imgs = [...document.querySelectorAll("main img")].map((i) => { const r = i.getBoundingClientRect(); return { src: (i.currentSrc || i.src).replace(location.origin, "").slice(0, 90), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top + scrollY), nw: i.naturalWidth, nh: i.naturalHeight, fit: getComputedStyle(i).objectFit }; });
      const secs = [...document.querySelectorAll("main section, main [id]")].map((s) => { const r = s.getBoundingClientRect(); return { id: s.id || s.getAttribute("aria-labelledby") || s.tagName, y: Math.round(r.top + scrollY), h: Math.round(r.height) }; });
      return { h: document.documentElement.scrollHeight, imgs, secs };
    });
    ozet[`${et}-${dev}`] = { status: r?.status(), google: g, ...info };
    console.log(et, dev, r?.status(), "yükseklik", info.h, "görsel", info.imgs.length, "google", g);
    await ctx.close();
  }
}
writeFileSync(`${OUT}/ozet.json`, JSON.stringify(ozet, null, 1));
await b.close();
