/* PREVIEW · Google kapalı görünüm. Üretime yazmaz, gerçek Google isteği yok (Preview'da kapalı; düğme testi sahte yanıtla).
   Test izni yalnız Preview veritabanında, tek mekân, işlem sonunda kapatılır. Görseller şifreli. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const HOST = process.env.SEO_HOST, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }, OUT = "out/gkapali", W = "https://www.gidenler.com"; mkdirSync(OUT, { recursive: true });
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const A = `https://${HOST}/api/admin/db/`, rj = async (q) => (await fetch(`${A}?rapor=${q}`, { headers: H })).json();
const post = async (b) => { const r = await fetch(A, { method: "POST", headers: { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", ...b }) }); return { r, j: await r.json().catch(() => ({})) }; };
const P0 = await rj("google-politika"); ok("Preview, Google kapalı", P0.env === "preview" && P0.enabled === false); if (P0.env !== "preview") process.exit(1);
ok("izin listesi boş", P0.policy?.allowedNow === 0, JSON.stringify(P0.policy));
const st = await post({ action: "redis-selftest", confirm: "EVET" }); for (const c of st.j.checks ?? []) ok(`Redis gerçek: ${c.name}`, c.ok, JSON.stringify(c.info ?? "")); ok("Redis öz testi tamam", st.j.ok === true);
/* 457 mekân: ilk HTML'de fotoğraf */
const gr = await (await fetch(`https://${HOST}/gercek/`, { headers: H })).text(); const slugs = [...new Set([...gr.matchAll(/href="\/mekan\/([^"/]+)\/"/g)].map((m) => m[1]))];
let withPhoto = [], noPhoto = 0, broken = [], box = 0;
for (const s of slugs) { const h = await (await fetch(`https://${HOST}/mekan/${s}/`, { headers: H })).text(); const mosaic = /<section aria-label="[^"]*fotoğrafları"/.test(h); if (mosaic) withPhoto.push(s); else noPhoto++; if (h.includes("yüklenemedi") || h.includes("Fotoğraf yükleme yakında")) box++; if (!mosaic && !h.includes("Henüz Gidenler fotoğrafı yok")) broken.push(s); }
console.log(`FOTO mekân ${slugs.length}, mozaikli ${withPhoto.length} [${withPhoto.join(",")}], fotoğrafsız şerit ${noPhoto}, eski metin ${box}, belirsiz ${broken.length}`);
ok("fotoğrafsız sayfada boş mozaik veya eski kutu yok", box === 0 && broken.length === 0);
const b = await chromium.launch({ channel: "chrome" });
const CMP = ["japon-erdal-beyoglu", "pandeli-fatih", "ismet-baba-uskudar", "beyti-lokanta-bakirkoy", "bafetto-pizza-kartal", "pidem-fatih", "ibb-eyupsultan-kent-lokantasi-eyupsultan", "maltepe-belediyesi-seyirtepe-sosyal-tesisleri-maltepe", "develi-atasehir", "barba-yani-adalar"];
const VP = { masaustu: { viewport: { width: 1280, height: 900 } }, mobil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } };
for (const [dev, opt] of Object.entries(VP)) { const c = await b.newContext(opt); const pg = await c.newPage(); const g = []; const errs = []; pg.on("request", (r) => { if (r.url().includes("/api/google/")) g.push(r.url()); }); pg.on("pageerror", (e) => errs.push(e.message.slice(0, 60)));
  await pg.route("**/*", (r) => new URL(r.request().url()).hostname === HOST ? r.continue({ headers: { ...r.request().headers(), ...H } }) : r.continue());
  for (const s of CMP) { await pg.goto(`https://${HOST}/mekan/${s}/`, { waitUntil: "load", timeout: 60000 }); await pg.waitForTimeout(1200);
    const t = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, imgs: [...document.querySelectorAll("main img")].filter((i) => i.naturalWidth === 0 && i.complete).length, tiles: document.querySelectorAll('section[aria-label$="fotoğrafları"] img').length, body: document.body.innerText, maps: !!document.querySelector('a[href*="google.com/maps/search"]'), nav: [...document.querySelectorAll("a[href='#fotograflar']")].length }));
    ok(`${dev} ${s}: taşma yok, kırık görsel yok, Haritalar bağlantısı`, t.sw <= t.cw && t.imgs === 0 && t.maps, `foto ${t.tiles}, nav ${t.nav}`); ok(`${dev} ${s}: Google düğmesi yok`, !t.body.includes("Google fotoğraflarını göster") && !t.body.includes("Google puanı, yorumları"));
    await pg.screenshot({ path: `${OUT}/${dev}-${s}.png` }); await pg.screenshot({ path: `${OUT}/${dev}-${s}-tam.png`, fullPage: true }); }
  ok(`${dev}: sayfa açılışlarında /api/google isteği 0`, g.length === 0, `${g.length}`); console.log(`${dev}: sayfa hatası ${errs.length} ${[...new Set(errs)].join("|")}`);
  await pg.goto(`https://${HOST}/mekan/kronotrop-cihangir-beyoglu/`, { waitUntil: "load" }); await pg.waitForTimeout(1200); const x = await pg.evaluate(() => document.body.innerText); ok(`${dev} puan ve eşik`, x.includes("8,8") && /Eşik seç|DENEME EŞİĞİN|Deneme eşiğin/.test(x)); await c.close(); }
