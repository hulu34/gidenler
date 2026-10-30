/* PREVIEW · pilot: tarar (Actions'tan), iki tur (durum izleme), adayları yalnız Preview havuzuna yükler. Üretime yazmaz. */
import { execFileSync } from "node:child_process"; import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const HOST = process.env.SEO_HOST, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }, OUT = "out/foto", A = `https://${HOST}/api/admin/db/`, W = "https://www.gidenler.com"; mkdirSync(OUT, { recursive: true });
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const rj = async (q) => (await fetch(`${A}?rapor=${q}`, { headers: H })).json();
const env = (await rj("foto-adaylar")).env; ok("hedef preview", env === "preview", env); if (env !== "preview") process.exit(1);
const run = (o) => execFileSync("node", ["ops/foto/foto-kesif.mjs", "ops/foto/pilot.json", o, `${OUT}/durum.json`], { stdio: "pipe", maxBuffer: 1e8 }).toString();
const t0 = Date.now(); run(`${OUT}/adaylar.json`); const dk = ((Date.now() - t0) / 60000).toFixed(1);
const R = JSON.parse(readFileSync(`${OUT}/adaylar.json`, "utf8"));
const t1 = Date.now(); run(`${OUT}/ikinci.json`); const R2 = JSON.parse(readFileSync(`${OUT}/ikinci.json`, "utf8"));
console.log(`SURE ilk ${dk} dk, ikinci ${((Date.now() - t1) / 60000).toFixed(1)} dk; ikinci turda değişmeyen ${R2.filter((r) => r.durum === "degismedi").length}`);
const c = (f) => R.filter(f).length;
console.log("OZET", JSON.stringify({ taranan: R.length, sitesi: c((r) => r.website && r.durum !== "site_yok"), erisilen: c((r) => r.sayfa > 0), instagram: c((r) => r.instagramDogrulandi), aday: R.reduce((a, r) => a + r.adaylar.length, 0), adayliMekan: c((r) => r.adaylar.length), kaliteli: c((r) => r.adaylar.some((a) => a.puan >= 65 && !a.kopya)), kopya: R.reduce((a, r) => a + r.adaylar.filter((x) => x.kopya).length, 0), durum: R.reduce((m, r) => (m[r.durum] = (m[r.durum] ?? 0) + 1, m), {}) }));
for (let i = 0; i < R.length; i += 10) { const venues = R.slice(i, i + 10).map(({ slug, subeKaniti, adaylar }) => ({ slug, subeKaniti, adaylar })); const r = await fetch(A, { method: "POST", headers: { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ action: "photo-candidates-load", confirm: "EVET", target: "preview", venues }) }); const j = await r.json().catch(() => ({})); ok(`yükleme ${i}`, r.ok, JSON.stringify({ a: j.added, k: j.kept, m: j.missing, e: j.error, i: j.issues })); }
const L = (await rj("foto-adaylar")).candidates ?? []; console.log("HAVUZ", L.length, L.filter((x) => x.status === "pending").length);
ok("havuzda onaylı yok, hepsi bağlantı", L.every((x) => x.status === "pending"));
const b = await chromium.launch({ channel: "chrome" });
for (const [dev, opt] of Object.entries({ masaustu: { viewport: { width: 1280, height: 900 } }, mobil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } })) { const ctx = await b.newContext(opt); const pg = await ctx.newPage(); const errs = []; pg.on("pageerror", (e) => errs.push(e.message.slice(0, 50)));
  await pg.route("**/*", (r) => new URL(r.request().url()).hostname === HOST ? r.continue({ headers: { ...r.request().headers(), ...H } }) : r.continue());
  for (const s of ["viktor-levi-sarap-evi-kadikoy", "savoy-beyoglu", "japon-erdal-beyoglu", "pandeli-fatih", "ciya-sofrasi-kadikoy"]) { await pg.goto(`https://${HOST}/mekan/${s}/`, { waitUntil: "load", timeout: 60000 }); await pg.waitForTimeout(1200); const t = await pg.evaluate(() => ({ n: [...document.querySelectorAll('section[aria-label$="fotoğrafları"] img')].filter((i) => i.naturalWidth > 0).length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, ext: [...document.querySelectorAll('section[aria-label$="fotoğrafları"] img')].some((i) => !i.src.includes(location.host)) })); ok(`${dev} ${s}: taşma yok, dış kaynaklı kapak yok`, t.sw <= t.cw && !t.ext, `foto ${t.n}`); await pg.screenshot({ path: `${OUT}/${dev}-${s}.png` }); }
  await pg.goto(`https://${HOST}/yonetim/fotograflar/`, { waitUntil: "load", timeout: 60000 }); await pg.waitForTimeout(4000); const txt = await pg.evaluate(() => document.body.innerText); ok(`${dev} editör ekranı`, /Fotoğraf adayları/.test(txt) && /aday/.test(txt), txt.slice(txt.indexOf("mekân,") - 6, txt.indexOf("mekân,") + 30)); await pg.screenshot({ path: `${OUT}/${dev}-editor.png`, fullPage: false }); console.log(`${dev} sayfa hatası ${errs.length} ${[...new Set(errs)].join("|")}`); await ctx.close(); }
await b.close();
const pub = await (await fetch(`${W}/yonetim/fotograflar/`)).status; ok("canlıda editör ekranı yok", pub === 404, String(pub));
const sm = await (await fetch(`https://${HOST}/sitemap.xml`, { headers: H })).text(), live = await (await fetch(`${W}/sitemap.xml`)).text(), loc = (x) => [...x.matchAll(/<loc>([^<]+)/g)].map((m) => m[1]); ok("site haritası korunuyor", loc(live).every((u) => loc(sm).includes(u)), `${loc(live).length}/${loc(sm).length}`);
const g = await (await fetch(`https://${HOST}/mekan/kronotrop-cihangir-beyoglu/`, { headers: H })).text(); ok("puan yerinde", g.includes("8,8"));
ok("demo korumalı", (await fetch("https://demo.gidenler.com/", { redirect: "manual" })).status === 302);
console.log(`SONUÇ ${res.filter(Boolean).length}/${res.length}`); if (res.includes(false)) process.exit(1);
