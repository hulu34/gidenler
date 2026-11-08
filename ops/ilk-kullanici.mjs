/* İLK KULLANICI · UÇTAN UCA (YALNIZ PREVIEW, izole Neon dalı). Gerçek tarayıcı (Playwright), gerçek API, test hesabı oturumu.
   Senaryo: Instagram bağlantısı (?k=ic03) → arama → seçim → deneyim yazma → (girişsiz) otomatik taslak → giriş → taslak geri
   → çift tıklamayla gönderim → tek kayıt → profilde görünür. Ek: bulunamadı + mekân öner, mükerrer öneri, başarısız kayıt,
   farklı ay, kampanya raporu, yönetici kararı, regresyon, ekran görüntüleri. Log yalnız sayı/durum; görüntüler şifreli. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const HOST = process.env.HOST, B = `https://${HOST}`, OUT = process.env.CIKTI ?? "out/ilk";
mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const sonuc = [];
const ok = (n, c, i = "") => { sonuc.push([n, !!c]); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const admin = async (b) => { const r = await fetch(`${B}/api/admin/db/`, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", confirm: "EVET", ...b }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

/* 0) izolasyon — Production veritabanına asla yazılmaz */
const d0 = await fetch(`${B}/api/admin/db/`, { headers: HB });
const d = await d0.json().catch(() => ({}));
if (d.env !== "preview") console.log("admin/db", d0.status, Object.keys(d).join(","), d.error ?? "", JSON.stringify(d.db ?? {}).slice(0, 300));
ok("izolasyon: Preview ortamı ve üretim dışı veritabanı", d.env === "preview" && d.db?.writeGuard?.ok === true, `env=${d.env}`);
if (d.env !== "preview" || d.db?.writeGuard?.ok !== true) process.exit(1);
const mg = await admin({ action: "migrate" });
ok("0009 (kampanya + mekân önerisi) Preview'a uygulandı", mg.s === 200 && (mg.j.status?.pending ?? ["?"]).length === 0, JSON.stringify(mg.j.status?.pending ?? mg.j.error ?? ""));
const U = (await admin({ action: "medya-test-oturum" })).j, U2 = (await admin({ action: "medya-test-oturum" })).j, ADM = (await admin({ action: "medya-test-oturum", mode: "admin" })).j;
ok("test hesapları (example.invalid, kind=test) oluşturuldu", !!U.cookieValue && !!U2.cookieValue && !!ADM.cookieValue);
const cookieOf = (u) => [{ name: u.cookieName, value: decodeURIComponent(u.cookieValue), domain: HOST, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }];
const apiAs = (u) => (p, { method = "GET", body } = {}) => fetch(`${B}${p}`, { method, body, redirect: "manual", headers: { ...HB, cookie: `${u.cookieName}=${u.cookieValue}`, ...(method !== "GET" ? { origin: B, "content-type": "application/json" } : {}) } });

const browser = await chromium.launch({ channel: "chrome" });
const shot = async (page, name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }).catch(() => {});
const ctxOf = async (w, h, mobile) => browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, extraHTTPHeaders: HB, locale: "tr-TR", userAgent: mobile ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 Instagram 350.0" : undefined });

