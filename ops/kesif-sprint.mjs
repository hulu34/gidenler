/* KEŞİF SPRİNTİ · gerçek tarayıcı (Chromium; masaüstü 1440 + iPhone 390 öykünmesi). Önce = canlı www, sonra = Preview.
   Google istekleri kesilir; Google sekmesi YALNIZ sahte yanıtla (route) sınanır — gerçek Google çağrısı yok. Groq yok. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const PH = process.env.PREVIEW_HOST, LIVE = "www.gidenler.com", OUT = "out/sprint"; mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const DESK = { viewport: { width: 1440, height: 900 } };
const MOB = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" };
const b = await chromium.launch();
async function open(host, path, o, mockGoogle) {
  const ctx = await b.newContext(o); if (host !== LIVE) await yetkiliBaslik(ctx, host, HB);
  const g = { n: 0 };
  if (mockGoogle) await ctx.route(/\/api\/google\/puanlar/, async (r) => { const sl = JSON.parse(r.request().postData() ?? "{}").slugs ?? []; await r.fulfill({ json: { ratings: sl.map((s, i) => ({ slug: s, rating: [4.1, 4.7, 4.4, 3.9, 4.6][i % 5], count: 100 * (i + 1), mapsUri: "https://maps.google.com/?cid=1" })), limited: false } }); });
  await ctx.route(/googleapis\.com|\/api\/google\/place/, (r) => { g.n++; return r.abort(); });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message.slice(0, 80)));
  const r = await p.goto(`https://${host}${path}`, { waitUntil: "networkidle" }).catch(() => null); await p.waitForTimeout(1500);
  return { ctx, p, status: r?.status(), errs, g };
}
/* sayfadaki en büyük dikey boşluk (görünür bloklar arası) */
/* en büyük boş dikey şerit: sayfa 8 px adımlarla taranır; bir satırda içerikli (metin, görsel, düğme, çerçeveli kutu) hiçbir öğe yoksa boş sayılır.
   Başlık ile altbilgi arası ölçülür; altbilgi ve sayfa sonu hariç. */
