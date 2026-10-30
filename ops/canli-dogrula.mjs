/* CANLI · yalnız okuma: dört mekân. Test başlığı yok, hesap yok, /api/google engellenir (Places çağrısı tetiklenmez). Mobil Chromium emülasyonu; gerçek cihaz değil. */
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
const W = "https://www.gidenler.com", OUT = "out/canlidog"; mkdirSync(OUT, { recursive: true });
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const S = ["bafetto-pizza-kartal", "pidem-fatih", "ibb-eyupsultan-kent-lokantasi-eyupsultan", "maltepe-belediyesi-seyirtepe-sosyal-tesisleri-maltepe"];
const un = (s) => s?.replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
const lds = (h) => [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
const sm = await (await fetch(`${W}/sitemap.xml`)).text(); const locs = [...sm.matchAll(/<loc>([^<]+)/g)].map((m) => m[1]);
const old = readFileSync(new URL("./veri42/oncesi427.txt", import.meta.url), "utf8").split("\n").filter(Boolean);
ok("site haritası 431", locs.length === 431, `${locs.length}`); ok("eski 427 adresin hepsi var", old.length === 427 && old.every((u) => locs.includes(u)));
ok("yeni olanlar yalnız dört mekân", locs.filter((u) => !old.includes(u)).sort().join() === S.map((s) => `${W}/mekan/${s}/`).sort().join());
ok("Durusu haritada yok", !locs.some((u) => u.includes("durusu-club")));
const P = S.map((s) => JSON.parse(readFileSync(new URL(`./veri42/${s}.json`, import.meta.url), "utf8")));
for (const p of P) { const u = `/mekan/${p.slug}/`; const r = await fetch(W + u); const h = await r.text(); const L = lds(h)[0];
  ok(`${p.slug}: 200, canonical, noindex yok`, r.status === 200 && h.includes(`rel="canonical" href="${W}${u}"`) && !/<meta name="robots"/.test(h));
  ok(`  adres ilk HTML'de ve JSON-LD aynı`, un(h).includes(p.address.value) && L?.address?.streetAddress === p.address.value, L?.["@type"]);
  ok(`  koordinat işaretli, puan yok`, !!L?.geo && !L?.aggregateRating); }
{ const h = await (await fetch(`${W}/mekan/maltepe-belediyesi-seyirtepe-sosyal-tesisleri-maltepe/`)).text(); ok("Seyirtepe başlıkta Restoran", /<title>[^<]*· Restoran ·/.test(un(h)) && !/<title>[^<]*Burger/.test(h)); }
{ const h = await (await fetch(`${W}/mekan/durusu-club-restaurant-arnavutkoy/`)).text(); ok("Durusu dokunulmadı: adres vaadi ve JSON-LD yok", lds(h).length === 0 && !/Deli Yunus/.test(h) && !/durusu-restaurant/.test(h)); }
const b = await chromium.launch({ channel: "chrome" });
for (const [dev, opt] of Object.entries({ masaustu: { viewport: { width: 1280, height: 900 } }, mobil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } })) {
  const c = await b.newContext(opt); const pg = await c.newPage(); let g = 0; const errs = []; pg.on("pageerror", (e) => errs.push(e.message.slice(0, 70)));
  await pg.route("**/api/google/**", (r) => { g++; r.abort(); });
  for (const p of P) { await pg.goto(`${W}/mekan/${p.slug}/`, { waitUntil: "load", timeout: 60000 }); await pg.waitForTimeout(1500);
    const s = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, t: document.body.innerText, dir: [...document.querySelectorAll("a")].map((a) => a.href).find((x) => x.includes("google.com/maps/dir")) ?? null, tel: [...document.querySelectorAll('a[href^="tel:"]')].length }));
    const geo = s.dir?.match(/destination=([\d.]+),([\d.]+)/); ok(`${dev} ${p.slug}: taşma yok, adres görünür, yol tarifi koordinata`, s.sw <= s.cw && s.t.includes(p.address.value) && !!geo, `${s.sw}/${s.cw} ${geo?.[1]},${geo?.[2]}`);
    if (p.phone) ok(`${dev} ${p.slug}: telefon bağlantısı`, s.tel > 0);
    await pg.screenshot({ path: `${OUT}/${dev}-${p.slug}.png` }); }
  console.log(`${dev}: sayfa hatası ${errs.length} ${[...new Set(errs)].join(" | ")}; engellenen /api/google ${g}`); await c.close(); }
await b.close();
const d = await fetch("https://demo.gidenler.com/", { redirect: "manual" }); ok("demo korumalı", d.status === 302);
console.log(`SONUÇ ${res.filter(Boolean).length}/${res.length}`); if (res.includes(false)) process.exit(1);