/* 1) ANA SAYFA — hiyerarşi ve görüntüler */
for (const [w, h, m] of [[1440, 900, false], [1280, 800, false], [768, 1024, true], [390, 844, true], [375, 812, true]]) {
  const c = await ctxOf(w, h, m); const p = await c.newPage();
  await p.goto(`${B}/`, { waitUntil: "networkidle" });
  await shot(p, `ana-${w}-ilk-ekran`);
  const info = await p.evaluate(() => {
    const y = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : -1; };
    return { cta: y("[data-hero-deneyim]"), top10: y("#h-eniyiler"), bolum: y("[data-ana-son-yemek]"), kesif: y("#h-kesif"), semt: y("#h-explore"), tasma: document.documentElement.scrollWidth > innerWidth + 1, vh: innerHeight };
  });
  ok(`ana sayfa ${w}: ilk ekranda deneyim çağrısı (${info.cta}px) ve sıralama başlığı (${info.top10}px)`, info.cta > 0 && info.cta < info.vh && info.top10 > 0, JSON.stringify(info));
  ok(`ana sayfa ${w}: sıra Top10 → deneyim → fotoğraflı keşif → semtler, yatay taşma yok`, info.top10 < info.bolum && info.bolum < info.kesif && info.kesif < info.semt && !info.tasma);
  if (w === 1440 || w === 390) { await p.locator("[data-ana-son-yemek]").scrollIntoViewIfNeeded(); await shot(p, `ana-${w}-deneyim-bolumu`); await shot(p, `ana-${w}-tam`, true); }
  if (w === 390) {
    await p.click("[data-hero-deneyim]"); await p.waitForTimeout(600);
    ok("mobil: üstteki çağrı bölüme kaydırır", await p.locator("[data-ana-son-yemek]").isVisible());
    await p.fill("[data-ana-son-yemek] [data-son-yemek-girdi]", "pandeli"); await p.waitForSelector("[data-son-yemek-sec]", { timeout: 8000 }).catch(() => {});
    ok("ana sayfa bölümünde arama gerçek dizinden sonuç verir", await p.locator("[data-son-yemek-sec='pandeli-fatih']").count() > 0);
    await shot(p, "ana-390-arama-sonuc");
  }
  await c.close();
}

/* 2) KAMPANYA BAĞLANTISI → ARAMA → SEÇİM → FORM (girişsiz) */
const c1 = await ctxOf(390, 844, true); const p1 = await c1.newPage();
const t0 = Date.now();
await p1.goto(`${B}/nerede-yedin/?k=ic03`, { waitUntil: "networkidle" });
ok(`kampanya bağlantısı doğrudan akışı açar (${Date.now() - t0} ms)`, (await p1.locator("h1").innerText()).includes("en son nerede yemek yedin"));
ok("arama kutusu hazır (odakta)", await p1.evaluate(() => document.activeElement?.hasAttribute("data-son-yemek-girdi")));
await shot(p1, "kampanya-390-acilis");
const ara = async (q) => { await p1.fill("[data-son-yemek-girdi]", q); await p1.waitForTimeout(900); return p1.$$eval("[data-son-yemek-sec]", (b) => b.map((x) => x.getAttribute("data-son-yemek-sec"))); };
ok("Türkçe karaktersiz arama: 'ciya sofrasi' → Çiya Sofrası", (await ara("ciya sofrasi")).includes("ciya-sofrasi-kadikoy"));
ok("yanlış yazım: 'kanat lokantasi' → Kanaat Lokantası", (await ara("kanat lokantasi")).includes("kanaat-lokantasi-uskudar"));
const hk = await ara("hunkar");
ok(`aynı adı taşıyan birden çok mekân semtiyle listelenir (${hk.length})`, hk.length >= 2 && (await p1.locator("[data-son-yemek-sonuc]").innerText()).includes("Şişli"));
await shot(p1, "kampanya-390-sonuclar");
const SL = "kanaat-lokantasi-uskudar";
await ara("kanat lokantasi");
await Promise.all([p1.waitForURL(`**/yaz/${SL}/`), p1.click(`[data-son-yemek-sec='${SL}']`)]);
ok("seçim mevcut deneyim formuna gider", p1.url().endsWith(`/yaz/${SL}/`));
await shot(p1, "form-390-bos");
const METIN = "Geçen ay öğle yemeğinde gittik; kuru fasulye ve pilav sıcaktı, servis hızlıydı. Kalabalıktı ama sıra çabuk ilerledi. Tatlıdaki kaymak çok tazeydi.";
await p1.fill("[data-deneyim-metin]", METIN);
await p1.click("[data-genel-puan] [aria-label='Genel puan: 8']");
await p1.click("button[aria-pressed]:has-text('evet')");
await p1.waitForTimeout(1200);
ok("yazarken otomatik taslak kaydedildi", await p1.locator("[data-otomatik-taslak]").count() > 0);
const btn = await p1.locator("button:has-text('Google ile giriş yap ve yayınla')").count();
ok("girişsiz kullanıcıya dürüst eylem: 'Google ile giriş yap ve yayınla'", btn === 1);
const ayrinti = await p1.locator("[data-ayrinti-ac]").count();
ok("ayrıntılı puanlar isteğe bağlı, kapalı başlar", ayrinti === 1);
const formH = await p1.evaluate(() => document.documentElement.scrollHeight);
await shot(p1, "form-390-dolu", true);
const tasma = await p1.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
ok(`mobil form yatay taşmasız (sayfa ${formH}px)`, !tasma);

