/* Tanı · yalnız okuma: React #418 hidrasyon uyarısı Seçki'ye mi özgü, sitenin başka sayfalarında da var mı?
   Aynı Preview'da Seçki ve Seçki dışı sayfalar sırayla birkaç tur açılır; sayfa hataları adresiyle sayılır. */
import { chromium } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
/* CANLI=1: www.gidenler.com, test başlığı YOK, yalnız Seçki dışı sayfalar (Seçki canlıda kapalı). */
const CANLI = process.env.CANLI === "1";
/* ESKI=1: Seçki kodu içermeyen eski Preview (PROFIL_HOST), yalnız Seçki dışı sayfalar. */
const ESKI = process.env.ESKI === "1";
const HOST = CANLI ? "www.gidenler.com" : ESKI ? process.env.PROFIL_HOST : process.env.SECKI_HOST;
const HB = CANLI ? {} : { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "x-vercel-set-bypass-cookie": "true" };
const SECKI = CANLI || ESKI ? [] : ["/seckisi/", "/seckisi/pandeli-carsinin-ustundeki-mavi-salon/", "/seckisi/serden-mese-atesinin-karsisinda/", "/seckisi/en/efes-duatepede-tas-firin/"];
const DIGER = ["/", "/kesfet/", "/mekan/pandeli-fatih/", "/mekan/serden-erzurum-cag-kebabi-bahcelievler/", "/nasil-calisir/"];
const b = await chromium.launch({ channel: "chrome" });
const say = new Map(); const ziyaret = new Map();
for (const [dev, o] of [["masaustu", { viewport: { width: 1366, height: 900 } }], ["mobil-emulasyon", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
  const ctx = await b.newContext(o); if (!CANLI) await yetkiliBaslik(ctx, HOST, HB);
  const p = await ctx.newPage(); let cur = "";
  p.on("pageerror", (e) => { if (/#418|#423|#425|ydrat/.test(e.message)) { const k = `${dev} ${cur}`; say.set(k, (say.get(k) ?? 0) + 1); } });
  for (let tur = 0; tur < 4; tur++) for (const path of [...SECKI, ...DIGER]) {
    cur = path; ziyaret.set(path, (ziyaret.get(path) ?? 0) + 1);
    await p.goto(`https://${HOST}${path}`, { waitUntil: "networkidle" }).catch(() => {});
    await p.waitForTimeout(800);
  }
  await ctx.close();
}
await b.close();
const toplam = (list) => [...say].filter(([k]) => list.includes(k.split(" ")[1])).reduce((a, [, n]) => a + n, 0);
console.log(`hedef: ${CANLI ? "canlı (başlıksız)" : ESKI ? "eski Preview (Seçki kodu yok)" : "Seçki Preview"}`);
console.log(`ziyaret: her sayfa ${[...ziyaret.values()][0]} kez (2 görünüm × 4 tur)`);
for (const [k, n] of [...say].sort()) console.log(`  hidrasyon ${k}: ${n}`);
console.log(`SONUÇ Seçki sayfaları: ${toplam(SECKI)} uyarı / ${SECKI.length * 8} açılış · Seçki dışı: ${toplam(DIGER)} uyarı / ${DIGER.length * 8} açılış`);
