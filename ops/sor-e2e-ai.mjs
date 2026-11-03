/* Sor Gidenler arayüz testi · AI AÇIK · YALNIZ PREVIEW (Groq ücretsiz). Ekran görüntüsü ve arayüz kontrolü; kalite ölçümü sor-gercek'te.
   Cihaz başına 3 AI yanıtı: ücretsiz kotayı korumak için az soru. Google ve veritabanına yazım yok. */
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const HOST = process.env.SOR_HOST, BASE = `https://${HOST}`, OUT = "out/sorai-ekran"; mkdirSync(OUT, { recursive: true });
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "x-vercel-set-bypass-cookie": "true" };
const sonuc = []; const ok = (n, c, i = "") => { sonuc.push([n, !!c]); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const br = await chromium.launch(); const hatalar = [];
for (const [ad, o] of [["mobil", { ...devices["iPhone 14"], defaultBrowserType: undefined }], ["masaustu", { viewport: { width: 1366, height: 900 } }]]) {
  const c = await br.newContext(o); await yetkiliBaslik(c, HOST, H); const p = await c.newPage(); const dis = [];
  p.on("pageerror", (e) => hatalar.push(`${ad}: ${e.message.slice(0, 160)}`)); const groq = [], js = []; p.on("request", (r) => { if (/googleapis|api\/google/.test(r.url())) dis.push(r.url()); if (/groq\.com/.test(r.url())) groq.push(r.url()); });
  p.on("response", async (r) => { if (/\.js(\?|$)/.test(r.url()) || r.url().includes("/api/sor")) { try { js.push(await r.text()); } catch { /* akış */ } } });
  await p.goto(`${BASE}/sor/`, { waitUntil: "networkidle" });
  const sor = async (q) => { const n = await p.locator("[data-sor-tur]").count(); await p.getByLabel("Sorun").fill(q); await p.getByRole("button", { name: "Sor", exact: true }).click(); await p.locator("[data-sor-tur]").nth(n).locator("[data-sor-mod], [role=alert]").waitFor({ timeout: 45000 }); return p.locator("[data-sor-tur]").nth(n); };
  const rapor = async (t, etiket) => {
    const mod = await t.locator("[data-sor-mod]").getAttribute("data-sor-mod").catch(() => null);
    const kart = await t.locator("[data-sor-kart]").evaluateAll((e) => e.map((x) => x.getAttribute("data-sor-kart")));
    ok(`${ad}: ${etiket} yanıt geldi`, mod !== null, `mod=${mod} kart=${kart.join(",")}`);
    console.log(`  METİN ${ad} ${etiket}: ${(await t.innerText()).replace(/\s+/g, " ").slice(0, 700)}`);
    return mod;
  };
  const m1 = await rapor(await sor("Kadıköy'de arkadaşlarla akşam yemeği için iyi bir yer"), "kadıköy");
  ok(`${ad}: AI modu`, m1 === "ai", m1);
  await p.screenshot({ path: `${OUT}/${ad}-1-kadikoy.png` });
  await p.getByLabel("Sorun").fill("Daha ekonomik olsun"); await p.getByRole("button", { name: "Sor", exact: true }).click();
  await p.locator("[data-sor-tur]").nth(1).locator("[data-sor-mod], [role=alert]").waitFor({ timeout: 45000 });
  await rapor(p.locator("[data-sor-tur]").nth(1), "takip");
  await p.screenshot({ path: `${OUT}/${ad}-2-takip.png`, fullPage: true });
  await rapor(await sor("Beşiktaş'ta kahvaltı"), "beşiktaş");
  await p.screenshot({ path: `${OUT}/${ad}-3-besiktas.png`, fullPage: true });
  /* kapaklı kart: kayıtlı fotoğrafı olan mekân */
  await rapor(await sor("Galata'da Samsun pidesi"), "samsun");
  ok(`${ad}: kayıtlı kapak kartta görünür`, (await p.locator("[data-sor-kart=japon-erdal-beyoglu] [data-sor-kapak] img").count()) > 0);
  ok(`${ad}: puan uydurulmaz (yayımlanmış puan yoksa puan satırı yok)`, (await p.locator("[data-sor-puan]").count()) === 0 || /Gidenler puanı \d/.test(await p.locator("[data-sor-puan]").first().innerText()));
  await p.screenshot({ path: `${OUT}/${ad}-4-samsun.png`, fullPage: true });
  ok(`${ad}: tarayıcı Groq'a doğrudan istek atmaz`, groq.length === 0, groq.length);
  ok(`${ad}: sayfada, JS'te ve API yanıtında anahtar biçimi yok`, !js.some((t) => /gsk_[A-Za-z0-9]{20,}/.test(t)) && !/gsk_[A-Za-z0-9]{20,}/.test(await p.content()), js.length);
  ok(`${ad}: yatay taşma yok`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  ok(`${ad}: Google çağrısı yok`, dis.length === 0, dis.length);
  await c.close();
  await new Promise((r) => setTimeout(r, 65000));
}
await br.close(); console.log(`JS hataları: ${hatalar.length}`); hatalar.slice(0, 5).forEach((h) => console.log(" " + h));
const k = sonuc.filter((x) => !x[1]).length; console.log(`SONUÇ ${sonuc.length - k}/${sonuc.length}`); process.exit(k || hatalar.length ? 1 : 0);