/* 3) GİRİŞ SONRASI TASLAK — OAuth dönüşü yerine aynı tarayıcıya test oturumu eklenir ve sayfa yeniden açılır */
await c1.addCookies(cookieOf(U));
await p1.goto(`${B}/yaz/${SL}/`, { waitUntil: "networkidle" });
await p1.waitForTimeout(800);
const geri = await p1.inputValue("[data-deneyim-metin]");
ok("giriş sonrası taslak geri geldi (metin aynen)", geri === METIN);
ok("giriş sonrası açık mesaj: 'Giriş yapıldı; yazdıkların yüklendi'", (await p1.locator("[data-taslak-yuklendi]").innerText().catch(() => "")).includes("Giriş yapıldı"));
await shot(p1, "form-390-giris-sonrasi");

/* 4) ÇİFT TIKLAMA → TEK KAYIT */
const yay = p1.locator("button:has-text('Deneyimi yayınla')");
await yay.dblclick().catch(() => {});
await p1.waitForSelector("text=Deneyimin yayınlandı", { timeout: 20000 }).catch(() => {});
const basari = await p1.locator("text=Deneyimin yayınlandı").count() + await p1.locator("text=Deneyimin incelemede").count();
ok("sunucu kaydı sonrası başarı ekranı", basari > 0);
await shot(p1, "basari-390");
const api = apiAs(U);
const mine = (await (await api(`/api/me/reviews/?slug=${SL}`)).json().catch(() => ({}))).reviews ?? [];
ok(`çift tıklama tek kayıt oluşturdu (${mine.length})`, mine.length === 1);
ok("kayıt 'doğrulanmamış' (ziyaret doğrulaması yok)", !(await p1.content()).includes("ziyaretin doğrulandı"));
const draftLeft = await p1.evaluate((sl) => { try { return Object.keys(JSON.parse(localStorage.getItem("gidenler.taslak.v1") ?? "{}")).includes(sl); } catch { return true; } }, SL);
ok("başarıdan sonra bu mekânın taslağı silindi", draftLeft === false);
const prof = await (await fetch(`${B}/mekan/${SL}/`, { headers: HB })).text();
ok("deneyim profil sayfasında görünüyor", prof.includes(METIN.slice(0, 40)));
ok("tek deneyimle Gidenler puanı uydurulmadı (eşik 5 yazar)", !/data-score-hero/.test(prof));

/* 5) AYNI KULLANICININ FARKLI ZİYARETİ / AYNI AY */
const ay = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 7);
const g = (m) => JSON.stringify({ slug: SL, body: "İkinci ziyaret: akşam saatinde gittik, sulu yemekler yine sıcaktı ama tatlılar bitmişti; garsonlar ilgiliydi.", visitMonth: m, overall: 7, ratings: {}, returnIntent: "evet", disclosure: "none" });
await new Promise((r) => setTimeout(r, 16000)); /* gönderim kilidi 15 sn (aynı kullanıcı + mekân) */
const r2 = await api("/api/reviews/", { method: "POST", body: g(ay(140)) });
const r3 = await api("/api/reviews/", { method: "POST", body: JSON.stringify({ ...JSON.parse(g(mine[0]?.visitedOn?.slice(0, 7) ?? ay(1))), body: "Aynı ay için ikinci kez yazma denemesi; bu kayıt reddedilmeli çünkü aynı ziyaret ayına zaten deneyim var." }) });
ok(`farklı ay ayrı deneyim (${r2.status}), aynı ay reddedilir (${r3.status})`, r2.status === 201 && r3.status === 409);