/* Kullanıcı isteği: Preview'da tek test izni, Google yanıtı sahte */
const T = "pandeli-fatih";
const set = await post({ action: "google-policy-set", confirm: "POLITIKA", slugs: [T], mode: "izinli", priority: "A", why: "Preview arayuz denemesi, canli degil", admin: "preview-test", allowAuto: true }); ok("Preview test izni yazıldı", set.r.ok, set.j.auditId);
try { await new Promise((r) => setTimeout(r, 6000));
  const FAKE = { rating: 4.5, count: 10, mapsUri: "https://www.google.com/maps", hours: ["Pazartesi: test"], reviews: [{ author: "Test", rating: 5, text: "Sahte yanıt", when: "", translated: false }], photos: [], photoTotal: 0, total: 0, refs: [] };
  for (const [dev, opt] of Object.entries(VP)) { const c = await b.newContext(opt); const pg = await c.newPage(); let calls = 0;
    await pg.route("**/api/google/place/**", (r) => { calls++; r.fulfill({ json: FAKE }); });
    await pg.route("**/*", (r) => { const u = new URL(r.request().url()); if (u.pathname.includes("/api/google/place")) return r.fallback(); return u.hostname === HOST ? r.continue({ headers: { ...r.request().headers(), ...H } }) : r.continue(); });
    await pg.goto(`https://${HOST}/mekan/${T}/?t=${Date.now()}`, { waitUntil: "load", timeout: 60000 }); await pg.waitForTimeout(2000);
    const b0 = await pg.getByRole("button", { name: /Google puanı, yorumları/ }).count(); ok(`${dev}: izinli mekânda düğme var, açılışta çağrı 0`, b0 === 1 && calls === 0, `düğme ${b0}, çağrı ${calls}`);
    await pg.screenshot({ path: `${OUT}/${dev}-izinli-once.png` });
    if (b0) { await pg.getByRole("button", { name: /Google puanı, yorumları/ }).click(); await pg.waitForTimeout(1500); const t = await pg.evaluate(() => document.body.innerText); ok(`${dev}: tıklayınca tek istek, içerik görünür`, calls === 1 && t.includes("Sahte yanıt") , `çağrı ${calls}`); await pg.screenshot({ path: `${OUT}/${dev}-izinli-sonra.png`, fullPage: true }); }
    await c.close(); }
} finally { const off = await post({ action: "google-policy-set", confirm: "POLITIKA", slugs: [T], mode: "kapali", priority: "A", why: "Preview arayuz denemesi bitti", admin: "preview-test" }); ok("test izni geri kapatıldı", off.r.ok, off.j.auditId); }
const P1 = await rj("google-politika"); ok("izin listesi yine boş", P1.policy?.allowedNow === 0);
await b.close();
const sm = await (await fetch(`https://${HOST}/sitemap.xml`, { headers: H })).text(); const live = await (await fetch(`${W}/sitemap.xml`)).text(); const L = (x) => [...x.matchAll(/<loc>([^<]+)/g)].map((m) => m[1]); ok("site haritası korunuyor", L(live).every((u) => L(sm).includes(u)), `canlı ${L(live).length}, Preview ${L(sm).length}`);
ok("demo korumalı", (await fetch("https://demo.gidenler.com/", { redirect: "manual" })).status === 302);
console.log(`SONUÇ ${res.filter(Boolean).length}/${res.length}`); if (res.includes(false)) process.exit(1);
