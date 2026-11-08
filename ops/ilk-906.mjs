/* İLK KULLANICI · 906 PAKETİ (YALNIZ PREVIEW, izole Neon dalı). Yeni mekânlar deneyim akışına bağlanıyor mu?
   Aynı adlı şubeler semtiyle ayrılıyor mu? Yeni mekâna deneyim yazılabiliyor mu? Mükerrer öneri yakalanıyor mu? Log yalnız sayı. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const HOST = process.env.HOST, B = `https://${HOST}`, OUT = process.env.CIKTI ?? "out/ilk906";
mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const sonuc = [];
const ok = (n, c, i = "") => { sonuc.push([n, !!c]); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const admin = async (b) => { const r = await fetch(`${B}/api/admin/db/`, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", confirm: "EVET", ...b }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

const d = await (await fetch(`${B}/api/admin/db/`, { headers: HB })).json().catch(() => ({}));
ok("izolasyon: Preview ortamı ve üretim dışı veritabanı", d.env === "preview" && d.db?.writeGuard?.ok === true, `env=${d.env}`);
if (d.env !== "preview" || d.db?.writeGuard?.ok !== true) process.exit(1);
const mg = await admin({ action: "migrate" });
ok("geçişler Preview'a uygulandı", mg.s === 200 && (mg.j.status?.pending ?? ["?"]).length === 0);
const P = JSON.parse(readFileSync("ops/gpuan-paket-bin.json", "utf8"));
const td = await admin({ action: "seed", slugs: P.yeni.map((x) => x.slug) });
ok(`450 yeni mekân Preview veritabanına tohumlandı (eklenen ${td.j.inserted ?? "?"}, güncellenen ${td.j.updated ?? "?"})`, td.s === 200 && td.j.env === "preview" && (td.j.integrity?.ok ?? false));
const U = (await admin({ action: "medya-test-oturum" })).j;
const api = (p, { method = "GET", body } = {}) => fetch(`${B}${p}`, { method, body, headers: { ...HB, cookie: `${U.cookieName}=${U.cookieValue}`, ...(method !== "GET" ? { origin: B, "content-type": "application/json" } : {}) } });

/* şube ayrımı: API */
const pairs = [["kosebasi", ["kosebasi-kadikoy", "kosebasi-besiktas"]], ["ali ocakbasi", ["ali-ocakbasi-kadikoy", "ali-ocakbasi-beyoglu"]], ["filizler koftecisi", ["filizler-koftecisi-uskudar", "filizler-koftecisi-tuzla"]], ["saray muhallebicisi", ["saray-muhallebicisi-bakirkoy", "saray-muhallebicisi-atasehir"]]];
for (const [q, want] of pairs) {
  const j = await (await fetch(`${B}/api/ara/?q=${encodeURIComponent(q)}&limit=8`, { headers: HB })).json();
  const got = j.items.filter((i) => want.includes(i.slug));
  ok(`aynı ad iki şube: '${q}' → ${got.map((g) => g.district).join(" / ")}`, got.length === 2 && new Set(got.map((g) => g.district)).size === 2);
}

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, extraHTTPHeaders: HB, locale: "tr-TR" });
await ctx.addCookies([{ name: U.cookieName, value: decodeURIComponent(U.cookieValue), domain: HOST, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
const p = await ctx.newPage();
await p.goto(`${B}/nerede-yedin/?k=ic07`, { waitUntil: "networkidle" });
await p.fill("[data-son-yemek-girdi]", "kosebasi"); await p.waitForTimeout(1000);
const txt = await p.locator("[data-son-yemek-sonuc]").innerText().catch(() => "");
ok("akışta iki şube semt + adresle ayrılıyor", txt.includes("Kadıköy") && txt.includes("Beşiktaş"));
await p.screenshot({ path: `${OUT}/sube-390.png` });
const SL = "kosebasi-besiktas";
await Promise.all([p.waitForURL(`**/yaz/${SL}/`), p.click(`[data-son-yemek-sec='${SL}']`)]);
await p.fill("[data-deneyim-metin]", "Yeni eklenen şubeyi denedik: adana ve ezme çok iyiydi, servis hızlıydı; akşam kalabalıktı ama masamız çabuk hazırlandı.");
await p.click("[data-genel-puan] [aria-label='Genel puan: 9']"); await p.click("button[aria-pressed]:has-text('evet')");
await p.click("button:has-text('Deneyimi yayınla')");
await p.waitForSelector("text=Deneyimin yayınlandı", { timeout: 20000 }).catch(() => {});
ok("yeni (906 paketi) mekâna deneyim gerçekten kaydedildi", (await p.locator("text=Deneyimin yayınlandı").count()) + (await p.locator("text=Deneyimin incelemede").count()) > 0);
const mine = (await (await api(`/api/me/reviews/?slug=${SL}`)).json().catch(() => ({}))).reviews ?? [];
ok(`yeni mekânda tek kayıt (${mine.length})`, mine.length === 1);
const prof = await (await fetch(`${B}/mekan/${SL}/`, { headers: HB })).text();
ok("deneyim yeni mekânın profilinde görünüyor", prof.includes("Yeni eklenen şubeyi denedik"));
await p.goto(`${B}/nerede-yedin/oner/?ad=${encodeURIComponent("Köşebaşı")}`, { waitUntil: "networkidle" });
await p.selectOption("[data-oneri-ilce]", "Beşiktaş"); await p.click("button:has-text('Öneriyi gönder')");
await p.waitForSelector("[data-oneri-eslesme]", { timeout: 10000 }).catch(() => {});
ok("906 paketindeki mekân önerilince 'bu mu?' sorulur", (await p.locator("[data-oneri-eslesme]").innerText().catch(() => "")).includes("Köşebaşı"));
for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: m ? 2 : 1, isMobile: m, extraHTTPHeaders: HB });
  const q = await c.newPage(); const t = Date.now(); await q.goto(`${B}/`, { waitUntil: "load" }); const lt = Date.now() - t;
  const js = await q.evaluate(() => performance.getEntriesByType("resource").filter((e) => e.initiatorType === "script").reduce((a, e) => a + (e.transferSize || 0), 0));
  ok(`906 ana sayfa ${w}: yükleme ${lt} ms, betik aktarımı ${Math.round(js / 1024)} kB`, lt < 8000);
  await q.screenshot({ path: `${OUT}/ana-906-${w}.png` }); await c.close();
}
await browser.close();
const ts = [];
for (const q of ["kebap", "kosebasi", "ali ocakbasi", "balik", "meyhane", "pide", "intiba", "sinop manti", "kahvalti", "lahmacun"]) { const s = Date.now(); await fetch(`${B}/api/ara/?q=${encodeURIComponent(q)}&limit=8`, { headers: HB }); ts.push(Date.now() - s); }
ts.sort((a, b) => a - b); ok(`906 arama API medyan ${ts[5]} ms, en kötü ${ts[9]} ms`, ts[5] < 1500);
writeFileSync(`${OUT}/sonuc.json`, JSON.stringify(sonuc, null, 1));
const k = sonuc.filter(([, c]) => !c).length;
console.log(`\n906 PAKETİ E2E: ${sonuc.length - k}/${sonuc.length} geçti`);
process.exit(k ? 1 : 0);