/* 6) BAŞARISIZ KAYIT — sunucu hatası: başarı denmez, taslak korunur */
const c2 = await ctxOf(390, 844, true); await c2.addCookies(cookieOf(U2)); const p2 = await c2.newPage();
await p2.route("**/api/reviews/", (r) => (r.request().method() === "POST" ? r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "db", message: "Sunucu hatası" }) }) : r.continue()));
await p2.goto(`${B}/nerede-yedin/?k=ic03`, { waitUntil: "networkidle" });
await p2.fill("[data-son-yemek-girdi]", "pandeli"); await p2.waitForTimeout(900);
await Promise.all([p2.waitForURL("**/yaz/pandeli-fatih/"), p2.click("[data-son-yemek-sec='pandeli-fatih']")]);
await p2.fill("[data-deneyim-metin]", "Hata senaryosu için yazılmış metin: öğle saatinde gittik, hünkar beğendi çok iyiydi ama servis yavaştı.");
await p2.click("[data-genel-puan] [aria-label='Genel puan: 7']"); await p2.click("button[aria-pressed]:has-text('evet')");
await p2.click("button:has-text('Deneyimi yayınla')"); await p2.waitForTimeout(1500);
ok("başarısız kayıtta başarı ekranı çıkmaz, hata yazılır", (await p2.locator("text=Deneyimin yayınlandı").count()) === 0 && (await p2.locator("[role=alert]").count()) > 0);
ok("başarısız kayıtta taslak korunur", (await p2.evaluate(() => JSON.stringify(localStorage))).includes("Hata senaryosu"));
await shot(p2, "hata-390");
const after = (await (await apiAs(U2)(`/api/me/reviews/?slug=pandeli-fatih`)).json().catch(() => ({}))).reviews ?? [];
ok("başarısız gönderimde kayıt yok", after.length === 0);
await c2.close();

/* 7) BULUNAMADI → MEKÂN ÖNER (+ mükerrer) */
const c3 = await ctxOf(390, 844, true); const p3 = await c3.newPage();
await p3.goto(`${B}/nerede-yedin/?k=ic05`, { waitUntil: "networkidle" });
const yok = `Zqvx Brtm ${Date.now().toString(36)}`;
await p3.fill("[data-son-yemek-girdi]", yok); await p3.waitForTimeout(1000);
ok("bulunamadı: dürüst mesaj + Mekân öner", (await p3.locator("[data-son-yemek-yok]").count()) === 1);
await shot(p3, "bulunamadi-390");
await Promise.all([p3.waitForURL("**/nerede-yedin/oner/**"), p3.click("[data-son-yemek-oner]")]);
ok("öneri formu aranan adla dolu açılır", (await p3.inputValue("[data-oneri-ad]")) === yok);
await p3.selectOption("[data-oneri-ilce]", "Üsküdar"); await p3.fill("[data-oneri-konum]", "İskele yakını");
await shot(p3, "oneri-390-form");
const [resp] = await Promise.all([p3.waitForResponse((r) => r.url().includes("/api/mekan-oner/"), { timeout: 15000 }).catch(() => null), p3.click("button:has-text('Öneriyi gönder')")]);
if (resp && resp.status() !== 201) console.log("öneri yanıtı", resp.status(), (await resp.text().catch(() => "")).slice(0, 200));
await p3.waitForSelector("[data-oneri-alindi]", { timeout: 15000 }).catch(() => {});
const alindi = await p3.locator("[data-oneri-alindi]").innerText().catch(() => "");
ok("öneri alındı mesajı dürüst: yayımlanmaz, Google puanı almaz", alindi.includes("yayımlanmaz") && alindi.includes("Google puanı almaz"));
if (alindi) await p3.fill("textarea[aria-label='Deneyim taslağı']", "Önerdiğim yer için şimdiden yazdığım kısa deneyim taslağı.");
if (alindi) await p3.click("button:has-text('Bu cihazda sakla')");
ok("öneri sırasında deneyim taslağı yalnız bu cihazda saklandı", (await p3.locator("[data-oneri-taslak]").count()) === 1);
await shot(p3, "oneri-390-alindi");
await p3.goto(`${B}/nerede-yedin/oner/?ad=${encodeURIComponent("Çiya Sofrası")}`, { waitUntil: "networkidle" });
await p3.selectOption("[data-oneri-ilce]", "Kadıköy"); await p3.click("button:has-text('Öneriyi gönder')");
await p3.waitForSelector("[data-oneri-eslesme]", { timeout: 10000 }).catch(() => {});
ok("var olan mekân önerilince 'bu mu?' sorulur, kayıt açılmaz", (await p3.locator("[data-oneri-eslesme]").innerText().catch(() => "")).includes("Çiya Sofrası"));
await shot(p3, "oneri-390-mukerrer");
await c3.close();
const ikinci = await fetch(`${B}/api/mekan-oner/`, { method: "POST", headers: { ...HB, origin: B, "content-type": "application/json" }, body: JSON.stringify({ name: yok.toLowerCase(), district: "Üsküdar" }) });
ok("aynı öneri ikinci kez: yeni satır değil, birleştirildi", ikinci.status === 201 && (await ikinci.json()).merged === true);
const spam = await fetch(`${B}/api/mekan-oner/`, { method: "POST", headers: { ...HB, origin: B, "content-type": "application/json" }, body: JSON.stringify({ name: "Lokanta 0532 123 45 67", district: "Üsküdar" }) });
ok("öneride telefon/bağlantı reddedilir", spam.status === 400);
const yabanci = await fetch(`${B}/api/mekan-oner/`, { method: "POST", headers: { ...HB, origin: "https://kotu.example", "content-type": "application/json" }, body: JSON.stringify({ name: "X Lokanta", district: "Üsküdar" }) });
ok("başka kökenden öneri reddedilir", yabanci.status === 403);

