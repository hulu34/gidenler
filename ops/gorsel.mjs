/* GÖRSEL FAZ 1 KONTROLÜ — farklı ağdan, koruma kaldırılmadan (bypass başlığı yalnız kendi alan adlarımıza).
   · Ekran görüntüleri (masaüstü + mobil), davranış kontrolleri, sayfa açılışında üçüncü taraf istekleri, Lighthouse mobil.
   · Google fotoğrafları yalnız korumalı test dağıtımında ve yalnız iki kez istenir (2 × [1 liste + en çok 5 foto]).
   Çıktı out/gorsel/ (iş akışı şifreler). Log: yalnız sayılar ve doğru/yanlış. */
import { mkdirSync, writeFileSync } from "node:fs";

const BYPASS = process.env.VERCEL_BYPASS, PRE = process.env.PREVIEW_HOST, STG = process.env.TEST_HOST, OLD = process.env.OLD_HOST;
const OWN = new Set([PRE, STG, OLD]);
const UA = { m: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  d: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" };
const VP = { m: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, d: { width: 1366, height: 900, deviceScaleFactor: 1 } };
mkdirSync("out/gorsel", { recursive: true });
const out = { checks: {}, thirdParty: {}, lighthouse: {} };
const ok = (k, v) => { out.checks[k] = !!v; console.log(`${v ? "✓" : "✗"} ${k}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const puppeteer = await import("puppeteer-core");
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"], headless: true });

async function open(host, path, kind, { track } = {}) {
  const page = await browser.newPage();
  await page.setUserAgent(UA[kind]); await page.setViewport(VP[kind]);
  await page.setRequestInterception(true);
  const third = new Set();
  page.on("request", (r) => {
    const h = new URL(r.url()).host;
    if (!OWN.has(h) && !r.url().startsWith("data:")) third.add(h);
    r.continue(OWN.has(h) ? { headers: { ...r.headers(), "x-vercel-protection-bypass": BYPASS } } : undefined);
  });
  await page.goto(`https://${host}${path}`, { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(800);
  if (track) out.thirdParty[track] = [...third].sort();
  return page;
}
const shot = (page, name, full = false) => page.screenshot({ path: `out/gorsel/${name}.png`, fullPage: full });
const byText = (page, sel, text) => page.evaluateHandle((sel, text) => [...document.querySelectorAll(sel)].find((e) => e.textContent?.includes(text)) ?? null, sel, text);

const ONLY_LH = process.env.ONLY_LH === "1";   /* yalnız hız ölçümü: tarayıcı kontrolleri ve Google çağrısı yok */
if (!ONLY_LH) {
/* ── 1) Preview: Çiya — fotoğrafsız şerit, video şeridi, oynatıcı (masaüstü) ── */
let p = await open(PRE, "/mekan/ciya-sofrasi-kadikoy/", "d", { track: "ciya_masaustu_acilis" });
await shot(p, "01-ciya-masaustu-ust");
const vids = await p.$$("#videolar button[aria-label*='oynat']");
ok("Çiya: video şeridi görünür (≥ 7 video)", vids.length >= 7);
await p.$eval("#videolar", (e) => e.scrollIntoView({ block: "center" })); await sleep(600);
await shot(p, "02-ciya-masaustu-videolar");
ok("sayfa açılışında YouTube/Instagram/TikTok isteği yok", !out.thirdParty.ciya_masaustu_acilis.some((h) => /youtube|ytimg|instagram|cdninstagram|tiktok/.test(h) && !/i\.ytimg\.com/.test(h)));
const urlBefore = p.url();
const ytCard = await byText(p, "#videolar button", "YouTube");
await (ytCard.asElement() ?? vids[0]).click(); await sleep(3500);
ok("video tıklanınca oynatıcı Gidenler içinde açılır", !!(await p.$("[role=dialog] iframe[src*='youtube-nocookie.com/embed/']")));
await shot(p, "03-ciya-masaustu-oynatici-youtube");
await p.keyboard.press("ArrowDown"); await sleep(2500);
ok("↓ ile sonraki video (yalnız aktif oynatıcı yüklü)", (await p.$$("[role=dialog] iframe")).length === 1);
await p.keyboard.press("Escape"); await sleep(800);
ok("Esc ile kapanır, restoran sayfasında kalınır", !(await p.$("[role=dialog]")) && p.url() === urlBefore);
await p.close();

/* ── 2) Preview: Çiya — mobil dikey oynatıcı (Instagram + TikTok), geri tuşu ── */
p = await open(PRE, "/mekan/ciya-sofrasi-kadikoy/", "m", { track: "ciya_mobil_acilis" });
await shot(p, "04-ciya-mobil-ust");
await p.$eval("#videolar", (e) => e.scrollIntoView({ block: "start" })); await sleep(600);
await shot(p, "05-ciya-mobil-videolar");
const ig = await byText(p, "#videolar button", "Instagram");
if (ig.asElement()) { await ig.asElement().click(); await sleep(4500); }
ok("mobil: Instagram Reel resmî gömme ile açılır", !!(await p.$("[role=dialog] iframe[src*='instagram.com/reel/']")));
await shot(p, "06-ciya-mobil-oynatici-instagram");
const mobUrl = p.url();
await p.goBack(); await sleep(1000);
ok("mobil: geri tuşu oynatıcıyı kapatır, sayfadan çıkarmaz", !(await p.$("[role=dialog]")) && p.url() === mobUrl);
const tt = await byText(p, "#videolar button", "TikTok");
if (tt.asElement()) { await tt.asElement().click(); await sleep(4500); }
ok("mobil: TikTok resmî oynatıcı ile açılır", !!(await p.$("[role=dialog] iframe[src*='tiktok.com/player/v1/']")));
await shot(p, "07-ciya-mobil-oynatici-tiktok");
await p.close();

/* ── 3) Preview: fotoğraflı mekân — mozaik, görüntüleyici, fotoğraflar sayfası ── */
p = await open(PRE, "/mekan/ismet-baba-uskudar/", "d");
await shot(p, "08-ismetbaba-masaustu-mozaik");
const tiles = await p.$$("section[aria-label$='fotoğrafları'] .sm\\:grid button");
if (tiles[0]) await tiles[0].click(); await sleep(1200);
ok("görüntüleyicide kaynak satırı (sahip + lisans)", await p.$eval("[role=dialog]", (d) => /Fotoğraf:/.test(d.textContent) && /Commons/.test(d.textContent)).catch(() => false));
await shot(p, "09-ismetbaba-masaustu-goruntuleyici");
await p.keyboard.press("Escape"); await p.close();
p = await open(PRE, "/mekan/ismet-baba-uskudar/fotograflar/", "m");
ok("fotoğraflar sayfası: 5 kategori sekmesi", (await p.$$eval("[role=tab]", (t) => t.map((x) => x.textContent))).filter((t) => /Yemekler|İç mekân|Dış cephe|Menü|Diğer/.test(t)).length === 5);
await shot(p, "10-ismetbaba-mobil-fotograflar");
await p.close();

/* ── 4) Preview: yönetim ekranı ── */
p = await open(PRE, "/yonetim/medya/", "d");
ok("yönetim ekranı korumalı adreste açılır", (await p.title()).includes("Yönetim"));
await shot(p, "11-yonetim-medya");
await p.close();

/* ── 5) Korumalı test dağıtımı: Google fotoğrafları (yalnız istenince) ── */
p = await open(STG, "/mekan/agora-meyhanesi-1890-fatih/", "d", { track: "agora_acilis" });
ok("Google: sayfa açılışında Google Places'e istek yok", !out.thirdParty.agora_acilis.some((h) => /googleusercontent|places\.googleapis/.test(h)));
const gbtn = await byText(p, "button", "Google'daki fotoğrafları");
if (gbtn.asElement()) { await gbtn.asElement().click(); await sleep(6000); }
const gTiles = await p.$$eval("section[aria-label$='fotoğrafları'] img", (im) => im.filter((i) => /googleusercontent|ggpht/.test(i.src)).length);
ok(`Google fotoğrafları istenince geldi (${gTiles})`, gTiles > 0);
await shot(p, "12-agora-masaustu-google-mozaik");
const firstG = await p.$("section[aria-label$='fotoğrafları'] .sm\\:grid button");
if (firstG) { await firstG.click(); await sleep(1500); }
ok("Google fotoğrafında sahip + 'Google Maps' atfı + profil bağlantısı", await p.$eval("[role=dialog]", (d) => /Google Maps/.test(d.textContent) && !!d.querySelector("a[href*='google.com/maps/contrib'], a[href*='maps.google.com'], a[href*='google.com']")).catch(() => false));
await shot(p, "13-agora-masaustu-google-goruntuleyici");
await p.close();
p = await open(STG, "/mekan/agora-meyhanesi-1890-fatih/fotograflar/", "m");
const gtab = await byText(p, "button", "Google'daki fotoğrafları göster");
if (gtab.asElement()) { await gtab.asElement().click(); await sleep(6000); }
await shot(p, "14-agora-mobil-fotograflar-google");
await p.close();
}
await browser.close();

/* ── 6) Lighthouse mobil: önce (eski Preview, statik) / sonra (Faz 1 Preview) ── */
const { default: lighthouse } = await import("lighthouse");
const chromeLauncher = await import("chrome-launcher");
const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
const b2 = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
for (const [k, host] of [["once", OLD], ["sonra", PRE]]) {
  const r = await fetch(`https://${host}/`, { headers: { "x-vercel-protection-bypass": BYPASS, "x-vercel-set-bypass-cookie": "true" }, redirect: "manual" });
  const ck = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]);
  for (const path of ["/mekan/ciya-sofrasi-kadikoy/", "/mekan/ismet-baba-uskudar/"]) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const page = await b2.newPage();
      for (const c of ck) { const [name, ...v] = c.split("="); await page.setCookie({ name, value: v.join("="), domain: host, path: "/", secure: true, httpOnly: true }); }
      const res = await lighthouse(`https://${host}${path}`, { output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility"], disableStorageReset: i > 0 }, undefined, page);
      const a = res.lhr.audits;
      runs.push({ perf: Math.round(res.lhr.categories.performance.score * 100), a11y: Math.round(res.lhr.categories.accessibility.score * 100),
        lcp: Math.round(a["largest-contentful-paint"].numericValue), cls: +a["cumulative-layout-shift"].numericValue.toFixed(3),
        tbt: Math.round(a["total-blocking-time"].numericValue), kb: Math.round(a["total-byte-weight"].numericValue / 1024) });
      await page.close();
    }
    const first = runs[0], med = (m) => [...runs.map((x) => x[m])].sort((x, y) => x - y)[1];
    out.lighthouse[`${k} ${path.split("/")[2]}`] = { ilk: first, ortanca: { perf: med("perf"), lcp: med("lcp"), cls: med("cls"), tbt: med("tbt") } };
  }
}
await b2.disconnect(); await chrome.kill();

writeFileSync("out/gorsel/sonuc.json", JSON.stringify(out, null, 1));
console.table(Object.fromEntries(Object.entries(out.lighthouse).map(([k, v]) => [k, { "perf(ilk)": v.ilk.perf, "LCP ms(ilk)": v.ilk.lcp, "KB(ilk)": v.ilk.kb, "erişilebilirlik": v.ilk.a11y, "CLS(ort)": v.ortanca.cls, "TBT ms(ort)": v.ortanca.tbt, "perf(ort)": v.ortanca.perf }])));
console.log("Açılışta üçüncü taraf alan adı sayısı:", JSON.stringify(Object.fromEntries(Object.entries(out.thirdParty).map(([k, v]) => [k, v.length]))));
process.exit(Object.values(out.checks).every(Boolean) ? 0 : 1);
