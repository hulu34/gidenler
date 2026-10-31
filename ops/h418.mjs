/* #418 izleme: tekrarlı yükleme, her konsol hatası sayfa ve zamanla kaydedilir. Görünmemesi çözüldüğü anlamına gelmez. Yalnız okuma. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const HOST = process.env.PREVIEW_HOST, OUT = "out/h418"; mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "x-vercel-set-bypass-cookie": "true" };
const S = ["/", "/kesfet/", "/ara/?q=pide", "/mekan/japon-erdal-beyoglu/", "/mekan/pandeli-fatih/", "/mekan/pidem-fatih/", "/seckisi/", "/yaz/pidem-fatih/", "/benim/"];
const br = await chromium.launch(); const k = []; let n = 0;
for (const [ad, o] of [["mobil", { ...devices["iPhone 14"], defaultBrowserType: undefined }], ["masaustu", { viewport: { width: 1366, height: 900 } }]]) {
  for (let t = 0; t < 12; t++) for (const u of S) {
    const c = await br.newContext({ ...o, ...(t % 3 === 2 ? { timezoneId: "America/New_York", locale: "en-US" } : { timezoneId: "Europe/Istanbul", locale: "tr-TR" }) }); await yetkiliBaslik(c, HOST, HB); const p = await c.newPage();
    const rec = (m) => { if (/418|423|425|hydrat/i.test(m)) k.push({ u, ad, t, tz: t % 3 === 2 ? "NY/en" : "IST/tr", at: new Date().toISOString(), m: m.slice(0, 300) }); };
    p.on("pageerror", (e) => rec(e.message)); p.on("console", (x) => { if (x.type() === "error") rec(x.text()); });
    await p.goto(`https://${HOST}${u}`, { waitUntil: "networkidle" }).catch(() => {}); await p.waitForTimeout(300); n++; await c.close();
  }
}
await br.close(); writeFileSync(`${OUT}/kayit.json`, JSON.stringify(k, null, 1));
console.log(`yükleme ${n}, hydration hatası ${k.length}`); const by = {}; for (const x of k) by[`${x.u} ${x.tz}`] = (by[`${x.u} ${x.tz}`] ?? 0) + 1; console.log(JSON.stringify(by)); k.slice(0, 4).forEach((x) => console.log(x.m));
