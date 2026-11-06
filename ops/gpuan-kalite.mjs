/* PREVIEW · veri kalitesi düzeltmesinin uçtan uca kontrolü (yalnız Preview veritabanı; Production'a dokunmaz).
   Örnek çalıştırmadan SONRA: yönetici kararı (ret + onay), yeniden aktarım, gizleme/geri açma, kapalı mekân görünürlüğü,
   yönetici rapor ekranı görüntüsü. Logda yalnız sayılar; ayrıntı şifreli çıktıda. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const HOST = process.env.PREVIEW_HOST, B = `https://${HOST}`, OUT = "out/gpuan/kalite";
mkdirSync(OUT, { recursive: true });
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const J = { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const A = `${B}/api/admin/google-puan/`;
const post = async (o) => { const r = await fetch(A, { method: "POST", headers: J, body: JSON.stringify({ target: "preview", confirm: "EVET", holder: "kalite-kontrol", ...o }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const rep = async () => (await (await fetch(`${A}?rapor=gunluk`, { headers: H })).json());
const page = async (p) => { const r = await fetch(`${B}${p}`, { headers: H }); return { s: r.status, t: await r.text() }; };
const hasG = (t) => /data-google-kayitli/.test(t);

const r0 = await rep(); writeFileSync(`${OUT}/rapor-once.json`, JSON.stringify(r0, null, 1));
ok("günlük rapor ucu", r0.env === "preview" && !!r0.final, JSON.stringify({ shown: r0.site?.shown, hidden: r0.site?.hidden }));
console.log("nihai", JSON.stringify(r0.final));
/* 1 · olumsuz kanıt gizledi mi: Adile Hanım Konağı ve Nostalji (otel) profillerinde Google puanı yok */
for (const s of ["adile-hanim-konagi-beyoglu", "nostalji-cafe-ve-restaurant-sile"]) { const p = await page(`/mekan/${s}/`); ok(`${s}: otel eşleşmesinin puanı gizli`, p.s === 200 && !hasG(p.t)); }
/* 2 · ret anında gizler (Pandeli üzerinde dene, sonra onayla geri aç) */
const pick = (arr, slug) => (arr ?? []).find((x) => x.slug === slug);
const target = process.env.KARAR_SLUG, tpid = process.env.KARAR_PID;
const before = await page(`/mekan/${target}/`);
ok(`${target}: önce puan görünüyor`, hasG(before.t));
const kr = await post({ op: "karar", slug: target, placeId: tpid, decision: "ret", note: "test: Preview karar akışı denemesi (ret)" });
ok("gerekçeli ret kabul edildi", kr.s === 200 && kr.j.ok, kr.s);
const kn = await post({ op: "karar", slug: target, placeId: tpid, decision: "onay", note: "kısa" });
ok("gerekçesiz karar reddedildi", kn.s === 400);
await new Promise((r) => setTimeout(r, 4000));
const mid = await page(`/mekan/${target}/`);
ok(`${target}: ret sonrası puan gizli`, !hasG(mid.t));
const ko = await post({ op: "karar", slug: target, placeId: tpid, decision: "onay", note: "test: Preview karar akışı denemesi (geri onay)" });
await post({ op: "kilit-al", ttl: 300 });
const son = await (await fetch(`${A}?dosya=son`, { headers: H })).headers.get("x-dosya-id");
const ak = await post({ op: "aktar", fileId: son });
await post({ op: "kilit-birak" });
await new Promise((r) => setTimeout(r, 4000));
const aft = await page(`/mekan/${target}/`);
ok("onay + yeniden aktarım puanı geri açtı", ko.j.ok && ak.s === 200 && hasG(aft.t), JSON.stringify({ unhidden: ak.j.unhidden, hidden: ak.j.hidden }));
/* 3 · bekleyen eşleşmeye onay: güçlü kanıtlı bir aday */
const pslug = process.env.ONAY_SLUG, ppid = process.env.ONAY_PID;
const pb = await page(`/mekan/${pslug}/`);
const po = await post({ op: "karar", slug: pslug, placeId: ppid, decision: "onay", note: "Preview: eşleştirici 46 m + adres eşleşti, Google tam görünümde aynı adres" });
await post({ op: "kilit-al", ttl: 300 }); const pk = await post({ op: "aktar", fileId: son }); await post({ op: "kilit-birak" });
await new Promise((r) => setTimeout(r, 4000));
const pa = await page(`/mekan/${pslug}/`);
ok(`${pslug}: bekleyen eşleşme onaydan önce görünmez, sonra görünür`, !hasG(pb.t) && po.j.ok && pk.s === 200 && hasG(pa.t), JSON.stringify({ written: pk.j.written }));
/* 4 · kalıcı kapalı (kesin): profil açık + not; ana sayfa ve Keşfet'te yok */
const cs = process.env.KAPALI_SLUG;
const cp = await page(`/mekan/${cs}/`); ok(`${cs}: profil korunur ve "kalıcı olarak kapandı" notu`, cp.s === 200 && /data-kapanis="kesin"/.test(cp.t));
const home = await page("/"), kes = await page("/kesfet/");
ok("kesin kapalı mekân ana sayfa ve Keşfet önerilerinde yok", !home.t.includes(`/mekan/${cs}/`) && !kes.t.includes(`/mekan/${cs}/`));
const sor = await fetch(`${B}/api/sor/`, { method: "GET", headers: H }); ok("Sor ucu çalışıyor (AI çağrısı yapılmadı)", sor.status === 200);
for (const p of ["/", "/kesfet/", "/ara/?q=bal%C4%B1k", "/sitemap.xml", "/mekan/japon-erdal-beyoglu/", "/seckisi/japon-erdal-dort-pide-bir-efsane/"]) { const r = await page(p); ok(`sayfa ${p}`, r.s === 200 && !/Application error/.test(r.t), r.s); }
const r1 = await rep(); writeFileSync(`${OUT}/rapor-sonra.json`, JSON.stringify(r1, null, 1));
console.log("sonra", JSON.stringify({ shown: r1.site?.shown, hidden: r1.site?.hidden, review: r1.review?.length, wrong: r1.wrong?.length }));

