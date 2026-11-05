/* DEMO BİRLEŞİMİ · Preview testi + karşılaştırma ekranları. Yazma YALNIZ Preview'un izole Neon dalına (geçiş 0005).
   Google: tarayıcıda kesilir; YALNIZ canlı Japon Erdal profilinde bir kez açık (puan ayrımını göstermek için; ücretsiz kota içinde).
   Groq kullanılmaz (soru gönderilmez). Log: doğru/yanlış ve sayılar. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const PH = process.env.PREVIEW_HOST, PB = `https://${PH}`, OUT = "out/birlesim"; mkdirSync(OUT, { recursive: true });
const LIVE = process.env.LIVE_HOST, DEMO = process.env.DEMO_HOST ?? "demo.gidenler.com", PRODDEP = process.env.PROD_DEPLOY;
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const ad = `${PB}/api/admin/db/`;
const admin = async (b) => { const r = await fetch(ad, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", confirm: "EVET", ...b }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const d = await (await fetch(ad, { headers: HB })).json().catch(() => ({}));
ok("izolasyon: Preview ve üretim dışı veritabanı", d.env === "preview" && d.db?.writeGuard?.ok === true, `env=${d.env}`);
if (d.env !== "preview" || d.db?.writeGuard?.ok !== true) process.exit(1);
const mg = await admin({ action: "migrate" });
ok("geçiş 0005 Preview'a uygulandı", mg.s === 200 && (mg.j.status?.pending ?? ["?"]).length === 0, JSON.stringify(mg.j.applied ?? mg.j.status?.pending ?? mg.j.error));
const b = await chromium.launch();
const MOB = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" };
const DESK = { viewport: { width: 1440, height: 900 } };
async function ctxFor(host, o, { googleOpen = false, cookieBypass = false } = {}) {
  const ctx = await b.newContext(o);
  if (cookieBypass) { await ctx.request.get(`https://${host}/`, { headers: { ...HB, "x-vercel-set-bypass-cookie": "true" } }); }
  else await yetkiliBaslik(ctx, host, HB);
  const g = { n: 0 }; if (!googleOpen) await ctx.route(/googleapis\.com|\/api\/google/, (r) => { g.n++; return r.abort(); });
  return { ctx, g };
}
async function shoot(host, path, o, name, opts = {}) {
  const { ctx, g } = await ctxFor(host, o, opts); const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message.slice(0, 80)));
  const r = await p.goto(`https://${host}${path}`, { waitUntil: "networkidle" }).catch(() => null); await p.waitForTimeout(1800);
  await p.screenshot({ path: `${OUT}/${name}-ilk.png` });
  await p.screenshot({ path: `${OUT}/${name}-tam.png`, fullPage: true });
  return { ctx, p, status: r?.status(), errs, g };
}
/* 1) demo ↔ yeni ana sayfa */
for (const [dev, o] of [["masaustu", DESK], ["mobil", MOB]]) {
  const dm = await shoot(DEMO, "/", o, `demo-ana-${dev}`, { cookieBypass: false }); await dm.ctx.close();
  const pv = await shoot(PH, "/", o, `yeni-ana-${dev}`);
  const p = pv.p;
  ok(`${dev}: Preview ana sayfa açılıyor, Sor ilk ekranda`, pv.status === 200 && (await p.locator("[data-ana-sor] textarea").boundingBox())?.y < o.viewport.height);
  const cols = await p.locator("[data-ana-pano] h2").allInnerTexts();
  ok(`${dev}: demo panosu 6 kolon, gerçek veriyle`, cols.length === 6, cols.join(" | "));
  ok(`${dev}: panoda "demo" etiketi yok`, !(await p.locator("[data-ana-pano]").innerText()).includes("DEMO") && (await p.locator('[data-ana-pano] [title^="Demo veri"]').count()) === 0);
  const bos = await p.locator("[data-pano-bos]").count(), satir = await p.locator("[data-ana-pano] a[href^='/mekan/']").count();
  ok(`${dev}: panoda gerçek mekân bağlantıları (boş kolonlarda kaynaklı seçki)`, satir >= 15, `bağlantı ${satir}, boş durumlu kolon ${bos}`);
  const kart = await p.locator("[data-ana-kesif-kart]").evaluateAll((xs) => xs.map((x) => !!x.querySelector("img")));
  ok(`${dev}: fotoğraflı vitrin yalnız fotoğraflı kartlar (4)`, kart.length >= 4 && kart.every(Boolean), `${kart.length}`);
  ok(`${dev}: ana sayfada Japon Erdal yok`, !/Japon Erdal/i.test(await p.evaluate(() => document.body.innerText)));
  await p.locator("[data-ana-pano]").scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/yeni-ana-${dev}-pano.png` });
  await p.locator("[data-ana-kesif]").scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/yeni-ana-${dev}-vitrin.png` });
  ok(`${dev}: sayfa hatası yok, Google isteği yok`, pv.errs.length === 0 && pv.g.n === 0, `${pv.errs.join("|")} g=${pv.g.n}`);
  await pv.ctx.close();
}
/* 2) Japon Erdal eski (canlı) ↔ yeni (Preview) */
for (const [dev, o] of [["masaustu", DESK], ["mobil", MOB]]) {
  const old = await shoot(PRODDEP, "/mekan/japon-erdal-beyoglu/", o, `je-eski-${dev}`); await old.ctx.close();
  const nw = await shoot(PH, "/mekan/japon-erdal-beyoglu/", o, `je-yeni-${dev}`);
  const m = await nw.p.evaluate(() => { const s = document.querySelector("[data-mozaik]"); return { mod: s?.getAttribute("data-mozaik"), imgs: [...(s?.querySelectorAll("img") ?? [])].slice(0, 3).map((i) => { const r = i.getBoundingClientRect(); return { w: r.width, h: r.height, nw: i.naturalWidth, nh: i.naturalHeight, src: (i.currentSrc || "").split("/").pop() }; }), dpr: devicePixelRatio }; });
  ok(`${dev}: JE fotoğrafları dikey düzende`, m.mod === "dikey", m.mod);
  const vis = m.imgs.filter((x) => x.nw > 0);
  ok(`${dev}: JE görünen karelerde büyütme yok (dosya ≥ ekran × dpr × 0,8)`, vis.length >= 1 && vis.every((x) => x.nw >= x.w * m.dpr * 0.8 || x.nw >= 1000), vis.map((x) => `${x.src} ${Math.round(x.w)}px←${x.nw}`).join(", "));
  ok(`${dev}: JE kare oranı fotoğrafa yakın (aşırı kırpma yok)`, vis.every((x) => Math.abs(x.w / x.h - x.nw / x.nh) < 0.25), vis.map((x) => `${(x.w / x.h).toFixed(2)}/${(x.nw / x.nh).toFixed(2)}`).join(" "));
  const t = await nw.p.evaluate(() => document.body.innerText);
  ok(`${dev}: JE kurucu açıklaması, Seçki, basın ve 6 video duruyor`, /kurucu/i.test(t) && (await nw.p.locator("#seckide").count()) === 1 && (await nw.p.locator("#h-basin").count()) === 1 && (await nw.p.locator("#seckide iframe, #seckide [data-video], #seckide button").count()) >= 6);
  ok(`${dev}: JE taş fırın iddiası yok`, !/taş fırın/i.test(t));
  ok(`${dev}: JE aksiyonları: deneyim yaz, yol tarifi, kaydet, gitmek istiyorum`, (await nw.p.locator('a[href*="/yaz/japon-erdal"]').count()) > 0 && (await nw.p.locator('a[href*="google.com/maps"]').count()) > 0 && (await nw.p.locator('button[data-sinyal="save"]').count()) >= 2);
  await nw.p.locator("[data-mozaik]").scrollIntoViewIfNeeded(); await nw.p.screenshot({ path: `${OUT}/je-yeni-${dev}-mozaik.png` });
  await nw.ctx.close();
}
/* 3) Google puanı ↔ Gidenler puanı: canlı JE profili, Google açık (tek görünüm, ücretsiz kota içinde) */
{
  const live = await shoot(LIVE, "/mekan/japon-erdal-beyoglu/", DESK, "puan-ayrimi-canli", { googleOpen: true });
  await live.p.waitForTimeout(2500); await live.p.screenshot({ path: `${OUT}/puan-ayrimi-canli-ilk.png` });
  const t = await live.p.evaluate(() => document.body.innerText);
  console.log("  · canlı JE: Google puanı görünüyor:", /Google Maps|Google Haritalar/.test(t), "· Gidenler puanı notu:", /Gidenler puanı/.test(t));
  await live.ctx.close();
}
/* 4) Sinyal: test başlıklı istek SAYILMAZ, bypass çerezli gerçek tarayıcı SAYILIR (Preview DB) */
{
  const before = await (await fetch(`${ad}?rapor=sinyal`, { headers: HB })).json().catch(() => ({}));
  const hd = await ctxFor(PH, MOB); const p1 = await hd.ctx.newPage(); await p1.goto(`${PB}/mekan/kanaat-lokantasi-uskudar/`, { waitUntil: "networkidle" }); await p1.waitForTimeout(5500); await hd.ctx.close();
  const mid = await (await fetch(`${ad}?rapor=sinyal`, { headers: HB })).json().catch(() => ({}));
  ok("sinyal: test erişim başlıklı ziyaret sayılmaz", (mid.byKind?.view ?? 0) === (before.byKind?.view ?? 0), `${before.byKind?.view ?? 0} → ${mid.byKind?.view ?? 0}`);
  const ck = await ctxFor(PH, MOB, { cookieBypass: true }); const p2 = await ck.ctx.newPage();
  await p2.goto(`${PB}/mekan/kanaat-lokantasi-uskudar/`, { waitUntil: "networkidle" }); await p2.waitForTimeout(5500);
  await p2.reload({ waitUntil: "networkidle" }); await p2.waitForTimeout(5500);
  await p2.locator('button[data-sinyal="save"]').nth(1).click().catch(() => {}); await p2.waitForTimeout(1500);
  const after = await (await fetch(`${ad}?rapor=sinyal`, { headers: HB })).json().catch(() => ({}));
  ok("sinyal: gerçek tarayıcı ziyareti sayılır, yenileme ikinci kez sayılmaz", (after.byKind?.view ?? 0) - (mid.byKind?.view ?? 0) === 1, `${mid.byKind?.view ?? 0} → ${after.byKind?.view ?? 0}`);
  ok("sinyal: gitmek istiyorum sayılır", (after.byKind?.save ?? 0) - (mid.byKind?.save ?? 0) === 1, `${mid.byKind?.save ?? 0} → ${after.byKind?.save ?? 0}`);
  ok("sinyal: tek ziyaretçiyle popüler liste oluşmaz", (after.boards?.popular ?? []).length === 0, JSON.stringify(after.boards?.reason));
  writeFileSync(`${OUT}/sinyal.json`, JSON.stringify({ before: before.byKind, after: after.byKind, boards: after.boards }, null, 1));
  await ck.ctx.close();
}
await b.close();
/* 5) Google maliyeti (yalnız okuma, canlı dağıtımın yönetim raporu) */
if (PRODDEP) {
  const g = await (await fetch(`https://${PRODDEP}/api/admin/db/?rapor=google`, { headers: HB })).json().catch(() => ({}));
  console.log("GOOGLE_KULLANIM", JSON.stringify({ env: g.env, usage: g.usage, spend: g.spend, pause: g.pause, stats: g.stats }));
}
const k = res.filter((x) => !x).length; console.log(`SONUÇ ${res.length - k}/${res.length}`); process.exit(k ? 1 : 0);
