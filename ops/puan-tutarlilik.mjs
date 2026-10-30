/* PREVIEW · gerçek puan bütün yüzeylerde aynı mı. Önce/sonra: test puanı yalnız Preview'ın kendi Neon dalında (puan-senaryo; üretimde reddedilir).
   Log yalnız slug ve sayı; görseller şifreli. Canlıda yalnız okuma: test verisi sızmadı mı. */
import { writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
const HOST = process.env.PUAN_HOST, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }, OUT = "out/puant"; mkdirSync(OUT, { recursive: true });
let SLUG, NAME; const WAIT = "Gidenler puanı için yeterli deneyim bekleniyor";
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const admin = `https://${HOST}/api/admin/db/`;
const post = (b) => fetch(admin, { method: "POST", headers: { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", confirm: "EVET", ...b }) });
const top = await (await fetch(admin, { headers: H })).json();
ok("Preview, ayrı veritabanı (yazma kilidi açık)", top.env === "preview" && top.db?.writeGuard?.ok, JSON.stringify(top.db?.writeGuard ?? {}).slice(0, 80));
if (!top.db?.writeGuard?.ok) { console.log("DUR"); process.exit(1); }
const b = await chromium.launch({ channel: "chrome" });
/* Önce/sonra için ana sayfada görünen ve hâlâ puansız bir gerçek mekân (Preview dalı önceki senaryoların puanlarını taşıyor). */
{
  const c = await b.newContext(); const p = await c.newPage();
  await p.route("**/*", (r) => new URL(r.request().url()).hostname === HOST ? r.continue({ headers: { ...r.request().headers(), ...H } }) : r.continue());
  await p.goto(`https://${HOST}/`, { waitUntil: "load", timeout: 60000 });
  const hit = await p.evaluate((w) => { const a = [...document.querySelectorAll('section[aria-labelledby="h-real"] a[href*="/mekan/"]')].find((x) => x.innerText.includes(w)); if (!a) return null; return { slug: a.getAttribute("href").split("/")[2], name: a.querySelector("span:nth-child(2)").innerText.trim() }; }, WAIT);
  await c.close();
  ok("ana sayfada puansız gerçek mekân kartı bekleme metniyle", !!hit, hit?.slug ?? "");
  if (!hit) process.exit(1);
  SLUG = hit.slug; NAME = hit.name;
}
const ctxs = { masaustu: { viewport: { width: 1280, height: 900 } }, mobil: { viewport: { width: 390, height: 844 }, isMobile: true } };
const pagesF = () => ({ detay: `/mekan/${SLUG}/`, kategori: "/kategori/restoran/?sirala=puan", arama: `/ara/?q=${encodeURIComponent(NAME)}`, gercek: "/gercek/", kesfet: "/kesfet/", ana: "/" });
async function snap(tag, dev, opt) {
  const c = await b.newContext(opt); const p = await c.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
  await p.route("**/*", (r) => new URL(r.request().url()).hostname === HOST ? r.continue({ headers: { ...r.request().headers(), ...H } }) : r.continue());
  const out = {};
  await p.goto(`https://${HOST}/mekan/${SLUG}/`, { waitUntil: "load", timeout: 60000 });
  const kat = await p.evaluate(() => document.querySelector('header nav a[href^="/kategori/"]')?.getAttribute("href"));
  for (const [k, path] of Object.entries({ ...pagesF(), kategori: `${kat}?sirala=puan` })) {
    await p.goto(`https://${HOST}${path}`, { waitUntil: "load", timeout: 60000 }); await p.waitForTimeout(1500);
    out[k] = await p.evaluate(({ NAME, SLUG }) => {
      const a = [...document.querySelectorAll(`a[href*="/mekan/${SLUG}/"]`)].find((x) => x.innerText.includes(NAME)); const li = a?.closest("li") ?? a;
      return { card: li?.innerText.replace(/\s+/g, " ").slice(0, 220) ?? null, body: document.body.innerText.slice(0, 60000), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
    }, { NAME, SLUG });
    await p.screenshot({ path: `${OUT}/${tag}-${dev}-${k}.png` });
    ok(`${tag} ${dev} ${k}: yatay taşma yok`, out[k].sw <= out[k].cw, `${out[k].sw}/${out[k].cw}`);
  }
  ok(`${tag} ${dev}: sayfa hatası yok`, errs.length === 0, errs.join(" | ").slice(0, 200));
  await c.close(); return out;
}
const once = await snap("once", "masaustu", ctxs.masaustu);
ok("önce: detay bekleme metni", once.detay.body.includes(WAIT));
ok("önce: arama kartı bekleme metni", (once.arama.card ?? "").includes(WAIT), once.arama.card ?? "");
ok("önce: 0 veya tahmini puan yok", !/Gidenler puanı\s*0/.test(once.detay.body));
const sc = await post({ action: "puan-senaryo", slug: SLUG }); const sj = await sc.json();
ok("puan-senaryo", sc.ok && sj.ok, `${sc.status} ${(sj.results ?? []).filter((x) => !x.ok).map((x) => x.name).join(";")}`);
const es = await post({ action: "esik-senaryo" }); const ej = await es.json();
ok("deneme eşiği senaryosu (alt, eşit, aşım, ilk puan, düşüş, eşzamanlı)", es.ok && ej.ok, `${es.status} ${(ej.results ?? []).length} adım; ${(ej.results ?? []).filter((x) => !x.ok).map((x) => x.name).join(";")}`);
const rp = await (await fetch(`${admin}?rapor=puan`, { headers: H })).json();
const row = rp.rows?.find((r) => r.slug === SLUG); const sc10 = row?.previous?.score ?? row?.score; const txt = sc10?.toFixed(1).replace(".", ",");
ok("raporda yayımlanmış puan", typeof sc10 === "number", JSON.stringify(row ?? {}).slice(0, 160));
/* tazelik ölçümü: yayından sonra detay ve kart listesi kaç istekte güncelleniyor */
for (let i = 0; i < 6; i++) {
  const t = async (u) => { const r = await fetch(`https://${HOST}${u}`, { headers: H }); const h = await r.text(); return `${h.includes(`${txt}`) && !h.includes(WAIT) ? "taze" : "eski"} (${r.headers.get("x-vercel-cache")})`; };
  console.log(`  tazelik ${i * 5}s · detay ${await t(`/mekan/${SLUG}/`)} · gercek ${await t("/gercek/")}`);
  await new Promise((r) => setTimeout(r, 5000));
}
for (const [dev, opt] of Object.entries(ctxs)) {
  const s = await snap("sonra", dev, opt);
  ok(`${dev} detay: ${txt}/10, kaynak Gidenler kullanıcıları`, s.detay.body.includes(`${txt}/10`) && s.detay.body.includes("Gidenler kullanıcılarının"));
  ok(`${dev} detay: bekleme metni yok`, !s.detay.body.includes(WAIT));
  for (const k of ["arama", "kategori"]) {
    ok(`${dev} ${k}: kart aynı puan, deneyim`, (s[k].card ?? "").replace(".", ",").includes(txt) && /deneyim/.test(s[k].card ?? "") && !(s[k].card ?? "").includes(WAIT), (s[k].card ?? "").slice(0, 130));
  }
  ok(`${dev} gerçek mekân listesi: aynı puan`, (s.gercek.card ?? "").includes(`${txt}/10`), (s.gercek.card ?? "").slice(0, 90));
  console.log(`  ${dev} keşfet kartı: ${(s.kesfet.card ?? "yok").slice(0, 100)} · ana sayfa: ${(s.ana.card ?? "yok").slice(0, 100)}`);
  ok(`${dev} ana sayfa: aynı puan`, (s.ana.card ?? "").includes(`${txt}/10`), (s.ana.card ?? "").slice(0, 110));
  for (const k of ["kesfet"]) if (s[k].card) ok(`${dev} ${k}: kart çelişmiyor`, !s[k].card.includes(WAIT), s[k].card.slice(0, 100));
  writeFileSync(`${OUT}/sonra-${dev}.json`, JSON.stringify(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.card]))));
}
await b.close();
const live = await (await fetch(`https://www.gidenler.com/mekan/${SLUG}/`)).text();
ok("canlıda test puanı görünmüyor", !live.includes(`${txt}/10`) && !live.includes("puan-test-"));
console.log(`\nSONUÇ ${res.filter(Boolean).length}/${res.length}`);
process.exit(res.every(Boolean) ? 0 : 1);
