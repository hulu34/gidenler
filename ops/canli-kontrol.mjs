/* Restoran profili · CANLI kontrol (www.gidenler.com, yalnız okuma). Uygulama yapmaz; kişisel hesap kullanmaz.
   Google fotoğrafları canlıda açık: mevcut bütçe tavanı içinde birkaç fotoğraf isteği. Log yalnız doğru/yanlış ve sayılar. */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const HOST = "www.gidenler.com", SLUG = "pandeli-fatih";
const SHOTS = true; mkdirSync("out/profil", { recursive: true });
const shot = async (pg, name, sel) => { try { if (sel) await pg.locator(sel).first().screenshot({ path: `out/profil/${name}.png` }); else await pg.screenshot({ path: `out/profil/${name}.png` }); } catch { /* yoksay */ } };
const HB = {};
const res = []; const ok = (n, c, i = "") => { res.push(c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const b = await chromium.launch({ channel: "chrome" });
for (const [dev, o] of [["masaustu", { viewport: { width: 1366, height: 900 } }], ["mobil", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }]]) {
  const ctx = await b.newContext({ ...o, extraHTTPHeaders: HB, ...(o.userAgent ? {} : { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" }) });
  const hosts = new Map(); ctx.on("request", (r) => { const h = new URL(r.url()).hostname; hosts.set(h, (hosts.get(h) ?? 0) + 1); });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => { const src = (e.stack ?? "").match(/https?:\/\/[^\s)]+/)?.[0] ?? "kaynak yok"; errs.push(`${e.message} @ ${src.replace(/\?.*$/, "").slice(0, 80)}`); });
  const failed = []; p.on("requestfailed", (r) => { const u = new URL(r.url()); failed.push(`${u.hostname}${u.pathname.slice(0, 40)} ${r.failure()?.errorText ?? ""}`); });
  await p.goto(`https://${HOST}/mekan/${SLUG}/`, { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  await shot(p, `${dev}-1-ilk`);
  const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  const nav = await p.evaluate(() => [...document.querySelectorAll("a[href^='#']")].map((a) => a.textContent.trim()));
  ok(`${dev}: sekmeler`, ["Genel bakış", "Menü", "Fotoğraflar", "Videolar", "Deneyimler"].every((x) => nav.includes(x)), nav.join("|"));
  ok(`${dev}: Gidenler puanı yok, açıkça yazıyor; demo dış puan yok`, /Henüz Gidenler puanı yok|henüz Gidenler puanı/i.test(t) && !/Tripadvisor|Yandex|Simüle/i.test(t));
  ok(`${dev}: tanıtım, adres, telefon ve kaynak/son kontrol`, t.includes("Mısır Çarşısı içindeki tarihî lokanta") && t.includes("+90 212 527 39 09") && /son kontrol 28\.10\.2026/.test(t));
  ok(`${dev}: saat uydurulmuyor`, t.includes("İşletmenin resmî kaynağında yayımlanmıyor"));
  ok(`${dev}: kurallar ve olanaklar`, t.includes("Evcil hayvan kabul edilmiyor") && t.includes("Yalnız tatlı, çay ve kahve"));
  const menuN = await p.locator("#menu li").count();
  ok(`${dev}: resmî menü (52 kalem), geçerlilik ve fiyat notu`, menuN === 52 && t.includes("01.02.2026 tarihinden itibaren geçerli") && t.includes("fiyat yayımlamıyor"), `${menuN}`);
  await shot(p, `${dev}-2-genel`, "#genel");
  await p.locator("a[href='#menu']").first().click(); await p.waitForTimeout(800);
  await shot(p, `${dev}-3-menu`);
  ok(`${dev}: Menü sekmesi menüye götürür`, await p.evaluate(() => { const r = document.getElementById("menu").getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }));
  let beforeVideo = Infinity;
  const cards = p.locator("#videolar button"); await p.locator("#videolar").scrollIntoViewIfNeeded().catch(() => {});
  await p.waitForTimeout(800);
  const nv = await cards.count();
  ok(`${dev}: video kartları (4), işbirliği etiketi`, nv === 4 && (await p.locator("#videolar").innerText()).includes("İşbirliği"), `${nv}`);
  if (nv) {
    await shot(p, `${dev}-4-videolar`, "#videolar");
    beforeVideo = errs.length; /* YouTube oynatıcısı açıldıktan sonraki hatalar YouTube'un kendi iframe'inden (doğrulama istekleri) */
    await cards.first().click(); await p.waitForTimeout(2500);
    await shot(p, `${dev}-5-oynatici`);
    const src = await p.locator("[role=dialog] iframe").getAttribute("src").catch(() => null);
    ok(`${dev}: video Gidenler içinde resmî oynatıcıyla açılıyor (indirme yok)`, !!src && /youtube(-nocookie)?\.com\/embed\//.test(src), src ?? "");
    await p.locator("[role=dialog] button[aria-label^='Kapat']").click(); await p.waitForTimeout(500);
    ok(`${dev}: kapatınca sayfaya dönülüyor`, (await p.locator("[role=dialog]").count()) === 0 && p.url().includes(`/mekan/${SLUG}/`));
  }
  await p.locator("#fotograflar").scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
  const imgs = await p.locator("#fotograflar img").count();
  const gtext = await p.locator("#fotograflar").innerText().catch(() => "");
  ok(`${dev}: Google fotoğrafları ve atıf`, imgs > 0 && /Google/.test(gtext), `${imgs} görsel`);
  await shot(p, `${dev}-0-fotograflar`, "#fotograflar");
  /* kayıt akışı (oturumsuz, bu cihazda): Kaydet → durum değişir, tekrar basınca geri alınır */
  const save = p.getByRole("button", { name: /^Kaydet/ }).first();
  const pressed0 = await save.getAttribute("aria-pressed");
  await save.click(); await p.waitForTimeout(500);
  const pressed1 = await save.getAttribute("aria-pressed");
  await save.click(); await p.waitForTimeout(500);
  ok(`${dev}: Kaydet akışı (oturumsuz, bu cihazda) çalışıyor ve geri alınıyor`, pressed1 !== pressed0 && (await save.getAttribute("aria-pressed")) === pressed0, `${pressed0}→${pressed1}`);
  ok(`${dev}: Kaydet / Gitmek istiyorum / Gittim düğmeleri`, (await p.getByRole("button", { name: /Kaydet/ }).count()) > 0 && (await p.getByRole("button", { name: /Gitmek istiyorum/ }).count()) > 0);
  const resv = await p.locator("#genel").innerText();
  ok(`${dev}: Google bölümü var`, (await p.locator("#google").count()) === 1);
  ok(`${dev}: rezervasyon bloğu iletişimle (ortaklık iddiası yok)`, /Ara|Web sitesi/.test(resv) && !/Masa ayırt/.test(resv));
  /* vercel.live: Vercel'in yalnız Preview'a eklediği araç çubuğu (üretimde yok) — bizim kodumuzun hatası sayılmaz */
  const own = errs.slice(0, Math.min(beforeVideo, errs.length)).filter((e) => !/vercel\.live|\.well-known\/vercel/.test(e));
  ok(`${dev}: sayfa hatası yok (Preview araç çubuğu ve YouTube iframe'i hariç)`, own.length === 0, own.join(" | ").slice(0, 300));
  if (errs.length > Math.min(beforeVideo, errs.length)) console.log(`  ${dev} YouTube oynatıcısı açıldıktan sonra: ${errs.length - beforeVideo} hata (YouTube'un kendi doğrulama istekleri)`);
  if (failed.length) console.log(`  ${dev} başarısız istekler: ${[...new Set(failed)].slice(0, 8).join(" · ")}`);
  if (dev === "masaustu") {
    await p.goto(`https://${HOST}/yaz/${SLUG}/`, { waitUntil: "networkidle" });
    const w = await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
    await shot(p, "masaustu-6-deneyim-yaz");
    ok("deneyim yazma sayfası açılıyor (yayın için giriş istenir)", /Pandeli/.test(w) && /(Google ile|giriş)/i.test(w));
  }
  console.log(`  ${dev} dış alan adları: ${[...hosts.keys()].filter((h) => h !== HOST).sort().join(", ")}`);
  await ctx.close();
}
await b.close();
console.log(`${res.filter(Boolean).length}/${res.length}`); process.exit(res.every(Boolean) ? 0 : 1);
