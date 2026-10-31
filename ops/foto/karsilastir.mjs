/* Karşılaştırma. Canlıda gerçek Google isteği YOK: /api/google yanıtı testte sahte görselle karşılanır, istek sunucuya gitmez.
   Yazma yalnız Preview veritabanına, Pandeli'nin deneme kaydını açmak için. */
import { mkdirSync, writeFileSync } from "node:fs"; import { chromium } from "playwright";
const HOST = process.env.SEO_HOST, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }, OUT = "out/kars", W = "www.gidenler.com", A = `https://${HOST}/api/admin/db/`; mkdirSync(OUT, { recursive: true });
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const pol = await (await fetch(`${A}?rapor=google-politika`, { headers: H })).json(); ok("Preview, Google kapalı", pol.env === "preview" && pol.enabled === false, JSON.stringify(pol.policy)); if (pol.env !== "preview") process.exit(1);
const u0 = JSON.stringify(pol.spend);
const set = await fetch(A, { method: "POST", headers: { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ action: "google-policy-set", confirm: "POLITIKA", target: "preview", slugs: ["pandeli-fatih"], mode: "izinli", priority: "A", why: "Preview karsilastirma, canli degil", admin: "preview-test", allowAuto: true }) }); ok("Pandeli Preview kaydı", set.ok); await new Promise((r) => setTimeout(r, 6000));
const V = ["japon-erdal-beyoglu", "pandeli-fatih", "yeni-lokanta-beyoglu", "balikci-sabahattin-fatih", "kanaat-lokantasi-uskudar", "cukur-meyhane-beyoglu", "viktor-levi-sarap-evi-kadikoy", "savoy-beyoglu", "pidem-fatih", "maltepe-belediyesi-seyirtepe-sosyal-tesisleri-maltepe"];
const svg = (t) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#c9d6c9"/><text x="600" y="380" font-size="54" text-anchor="middle" font-family="sans-serif">SAHTE TEST GÖRSELİ</text><text x="600" y="460" font-size="40" text-anchor="middle" font-family="sans-serif">${t}</text></svg>`;
const ph = (i) => ({ src: `https://sahte.test/g${i}.svg`, author: "Sahte", w: 1200, h: 800 });
const VIEW = { rating: 4.4, count: 100, mapsUri: "https://www.google.com/maps", hours: ["Pazartesi: test"], reviews: [{ author: "Sahte", rating: 5, text: "Sahte yorum", when: "", translated: false }], photos: [0, 1, 2, 3, 4].map(ph), photoTotal: 10, total: 10, refs: [] };
const COVER = { hours: [], reviews: [], photos: [ph(0)], photoTotal: 10, refs: [] };
const b = await chromium.launch({ channel: "chrome" }); const rows = [];
const VP = { masaustu: { viewport: { width: 1280, height: 900 } }, mobil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } };
async function shot(dev, host, slug, senaryo, fake) {
  const c = await b.newContext(VP[dev]); const pg = await c.newPage(); const calls = []; const errs = []; pg.on("pageerror", (e) => errs.push(e.message.slice(0, 40)));
  await pg.route("**/*", async (r) => { const u = new URL(r.request().url()); if (u.hostname === "sahte.test") return r.fulfill({ contentType: "image/svg+xml", body: svg(u.pathname) }); if (u.pathname.includes("/api/google/")) { calls.push(u.searchParams.get("part") ?? "post"); if (fake) return r.fulfill({ json: u.searchParams.get("part") === "cover" ? COVER : VIEW }); if (host === W) return r.abort(); } return u.hostname === HOST ? r.continue({ headers: { ...r.request().headers(), ...H } }) : r.continue(); });
  await pg.goto(`https://${host}/mekan/${slug}/`, { waitUntil: "load", timeout: 60000 }); await pg.waitForTimeout(1800);
  const t = await pg.evaluate(() => { const im = [...document.querySelectorAll('section[aria-label$="fotoğrafları"] img')]; const f = im[0]; const en = f ? performance.getEntriesByName(f.currentSrc)[0] : null; return { n: im.length, kaynak: f ? (f.currentSrc.includes("sahte.test") ? "sahte" : f.currentSrc.split("/").pop()) : null, kb: en ? Math.round(en.encodedBodySize / 1024) : null, gen: f?.naturalWidth ?? 0, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, y: f ? Math.round(f.getBoundingClientRect().top) : null, serit: document.body.innerText.includes("Henüz Gidenler fotoğrafı yok") }; });
  await pg.evaluate(() => { const f = document.querySelector('section[aria-label$="fotoğrafları"]') ?? document.querySelector("#fotograflar"); f?.scrollIntoView({ block: "center" }); }); await pg.waitForTimeout(500);
  await pg.screenshot({ path: `${OUT}/${slug}__${senaryo}__${dev}.png` }); rows.push({ slug, senaryo, dev, istek: calls, foto: t.n, kaynak: t.kaynak, kb: t.kb, gen: t.gen, serit: t.serit, tasma: t.sw > t.cw, hata: errs }); await c.close();
}
for (const slug of V) for (const dev of Object.keys(VP)) { await shot(dev, W, slug, "1-canli-model", true); await shot(dev, HOST, slug, "2-onerilen", true); await shot(dev, HOST, slug, "3-google-kapali", false); }
await b.close(); writeFileSync(`${OUT}/tablo.json`, JSON.stringify(rows, null, 1));
for (const r of rows) console.log("SATIR", r.slug.slice(0, 22), r.senaryo, r.dev, JSON.stringify(r.istek), r.foto, r.kaynak, r.kb, r.gen, r.serit ? "şerit" : "", r.tasma ? "TAŞMA" : "", r.hata.join("|"));
ok("önerilen modelde açılışta yalnız kapak isteği", rows.filter((r) => r.senaryo === "2-onerilen").every((r) => r.istek.every((p) => p === "cover") && r.istek.length <= 1));
ok("kendi kapağı olanda Google kapak isteği yok", rows.filter((r) => r.senaryo === "2-onerilen" && /japon|kanaat|cukur|viktor|savoy/.test(r.slug)).every((r) => r.istek.length === 0));
ok("Pidem ve Seyirtepe kapalı kayıtla çağrı yok", rows.filter((r) => r.senaryo === "2-onerilen" && /pidem|maltepe/.test(r.slug)).every((r) => r.istek.length === 0));
ok("Google kapalıyken kendi fotoğrafları görünür", rows.filter((r) => r.senaryo === "3-google-kapali" && /japon|kanaat|cukur|viktor|savoy/.test(r.slug)).every((r) => r.foto >= 1 && r.gen > 0));
ok("taşma yok", rows.every((r) => !r.tasma)); ok("sayaç değişmedi", JSON.stringify((await (await fetch(`${A}?rapor=google-politika`, { headers: H })).json()).spend) === u0);
const s = (await (await fetch(`https://${HOST}/sitemap.xml`, { headers: H })).text()), l = await (await fetch(`https://${W}/sitemap.xml`)).text(), loc = (x) => [...x.matchAll(/<loc>([^<]+)/g)].map((m) => m[1]); ok("site haritası korunuyor", loc(l).every((u) => loc(s).includes(u)), `${loc(l).length}/${loc(s).length}`);
const pu = await (await fetch(`https://${HOST}/mekan/kronotrop-cihangir-beyoglu/`, { headers: H })).text(); ok("puan ve eşik", pu.includes("8,8") && /[Dd]eneme eşiğin|DENEME/.test(pu));
ok("demo korumalı", (await fetch("https://demo.gidenler.com/", { redirect: "manual" })).status === 302);
console.log(`SONUÇ ${res.filter(Boolean).length}/${res.length}`); if (res.includes(false)) process.exit(1);