/* 5 · yönetici rapor ekranı (korumalı adres, salt okunur) */
const b = await chromium.launch({ channel: "chrome" });
for (const [dev, opt] of [["masaustu", { viewport: { width: 1440, height: 900 } }], ["mobil", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true }]]) {
  const ctx = await b.newContext({ ...opt, extraHTTPHeaders: { ...H, "x-vercel-set-bypass-cookie": "true" } });
  await ctx.route(/google(apis)?\.com|gstatic\.com/, (r) => r.abort());
  const p = await ctx.newPage();
  await p.goto(`${B}/yonetim/google-puan/`, { waitUntil: "networkidle", timeout: 60000 });
  ok(`${dev}: yönetici raporu açılıyor`, (await p.locator("[data-gpuan-rapor]").count()) === 1);
  await p.screenshot({ path: `${OUT}/${dev}-yonetici-raporu.png`, fullPage: dev === "masaustu" });
  await p.screenshot({ path: `${OUT}/${dev}-yonetici-raporu-ust.png` });
  await p.goto(`${B}/mekan/${cs}/`, { waitUntil: "networkidle", timeout: 60000 }); await p.screenshot({ path: `${OUT}/${dev}-kapali-profil.png` });
  await p.goto(`${B}/mekan/adile-hanim-konagi-beyoglu/`, { waitUntil: "networkidle", timeout: 60000 }); await p.screenshot({ path: `${OUT}/${dev}-adile-profil.png` });
  await ctx.close();
}
await b.close();
const www = await fetch("https://www.gidenler.com/yonetim/google-puan/"); ok("alan adında yönetici raporu kapalı (404)", www.status === 404, www.status);
const k = res.filter((x) => !x).length; console.log(`SONUÇ ${res.length - k}/${res.length}`); process.exit(k ? 1 : 0);
