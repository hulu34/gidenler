/* Mobil "network error" karşılaştırması: aynı sayfa canlı test dağıtımında ve Preview'da (yalnız okuma; Google'sız mekân). */
import { chromium } from "playwright";
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "x-vercel-set-bypass-cookie": "true" };
const b = await chromium.launch({ channel: "chrome" });
for (const [ad, host] of [["canlı-test", process.env.TEST_HOST], ["preview", process.env.PROFIL_HOST]]) for (const path of ["/mekan/ciya-sofrasi-kadikoy/", "/"]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, extraHTTPHeaders: HB, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`https://${host}${path}`, { waitUntil: "networkidle" }); await p.waitForTimeout(3000);
  await p.mouse.wheel(0, 3000); await p.waitForTimeout(2000);
  console.log(`${ad} ${path}: ${errs.length} hata ${errs.slice(0, 2).join(" | ")}`);
  await ctx.close();
}
await b.close();
