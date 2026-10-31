/* Sor Gidenler arayüz testi · YALNIZ PREVIEW. Preview'da AI anahtarı yok: gerçek model denenmez, "AI kapalı" akışı sınanır. Google ve veritabanına yazım yok. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const HOST = process.env.SOR_HOST, BASE = `https://${HOST}`, OUT = "out/sor"; mkdirSync(OUT, { recursive: true });
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "x-vercel-set-bypass-cookie": "true" };
const sonuc = []; const ok = (n, c, i = "") => { sonuc.push([n, !!c]); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const br = await chromium.launch(); const hatalar = [];
for (const [ad, o] of [["mobil", { ...devices["iPhone 14"], defaultBrowserType: undefined }], ["masaustu", { viewport: { width: 1366, height: 900 } }]]) {
  const c = await br.newContext(o); await yetkiliBaslik(c, HOST, H); const p = await c.newPage(); const dis = [];
  p.on("pageerror", (e) => hatalar.push(`${ad}: ${e.message.slice(0, 160)}`)); p.on("request", (r) => { if (/googleapis|api\/google/.test(r.url())) dis.push(r.url()); });
  await p.goto(`${BASE}/sor/`, { waitUntil: "networkidle" }); await p.screenshot({ path: `${OUT}/${ad}-0-bos.png` });
  const sor = async (q) => { const n = await p.locator("[data-sor-tur]").count(); await p.getByLabel("Sorun").fill(q); await p.getByRole("button", { name: "Sor", exact: true }).click(); await p.locator("[data-sor-tur]").nth(n).locator("[data-sor-mod], [role=alert]").waitFor({ timeout: 20000 }); return p.locator("[data-sor-tur]").nth(n); };
  const t1 = await sor("Galata'da iyi bir Samsun pidesi yemek istiyorum.");
  ok(`${ad}: soru görünür`, (await t1.locator("[data-sor-soru]").innerText()).includes("Samsun"));
  const k1 = t1.locator("[data-sor-kart]").first();
  ok(`${ad}: Japon Erdal ilk kart`, (await k1.getAttribute("data-sor-kart")) === "japon-erdal-beyoglu");
  ok(`${ad}: Samsun gerekçesi`, /Samsun/.test(await k1.innerText()));
  ok(`${ad}: AI kapalı açıkça yazılı`, /AI yorumu şu an kapalı/.test(await t1.innerText()));
  await p.screenshot({ path: `${OUT}/${ad}-1-samsun.png` });
  const t2 = await sor("Ataşehir'de kebap");
  const kart = await t2.locator("[data-sor-kart]").count(); ok(`${ad}: Ataşehir kebap kartları`, kart >= 3 && /Ataşehir/.test(await t2.innerText()), kart);
  await p.screenshot({ path: `${OUT}/${ad}-2-kebap.png` });
  await p.getByRole("button", { name: "Daha ekonomik olsun" }).click(); await p.locator("[data-sor-tur]").nth(2).locator("[data-sor-mod]").waitFor({ timeout: 20000 });
  const t3 = await p.locator("[data-sor-tur]").nth(2).innerText();
  ok(`${ad}: takip bağlamı korur`, /Ataşehir/.test(t3) && /kebap/i.test(t3), t3.slice(0, 80));
  await p.getByRole("button", { name: "Başka semtte olsun" }).click(); await p.locator("[data-sor-tur]").nth(3).locator("[data-sor-mod]").waitFor({ timeout: 20000 });
  ok(`${ad}: başka semt, aynı mutfak`, /Kebap/i.test(await p.locator("[data-sor-tur]").nth(3).innerText()));
  await p.screenshot({ path: `${OUT}/${ad}-3-takip.png`, fullPage: true });
  ok(`${ad}: yatay taşma yok`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  /* karttan profile */
  await p.locator("[data-sor-kart=japon-erdal-beyoglu] a").first().click(); await p.waitForURL(/mekan\/japon-erdal-beyoglu/, { timeout: 15000 }); ok(`${ad}: kart profile gider`, true);
  /* sunucu hatası boş sonuç gibi görünmez */
  await p.goto(`${BASE}/sor/`, { waitUntil: "networkidle" }); await p.route("**/api/sor/**", (r) => r.fulfill({ status: 500, json: { error: "internal", message: "Sor Gidenler şu an yanıt veremedi; yeniden dene." } }));
  const te = await sor("Fatih'te döner"); ok(`${ad}: hata açık, sonuç yok denmez`, /yanıt veremedi/.test(await te.innerText()) && !/bulamadım/.test(await te.innerText()));
  await p.screenshot({ path: `${OUT}/${ad}-4-hata.png` }); await p.unroute("**/api/sor/**");
  /* yönlendirilen soru */
  await p.goto(`${BASE}/sor/?q=${encodeURIComponent("Çiya Sofrası")}`, { waitUntil: "networkidle" }); await p.locator("[data-sor-kart]").first().waitFor({ timeout: 20000 });
  ok(`${ad}: adresten gelen soru`, (await p.locator("[data-sor-kart]").first().getAttribute("data-sor-kart")) === "ciya-sofrasi-kadikoy");
  ok(`${ad}: Google çağrısı yok`, dis.filter((u) => !u.includes("japon-erdal")).length === 0, dis.length);
  await c.close();
  /* sunucunun dakika sınırı: cihazlar arasında pencere boşalır */
  await new Promise((r) => setTimeout(r, 65000));
}
await br.close(); console.log(`JS hataları: ${hatalar.length}`); hatalar.slice(0, 5).forEach((h) => console.log(" " + h));
const k = sonuc.filter((x) => !x[1]).length; console.log(`SONUÇ ${sonuc.length - k}/${sonuc.length}`); process.exit(k || hatalar.length ? 1 : 0);
