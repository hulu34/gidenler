/* GECE 3 EK DENETİM · YALNIZ PREVIEW (izole Neon). Test hesapları, tuvalde üretilmiş "TEST GÖRSELİ" kareleri.
   Moderasyon paneli (bağlı deneyim, kapak karşılaştırma), fotoğraf değiştir, hesap kapatma uçtan uca, mevcut site yolu (G).
   Mobil = Chromium öykünmesi. Google uçları tarayıcıda kesilir. Log yalnız doğru/yanlış. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const HOST = process.env.PREVIEW_HOST, BASE = `https://${HOST}`, OUT = "out/gece3"; mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const ad = `${BASE}/api/admin/db/`;
const son = []; const ok = (n, c, i = "") => { son.push([n, !!c]); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const admin = async (b) => { const r = await fetch(ad, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", confirm: "EVET", ...b }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const d = await (await fetch(ad, { headers: HB })).json().catch(() => ({}));
ok("izolasyon: Preview ve üretim dışı veritabanı", d.env === "preview" && d.db?.writeGuard?.ok === true, `env=${d.env} iz=${d.db?.fingerprint}`);
if (d.env !== "preview" || d.db?.writeGuard?.ok !== true) process.exit(1);
writeFileSync(`${OUT}/ortam.json`, JSON.stringify({ env: d.env, db: d.db, migrations: d.migrations }, null, 1));
await admin({ action: "migrate" });
const hesap = async (mode) => (await admin({ action: "medya-test-oturum", mode })).j;
const U = await hesap(), K = await hesap(), M = await hesap("admin");
const ck = (u) => `${u.cookieName}=${u.cookieValue}`;
const api = (p, { u, method = "GET", body, json } = {}) => fetch(`${BASE}${p}`, { method, body: json ? JSON.stringify(json) : body, redirect: "manual", headers: { ...HB, ...(u ? { cookie: ck(u) } : {}), ...(method !== "GET" ? { origin: BASE } : {}), ...(json ? { "content-type": "application/json" } : {}) } });
const br = await chromium.launch();
const baglam = async (u, o = {}) => { const c = await br.newContext(o); await yetkiliBaslik(c, HOST, { ...HB, "x-vercel-set-bypass-cookie": "true" }); await c.route(/\/api\/google\/|googleapis\.com/, (r) => r.abort()); if (u) await c.addCookies([{ name: u.cookieName, value: u.cookieValue, domain: HOST, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]); return c; };
const tp = await (await br.newContext()).newPage();
const kare = async (hue, label) => Buffer.from((await tp.evaluate(([hue, label]) => { const c = document.createElement("canvas"); c.width = 1400; c.height = 1000; const x = c.getContext("2d"); x.fillStyle = `hsl(${hue} 55% 45%)`; x.fillRect(0, 0, 1400, 1000); for (let i = 0; i < 300; i++) { x.fillStyle = `hsla(${(hue + i * 7) % 360} 70% 55% / .3)`; x.fillRect((i * 97) % 1400, (i * 53) % 1000, 70, 70); } x.fillStyle = "#fff"; x.font = "bold 64px sans-serif"; x.fillText("TEST GÖRSELİ", 80, 140); x.fillText(label, 80, 230); x.font = "20px sans-serif"; x.fillText(String(Date.now()), 80, 280); return c.toDataURL("image/jpeg", 0.9); }, [hue, label])).split(",")[1], "base64");
const SL = "kanaat-lokantasi-uskudar";
const m1 = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 7);
const g = { body: "Gece üç ek denetimi için yazılmış örnek deneyim metni; öğlen gidildi, sulu yemekler sıcaktı ve servis hızlıydı.", visitMonth: m1, overall: 8, ratings: {}, returnIntent: "evet", disclosure: "none" };

/* 1) fotoğraf seçicide Değiştir (iPhone öykünmesi) */
{
  const c = await baglam(U, { ...devices["iPhone 14"], defaultBrowserType: undefined }); const p = await c.newPage();
  await p.goto(`${BASE}/yaz/${SL}/`, { waitUntil: "networkidle" });
  const girdi = p.locator('#fotograf input[type="file"]').last();
  await girdi.setInputFiles([{ name: "a.jpg", mimeType: "image/jpeg", buffer: await kare(30, "ilk") }]);
  await p.waitForTimeout(300);
  const once = await p.locator('#fotograf img[alt^="Seçilen"]').first().getAttribute("src");
  await p.locator('#fotograf [aria-label="Bu fotoğrafı başka bir fotoğrafla değiştir"]').first().setInputFiles([{ name: "b.jpg", mimeType: "image/jpeg", buffer: await kare(200, "değişen") }]);
  await p.waitForTimeout(300);
  const sonra = await p.locator('#fotograf img[alt^="Seçilen"]').first().getAttribute("src");
  ok("seçici: Değiştir aynı yerde yeni fotoğrafı koyar, sayı artmaz", once && sonra && once !== sonra && (await p.locator('#fotograf img[alt^="Seçilen"]').count()) === 1);
  const dokun = await p.evaluate(() => [...document.querySelectorAll("#fotograf button, #fotograf label")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 32 || r.width < 32); }).length);
  ok("seçici: dokunma alanları en az 32 px (mobil)", dokun === 0, dokun);
  await p.locator("#fotograf").scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/1-secici-degistir-iphone-emulasyon.png` });
  await c.close();
}
/* 2) deneyim + fotoğraf (API), yönetici onayı; panelde bağlı deneyim ve kapak karşılaştırması */
const rv = await (await api("/api/reviews/", { u: K, method: "POST", json: { slug: SL, ...g } })).json();
ok("hesap kapatma için deneyim yazıldı", !!rv.id, rv.error ?? "");
const fd = new FormData(); fd.set("file", new Blob([await kare(120, "kapanacak hesap")], { type: "image/jpeg" }), "k.jpg"); fd.set("rights", "own");
const up = await (await api(`/api/reviews/${rv.id}/photos/`, { u: K, method: "POST", body: fd })).json();
ok("fotoğraf yüklendi, onay bekliyor", up.ok && up.status === "pending", JSON.stringify(up).slice(0, 80));
const ap = await api("/api/moderation/photos/", { u: M, method: "POST", json: { id: up.id, action: "approve" } });
ok("yönetici onayı", ap.status === 200);
{
  for (const [cihaz, o] of [["masaustu", { viewport: { width: 1366, height: 900 } }], ["android-emulasyon", { ...devices["Pixel 7"], defaultBrowserType: undefined }]]) {
    const c = await baglam(M, o); const p = await c.newPage();
    await p.goto(`${BASE}/yonetim/fotograf-moderasyon/`, { waitUntil: "networkidle" });
    await p.getByRole("tab", { name: "Onaylı" }).click(); await p.waitForTimeout(1500);
    const kart = p.locator(`[data-photo="${up.id}"]`);
    ok(`${cihaz}: panelde bağlı deneyim (ay ve metin başı)`, (await kart.locator("[data-review-link]").innerText().catch(() => "")).includes(m1));
    ok(`${cihaz}: şu anki kapak ile aday kapak yan yana`, (await kart.locator("[data-cover-compare] figure").count()) === 2);
    ok(`${cihaz}: Kanaat'ın şu anki kapağı görsel olarak gösteriliyor`, (await kart.locator("[data-cover-compare] figure").first().locator("img").count()) === 1);
    ok(`${cihaz}: yatay kaydırma yok`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await kart.scrollIntoViewIfNeeded(); await kart.screenshot({ path: `${OUT}/2-panel-karsilastirma-${cihaz}.png` });
    await c.close();
  }
}
const dosya = await (async () => { const h = await (await api(`/mekan/${SL}/fotograflar/?v=${Date.now()}`)).text(); return (h.match(/\/api\/media\/file\/public\/[0-9a-f-]{36}\/\d+\.webp/g) ?? []).find((x) => x.includes(up.id)); })();
ok("onaylı fotoğraf galeride", !!dosya);
const kapakOnce = (await (await api(`/mekan/${SL}/?v=${Date.now()}`)).text()).match(/og:image" content="([^"]+)/)?.[1];
ok("onay kapağı değiştirmez (Kanaat'ın kendi kapağı kalır)", !!kapakOnce && !kapakOnce.includes(up.id), kapakOnce?.slice(-40));
/* 3) hesap kapatma: başkası kapatamaz, onaysız kapanmaz, kapanınca deneyim, fotoğraf ve dosya gider */
ok("hesap kapatma: oturumsuz 401", (await api("/api/me/hesap/", { method: "DELETE", json: { confirm: "HESABIMI KAPAT" } })).status === 401);
ok("hesap kapatma: onay cümlesi olmadan 400", (await api("/api/me/hesap/", { u: K, method: "DELETE", json: { confirm: "evet" } })).status === 400);
ok("hesap kapatma: yabancı köken reddedilir", (await fetch(`${BASE}/api/me/hesap/`, { method: "DELETE", headers: { ...HB, cookie: ck(K), origin: "https://kotu.example", "content-type": "application/json" }, body: JSON.stringify({ confirm: "HESABIMI KAPAT" }) })).status === 403);
{
  const c = await baglam(K, { ...devices["iPhone 14"], defaultBrowserType: undefined }); const p = await c.newPage();
  await p.goto(`${BASE}/benim/`, { waitUntil: "networkidle" });
  const bol = p.locator("[data-close-account]");
  await bol.scrollIntoViewIfNeeded().catch(() => {});
  ok("Benim Gidenler'im: Hesabı kapat bölümü görünür", await bol.isVisible().catch(() => false));
  await bol.getByRole("button", { name: "Hesabımı kapatmak istiyorum" }).click();
  const dugme = bol.getByRole("button", { name: "Hesabımı kalıcı olarak kapat" });
  ok("onay cümlesi yazılmadan düğme kapalı", await dugme.isDisabled());
  await bol.locator("input").fill("HESABIMI KAPAT");
  await bol.screenshot({ path: `${OUT}/3-hesap-kapat-onay-iphone-emulasyon.png` });
  await dugme.click();
  await p.locator("[data-account-closed]").waitFor({ timeout: 20000 }).then(() => ok("hesap kapandı, gerçek sonuç gösterildi", true), () => ok("hesap kapandı, gerçek sonuç gösterildi", false));
  await c.close();
}
ok("kapanan hesabın oturumu geçersiz", (await api("/api/me/reviews/", { u: K })).status === 401);
const sonraGaleri = await (await api(`/mekan/${SL}/fotograflar/?v=${Date.now()}`)).text();
ok("kapanan hesabın fotoğrafı galeriden kalktı", !sonraGaleri.includes(up.id));
ok("kapanan hesabın fotoğraf dosyası açılmaz", dosya ? (await api(dosya)).status === 404 : false);
ok("kapanan hesabın deneyimi sayfada yok", !(await (await api(`/mekan/${SL}/?v=${Date.now()}`)).text()).includes("Gece üç ek denetimi"));
/* 4) G — mevcut site: ana sayfa → arama → Japon Erdal → Seçki → Sor (soru sorulmaz: Groq kotası canlıyla ortak) */
{
  const c = await baglam(null, { ...devices["iPhone 14"], defaultBrowserType: undefined }); const p = await c.newPage(); const hata = [];
  p.on("pageerror", (e) => hata.push(e.message.slice(0, 120)));
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" }); ok("G: ana sayfa", (await p.title()).length > 0);
  await p.goto(`${BASE}/ara/?q=ciya`, { waitUntil: "networkidle" }); ok("G: 'ciya' araması Çiya Sofrası'nı ilk getirir", /Çiya Sofrası/.test(await p.locator("main").innerText()) && (await p.locator("main a[href*='/mekan/']").first().getAttribute("href"))?.includes("ciya"));
  await p.goto(`${BASE}/mekan/japon-erdal-beyoglu/`, { waitUntil: "networkidle" });
  const j = await p.content();
  ok("G: Japon Erdal kendi fotoğrafları (kapalı pide, hamur, havuz)", ["kapali-pide", "hamur", "havuz"].every((k) => j.includes(`/media/foto/japon-erdal-${k}`)));
  /* altı video ve Flu 44:42 Seçki yazısında: medya-e2e "Seçki videoları korunur" ve "Flu 44:42 başlangıcı" denetler */
  await p.goto(`${BASE}/seckisi/`, { waitUntil: "networkidle" }); ok("G: Seçki TR", /Japon Erdal/.test(await p.locator("main").innerText()));
  const en = await api("/seckisi/en/"); ok("G: Seçki EN", en.status === 200, en.status);
  await p.goto(`${BASE}/sor/`, { waitUntil: "networkidle" }); ok("G: Sor Gidenler sayfası ve Beta etiketi", (await p.locator("[data-sor-beta]").count()) > 0);
  ok("G: JavaScript hatası yok", hata.length === 0, hata.join(" | "));
  await c.close();
}
await br.close();
const k = son.filter((x) => !x[1]).length; console.log(`SONUÇ ${son.length - k}/${son.length}`); process.exit(k ? 1 : 0);
