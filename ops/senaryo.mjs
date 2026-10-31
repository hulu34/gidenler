/* Pilot yolculuklar A, B, D, E · YALNIZ PREVIEW. Oturumlar test hesabıdır (Google girişi otomasyonla yapılmaz). Mobil = öykünme. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const HOST = process.env.PREVIEW_HOST, BASE = `https://${HOST}`, OUT = "out/senaryo"; mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const ad = `${BASE}/api/admin/db/`;
const son = []; const ok = (n, c, i = "") => { son.push([n, !!c]); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const admin = async (b) => { const r = await fetch(ad, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", confirm: "EVET", ...b }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const d = await (await fetch(ad, { headers: HB })).json();
ok("izolasyon", d.env === "preview" && d.db?.writeGuard?.ok === true); if (d.env !== "preview" || d.db?.writeGuard?.ok !== true) process.exit(1);
const hesap = async (mode) => (await admin({ action: "medya-test-oturum", mode })).j;
const U = await hesap(), V = await hesap();
const api = (p, { u, cookie, method = "GET", body } = {}) => fetch(`${BASE}${p}`, { method, body, redirect: "manual", headers: { ...HB, ...(u ? { cookie: `${u.cookieName}=${u.cookieValue}` } : cookie ? { cookie } : {}), ...(method !== "GET" ? { origin: BASE, "content-type": "application/json" } : {}) } });
const br = await chromium.launch();
const ctxOf = async (u, o) => { const c = await br.newContext(o); await yetkiliBaslik(c, HOST, { ...HB, "x-vercel-set-bypass-cookie": "true" }); if (u) await c.addCookies([{ name: u.cookieName, value: u.cookieValue, domain: HOST, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]); return c; };
const IP = { ...devices["iPhone 14"], defaultBrowserType: undefined }, AN = { ...devices["Pixel 7"], defaultBrowserType: undefined };
const hatalar = [];
/* A — yeni ziyaretçi */
for (const [ad2, o] of [["iphone-emulasyon", IP], ["android-emulasyon", AN], ["masaustu", { viewport: { width: 1366, height: 900 } }]]) {
  const c = await ctxOf(null, o), p = await c.newPage(); p.on("pageerror", (e) => hatalar.push(`A ${ad2}: ${e.message.slice(0, 140)}`));
  const ext = []; p.on("request", (r) => { const u = r.url(); if (/youtube\.com\/embed|googleapis|\/api\/google\/place.*part=media/.test(u)) ext.push(u); });
  await p.goto(BASE, { waitUntil: "networkidle" });
  const box = p.locator('main input[name="q"]');
  ok(`A ${ad2}: ilk ekranda arama`, await box.isVisible() && (await box.boundingBox()).y < 700);
  ok(`A ${ad2}: başlık aramasında yer tutucu tam`, ((await p.locator('header input[type="search"]').boundingBox()).width) > (o.viewport?.width > 800 ? 300 : 170));
  await box.fill("japon erdal"); await box.press("Enter"); await p.waitForURL(/\/ara\//); await p.waitForTimeout(500);
  const ilk = p.locator('main a[href*="/mekan/"]').first();
  ok(`A ${ad2}: aranan restoran ilk sonuç`, (await ilk.getAttribute("href")).includes("japon-erdal"));
  await p.screenshot({ path: `${OUT}/A-arama-${ad2}.png` });
  await ilk.click(); await p.waitForURL(/japon-erdal/); await p.waitForLoadState("networkidle");
  const kapak = p.locator('#fotograflar button[aria-label^="Fotoğrafı büyüt"] img').first();
  ok(`A ${ad2}: kapak ilk ekranda`, (await kapak.boundingBox()).y < (o.viewport?.height ?? 800) * 0.7, Math.round((await kapak.boundingBox()).y));
  ok(`A ${ad2}: kapak yüklendi`, await kapak.evaluate((i) => i.complete && i.naturalWidth > 0));
  await p.screenshot({ path: `${OUT}/A-profil-${ad2}.png` });
  const mn = p.locator('a[href="#menu"]').first(); ok(`A ${ad2}: Menü kısayolu`, await mn.isVisible()); await mn.click(); await p.waitForTimeout(500);
  ok(`A ${ad2}: menü bölümüne indi`, await p.locator("#menu").first().isVisible());
  ok(`A ${ad2}: sayfa açılışında oynatıcı ve Google fotoğraf devamı yok`, ext.length === 0, ext.length);
  const metin = (await p.locator("main").innerText()).replace(/\s+/g, " ");
  ok(`A ${ad2}: Seçki bağlantısı`, await p.locator('main a[href*="/seckisi/"]').count() > 0);
  ok(`A ${ad2}: altı video`, (await p.locator("[data-video], [data-rail-video]").count()) === 6 || (metin.match(/YouTube/g) ?? []).length >= 6, (metin.match(/YouTube/g) ?? []).length);
  ok(`A ${ad2}: Flu 44:42`, metin.includes("44:42"));
  ok(`A ${ad2}: yatay taşma yok`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await c.close();
}
/* B — yeni üye: durum kaydı ve kalıcılık */
{
  const c = await ctxOf(U, IP), p = await c.newPage(); p.on("pageerror", (e) => hatalar.push(`B: ${e.message.slice(0, 140)}`));
  await p.goto(`${BASE}/mekan/pandeli-fatih/`, { waitUntil: "networkidle" });
  const kay = p.getByRole("button", { name: "Kaydet" }).first(); await kay.click(); await p.waitForTimeout(1500);
  ok("B: Kaydet işaretlendi", (await kay.getAttribute("aria-pressed")) === "true");
  ok("B: hesapta saklandığı yazıyor", (await p.locator("main").innerText()).includes("Hesabında saklanıyor"));
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  ok("B: yenileyince duruyor", (await p.getByRole("button", { name: /Kaydet/ }).first().getAttribute("aria-pressed")) === "true");
  const c2 = await ctxOf(U, { viewport: { width: 1366, height: 900 } }), p2 = await c2.newPage(); await p2.goto(`${BASE}/mekan/pandeli-fatih/`, { waitUntil: "networkidle" }); await p2.waitForTimeout(2000);
  ok("B: başka cihazda da görünür (sunucu kaydı)", (await p2.getByRole("button", { name: /Kaydet/ }).first().getAttribute("aria-pressed")) === "true"); await c2.close();
  await p.getByRole("button", { name: /^(✓ )?Gittim$/ }).first().click(); await p.waitForTimeout(800);
  ok("B: Gittim deneyim sayısını değiştirmez", !/2 deneyim/.test((await p.locator("main").innerText())) );
  await p.screenshot({ path: `${OUT}/B-durum.png` }); await c.close();
}
/* deneyim API */
const gov = { body: "Senaryo testi için yazılmış örnek deneyim metni; öğlen gidildi ve servis hızlıydı, tekrar düşünülür.", visitMonth: new Date(Date.now() - 40 * 864e5).toISOString().slice(0, 7), overall: 7, ratings: {}, returnIntent: "evet", disclosure: "none" };
const SL = "efes-pide-ve-lahmacun-sisli";
const par = await Promise.all([1, 2, 3].map(() => api("/api/reviews/", { u: U, method: "POST", body: JSON.stringify({ slug: SL, ...gov }) })));
const st = par.map((r) => r.status);
ok("B: çift gönderimde tek deneyim", st.filter((x) => x === 200 || x === 201).length === 1, st.join());
const yid = (await Promise.all(par.map((r) => r.json().catch(() => ({}))))).find((j) => j.id)?.id;
ok("B: başkası deneyimi değiştiremez", [403, 404].includes((await api(`/api/reviews/${yid}/`, { u: V, method: "PATCH", body: JSON.stringify(gov) })).status));
ok("B: başkası deneyimi silemez", [403, 404].includes((await api(`/api/reviews/${yid}/`, { u: V, method: "DELETE" })).status));
ok("B: oturumsuz deneyim 401", (await api("/api/reviews/", { method: "POST", body: JSON.stringify({ slug: SL, ...gov }) })).status === 401);
ok("B: olmayan mekân reddedilir", (await api("/api/reviews/", { u: V, method: "POST", body: JSON.stringify({ slug: "uydurma-mekan", ...gov }) })).status >= 400);
ok("B: kendi deneyimini düzeltir", (await api(`/api/reviews/${yid}/`, { u: U, method: "PATCH", body: JSON.stringify({ ...gov, overall: 8 }) })).status === 200);
{ const h = await (await api(`/mekan/${SL}/?v=${Date.now()}`)).text(); ok("B: 'doğrulanmamış' etiketi", /doğrulanmamış/i.test(h)); ok("B: doğrulanmış denmiyor", !/ziyaret doğrulandı|doğrulanmış ziyaret/i.test(h)); }
/* D — hata */
ok("D: geçersiz oturum 401", (await api("/api/moderation/photos/", { cookie: `${U.cookieName}=sahte.imza` })).status === 401);
ok("D: imzası bozuk çerezle yükleme 401", (await api(`/api/reviews/${yid}/photos/`, { cookie: `${U.cookieName}=${U.cookieValue.slice(0, -4)}AAAA`, method: "POST", body: "{}" })).status === 401);
{ const c = await ctxOf(null, IP), p = await c.newPage(); const h = []; p.on("pageerror", (e) => h.push(e.message));
  await p.route(/\/media\/foto\//, (r) => r.abort()); await p.goto(`${BASE}/mekan/japon-erdal-beyoglu/`, { waitUntil: "load" }); await p.waitForTimeout(800);
  ok("D: görsel bozulsa da sayfa ayakta", (await p.locator("h1").innerText()).includes("Japon") && h.length === 0); await c.close();
  const c2 = await ctxOf(null, IP), p2 = await c2.newPage(); await p2.route(/\/api\/media\/status/, (r) => r.abort()); await p2.goto(`${BASE}/yaz/pidem-fatih/`, { waitUntil: "networkidle" });
  ok("D: depolama durumu alınamazsa form çalışır, yükleme alanı görünmez", await p2.locator('[aria-label="Deneyim metni"]').isVisible() && !(await p2.locator('#fotograf input[type="file"]').count())); await c2.close();
  const c3 = await ctxOf(null, IP), p3 = await c3.newPage(); await p3.goto(`${BASE}/ara/?q=zzzqqqwww`, { waitUntil: "networkidle" }); ok("D: sonuçsuz arama yol gösterir", (await p3.locator("main").innerText()).includes("eşleşme yok")); await p3.screenshot({ path: `${OUT}/D-bos-arama.png` }); await c3.close();
  const pl = await api("/api/google/place/?slug=pidem-fatih&part=cover"); console.log(`  Google kapalı/izinsiz kapak yanıtı: ${pl.status}`);
}
/* E — puan tutarlılığı */
{
  const SS = "ciya-sofrasi-kadikoy";
  const r0 = await (await api(`/mekan/${SS}/?v=${Date.now()}`)).text();
  const sen = await admin({ action: "puan-senaryo", slug: SS });
  ok("E: yayım senaryosu", sen.s === 200, sen.j.error ?? "");
  await new Promise((r) => setTimeout(r, 2500));
  const bilgi = await (await fetch(`${ad}?rapor=puan`, { headers: HB })).json().catch(() => ({}));
  const c = await ctxOf(null, { viewport: { width: 1366, height: 900 } }), p = await c.newPage();
  const txt = async (u) => { await p.goto(`${BASE}${u}${u.includes("?") ? "&" : "?"}v=${Date.now()}`, { waitUntil: "networkidle" }); await p.waitForTimeout(500); return (await p.locator("main").innerText()).replace(/\s+/g, " "); };
  const pr = await txt(`/mekan/${SS}/`);
  const m = pr.match(/Gidenler puanı\s*([0-9],[0-9])/);
  writeFileSync(`${OUT}/puan.json`, JSON.stringify({ sen: { s: sen.s, ok: sen.j.ok, results: sen.j.results }, bilgi: Object.keys(bilgi), once: /yeterli deneyim bekleniyor/.test(r0) }, null, 1));
  ok("E: profilde yayımlanmış puan", !!m, m?.[1] ?? pr.slice(0, 120));
  if (m) {
    const puan = m[1]; const has = async (u, re) => re.test(await txt(u));
    const esc = puan.replace(",", "[,.]");
    ok("E: arama aynı puan", await has("/ara/?q=çiya", new RegExp(`Çiya Sofrası[\\s\\S]{0,120}${esc}|${esc}[\\s\\S]{0,120}Çiya`)));
    ok("E: Keşfet aynı puan", await has("/kesfet/", new RegExp(`Çiya Sofrası[\\s\\S]{0,60}${esc}`)));
    ok("E: gerçek mekân listesi aynı puan", await has("/gercek/", new RegExp(`Çiya Sofrası[\\s\\S]{0,30}${esc}`)));
    ok("E: ana sayfa puanı tutarlı (görünüyorsa)", await (async () => { const t = await txt("/"); const x = t.match(/Çiya Sofrası[\s\S]{0,80}?([0-9],[0-9])/); return !x || x[1] === puan; })());
    const h = await (await api(`/mekan/${SS}/?v=${Date.now()}`)).text();
    const ld = [...h.matchAll(/application\/ld\+json">(.*?)<\/script>/gs)].map((x) => { try { return JSON.parse(x[1]); } catch { return null; } }).find((x) => x?.url?.includes("/mekan/"));
    ok("E: yapılandırılmış veri aynı puan", String(ld?.aggregateRating?.ratingValue).replace(".", ",") === puan, `${ld?.aggregateRating?.ratingValue}/${puan}`);
  }
  const es = await admin({ action: "esik-senaryo", slug: "leb-i-derya-beyoglu" });
  ok("E: eşik bildirimi senaryosu", es.s === 200 && es.j.ok === true, es.j.error ?? "");
  await c.close();
}
await br.close();
console.log(`JS hataları: ${hatalar.length}`); [...new Set(hatalar)].forEach((h) => console.log("  " + h));
writeFileSync(`${OUT}/sonuc.json`, JSON.stringify({ son, hatalar }, null, 1));
const k = son.filter((x) => !x[1]); console.log(`SONUÇ ${son.length - k.length}/${son.length}`); process.exit(k.length ? 1 : 0);
