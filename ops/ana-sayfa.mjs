/* ANA SAYFA · Sor merkezde — YALNIZ PREVIEW. Google istekleri tarayıcıda kesilir (ücret yok).
   Groq kotası canlıyla ortak: toplam 2 gerçek soru (masaüstü yazılan, mobil örnek). Log: doğru/yanlış ve sayılar. */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { yetkiliBaslik, baslikSizintisi } from "./yetkili.mjs";
const HOST = process.env.PREVIEW_HOST, B = `https://${HOST}`, OUT = "out/anasayfa"; mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const b = await chromium.launch();
const CIHAZ = [
  ["masaustu", { viewport: { width: 1440, height: 900 } }, "Kadıköy'de uygun fiyatlı balık yiyebileceğimiz bir yer"],
  ["iphone", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }, "ornek"],
  ["android", { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36" }, null],
];
for (const [dev, o, soru] of CIHAZ) {
  const ctx = await b.newContext(o);
  await yetkiliBaslik(ctx, HOST, HB); const sizinti = baslikSizintisi(ctx, HOST);
  let google = 0, sorPost = 0;
  await ctx.route(/googleapis\.com|\/api\/google/, (r) => { google++; return r.abort(); });
  ctx.on("request", (r) => { if (r.method() === "POST" && new URL(r.url()).pathname.startsWith("/api/sor")) sorPost++; });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message.slice(0, 80)));
  await p.goto(`${B}/`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/${dev}-1-ilk-ekran.png` });
  const vh = o.viewport.height;
  const h1 = await p.locator("h1").first().innerText();
  ok(`${dev}: başlık "Nereye gitsek?"`, h1.trim() === "Nereye gitsek?", h1);
  const box = await p.locator("[data-ana-sor] textarea").boundingBox(); const btn = await p.locator("[data-ana-sor] button[type=submit]").boundingBox();
  ok(`${dev}: soru alanı ve Sor düğmesi ilk ekranda`, box && btn && box.y + box.height <= vh && btn.y + btn.height <= vh, `alan alt=${Math.round(box?.y + box?.height)} / ${vh}`);
  const orn = await p.locator("[data-ana-sor-ornek]").count();
  const ornGor = await p.locator("[data-ana-sor-ornek]").first().boundingBox();
  ok(`${dev}: örnek sorular (${orn}), ilki ilk ekranda`, orn >= 3 && ornGor && ornGor.y + ornGor.height <= vh);
  const txt = await p.evaluate(() => document.body.innerText);
  ok(`${dev}: ana sayfada Japon Erdal yok (metin ve bağlantı)`, !/Japon Erdal/i.test(txt) && (await p.locator('a[href*="japon-erdal"]').count()) === 0);
  ok(`${dev}: Seçki yazısı ana sayfada tekil vitrin değil`, (await p.locator('a[href*="/seckisi/"]:not([href$="/seckisi/"])').count()) === 0);
  const kart = await p.locator("[data-ana-kesif-kart]").evaluateAll((xs) => xs.map((x) => x.textContent));
  ok(`${dev}: keşif 4–6 gerçek mekân`, kart.length >= 4 && kart.length <= 6, kart.length);
  ok(`${dev}: "en iyi"/sıralama iddiası yok`, !/en iyi|1\. sırada|top ?\d/i.test(await p.locator("[data-ana-kesif]").innerText()));
  ok(`${dev}: üst menü araması duruyor`, (await p.locator('header form[action*="/ara"], header input[type=search]').count()) > 0);
  await p.locator("[data-ana-kesif]").scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${dev}-2-kesif.png` });
  if (soru) {
    await p.evaluate(() => scrollTo(0, 0));
    let gonderilen;
    if (soru === "ornek") { const l = p.locator("[data-ana-sor-ornek]").nth(1); gonderilen = (await l.innerText()).trim(); await l.click(); }
    else { gonderilen = soru; await p.locator("[data-ana-sor] textarea").fill(soru); await p.screenshot({ path: `${OUT}/${dev}-3-yazildi.png` }); await p.locator("[data-ana-sor] textarea").press("Enter"); }
    await p.waitForURL(/\/sor\/\?q=/, { timeout: 15000 });
    ok(`${dev}: gönderim gerçek /sor'a gider, soru adreste`, new URL(p.url()).searchParams.get("q") === gonderilen);
    await p.locator("[data-sor-mod]").first().waitFor({ timeout: 45000 }).catch(() => {});
    const soruBalon = await p.locator("[data-sor-soru]").allInnerTexts();
    ok(`${dev}: yazılan mesaj kaybolmadı`, soruBalon.length === 1 && soruBalon[0].trim() === gonderilen, JSON.stringify(soruBalon));
    const mod = await p.locator("[data-sor-mod]").first().getAttribute("data-sor-mod").catch(() => null);
    const kartN = await p.locator("[data-sor-kart]").count();
    ok(`${dev}: yanıt doğrudan görünür`, !!mod && kartN > 0, `mod=${mod} kart=${kartN}`);
    ok(`${dev}: tek istek (kota çift harcanmaz)`, sorPost === 1, sorPost);
    ok(`${dev}: ilk yanıtta sayfa başta`, (await p.evaluate(() => scrollY)) < 200);
    await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/${dev}-4-yanit.png` });
  }
  if (dev === "masaustu") {
    const g = await p.goto(`${B}/mekan/japon-erdal-beyoglu/`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
    const t = await p.evaluate(() => document.body.innerText);
    ok("Japon Erdal profili açılıyor, fotoğraf ve video duruyor", g.status() === 200 && (await p.locator("#videolar button").count()) > 0 && (await p.locator("img").count()) > 2);
    ok("Japon Erdal profilinde kurucu ilişkisi açıklaması duruyor", /kurucu/i.test(t));
    const s = await p.goto(`${B}/seckisi/`, { waitUntil: "networkidle" });
    ok("Seçki sayfası ve yazı bağlantısı duruyor", s.status() === 200 && (await p.locator('a[href*="japon-erdal-dort-pide"]').count()) > 0);
    const a = await p.goto(`${B}/ara/?q=pide`, { waitUntil: "networkidle" });
    ok("arama çalışıyor (/ara?q=pide)", a.status() === 200 && /pide/i.test(await p.evaluate(() => document.body.innerText)));
    const k = await p.goto(`${B}/kesfet/`, { waitUntil: "networkidle" }); ok("Keşfet açılıyor", k.status() === 200);
    const sm = await (await ctx.request.get(`${B}/sitemap.xml`)).text(); ok("site haritası", (sm.match(/<loc>/g) ?? []).length >= 400, (sm.match(/<loc>/g) ?? []).length);
    const home = await (await ctx.request.get(`${B}/`)).text();
    ok("SEO: tek h1, canonical ve title", (home.match(/<h1/g) ?? []).length === 1 && /rel="canonical"/.test(home) && /<title>[^<]+<\/title>/.test(home));
  }
  ok(`${dev}: sayfa hatası yok`, errs.length === 0, errs.join(" | "));
  ok(`${dev}: Google isteği yok`, google === 0, google);
  ok(`${dev}: test başlığı dışarı sızmadı`, sizinti.size === 0, [...sizinti].join(","));
  await ctx.close();
}
await b.close();
const k = res.filter((x) => !x).length; console.log(`SONUÇ ${res.length - k}/${res.length}`); process.exit(k ? 1 : 0);