/* 8) YÖNETİM — öneri kuyruğu + karar (admin test oturumu) ve kampanya raporu */
const c4 = await ctxOf(1440, 900, false); await c4.addCookies(cookieOf(ADM)); const p4 = await c4.newPage();
await p4.goto(`${B}/yonetim/mekan-onerileri/`, { waitUntil: "networkidle" });
const satir = p4.locator("[data-oneri-satir]", { hasText: yok });
ok("öneri yönetici kuyruğunda (2 kez önerildi)", (await satir.innerText().catch(() => "")).includes("2 kez"));
await shot(p4, "yonetim-oneriler");
await satir.locator("button:has-text('Doğrulamaya al')").click(); await p4.waitForTimeout(1500);
ok("yönetici kararı kaydedildi", (await satir.innerText().catch(() => "")).includes("Karar kaydedildi"));
const anonKarar = await fetch(`${B}/api/admin/mekan-oner/`, { method: "POST", headers: { ...HB, origin: B, "content-type": "application/json" }, body: JSON.stringify({ id: "oneri_00000000-0000-0000-0000-000000000000", decision: "rejected" }) });
const userKarar = await apiAs(U)("/api/admin/mekan-oner/", { method: "POST", body: JSON.stringify({ id: "oneri_00000000-0000-0000-0000-000000000000", decision: "rejected" }) });
ok(`oturumsuz (${anonKarar.status}) ve yetkisiz kullanıcı (${userKarar.status}) karar veremez`, anonKarar.status === 401 && userKarar.status === 403);
await p4.goto(`${B}/yonetim/kampanya/?gun=7`, { waitUntil: "networkidle" });
const row = await p4.$$eval("[data-kampanya-satir='ic03'] td", (t) => t.map((x) => x.textContent.trim()));
const ad = ["ziyaret", "arama", "secim", "form", "giris", "gonderim", "tamam", "hata", "bulunamadi", "oneri"];
const ic03 = Object.fromEntries(ad.map((k, i) => [k, Number(row[i + 1] ?? 0)]));
console.log("ic03", JSON.stringify(ic03));
ok("kampanya ic03: ziyaret → arama → seçim → form → gönderim → kaydedildi ölçüldü", ic03.ziyaret >= 1 && ic03.arama >= 1 && ic03.secim >= 1 && ic03.form >= 1 && ic03.gonderim >= 1 && ic03.tamam >= 1);
ok("kampanya ic03: başarısız kayıt ölçüldü", ic03.hata >= 1);
const row5 = await p4.$$eval("[data-kampanya-satir='ic05'] td", (t) => t.map((x) => x.textContent.trim()));
ok("kampanya ic05: bulunamadı ve öneri ölçüldü", Number(row5[9]) >= 1 && Number(row5[10]) >= 1, row5.slice(1, 11).join(","));
ok("10 içerik üreticisi bağlantısı listeleniyor", (await p4.locator("[data-kampanya-baglanti]").count()) === 10);
await shot(p4, "yonetim-kampanya", true);
await c4.close();
const sahte = await fetch(`${B}/api/kampanya/`, { method: "POST", headers: { ...HB, origin: B, "content-type": "application/json" }, body: JSON.stringify({ code: "ic03", step: "tamam" }) });
ok("istemci 'kaydedildi' adımını uyduramaz", sahte.status === 400);

