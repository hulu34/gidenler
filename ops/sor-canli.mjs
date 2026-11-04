/* Sor Gidenler Beta · CANLI kontrol (www.gidenler.com). Yazım yok. Google uçları test tarayıcısında engellenir (ücretli çağrı yok).
   Cihaz başına 3 soru (AI hakkından en çok 6). Ölçüm yalnız SOR_OLCUM_TOKEN ile okunur; değerler sayıdır. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";
const BASE = "https://www.gidenler.com", OUT = "out/sorcanli"; mkdirSync(OUT, { recursive: true });
const sonuc = []; const ok = (n, c, i = "") => { sonuc.push([n, !!c]); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };

/* 1) korunan yüzeyler: yalnız HTML (JavaScript çalışmaz, Google tetiklenmez) */
const html = async (p) => { const r = await fetch(BASE + p, { headers: { "user-agent": "Mozilla/5.0 GidenlerKontrol" } }); return [r.status, await r.text()]; };
{ const [s, t] = await html("/"); ok("ana sayfa 200", s === 200, s); }
{ const [s, t] = await html("/mekan/japon-erdal-beyoglu/"); ok("Japon Erdal profili 200 ve kendi kapağı", s === 200 && /media\/foto\/japon-erdal/.test(t), s); }
{ const [s, t] = await html("/seckisi/"); ok("Seçki 200", s === 200 && /Japon Erdal/.test(t), s); }
{ const [s, t] = await html("/sitemap.xml"); ok("site haritası 200", s === 200 && (t.match(/<loc>/g) ?? []).length > 400, (t.match(/<loc>/g) ?? []).length); }
{ const [s, t] = await html("/sor/"); ok("/sor 200, noindex korunur", s === 200 && /noindex/.test(t), s); }
{ const r = await fetch(BASE + "/api/sor/"); ok("durum ucu Production'da kapalı", r.status === 404, r.status); }
{ const r = await fetch(BASE + "/api/sor/olcum"); ok("ölçüm ucu anahtarsız açılmaz", r.status === 401 || r.status === 404, r.status); }
{ const r = await fetch("https://demo.gidenler.com/", { redirect: "manual" }); ok("yatırımcı demosu korumalı (değişmedi)", r.status === 302 || r.status === 401 || r.status === 403, r.status); }

/* 2) /sor mobil ve masaüstü */
const br = await chromium.launch(); const hatalar = [], kayit = [];
for (const [ad, o] of [["mobil", { ...devices["iPhone 14"], defaultBrowserType: undefined }], ["masaustu", { viewport: { width: 1366, height: 900 } }]]) {
  const c = await br.newContext(o); const p = await c.newPage(); const dis = [];
  await c.route(/googleapis\.com|\/api\/google/, (r) => { dis.push(r.request().url()); return r.abort(); });
  p.on("pageerror", (e) => hatalar.push(`${ad}: ${e.message.slice(0, 160)}`));
  await p.goto(`${BASE}/sor/`, { waitUntil: "networkidle" });
  ok(`${ad}: Beta etiketi ve açıklaması`, (await p.locator("[data-sor-beta]").count()) > 0 && (await p.locator("[data-sor-beta-not]").count()) > 0);
  await p.screenshot({ path: `${OUT}/${ad}-0-bos.png` });
  const sor = async (q) => { const n = await p.locator("[data-sor-tur]").count(); await p.getByLabel("Sorun").fill(q); await p.getByRole("button", { name: "Sor", exact: true }).click(); await p.locator("[data-sor-tur]").nth(n).locator("[data-sor-mod], [role=alert]").waitFor({ timeout: 45000 }); return p.locator("[data-sor-tur]").nth(n); };
  const sorular = ad === "mobil" ? ["Kadıköy'de balık", "kebap olmasın, pide olsun", "Galata'da Samsun pidesi"] : ["Beşiktaş'ta kahvaltı", "Fatih'te köfte", "Bodrum'da balık"];
  for (const [i, q] of sorular.entries()) {
    const t = await sor(q), mod = await t.locator("[data-sor-mod]").getAttribute("data-sor-mod").catch(() => null), metin = (await t.innerText()).replace(/\s+/g, " ");
    const etiketli = mod === "ai" ? (await t.locator("[data-sor-ai-etiket]").count()) > 0 : /AI yanıtı değil|AI yorumu şu an kapalı/.test(metin) || /yalnız İstanbul|Tarif vermiyorum/.test(metin);
    ok(`${ad}: "${q}" yanıt geldi ve modu açıkça yazılı`, mod !== null && etiketli, mod);
    kayit.push({ ad, q, mod, kart: await t.locator("[data-sor-kart]").evaluateAll((e) => e.map((x) => x.getAttribute("data-sor-kart"))), metin: metin.slice(0, 900) });
    await p.screenshot({ path: `${OUT}/${ad}-${i + 1}.png`, fullPage: true });
  }
  ok(`${ad}: yatay taşma yok`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  ok(`${ad}: Google ucu çağrılmadı`, dis.length === 0, dis.length);
  await c.close();
  await new Promise((r) => setTimeout(r, 30000));
}
await br.close();

/* 3) ölçüm */
if (process.env.SOR_OLCUM_TOKEN) {
  const r = await fetch(`${BASE}/api/sor/olcum/?gun=2`, { headers: { authorization: `Bearer ${process.env.SOR_OLCUM_TOKEN}` } });
  const j = await r.json().catch(() => null); ok("ölçüm ucu anahtarla okunur", r.status === 200 && !!j?.gunler, r.status);
  writeFileSync(`${OUT}/olcum.json`, JSON.stringify(j));
  ok("ölçümde kişisel veri ya da sorgu metni yok", !/Kadıköy|Samsun|\d+\.\d+\.\d+\.\d+/.test(JSON.stringify(j)));
}
writeFileSync(`${OUT}/kayit.json`, JSON.stringify(kayit));
console.log(`JS hataları: ${hatalar.length}`); hatalar.slice(0, 5).forEach((h) => console.log(" " + h));
const k = sonuc.filter((x) => !x[1]).length; console.log(`SONUÇ ${sonuc.length - k}/${sonuc.length}`); process.exit(k ? 1 : 0);