const gap = (p) => p.evaluate(() => {
  const H = document.documentElement.scrollHeight, foot = document.querySelector("footer")?.getBoundingClientRect().top + scrollY || H;
  const top = (document.querySelector("header")?.getBoundingClientRect().bottom ?? 0) + scrollY;
  const filled = new Uint8Array(Math.ceil(H / 8));
  const all = document.querySelectorAll("body *");
  for (const el of all) {
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 2) continue;
    const content = el.matches("img,svg,video,iframe,button,input,textarea,canvas,hr") || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || (cs.borderTopWidth !== "0px" && cs.borderTopStyle !== "none") || (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && el !== document.body && r.height < 2000 && !/^(MAIN|DIV)$/.test(el.tagName) );
    if (!content) continue;
    const a = Math.floor((r.top + scrollY) / 8), b = Math.ceil((r.bottom + scrollY) / 8);
    for (let i = Math.max(0, a); i < Math.min(filled.length, b); i++) filled[i] = 1;
  }
  let max = 0, at = 0, run = 0;
  for (let i = Math.floor(top / 8); i < Math.floor(foot / 8); i++) { if (filled[i]) run = 0; else { run++; if (run * 8 > max) { max = run * 8; at = (i - run + 1) * 8; } } }
  return { max, at };
});
for (const [dev, o] of [["masaustu", DESK], ["mobil", MOB]]) {
  /* ÖNCE: canlı */
  for (const [ad, path] of [["ana", "/"], ["je", "/mekan/japon-erdal-beyoglu/"], ["fotosuz", "/mekan/halil-lahmacun-kadikoy/"], ["beny", "/mekan/beny-burger-house-ve-cafeteria-besiktas/"]]) {
    const x = await open(LIVE, path, o); await x.p.screenshot({ path: `${OUT}/once-${ad}-${dev}.png` });
    if (ad === "ana") { await x.p.locator("[data-ana-pano]").scrollIntoViewIfNeeded().catch(() => {}); await x.p.waitForTimeout(400); await x.p.screenshot({ path: `${OUT}/once-ana-pano-${dev}.png` }); }
    await x.ctx.close();
  }
  /* SONRA: Preview */
  const h = await open(PH, "/", o, true);
  ok(`${dev}: ana sayfa 200, Sor ilk ekranda`, h.status === 200 && (await h.p.locator("[data-ana-sor] textarea").boundingBox())?.y < o.viewport.height);
  await h.p.screenshot({ path: `${OUT}/sonra-ana-${dev}.png` });
  const hrefs = await h.p.evaluate(() => { const cols = [...document.querySelectorAll("[data-ana-pano] .home-board > *"), ...document.querySelectorAll("[data-ana-kesif]")];
    return cols.filter((x) => !/Sana göre/i.test(x.querySelector("h2")?.textContent ?? "")).flatMap((x) => [...x.querySelectorAll("a[href^='/mekan/']")].map((a) => a.getAttribute("href"))); });
  console.log("  · ana sayfa mekân bağlantıları:", JSON.stringify(hrefs));
  const uniq = new Set(hrefs);
  ok(`${dev}: ana sayfada aynı mekân iki kez yok (pano + vitrin)`, uniq.size === hrefs.length, `${hrefs.length} bağlantı, ${uniq.size} farklı`);
  const bos = await h.p.evaluate(() => ["popular", "rising", "talked"].map((k) => { const el = document.querySelector(`[data-pano-bos="${k}"]`); const col = el?.closest("section"); return [k, !!el, col ? col.querySelectorAll("a[href^='/mekan/']").length : -1]; }));
  ok(`${dev}: veri yoksa Popülerler/Yükselenler/Konuşulanlar dolgu listesi göstermez`, bos.every(([, e, n]) => !e || n === 0), JSON.stringify(bos));
  const kart = await h.p.locator("[data-ana-kesif-kart]").evaluateAll((xs) => xs.map((x) => !!x.querySelector("img")));
  ok(`${dev}: fotoğraflı vitrinde fotoğrafsız kart yok`, kart.length >= 4 && kart.every(Boolean), String(kart.length));
  await h.p.locator("[data-ana-pano]").scrollIntoViewIfNeeded(); await h.p.waitForTimeout(400); await h.p.screenshot({ path: `${OUT}/sonra-ana-pano-${dev}.png` });
  /* Google sekmesi (sahte yanıtla) */
  await h.p.locator('[data-puan-sekme="google"]').click(); await h.p.waitForTimeout(1200);
  const gl = await h.p.locator("[data-google-liste] li").allInnerTexts();
  const gtxt = await h.p.locator("[data-google-siralama]").innerText().catch(() => "");
  ok(`${dev}: Google sekmesi: 5 üzerinden, değerlendirme sayısı, Google Maps atfı, 'Gidenler puanı değildir'`, gl.length >= 3 && gl.every((t) => /\/5/.test(t) && /değerlendirme/.test(t)) && /Gidenler puanı değildir/.test(gtxt) && (await h.p.locator("[data-google-siralama] img, [data-google-siralama] svg").count()) > 0, `${gl.length} satır (SAHTE yanıt)`);
  const sorted = gl.map((t) => Number((t.match(/★\s*([\d,]+)/) ?? [])[1]?.replace(",", "."))); ok(`${dev}: Google listesi puana göre sıralı`, sorted.every((v, i) => i === 0 || v <= sorted[i - 1]), sorted.join(" "));
  await h.p.locator("[data-google-siralama]").scrollIntoViewIfNeeded(); await h.p.screenshot({ path: `${OUT}/sonra-google-sekmesi-${dev}-SAHTE.png` });
  ok(`${dev}: sayfa hatası yok, gerçek Google isteği yok`, h.errs.length === 0 && h.g.n === 0, `${h.errs.join("|")} g=${h.g.n}`);
  await h.ctx.close();
  /* profiller */
  for (const [ad, path, web] of [["je", "/mekan/japon-erdal-beyoglu/", false], ["fotosuz", "/mekan/halil-lahmacun-kadikoy/", false], ["beny", "/mekan/beny-burger-house-ve-cafeteria-besiktas/", true]]) {
    const x = await open(PH, path, o); await x.p.screenshot({ path: `${OUT}/sonra-${ad}-${dev}.png` });
    await x.p.screenshot({ path: `${OUT}/sonra-${ad}-${dev}-tam.png`, fullPage: true });
    const vh = o.viewport.height;
    const pos = async (sel) => (await x.p.locator(sel).first().boundingBox())?.y ?? 99999;
    const yaz = await pos('a[href^="/yaz/"]'), harita = await pos('[data-aksiyon="harita"]'), kaydet = await pos('button[data-sinyal="save"]');
    ok(`${dev} ${ad}: deneyim yaz, haritada aç, kaydet/gitmek istiyorum ilk iki ekranda`, Math.max(yaz, harita, kaydet) < vh * 2, `${Math.round(yaz)} ${Math.round(harita)} ${Math.round(kaydet)} / ${vh * 2}`);
    if (web) ok(`${dev} ${ad}: çalışan web sitesi bağlantısı görünür`, (await x.p.locator('[data-aksiyon="web"]').count()) === 1);
    const t = await x.p.evaluate(() => document.body.innerText);
    if (ad === "beny") ok(`${dev} beny: tür Burger`, /BURGER|Burger/.test(t) && !/^KAHVALTI/m.test(t));
    const gp = await gap(x.p); ok(`${dev} ${ad}: anlamsız büyük boşluk yok (< 160 px)`, gp.max < 160, `en büyük ${gp.max} px @${gp.at}`);
    ok(`${dev} ${ad}: hata yok`, x.status === 200 && x.errs.length === 0, x.errs.join("|"));
    await x.ctx.close();
  }
}
await b.close();
const k = res.filter((x) => !x).length; console.log(`SONUÇ ${res.length - k}/${res.length}`); process.exit(k ? 1 : 0);
