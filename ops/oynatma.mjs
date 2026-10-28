/* GERÇEK OYNATMA TESTİ — iframe'in açılması başarı SAYILMAZ: oynatıcının içindeki <video> öğesinde süre
   ilerlemeli (currentTime artmalı) ve görüntü boyutu > 0 olmalı.
   Tarayıcılar: iPhone 15 (WebKit = Safari motoru, macOS, dokunmatik, iOS kimliği) ve Pixel 7 (Google Chrome, mobil).
   Bypass başlığı yalnız kendi aday adresimize; video platformlarına gitmez. Çıktı şifrelenir; log yalnız sonuç. */
import { mkdirSync, writeFileSync } from "node:fs";
import { webkit, chromium, devices } from "playwright";
const HOST = process.env.TEST_HOST, BYPASS = process.env.VERCEL_BYPASS;
mkdirSync("out/oynatma", { recursive: true });
const results = [];
const PAGES = [["ciya-sofrasi-kadikoy", ["YouTube", "Instagram", "TikTok"]]];

async function videoState(page) {
  let best = null;
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    try {
      const s = await f.evaluate(() => { const v = [...document.querySelectorAll("video")].find((x) => x.readyState > 0) ?? document.querySelector("video");
        return v ? { t: v.currentTime, paused: v.paused, rs: v.readyState, w: v.videoWidth, muted: v.muted } : null; });
      if (s && (!best || s.t > best.t)) best = { ...s, frame: new URL(f.url()).host };
    } catch { /* çapraz köken çerçeve hazır değil */ }
  }
  return best;
}

for (const [label, type, dev, opts] of [["iPhone 15 · Safari (WebKit)", webkit, devices["iPhone 15"], {}], ["Pixel 7 · Google Chrome", chromium, devices["Pixel 7"], { channel: "chrome" }]]) {
  const browser = await type.launch(opts);
  const ctx = await browser.newContext({ ...dev, locale: "tr-TR" });
  await ctx.route(`https://${HOST}/**`, (r) => r.continue({ headers: { ...r.request().headers(), "x-vercel-protection-bypass": BYPASS } }));
  const page = await ctx.newPage();
  for (const [slug, platforms] of PAGES) {
    await page.goto(`https://${HOST}/mekan/${slug}/`, { waitUntil: "networkidle", timeout: 60000 });
    await page.locator("#videolar").scrollIntoViewIfNeeded();
    for (const pl of platforms) {
      const r = { browser: label, platform: pl, opened: false, playing: false, t0: null, t1: null, w: 0, closedOnPage: false };
      try {
        await page.locator("#videolar button", { hasText: pl }).first().tap().catch(() => page.locator("#videolar button", { hasText: pl }).first().click());
        await page.waitForSelector("[role=dialog] iframe", { timeout: 10000 });
        r.opened = true;
        await page.waitForTimeout(4000);
        let s = await videoState(page);
        if (!s || s.paused || s.t === 0) {
          /* kullanıcı dokunuşu: oynatıcının ortasına */
          const b = await page.locator("[role=dialog] iframe").boundingBox();
          if (b) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2).catch(() => page.mouse.click(b.x + b.width / 2, b.y + b.height / 2));
          await page.waitForTimeout(2500);
          s = await videoState(page);
          if (s && s.paused) { const b2 = await page.locator("[role=dialog] iframe").boundingBox(); if (b2) await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2); await page.waitForTimeout(1500); }
        }
        const a = await videoState(page);
        await page.waitForTimeout(5000);
        const z = await videoState(page);
        r.t0 = a?.t ?? null; r.t1 = z?.t ?? null; r.w = z?.w ?? 0; r.muted = z?.muted; r.frame = z?.frame;
        r.playing = !!(a && z && z.t - a.t > 2 && z.w > 0);
        await page.screenshot({ path: `out/oynatma/${label.split(" ")[0]}-${pl}.png` });
        const before = page.url();
        await page.goBack(); await page.waitForTimeout(1200);
        r.closedOnPage = !(await page.$("[role=dialog]")) && page.url() === before;
      } catch (e) { r.error = String(e).slice(0, 160); }
      results.push(r);
      console.log(`${r.playing ? "✓" : "✗"} ${label} · ${pl}: açıldı=${r.opened} oynuyor=${r.playing} süre ${r.t0?.toFixed?.(1) ?? "-"}→${r.t1?.toFixed?.(1) ?? "-"} sn · görüntü ${r.w}px · kapatınca sayfada=${r.closedOnPage}${r.error ? " · " + r.error.slice(0, 80) : ""}`);
    }
  }
  await browser.close();
}
writeFileSync("out/oynatma/sonuc.json", JSON.stringify(results, null, 1));
process.exit(results.every((r) => r.playing && r.closedOnPage) ? 0 : 1);
