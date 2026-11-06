/* PREVIEW · aktarım sonrası sitede Google puanı: ana sayfa Google sekmesi, Keşfet, profil, arama (masaüstü + mobil).
   Çıktı: ekran görüntüleri + sayısal kontroller (şifreli). Google'a istek atılmaz (sayfa Google içeriğini kayıtlı veriden okur). */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const HOST = process.env.PREVIEW_HOST, OUT = "out/gpuan/site";
mkdirSync(OUT, { recursive: true });
const rated = (await (await fetch(`https://${HOST}/api/admin/google-puan/?rapor=durum`, { headers: { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } })).json().catch(() => ({})));
writeFileSync(`${OUT}/durum.json`, JSON.stringify(rated, null, 1));
const b = await chromium.launch({ channel: "chrome" });
const res = {};
for (const [dev, opt] of [["masaustu", { viewport: { width: 1440, height: 900 } }], ["mobil", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const ctx = await b.newContext({ ...opt, extraHTTPHeaders: { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "x-vercel-set-bypass-cookie": "true" } });
  /* Google'a giden her isteği kes: sayfa Google içeriğini yalnız kayıtlı veriden göstermeli */
  let googleCalls = 0;
  await ctx.route(/google(apis)?\.com|gstatic\.com/, (r) => { googleCalls++; return r.abort(); });
  const p = await ctx.newPage();
  await p.goto(`https://${HOST}/`, { waitUntil: "networkidle", timeout: 60000 });
  await p.locator('[data-puan-sekme="google"]').first().click().catch(() => {});
  await p.waitForTimeout(800);
  const tab = await p.locator("[data-google-siralama]").first();
  res[`${dev}_ana_google_satir`] = await p.locator("[data-google-liste] li, [data-google-az] li").count();
  res[`${dev}_ana_google_bos`] = await p.locator("[data-google-bos]").count();
  await tab.scrollIntoViewIfNeeded().catch(() => {});
  await tab.screenshot({ path: `${OUT}/${dev}-ana-google-sekmesi.png` }).catch(() => {});
  await p.goto(`https://${HOST}/kesfet/`, { waitUntil: "networkidle", timeout: 60000 });
  res[`${dev}_kesfet_google`] = await p.locator("[data-google-top] li").count();
  const kt = p.locator("[data-google-top]").first();
  if (await kt.count()) { await kt.scrollIntoViewIfNeeded(); await kt.screenshot({ path: `${OUT}/${dev}-kesfet-google.png` }); }
  for (const slug of (process.env.PROFIL ?? "").split(",").filter(Boolean)) {
    await p.goto(`https://${HOST}/mekan/${slug}/`, { waitUntil: "networkidle", timeout: 60000 });
    res[`${dev}_profil_${slug}`] = await p.locator("[data-google-kayitli]").count();
    res[`${dev}_profil_${slug}_metin`] = (await p.locator("[data-google-kayitli]").first().innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 80);
    await p.screenshot({ path: `${OUT}/${dev}-profil-${slug}.png` });
  }
  await p.goto(`https://${HOST}/ara/?q=${encodeURIComponent(process.env.ARAMA ?? "kahve")}`, { waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(1500);
  res[`${dev}_arama_google_rozet`] = await p.locator("[data-google-chip]").count();
  await p.screenshot({ path: `${OUT}/${dev}-arama.png` });
  res[`${dev}_google_istek_kesildi`] = googleCalls;
  await ctx.close();
}
await b.close();
writeFileSync(`${OUT}/kontroller.json`, JSON.stringify(res, null, 1));
console.log(Object.entries(res).filter(([k]) => !k.endsWith("_metin")).map(([k, v]) => `${k}=${v}`).join(" "));
