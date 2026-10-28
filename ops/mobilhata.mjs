/* Mobil "network error" daraltma: Pandeli profil sayfası (Preview) adım adım; hangi adımdan sonra hata çıktığı. Yalnız okuma. */
import { chromium } from "playwright";
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "x-vercel-set-bypass-cookie": "true" };
const b = await chromium.launch({ channel: "chrome" });
for (const run of [1, 2]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, extraHTTPHeaders: HB, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const reqs = []; p.on("requestfailed", (r) => reqs.push(`${new URL(r.url()).hostname}${new URL(r.url()).pathname.slice(0, 50)} ${r.failure()?.errorText}`));
  const step = async (ad, fn) => { const n = errs.length; await fn(); await p.waitForTimeout(2500); console.log(`ÖLÇÜM ${run} · ${ad}: +${errs.length - n} hata · başarısız istek: ${reqs.splice(0).filter((x) => !/vercel\.live|jwe/.test(x)).slice(0, 4).join(" | ") || "yok"}`); };
  await step("açılış", () => p.goto(`https://${process.env.PROFIL_HOST}/mekan/pandeli-fatih/`, { waitUntil: "networkidle" }));
  await step("kaydırma", () => p.mouse.wheel(0, 2500));
  await step("menü sekmesi", () => p.locator("a[href='#menu']").first().click());
  await step("video aç", async () => { await p.locator("#videolar").scrollIntoViewIfNeeded(); await p.locator("#videolar button").first().click(); });
  await step("video kapat", () => p.locator("[role=dialog] button[aria-label^='Kapat']").click());
  await step("sona kaydır", () => p.mouse.wheel(0, 6000));
  await ctx.close();
}
await b.close();