/* 9) MASAÜSTÜ akış görüntüleri */
const c5 = await ctxOf(1440, 900, false); const p5 = await c5.newPage();
await p5.goto(`${B}/nerede-yedin/?k=ic01`, { waitUntil: "networkidle" }); await shot(p5, "kampanya-1440-acilis");
await p5.fill("[data-son-yemek-girdi]", "hunkar"); await p5.waitForTimeout(900); await shot(p5, "kampanya-1440-sonuclar");
await p5.goto(`${B}/yaz/hunkar-sisli/`, { waitUntil: "networkidle" }); await shot(p5, "form-1440", true);
await c5.close();

/* 10) REGRESYON + puan ayrımı + performans */
for (const p of ["/", "/ara/?q=kebap", "/kesfet/", "/sor/", "/seckisi/", "/mekan/ciya-sofrasi-kadikoy/", "/mekan/pandeli-fatih/", "/sitemap.xml", "/demo/", "/nerede-yedin/", "/nerede-yedin/oner/", "/kategori/kebap/"]) {
  const r = await fetch(B + p, { headers: HB }); console.log(`${r.status} ${p}`);
  /* /demo/ gerçek sitede bilinçli 404 (yatırımcı demosu ayrı dağıtım; canlıda da 404) */
  sonuc.push([`sayfa ${p}`, r.status === 200 || ((p.startsWith("/kategori") || p === "/demo/") && r.status === 404)]);
}
const ana = await (await fetch(`${B}/`, { headers: HB })).text();
ok("ana sayfada Google rozeti '/5' ve Google etiketi; Gidenler puanı uydurulmuyor", /data-gpuan/.test(ana) && /\/5/.test(ana) && !/data-score-hero/.test(ana));
const pdl = await (await fetch(`${B}/mekan/pandeli-fatih/`, { headers: HB })).text();
ok("profilde rezervasyon/yol tarifi bağlantısı duruyor", /rezervasyon|yol tarifi/i.test(pdl));
const ts = [];
for (const q of ["kebap", "ciya", "kanat", "balik kadikoy", "meyhane", "pide", "hunkar", "karakoy", "lahmacun", "kahvalti"]) { const s = Date.now(); await fetch(`${B}/api/ara/?q=${encodeURIComponent(q)}&limit=8`, { headers: HB }); ts.push(Date.now() - s); }
ts.sort((a, b) => a - b); ok(`arama API medyan ${ts[5]} ms, en kötü ${ts[9]} ms (ağ dahil)`, ts[5] < 1500);
await browser.close();
writeFileSync(`${OUT}/sonuc.json`, JSON.stringify(sonuc, null, 1));
const k = sonuc.filter(([, c]) => !c).length;
console.log(`\nİLK KULLANICI E2E: ${sonuc.length - k}/${sonuc.length} geçti`);
process.exit(k ? 1 : 0);
