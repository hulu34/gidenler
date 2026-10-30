/* PREVIEW · izin kapısı. Google Preview'da kapalı, ücretli istek yok; sahte fetch testleri scripts/dbtest.ts içinde. Üretime yazmaz. */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const HOST = process.env.SEO_HOST, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }, OUT = "out/politika", W = "https://www.gidenler.com"; mkdirSync(OUT, { recursive: true });
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const A = `https://${HOST}/api/admin/db/`, rj = async (q) => (await fetch(`${A}?rapor=${q}`, { headers: H })).json();
const P0 = await rj("google-politika"); ok("Preview, Google kapalı", P0.env === "preview" && P0.enabled === false, JSON.stringify(P0.policy)); if (P0.env !== "preview") process.exit(1);
const u0 = JSON.stringify((await rj("google")).usage);
const S4 = ["bafetto-pizza-kartal", "pidem-fatih", "ibb-eyupsultan-kent-lokantasi-eyupsultan", "maltepe-belediyesi-seyirtepe-sosyal-tesisleri-maltepe"];
const post = (b) => fetch(A, { method: "POST", headers: { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", ...b }) });
{ const r = await post({ action: "google-policy-set", confirm: "POLITIKA", slugs: S4, mode: "baglanti", priority: "C", why: "Zincir veya kamu tesisi, Preview denemesi", admin: "preview-test" }); const j = await r.json(); ok("politika yazımı denetimli", r.ok && j.ok && j.count === 4, j.auditId);
  const bad = await post({ action: "google-policy-set", confirm: "POLITIKA", slugs: ["pidem-fatih"], mode: "izinli", priority: "D", why: "denenir", admin: "preview-test" }); ok("D izinli reddedilir", bad.status === 400);
  const P1 = await rj("google-politika"); ok("rapor politikayı görür", (P1.policy?.byMode?.baglanti ?? 0) >= 4 && P1.policy?.allowedNow === 0, JSON.stringify(P1.policy)); }
const api = async (p) => (await fetch(`https://${HOST}/api/google/place/?${p}`, { headers: { ...H, "user-agent": "Mozilla/5.0" } }));
for (const s of S4) { const r = await api(`slug=${s}&part=view`); const j = await r.json(); ok(`${s}: ücretli çağrı yok`, !j.rating && !j.photos?.length, JSON.stringify(j)); }
{ const r = await api(`slug=pidem-fatih&part=reviews`); console.log(`eski uç: HTTP ${r.status}`); }
const sm = await (await fetch(`https://${HOST}/sitemap.xml`, { headers: H })).text(); const live = await (await fetch(`${W}/sitemap.xml`)).text(); const L = (x) => [...x.matchAll(/<loc>([^<]+)/g)].map((m) => m[1]);
ok("canlı site haritasının adresleri korunuyor", L(live).every((u) => L(sm).includes(u)), `canlı ${L(live).length}, Preview ${L(sm).length}`);
const b = await chromium.launch({ channel: "chrome" });
for (const [dev, opt] of Object.entries({ masaustu: { viewport: { width: 1280, height: 900 } }, mobil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } })) {
  const c = await b.newContext(opt); const pg = await c.newPage(); const g = []; const errs = [];
  pg.on("pageerror", (e) => errs.push(e.message.slice(0, 60))); pg.on("response", async (r) => { if (r.url().includes("/api/google/")) g.push(r.url()); });
  await pg.route("**/*", (r) => new URL(r.request().url()).hostname === HOST ? r.continue({ headers: { ...r.request().headers(), ...H } }) : r.continue());
  for (const s of [...S4, "pandeli-fatih", "develi-atasehir"]) { const n = g.length; const rr = await pg.goto(`https://${HOST}/mekan/${s}/`, { waitUntil: "load", timeout: 60000 }); await pg.waitForTimeout(1500);
    const t = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, b: document.body.innerText, ld: [...document.querySelectorAll('script[type="application/ld+json"]')].length, can: document.querySelector('link[rel=canonical]')?.href, rob: document.querySelector('meta[name=robots]')?.content, link: !!document.querySelector('a[href*="google.com/maps/search"]') }));
    ok(`${dev} ${s}: sayfa, canonical, noindex yok, Haritalar bağlantısı`, rr.status() === 200 && t.can === `${W}/mekan/${s}/` && !t.rob && t.sw <= t.cw && t.link); if (S4.includes(s)) ok(`${dev} ${s}: sayfa Google içerik isteği yapmıyor`, g.length === n, `${g.length - n}`);
    await pg.screenshot({ path: `${OUT}/${dev}-${s}.png` }); }
  await pg.goto(`https://${HOST}/mekan/kronotrop-cihangir-beyoglu/`, { waitUntil: "load" }); await pg.waitForTimeout(1500); const x = await pg.evaluate(() => document.body.innerText); ok(`${dev} puan ve eşik`, x.includes("8,8") && /Eşik seç|DENEME EŞİĞİN|Deneme eşiğin/.test(x));
  console.log(`${dev}: sayfa hatası ${errs.length} ${[...new Set(errs)].join("|")}`); await c.close(); }
await b.close();
ok("sayaç değişmedi", JSON.stringify((await rj("google")).usage) === u0);
ok("demo korumalı", (await fetch("https://demo.gidenler.com/", { redirect: "manual" })).status === 302);
console.log(`SONUÇ ${res.filter(Boolean).length}/${res.length}`); if (res.includes(false)) process.exit(1);
