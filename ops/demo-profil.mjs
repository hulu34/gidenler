/* Yatırımcı demosu · profil kontrolü (demo.gidenler.com, korumayı kaldırmadan): sekmeler, simüle puan etiketleri, galeri ve
   tam ekran, öne çıkan → menü, videoların gerçekten oynaması ve kapanınca sayfaya dönüş, demo rezervasyonun iletilmemesi,
   dış servise (Google/AI) istek olmaması. Log yalnız sayı / doğru-yanlış. */
import { chromium } from "playwright";
const B = `https://${process.env.DEMO_HOST}`;
const BYPASS = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "x-vercel-set-bypass-cookie": "true" };
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const UAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const b = await chromium.launch({ channel: "chrome" }); // H.264 için Google Chrome (Playwright Chromium çözemez)
const res = {};
for (const [dev, opts] of [["masaustu", { viewport: { width: 1366, height: 900 }, userAgent: UA }], ["mobil", { viewport: { width: 390, height: 844 }, userAgent: UAM, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const ctx = await b.newContext({ ...opts, extraHTTPHeaders: BYPASS });
  const ext = new Set(); const apis = [];
  ctx.on("request", (r) => { const u = new URL(r.url()); if (u.hostname !== process.env.DEMO_HOST) ext.add(u.hostname); else if (u.pathname.startsWith("/api/")) apis.push(r.method() + " " + u.pathname); });
  for (const s of ["moda-lokantasi", "koz-durum", "asma-teras"]) {
    const page = await ctx.newPage(); const r = {}; const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto(`${B}/mekan/${s}/`, { waitUntil: "networkidle" }); await page.waitForTimeout(600);
    const txt = await page.evaluate(() => document.body.innerText);
    const navTxt = await page.evaluate(() => [...document.querySelectorAll("a[href^='#']")].map((a) => a.textContent.trim()));
    r.sekmeler = ["Genel bakış", "Menü", "Fotoğraflar", "Videolar", "Deneyimler", "Puan ve trend"].every((t) => navTxt.includes(t));
    r.simule = (txt.match(/Simüle puan — canlı veri bağlantısı değil/g) ?? []).length;
    r.gercekMekanEtiketi = await page.locator("header").getByText("Gerçek mekân", { exact: true }).count();
    r.galeri = await page.locator("#fotograflar ul li").count();
    r.menu = await page.locator("#menu li[id^=menu-]").count();
    r.temsili = (txt.match(/Temsili görsel — demo/g) ?? []).length;
    // öne çıkan → menü
    const hl = page.locator("#genel a[href^='#menu-']").first(); const href = await hl.getAttribute("href");
    await hl.click(); await page.waitForTimeout(900);
    r.oneCikan = await page.evaluate((h) => { const el = document.querySelector(h); const b = el?.getBoundingClientRect(); return location.hash === h && !!b && b.top >= 0 && b.top < innerHeight; }, href);
    // galeri tam ekran
    await page.locator("#fotograflar ul li button").nth(1).click(); await page.waitForTimeout(500);
    const lb = page.locator("[role=dialog]"); r.lightbox = await lb.count() === 1 && (await lb.innerText()).includes("Temsili görsel — demo");
    await page.keyboard.press("ArrowRight"); await page.waitForTimeout(200);
    r.lightboxSayac = (await lb.innerText()).match(/\d+ \/ \d+/)?.[0];
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    r.lightboxKapandi = await page.locator("[role=dialog]").count() === 0;
    // menü ve galeri ekran görüntüsü
    await page.locator("#menu").scrollIntoViewIfNeeded(); await page.evaluate(() => document.getElementById("menu").scrollIntoView()); await page.waitForTimeout(700);
    // videolar
    const cards = page.locator("#videolar button"); r.video = await cards.count();
    await page.evaluate(() => document.getElementById("videolar").scrollIntoView()); await page.waitForTimeout(500);
    r.oynadi = [];
    for (let i = 0; i < r.video; i++) {
      await cards.nth(i).click();
      const ok = await page.waitForFunction(() => { const v = document.querySelector("[role=dialog] video"); return v && v.readyState >= 2 && v.currentTime > 0.8; }, null, { timeout: 15000 }).then(() => true).catch(() => false);
      r.oynadi.push(ok);
      await page.locator("[role=dialog] button[aria-label^='Kapat']").click(); await page.waitForTimeout(400);
    }
    r.donus = page.url().endsWith(`/mekan/${s}/`) || page.url().includes(`/mekan/${s}/#`);
    r.dialogKapali = await page.locator("[role=dialog]").count() === 0;
    // rezervasyon (yalnız ortak mekânda form var)
    const form = page.locator("#bilgi form");
    if (await form.count()) {
      await form.locator("[role=radiogroup][aria-label='Rezervasyon günü'] button[role=radio]:not([disabled])").nth(1).click();
      await form.locator("button[aria-pressed]:not([disabled])").first().click(); await page.waitForTimeout(300);
      await form.locator("input[placeholder='Ad soyad']").fill("Demo Deneme");
      await form.locator("input[placeholder^='Telefon']").fill("0500 000 00 00");
      const cb = form.locator("input[type=checkbox]"); if (await cb.count()) await cb.first().check();
      const resp = page.waitForResponse((x) => x.url().includes("/api/rezervasyon"), { timeout: 10000 }).catch(() => null);
      await form.locator("button[type=submit]").click(); const rr = await resp;
      r.rezervasyon = rr ? `${rr.status()} ${(await rr.json()).status} iletildi=${(await rr.json().catch(() => ({}))).forwarded}` : "istek yok";
      await page.waitForTimeout(500);
      r.rezervasyonEkran = /önizleme/i.test(await page.locator("#bilgi").innerText());
    } else r.rezervasyon = "form yok (ortak değil)";
    r.hata = errs;
    res[`${s}/${dev}`] = r; await page.close();
  }
  res[`${dev}/dis-istek`] = [...ext]; res[`${dev}/api`] = [...new Set(apis)];
  await ctx.close();
}
let fail = 0;
for (const [k, v] of Object.entries(res)) {
  if (Array.isArray(v)) { const bad = k.endsWith("dis-istek") && v.length > 0; fail += bad; console.log(`${bad ? "✗" : "✓"} ${k}: ${v.join(", ") || "yok"}`); continue; }
  const good = v.sekmeler && v.simule === 3 && v.gercekMekanEtiketi === 0 && v.oneCikan && v.lightbox && v.lightboxKapandi && v.video >= 2 && v.oynadi.every(Boolean) && v.donus && v.dialogKapali && !v.hata.length && (!v.rezervasyon.startsWith("2") || /önizleme iletildi=false/.test(v.rezervasyon));
  fail += !good;
  console.log(`${good ? "✓" : "✗"} ${k} galeri=${v.galeri} menü=${v.menu} video=${v.video} oynadı=${v.oynadi.filter(Boolean).length} temsili=${v.temsili} rezervasyon=${v.rezervasyon} hata=${v.hata.length}`);
}
await b.close();
process.exit(fail ? 1 : 0);
