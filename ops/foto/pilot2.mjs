/* PREVIEW · pilot 2: iyileştirilmiş tarama, ön inceleme, editör akışı. Üretime yazmaz. */
import { execFileSync } from "node:child_process"; import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const HOST = process.env.SEO_HOST, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }, OUT = "out/foto", A = `https://${HOST}/api/admin/db/`, W = "https://www.gidenler.com"; mkdirSync(OUT, { recursive: true });
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const rj = async (q) => (await fetch(`${A}?rapor=${q}`, { headers: H })).json();
const post = async (b) => { for (let t = 0; t < 3; t++) { try { const r = await fetch(A, { method: "POST", headers: { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin", connection: "close" }, body: JSON.stringify({ confirm: "EVET", target: "preview", ...b }) }); return { r, j: await r.json().catch(() => ({})) }; } catch (e) { await new Promise((x) => setTimeout(x, 3000)); } } return { r: { ok: false }, j: {} }; };
const env = (await rj("foto-adaylar")).env; ok("hedef preview", env === "preview", env); if (env !== "preview") process.exit(1);
execFileSync("node", ["ops/foto/foto-kesif.mjs", "ops/foto/pilot.json", `${OUT}/yeni.json`], { stdio: "pipe", maxBuffer: 1e8, env: { ...process.env, KESIF_COMMONS: "0" } });
const R = JSON.parse(readFileSync(`${OUT}/yeni.json`, "utf8")); const E = JSON.parse(readFileSync("ops/foto/etiket.json", "utf8")); const C = JSON.parse(readFileSync("ops/foto/commons-secili.json", "utf8"));
const yeniUrl = new Set(R.flatMap((r) => r.adaylar.map((a) => a.url))); const lab = Object.entries(E);
const bad = lab.filter(([, v]) => v.etiket[0] === "x"), good = lab.filter(([, v]) => v.etiket[0] !== "x");
console.log("OTOFILTRE", JSON.stringify({ yeniAday: yeniUrl.size, kotuEtiketli: bad.length, kotuElenen: bad.filter(([u]) => !yeniUrl.has(u)).length, iyiEtiketli: good.length, iyiKalan: good.filter(([u]) => yeniUrl.has(u)).length, etiketsizYeni: [...yeniUrl].filter((u) => !E[u]).length, adayliMekan: R.filter((r) => r.adaylar.length).length, durum: R.reduce((m, r) => (m[r.durum] = (m[r.durum] ?? 0) + 1, m), {}) }));
const TUR = { y: "yemek", i: "ic", d: "dis" };
const eski = JSON.parse(readFileSync("ops/foto/adaylar.json", "utf8")); const venues = [];
for (const r of eski) { const ad = r.adaylar.map((a) => { const l = E[a.url]?.etiket ?? ""; return l[0] === "x" ? { ...a, onInceleme: `red: ${l.slice(2)}` } : l ? { ...a, tur: TUR[l[0]], onInceleme: `gerçek ${TUR[l[0]]} görünümlü; şube ve hak doğrulanmadı` } : a; }); if (ad.length) venues.push({ slug: r.slug, subeKaniti: r.subeKaniti, adaylar: ad }); }
for (let i = 0; i < venues.length; i += 2) { const { r, j } = await post({ action: "photo-candidates-load", venues: venues.slice(i, i + 2) }); if (!r.ok) ok(`yükleme ${i}`, false, JSON.stringify(j)); }
for (const v of C) { const { r, j } = await post({ action: "photo-candidates-load", venues: [v] }); ok(`açık lisans yükleme ${v.slug}`, r.ok, JSON.stringify({ a: j.added, k: j.kept, m: j.missing, e: j.error, i: j.issues })); }
let L = (await rj("foto-adaylar")).candidates; let rej = 0;
for (const c of L) if (c.status === "pending" && String(E[c.url]?.etiket ?? "")[0] === "x") { const { r } = await post({ action: "photo-decide", id: c.id, decision: "reject", admin: "on-inceleme", why: `ön inceleme: ${E[c.url].etiket.slice(2)}` }); if (r.ok) rej++; }
L = (await rj("foto-adaylar")).candidates; console.log("HAVUZ", JSON.stringify({ toplam: L.length, red: rej, durum: L.reduce((m, c) => (m[c.status] = (m[c.status] ?? 0) + 1, m), {}), kaynak: L.reduce((m, c) => (m[c.meta.kaynakTuru ?? "site"] = (m[c.meta.kaynakTuru ?? "site"] ?? 0) + 1, m), {}) }));
writeFileSync(`${OUT}/havuz.json`, JSON.stringify(L));
const b = await chromium.launch({ channel: "chrome" });
for (const [dev, opt] of Object.entries({ masaustu: { viewport: { width: 1280, height: 900 } }, mobil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } })) { const ctx = await b.newContext(opt); const pg = await ctx.newPage(); await pg.route("**/*", (r) => new URL(r.request().url()).hostname === HOST ? r.continue({ headers: { ...r.request().headers(), ...H } }) : r.continue());
  await pg.goto(`https://${HOST}/yonetim/fotograflar/`, { waitUntil: "load", timeout: 60000 }); await pg.waitForSelector("[data-ozet]", { timeout: 20000 }); const sum = await pg.textContent("[data-ozet]"); ok(`${dev} editör özeti`, /aday/.test(sum), sum);
  await pg.selectOption('select[aria-label="Kaynak"]', "commons"); await pg.waitForTimeout(400); const sec = await pg.locator("[data-aday]").count(); ok(`${dev} kaynak filtresi`, sec >= 6 && sec < 40, `${sec}`); await pg.waitForTimeout(1500); await pg.screenshot({ path: `${OUT}/${dev}-editor-acik.png` });
  await pg.selectOption('select[aria-label="Kaynak"]', "site"); await pg.selectOption('select[aria-label="Tür"]', "yemek"); await pg.waitForTimeout(1500); await pg.screenshot({ path: `${OUT}/${dev}-editor-yemek.png` }); ok(`${dev} site adayı kanıt alanı boş`, (await pg.locator('input[aria-label="İzin kanıtı"]').first().inputValue()) === "");
  if (dev === "masaustu") { const f = pg.locator('input[aria-label="İzin kanıtı"]').first(); await pg.locator('button:has-text("Hak kaydıyla onayla")').first().click(); await pg.waitForTimeout(800); const same = (await rj("foto-onayli")).approved.length; ok("kanıtsız onay olmuyor", same === 0, `${same}`);
    await pg.selectOption('select[aria-label="Tür"]', "hepsi"); await pg.selectOption('select[aria-label="Kaynak"]', "commons"); await pg.fill('input[aria-label="Mekân ara"]', "Çukur"); await pg.waitForTimeout(500); const card = pg.locator("[data-aday]").filter({ hasText: "Ön inceleme: uygun: tabela" }).first(); ok("açık lisans kanıtı ön dolu", /CC BY-SA/.test(await card.locator('input[aria-label="İzin kanıtı"]').inputValue())); await card.locator('button:has-text("Hak kaydıyla onayla")').click(); await pg.waitForTimeout(2500);
    const ap = (await rj("foto-onayli")).approved; ok("editör onayı: yalnız seçilen görsel", ap.length === 1 && ap[0].slug === "cukur-meyhane-beyoglu", JSON.stringify(ap[0] ?? {}).slice(0, 200)); writeFileSync(`${OUT}/onayli.json`, JSON.stringify(ap)); }
  await ctx.close(); }
await b.close();
const pg = await (await fetch(`https://${HOST}/mekan/cukur-meyhane-beyoglu/`, { headers: H })).text(); ok("onay kapağı tek başına değiştirmez (arşive alınmadan yayın yok)", !pg.includes("commons.wikimedia.org/wiki/File:%C3%87ukur"));
ok("canlıda editör ekranı yok", (await fetch(`${W}/yonetim/fotograflar/`)).status === 404);
console.log(`SONUÇ ${res.filter(Boolean).length}/${res.length}`); if (res.includes(false)) process.exit(1);
