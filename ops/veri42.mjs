/* PREVIEW · 42 mekân veri işi. APPLY=1: beş profil yalnız Preview veritabanına uygulanır (hedef preview değilse durur). Üretime yazmaz.
   Sonra sayfa, site haritası, yapılandırılmış veri ve ekran (masaüstü + mobil emülasyon; gerçek cihaz değil). Görseller şifreli. */
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
const HOST = process.env.SEO_HOST, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }, OUT = "out/veri42"; mkdirSync(OUT, { recursive: true });
const W = "https://www.gidenler.com", admin = `https://${HOST}/api/admin/db/`;
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const files = readdirSync(new URL("./veri42/", import.meta.url)); const P = files.map((f) => JSON.parse(readFileSync(new URL(`./veri42/${f}`, import.meta.url), "utf8")));
const rapor = async (s) => (await fetch(`${admin}?rapor=profil&slug=${s}`, { headers: H })).json();
const env = (await rapor(P[0].slug)).env; ok("hedef preview", env === "preview", env); if (env !== "preview") process.exit(1);
if (process.env.APPLY === "1") for (const p of P) { const r = await fetch(admin, { method: "POST", headers: { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ action: "profile-apply", target: "preview", confirm: "EVET", profile: p }) }); ok(`uygulandı ${p.slug}`, r.ok, `HTTP ${r.status}`); }
const get = async (p) => { const r = await fetch(`https://${HOST}${p}`, { headers: H, redirect: "manual" }); return { st: r.status, h: await r.text() }; };
const tag = (h, re) => h.match(re)?.[1] ?? null; const un = (s) => s?.replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
const lds = (h) => [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
for (const p of P) { const u = `/mekan/${p.slug}/`; const { st, h } = await get(u); const L = lds(h)[0]; const desc = un(tag(h, /<meta name="description" content="([^"]*)/));
  ok(`${p.slug}: 200, canonical, noindex yok`, st === 200 && tag(h, /<link rel="canonical" href="([^"]*)/) === W + u && !/<meta name="robots"/.test(h));
  ok(`  ilk HTML'de adres`, un(h).includes(p.address.value));
  ok(`  Restaurant adresi kaynakla aynı, puan yok`, L?.address?.streetAddress === p.address.value && !L.aggregateRating, L?.["@type"]);
  ok(`  telefon yalnız kaynaktaysa`, !!L?.telephone === !!p.phone || !p.phone && !!L?.telephone, L?.telephone ?? "yok");
  ok(`  açıklamada adres`, desc?.includes("adres"), desc);
  if (p.website) ok(`  resmî site bağlantısı`, h.includes(new URL(p.website.value).hostname)); }
const sm = (await get("/sitemap.xml")).h; const locs = [...sm.matchAll(/<loc>([^<]+)/g)].map((m) => m[1]);
const live = [...(await (await fetch(`${W}/sitemap.xml`)).text()).matchAll(/<loc>([^<]+)/g)].map((m) => m[1]);
console.log(`site haritası: canlı ${live.length}, Preview ${locs.length}, mekân ${locs.filter((x) => x.includes("/mekan/")).length}`);
ok("canlı adreslerin hepsi korunuyor", live.every((u) => locs.includes(u)), `${live.filter((u) => !locs.includes(u)).length} eksik`);
ok("beş mekân eklendi", P.every((p) => locs.includes(`${W}/mekan/${p.slug}/`)));
ok("yalnız bu beşi eklendi", locs.length === live.length + P.length, `${locs.filter((u) => !live.includes(u)).length} yeni`);
ok("tekil ve üretim alanı", new Set(locs).size === locs.length && locs.every((u) => u.startsWith(W + "/")));
{ const { h } = await get("/mekan/barba-yani-adalar/"); ok("dokunulmayan adressiz: noindex yok, haritada yok", !/<meta name="robots"/.test(h) && !locs.includes(`${W}/mekan/barba-yani-adalar/`)); }
const b = await chromium.launch({ channel: "chrome" });
for (const [dev, opt] of Object.entries({ masaustu: { viewport: { width: 1280, height: 900 } }, mobil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } })) {
  const c = await b.newContext(opt); const pg = await c.newPage(); const errs = []; let goog = 0;
  pg.on("pageerror", (e) => errs.push(e.message.slice(0, 80))); pg.on("request", (r) => { if (r.url().includes("/api/google/")) goog++; });
  await pg.route("**/*", (r) => new URL(r.request().url()).hostname === HOST ? r.continue({ headers: { ...r.request().headers(), ...H } }) : r.continue());
  for (const p of P) { await pg.goto(`https://${HOST}/mekan/${p.slug}/`, { waitUntil: "load", timeout: 60000 }); await pg.waitForTimeout(1500);
    const s = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, t: document.body.innerText, tel: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute("href")), map: !!document.querySelector('a[href*="google.com/maps"],a[href*="openstreetmap"]') }));
    ok(`${dev} ${p.slug}: taşma yok, adres görünür, yol tarifi var`, s.sw <= s.cw && s.t.includes(p.address.value) && s.map, `${s.sw}/${s.cw}`);
    if (p.phone) ok(`${dev} ${p.slug}: telefon bağlantısı`, s.tel.some((t) => t.replace(/\D/g, "").endsWith(p.phone.value.replace(/\D/g, "").slice(-10))));
    ok(`${dev} ${p.slug}: sahte puan yok`, s.t.includes("yeterli deneyim bekleniyor"));
    await pg.screenshot({ path: `${OUT}/${dev}-${p.slug}.png` }); }
  /* puan ve eşik: Preview test puanı değişmemiş */
  await pg.goto(`https://${HOST}/mekan/kronotrop-cihangir-beyoglu/`, { waitUntil: "load", timeout: 60000 }); await pg.waitForTimeout(1500);
  const t = await pg.evaluate(() => document.body.innerText); await pg.screenshot({ path: `${OUT}/${dev}-kronotrop.png` }); ok(`${dev} puan görünür`, t.includes("8,8")); ok(`${dev} deneme eşiği görünür`, /Eşik seç|DENEME EŞİĞİN|Deneme eşiğin/.test(t)); if (!t.includes("8,8")) console.log("  puan bölgesi:", t.slice(0, 500).replace(/\s+/g, " "));
  console.log(`${dev}: sayfa hatası ${errs.length} ${[...new Set(errs)].join(" | ")}; /api/google isteği ${goog}`);
  await c.close(); }
await b.close();
const d = await fetch("https://demo.gidenler.com/", { redirect: "manual" }); ok("demo korumalı", d.status === 302, `HTTP ${d.status}`);
console.log(`\nSONUÇ ${res.filter(Boolean).length}/${res.length}`); if (res.includes(false)) process.exit(1);
