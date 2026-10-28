/* Deneyim–grafik–puan tutarlılığı ve dönem ifadeleri (demo.gidenler.com, korumayı kaldırmadan). */
import { chromium } from "playwright";
const B = `https://${process.env.DEMO_HOST}`;
const H = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : undefined;
const b = await chromium.launch({ channel: "chrome" });
const page = await b.newPage({ viewport: { width: 1366, height: 900 }, extraHTTPHeaders: H, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" });
const res = []; const ok = (n, c, i = "") => { res.push(c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const txt = async (p) => { await page.goto(B + p, { waitUntil: "networkidle" }); return page.evaluate(() => document.body.innerText.replace(/\s+/g, " ")); };
let t = await txt("/mekan/moda-lokantasi/");
ok("Moda özet: son 12 ay / 182 deneyim, grafikle aynı", /Son 12 ayda 182 deneyimden/.test(t) && t.includes("son 12 ayın 182 deneyiminin 151'i"));
ok("Moda: örnek seçki etiketi", t.includes("Örnek seçki: 8 deneyim metni") && t.includes("bu yorumların ortalaması değildir"));
t = await txt("/mekan/koz-durum/");
ok("Köz özet: son üç ay 93 deneyim", /Son üç ayda 93 deneyimden/.test(t) && t.includes("93 deneyimin 86'sı olumlu"));
t = await txt("/mekan/sedef-kahvalti/"); t = (await page.locator("#ozet").innerText()).replace(/\s+/g, " ");
ok("Sedef özet: son üç ay, grafikle aynı pencere ve yön (+1,0)", /Son üç ayda 73 deneyimden/.test(t) && t.includes("Puan son üç ayda +1,0 yükseldi.") && !t.includes("200 deneyim"), (t.match(/Son 90 günde[^.]*\./) ?? [""])[0]);
t = await txt("/mekan/iskele-burger/"); t = (await page.locator("#ozet").innerText()).replace(/\s+/g, " ");
ok("İskele özet: son üç ay 167 deneyim, −0,9", /Son üç ayda 167 deneyimden/.test(t) && t.includes("Puan son üç ayda −0,9 geriledi.") && !t.includes("420 deneyim"));
t = await txt("/mekan/asma-teras/");
ok("Asma özet: 55 deneyim, manzara toplamda", /Son üç ayda 55 deneyimden/.test(t) && t.includes("toplamda 58 deneyim manzaradan"));
t = await txt("/demo/");
ok("/demo: örnek deneyim etiketi ve yükselen/düşen listeleri", (t.match(/ÖRNEK DENEYİM · SEÇKİDEN EN YENİ/gi) ?? []).length === 3 && t.includes("Tarçın Lokantası") && t.includes("Ekin Pide"));
ok("/demo: senaryo metni \"demo başlangıç puanı\"", t.includes("demo başlangıç puanından") && !/gerçek puan/i.test(t));
for (const p of ["/", "/demo/", "/kesfet/", "/mekan/moda-lokantasi/", "/mekan/koz-durum/", "/mekan/asma-teras/", "/mekan/tarcin-lokantasi/", "/mekan/iskele-burger/", "/isletme/moda-lokantasi/", "/nasil-calisir/"]) {
  const x = await txt(p);
  ok(`${p}: "90 gün" / "30 gün" ifadesi yok (zaman serisi kayıtlarından hesaplanıyor)`, !/\b(90|30) gün/i.test(x), (x.match(/.{0,40}\b(90|30) gün.{0,30}/i) ?? [""])[0]);
}
await b.close(); console.log(`${res.filter(Boolean).length}/${res.length}`); process.exit(res.every(Boolean) ? 0 : 1);
