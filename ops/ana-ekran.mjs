/* ANA SAYFA EKRAN ÖLÇÜMÜ — 5 genişlikte ilk ekran + tam sayfa görüntüsü ve ölçüm.
   Kullanım: HOST=<alan> ETIKET=once|sonra CIKTI=<klasör> [VERCEL_BYPASS=…] node ana-ekran.mjs
   Ölçüm: Sor alanı yüksekliği, ilk sıralama başlığının sayfa üstüne uzaklığı, yatay taşma, Top 10 satır sayısı. */
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.PW ?? "playwright");
const HOST = process.env.HOST, OUT = process.env.CIKTI ?? "out/ana", TAG = process.env.ETIKET ?? "ekran";
mkdirSync(OUT, { recursive: true });
const SIZES = [["1440", 1440, 900], ["1280", 1280, 800], ["768", 768, 1024], ["390", 390, 844], ["375", 375, 812]];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const res = {};
for (const [k, w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: "tr-TR", isMobile: w < 768, hasTouch: w < 768,
    extraHTTPHeaders: process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "x-vercel-set-bypass-cookie": "true" } : {} });
  const p = await ctx.newPage();
  await p.goto(`https://${HOST}/`, { waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/${TAG}-${k}-ilk-ekran.png` });
  await p.screenshot({ path: `${OUT}/${TAG}-${k}-tam.png`, fullPage: true });
  res[k] = await p.evaluate(() => {
    const top = (el) => (el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null);
    const sor = document.querySelector("[data-ana-sor]")?.closest("section") ?? document.querySelector("[data-ana-hero]");
    const firstRank = document.querySelector("[data-siralama] h2, [data-ana-pano] h2, [data-ana-siralama] h2");
    return {
      sorHeight: sor ? Math.round(sor.getBoundingClientRect().height) : null,
      firstRankTop: top(firstRank), firstRankTitle: firstRank?.textContent?.trim().slice(0, 40) ?? null,
      viewport: window.innerHeight, pageHeight: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      top10Rows: document.querySelectorAll("[data-top10] li").length,
      googleBadges: document.querySelectorAll("[data-gpuan]").length,
    };
  });
  if (k === "1440" && process.env.ETKILESIM) {
    /* kategori sekmeleri: her sekmede liste değişir, en çok 10 satır, ekran görüntüsü */
    const tabs = await p.$$eval("[data-kategori]", (xs) => xs.map((x) => x.getAttribute("data-kategori")));
    res.kategoriler = {};
    for (const t of tabs) {
      await p.click(`[data-kategori="${t}"]`); await p.waitForTimeout(150);
      res.kategoriler[t] = await p.$$eval("[data-top10] li", (xs) => xs.map((x) => x.getAttribute("data-top10-satir")));
      if (["balik", "kebap", "meyhane", "kafe"].includes(t)) await (await p.$("[data-siralama]")).screenshot({ path: `${OUT}/${TAG}-1440-eniyiler-${t}.png` });
    }
    await p.click(`[data-kategori="hepsi"]`);
    const closed = (process.env.KAPALI ?? "").split(",").filter(Boolean);
    const html = await p.content();
    res.kapaliSizinti = closed.filter((s) => html.includes(`/mekan/${s}/`));
    /* yedek (sıralama değil) listeler En İyiler'i ve birbirini tekrar etmez */
    res.yedekTekrar = await p.evaluate(() => {
      const top = [...document.querySelectorAll("[data-top10] li")].map((x) => x.getAttribute("data-top10-satir"));
      const fb = [...document.querySelectorAll("[data-pano-yedek] a")].map((a) => a.getAttribute("href"));
      const seen = new Set(top.map((s) => `/mekan/${s}/`)); let d = 0; for (const h of fb) { if (seen.has(h)) d++; seen.add(h); } return d;
    });
    await (await p.$("[data-ana-pano]")).screenshot({ path: `${OUT}/${TAG}-1440-pano.png` });
    /* Sor: soru eksiksiz /sor/?q= ile aktarılır */
    const q = "Kadıköy'de sakin bir akşam yemeği, 2 kişi";
    await p.fill("#ana-sor", q); await p.press("#ana-sor", "Enter"); await p.waitForURL(/\/sor\//, { timeout: 15000 }).catch(() => {});
    res.sorAktarim = decodeURIComponent(new URL(p.url()).searchParams.get("q") ?? "") === q;
  }
  if (k === "390") {
    const btn = await p.$("[data-siralama] button[aria-expanded]");
    res.mobilOnce = await p.$$eval("[data-top10] li", (xs) => xs.filter((x) => getComputedStyle(x).display !== "none").length);
    if (btn) { await btn.evaluate((b) => b.click()); await p.waitForTimeout(200); }
    res.mobilSonra = await p.$$eval("[data-top10] li", (xs) => xs.filter((x) => getComputedStyle(x).display !== "none").length);
    await (await p.$("[data-siralama]")).screenshot({ path: `${OUT}/${TAG}-390-eniyiler-acik.png` });
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/${TAG}-olcum.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res));
