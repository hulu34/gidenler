/* GECE OPERASYONU 10 KASIM · UÇTAN UCA (YALNIZ PREVIEW, izole Neon dalı; Production'a yazmaz).
   A4) Yayımlanmış deneyim düzenlenirken aynı sekmede/yeni sekmede taslak bağlantısı: forma uygulanmaz.
   A) Instagram uygulama içi tarayıcı: kampanya bağlantısı → uyarı → arama → form → taslak # ile taşınır → Safari'de açılır →
      taslak geri gelir → (test oturumu) yayınla → tek kayıt → kampanya 'tamam' doğru koda yazılır.
   B) Ana sayfa 375/390/768/1280/1440: yatay taşma, kesik başlık, küçük dokunma alanı, düşük çözünürlüklü görsel.
   C) 23 restoran profili: alan/öğe matrisi + tam sayfa görüntü. Google ücretli uçları (/api/google/**) ENGELLİ.
   D) Yasal sayfalar, paylaşım kartı, İngilizce Seçki dili.  Log yalnız sayı/durum; görüntüler ve matris şifreli. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const HOST = process.env.HOST, B = `https://${HOST}`, OUT = process.env.CIKTI ?? "out/gece";
mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const sonuc = [];
const ok = (n, c, i = "") => { sonuc.push([n, !!c]); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const admin = async (b) => { const r = await fetch(`${B}/api/admin/db/`, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", confirm: "EVET", ...b }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

const d = await (await fetch(`${B}/api/admin/db/`, { headers: HB })).json().catch(() => ({}));
ok("izolasyon: Preview ortamı ve üretim dışı veritabanı", d.env === "preview" && d.db?.writeGuard?.ok === true, `env=${d.env}`);
if (d.env !== "preview" || d.db?.writeGuard?.ok !== true) process.exit(1);
const mg = await admin({ action: "migrate" });
ok("geçişler Preview'da tamam", mg.s === 200 && (mg.j.status?.pending ?? ["?"]).length === 0);
const U = (await admin({ action: "medya-test-oturum" })).j;
const cookieOf = (u) => [{ name: u.cookieName, value: decodeURIComponent(u.cookieValue), domain: HOST, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }];

const IG = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 356.0.0.32.104 (iPhone15,2; iOS 18_1; tr_TR; tr; scale=3.00; 1179x2556; 655574148)";
const IGA = "Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36 Instagram 352.0.0.38.100 Android (34/14; 480dpi; 1080x2340; samsung; SM-S911B; dm1q; qcom; tr_TR; 650181412)";
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const browser = await chromium.launch({ channel: "chrome" });
let googleCalls = 0;
const ctx = async ({ w = 390, h = 844, mobile = true, ua = SAFARI } = {}) => {
  const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, extraHTTPHeaders: HB, locale: "tr-TR", userAgent: mobile ? ua : undefined, permissions: ["clipboard-read", "clipboard-write"] });
  await c.route("**/api/google/**", (r) => { googleCalls++; return r.fulfill({ status: 204, body: "" }); });
  return c;
};
const shot = (p, n, full = false) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full }).catch(() => {});

/* ── A) Instagram akışı ─────────────────────────────────────────────── */
const SL = "kanaat-lokantasi-uskudar";
const TXT = "Instagram'dan geldim: kuru fasulye ve pilav çok iyiydi, servis hızlıydı; öğle saatinde kalabalıktı ama masa çabuk açıldı. Şöbiyet de güzeldi.";
{
  const c = await ctx({ ua: IG }); const p = await c.newPage();
  await p.goto(`${B}/nerede-yedin/?k=ic05`, { waitUntil: "networkidle" });
  await p.waitForSelector("[data-uygulama-ici]", { timeout: 8000 }).catch(() => {});
  ok("Instagram iOS: kampanya sayfasında 'tarayıcıda aç' uyarısı", (await p.locator("[data-uygulama-ici='Instagram']").count()) === 1);
  ok("iOS'ta Android 'Chrome'da aç' düğmesi yok", (await p.locator("[data-uygulama-ici-ac]").count()) === 0);
  await shot(p, "ig-ios-acilis");
  await p.fill("[data-son-yemek-girdi]", "kanaat"); await p.waitForTimeout(1200);
  await Promise.all([p.waitForURL(`**/yaz/${SL}/`), p.click(`[data-son-yemek-sec='${SL}']`)]);
  ok("Instagram içinde arama + seçim çalışıyor", p.url().includes(`/yaz/${SL}/`));
  await p.waitForSelector("[data-deneyim-metin]");
  ok("formda Google ile giriş düğmesi YOK (403'e gönderilmez)", (await p.locator("button:has-text('Google ile giriş yap')").count()) === 0);
  ok("formda uyarı + alt düğme var", (await p.locator("#tarayicida-ac [data-uygulama-ici]").count()) === 1 && (await p.locator("[data-uygulama-ici-alt]").count()) === 1);
  await p.fill("[data-deneyim-metin]", TXT);
  await p.click("[data-genel-puan] [aria-label='Genel puan: 8']");
  await p.waitForTimeout(900);
  const hash = await p.evaluate(() => location.hash);
  ok("taslak adres çubuğundaki # parçasında (sunucuya gitmez)", hash.startsWith("#aktar=") && hash.length > 60, hash.length);
  await p.click("[data-uygulama-ici-kopyala]"); await p.waitForTimeout(300);
  const copied = await p.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  ok("'Bağlantıyı kopyala' taslaklı adresi kopyalar", copied.startsWith(`${B}/yaz/${SL}/#aktar=`));
  await p.click("[data-uygulama-ici-alt]"); await p.waitForTimeout(500);
  ok("alt düğme # parçasını bozmaz", (await p.evaluate(() => location.hash)) === hash);
  await shot(p, "ig-ios-form", true);
  await c.close();

  /* "tarayıcıda aç" → Safari, taslaklı adres; test oturumu = Google girişi tamamlanmış kullanıcı */
  const s = await ctx({ ua: SAFARI }); await s.addCookies(cookieOf(U)); const q = await s.newPage();
  await q.goto(copied || `${B}/yaz/${SL}/${hash}`, { waitUntil: "networkidle" });
  await q.waitForSelector("[data-deneyim-metin]");
  await q.waitForTimeout(800);
  ok("Safari'de metin geri geldi", (await q.inputValue("[data-deneyim-metin]")) === TXT);
  ok("Safari'de genel puan geri geldi", (await q.locator("[data-genel-puan] [aria-label='Genel puan: 8'][aria-checked='true']").count()) === 1);
  ok("# parçası adresten silindi", (await q.evaluate(() => location.hash)) === "");
  ok("kampanya kodu taşındı (ic05)", (await q.evaluate(() => JSON.parse(localStorage.getItem("gidenler.kampanya") ?? "{}").code)) === "ic05");
  ok("Safari'de uyarı yok, yayınla düğmesi var", (await q.locator("[data-uygulama-ici]").count()) === 0 && (await q.locator("button:has-text('Deneyimi yayınla')").count()) === 1);
  await q.click("button[aria-pressed]:has-text('evet')").catch(() => {});
  const resp = q.waitForResponse((r) => r.url().includes("/api/reviews") && r.request().method() === "POST", { timeout: 20000 }).catch(() => null);
  await q.click("button:has-text('Deneyimi yayınla')");
  const rr = await resp;
  ok("yayın isteği 201", rr?.status() === 201, rr?.status());
  const body = rr ? JSON.parse(rr.request().postData() ?? "{}") : {};
  ok("istek kaynağı ic05", body.kaynak === "ic05");
  await q.waitForSelector("text=Deneyimin yayınlandı", { timeout: 15000 }).catch(() => {});
  await shot(q, "safari-yayinlandi");
  const mine = (await (await fetch(`${B}/api/me/reviews/?slug=${SL}`, { headers: { ...HB, cookie: `${U.cookieName}=${U.cookieValue}` } })).json().catch(() => ({}))).reviews ?? [];
  ok(`tek kayıt (${mine.length})`, mine.length === 1);
  await s.close();
}
{
  const c = await ctx({ ua: IGA }); const p = await c.newPage();
  await p.goto(`${B}/nerede-yedin/?k=ic06`, { waitUntil: "networkidle" });
  await p.waitForSelector("[data-uygulama-ici]", { timeout: 8000 }).catch(() => {});
  const href = await p.getAttribute("[data-uygulama-ici-ac]", "href").catch(() => null);
  ok("Instagram Android: 'Chrome'da aç' intent bağlantısı, kod korunur", !!href && href.startsWith(`intent://${HOST}/nerede-yedin/?k=ic06#Intent;scheme=https;`), href?.slice(0, 60));
  await shot(p, "ig-android-acilis");
  await p.goto(`${B}/benim/`, { waitUntil: "load" }); await p.waitForSelector("[data-uygulama-ici]", { timeout: 10000 }).catch(() => {});
  ok("Benim: uygulama içinde Google düğmesi yerine uyarı", (await p.locator("[data-uygulama-ici]").count()) === 1 && (await p.locator("button:has-text('Google ile giriş yap')").count()) === 0);
  await c.close();
}
{
  const c = await ctx({ ua: SAFARI }); const p = await c.newPage();
  await p.goto(`${B}/yaz/${SL}/`, { waitUntil: "networkidle" });
  ok("normal Safari: uyarı yok, Google ile giriş düğmesi var", (await p.locator("[data-uygulama-ici]").count()) === 0 && (await p.locator("button:has-text('Google ile giriş yap')").count()) === 1);
  await c.close();
}
/* ── A2) Taslak çakışması: aktarım hedefteki FARKLI taslağın üzerine yazmaz ── */
{
  const SL2 = "karakoy-lokantasi-beyoglu";
  const LOCAL = "Safari'de daha önce yazdığım taslak: öğle menüsü iyiydi, tatlıyı beğenmedik; yine de tekrar gideriz.";
  const INC = "Instagram'da yazdığım YENİ taslak: akşam gittik, mezeler ve ızgara çok iyiydi; şöbiyet hafifti, servis özenliydi.";
  const s = await ctx({ ua: SAFARI }); const q = await s.newPage();
  await q.goto(`${B}/yaz/${SL2}/`, { waitUntil: "load" }); await q.waitForSelector("[data-deneyim-metin]");
  await q.fill("[data-deneyim-metin]", LOCAL); await q.click("[data-genel-puan] [aria-label='Genel puan: 6']"); await q.waitForTimeout(1200);
  const localDraft = () => q.evaluate((sl) => JSON.parse(localStorage.getItem("gidenler.taslak.v1") ?? "{}")[sl]?.body ?? null, SL2);
  ok("Safari'de yerel taslak kaydedildi", (await localDraft()) === LOCAL);
  const ig = await ctx({ ua: IG }); const p = await ig.newPage();
  const linkOf = async (text) => {
    await p.goto(`${B}/yaz/${SL2}/`, { waitUntil: "load" }); await p.waitForSelector("[data-deneyim-metin]");
    await p.fill("[data-deneyim-metin]", text); await p.click("[data-genel-puan] [aria-label='Genel puan: 9']"); await p.waitForTimeout(900);
    return `${B}/yaz/${SL2}/${await p.evaluate(() => location.hash)}`;
  };
  const L1 = await linkOf(INC);
  /* (a) Safari'de sayfa zaten açıkken bağlantı aynı sekmeye yapıştırılır: yalnız # değişir */
  await q.goto(L1, { waitUntil: "load" }); await q.waitForSelector("[data-taslak-secim]", { timeout: 8000 }).catch(() => {});
  ok("iki farklı taslak → seçim ekranı (aynı sekmeye yapıştırma)", (await q.locator("[data-taslak-secim]").count()) === 1);
  ok("seçim beklerken yerel taslak korunuyor (depoda ve formda)", (await localDraft()) === LOCAL && (await q.inputValue("[data-deneyim-metin]")) === LOCAL);
  ok("seçim beklerken yayınla kapalı", (await q.locator("button:has-text('Google ile giriş yap')").isDisabled().catch(() => true)));
  await q.waitForTimeout(1500);
  ok("seçim beklerken otomatik kayıt üzerine yazmadı", (await localDraft()) === LOCAL);
  await shot(q, "taslak-secim-390", true);
  await q.click("[data-taslak-mevcut]"); await q.waitForTimeout(500);
  ok("iptal (bu cihazdakiyle devam): yerel taslak aynen kaldı, # silindi", (await localDraft()) === LOCAL && (await q.inputValue("[data-deneyim-metin]")) === LOCAL && (await q.evaluate(() => location.hash)) === "" && (await q.locator("[data-taslak-secim]").count()) === 0);
  await q.reload({ waitUntil: "load" }); await q.waitForSelector("[data-deneyim-metin]"); await q.waitForTimeout(500);
  ok("yeniden yüklemede seçim tekrar sorulmuyor, yerel taslak geliyor", (await q.locator("[data-taslak-secim]").count()) === 0 && (await q.inputValue("[data-deneyim-metin]")) === LOCAL);
  /* (b) yeni sekmede açılış (sayfa baştan yüklenir) */
  const q2 = await s.newPage();
  await q2.goto(L1, { waitUntil: "load" }); await q2.waitForSelector("[data-taslak-secim]", { timeout: 8000 }).catch(() => {});
  ok("iki farklı taslak → seçim ekranı (yeni sekme)", (await q2.locator("[data-taslak-secim]").count()) === 1 && (await localDraft()) === LOCAL);
  await q2.click("[data-taslak-gelen]"); await q2.waitForTimeout(800);
  ok("getirdiğimle devam: metin ve puan gelen taslaktan, depoya yazıldı, # silindi", (await q2.inputValue("[data-deneyim-metin]")) === INC && (await localDraft()) === INC && (await q2.locator("[data-genel-puan] [aria-label='Genel puan: 9'][aria-checked='true']").count()) === 1 && (await q2.evaluate(() => location.hash)) === "");
  /* bozuk bağlantı: yeni sekmede ve açık sayfaya yapıştırınca */
  const BAD = `${B}/yaz/${SL2}/#${L1.split("#")[1].slice(0, 30)}`;
  const q3 = await s.newPage(); await q3.goto(BAD, { waitUntil: "load" }); await q3.waitForSelector("[data-deneyim-metin]"); await q3.waitForTimeout(700);
  ok("bozuk/yarım bağlantı (yeni sekme): uyarı var, yerel taslak değişmedi, # silindi", (await q3.locator("[data-aktarim-bozuk]").count()) === 1 && (await localDraft()) === INC && (await q3.evaluate(() => location.hash)) === "");
  await q2.goto(BAD, { waitUntil: "load" }); await q2.waitForTimeout(700);
  ok("bozuk bağlantı (açık sayfaya yapıştırma): uyarı var, metin değişmedi", (await q2.locator("[data-aktarim-bozuk]").count()) === 1 && (await q2.inputValue("[data-deneyim-metin]")) === INC);
  /* uzun Türkçe metin */
  const LONG = "Şişli'de ğüçlü İskender; ılık şöbiyet, çıtır pide ve köpüklü ayran. ".repeat(90).slice(0, 5900);
  const L2 = await linkOf(LONG);
  ok("5.900 karakterlik Türkçe metinde uyarı yok", (await p.locator("[data-uygulama-ici-uzun]").count()) === 0);
  const s2 = await ctx({ ua: SAFARI }); const r = await s2.newPage();
  await r.goto(L2, { waitUntil: "load" }); await r.waitForSelector("[data-deneyim-metin]"); await r.waitForTimeout(700);
  ok("5.900 karakterlik Türkçe metin yeni tarayıcıda eksiksiz", (await r.inputValue("[data-deneyim-metin]")) === LONG, `adres ${L2.length} karakter`);
  await p.fill("[data-deneyim-metin]", LONG + " ek ".repeat(80)); await p.waitForTimeout(900);
  ok("6.000 üstü metin: aktarmadan önce uyarı görünüyor", (await p.locator("[data-uygulama-ici-uzun]").count()) === 1);
  await shot(p, "uzun-metin-uyari-390");
  await s2.close(); await ig.close(); await s.close();
}
/* ── A3) Depolama reddi + aynı sekmede kaydedilmemiş form metni ───────────── */
{
  const SL3 = "ali-ocakbasi-kadikoy";
  const TX = "Instagram'dan taşınan metin: Adana ve ezme çok iyiydi, servis hızlıydı; akşam kalabalıktı ama masamız çabuk hazırlandı.";
  const ig = await ctx({ ua: IG }); const p = await ig.newPage();
  await p.goto(`${B}/yaz/${SL3}/`, { waitUntil: "load" }); await p.waitForSelector("[data-deneyim-metin]");
  await p.fill("[data-deneyim-metin]", TX); await p.click("[data-genel-puan] [aria-label='Genel puan: 7']"); await p.waitForTimeout(900);
  const LINK = `${B}/yaz/${SL3}/${await p.evaluate(() => location.hash)}`;
  await ig.close();
  /* (1) tarayıcı taslak kaydını reddediyor (gizli sekme / dolu depo benzetimi) */
  const c = await ctx({ ua: SAFARI });
  await c.addInitScript(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "gidenler.taslak.v1" && !window.__izin) throw new DOMException("dolu", "QuotaExceededError"); return o.call(this, k, v); }; });
  const q = await c.newPage();
  await q.goto(LINK, { waitUntil: "load" }); await q.waitForSelector("[data-deneyim-metin]"); await q.waitForTimeout(700);
  ok("kayıt reddedildi: gelen metin ve puan ekranda", (await q.inputValue("[data-deneyim-metin]")) === TX && (await q.locator("[data-genel-puan] [aria-label='Genel puan: 7'][aria-checked='true']").count()) === 1);
  ok("kayıt reddedildi: uyarı + 'Metni kopyala' + 'Yeniden dene' görünüyor", (await q.locator("[data-aktarim-kaydedilemedi]").count()) === 1 && (await q.locator("[data-aktarim-kopyala]").count()) === 1 && (await q.locator("[data-aktarim-yeniden]").count()) === 1);
  ok("kayıt reddedildi: # adreste duruyor (yeniden yüklemede kaybolmasın)", (await q.evaluate(() => location.hash)).startsWith("#aktar="));
  await shot(q, "kayit-reddedildi-390");
  await q.reload({ waitUntil: "load" }); await q.waitForSelector("[data-deneyim-metin]"); await q.waitForTimeout(700);
  ok("yeniden yükleme: metin yine ekranda", (await q.inputValue("[data-deneyim-metin]")) === TX && (await q.locator("[data-aktarim-kaydedilemedi]").count()) === 1);
  await q.click("[data-aktarim-kopyala]"); await q.waitForTimeout(300);
  ok("'Metni kopyala' metni panoya koyar", (await q.evaluate(() => navigator.clipboard.readText().catch(() => ""))) === TX);
  await q.click("[data-aktarim-yeniden]"); await q.waitForTimeout(400);
  ok("depo hâlâ kapalıyken 'Yeniden dene': uyarı kalır, metin kaybolmaz", (await q.locator("[data-aktarim-kaydedilemedi]").count()) === 1 && (await q.inputValue("[data-deneyim-metin]")) === TX);
  await q.evaluate(() => { window.__izin = true; });
  await q.click("[data-aktarim-yeniden]"); await q.waitForTimeout(500);
  ok("depo açılınca 'Yeniden dene': kaydedildi, uyarı kalktı, # silindi", (await q.locator("[data-aktarim-kaydedilemedi]").count()) === 0 && (await q.evaluate((sl) => JSON.parse(localStorage.getItem("gidenler.taslak.v1") ?? "{}")[sl]?.body, SL3)) === TX && (await q.evaluate(() => location.hash)) === "");
  await c.close();
  /* (2) aynı sekme: form yazıldı, otomatik kayıt (700 ms) çalışmadan bağlantı yapıştırıldı */
  const c2 = await ctx({ ua: SAFARI }); const r = await c2.newPage();
  await r.goto(`${B}/yaz/${SL3}/`, { waitUntil: "load" }); await r.waitForSelector("[data-deneyim-metin]");
  const TYPED = "Bu sayfada az önce yazdığım ama henüz kaydedilmemiş farklı bir metin; kırk karakteri geçiyor.";
  await r.fill("[data-deneyim-metin]", TYPED);
  await r.goto(LINK, { waitUntil: "load" });
  await r.waitForSelector("[data-taslak-secim]", { timeout: 6000 }).catch(() => {});
  const stored0 = await r.evaluate((sl) => JSON.parse(localStorage.getItem("gidenler.taslak.v1") ?? "{}")[sl]?.body ?? null, SL3);
  ok("aynı sekme, kaydedilmemiş form metni: seçim ekranı açıldı", (await r.locator("[data-taslak-secim]").count()) === 1, `depoda=${stored0 === null ? "yok" : "var"}`);
  const mevcut = await r.locator("[data-taslak-aday='mevcut']").innerText().catch(() => "");
  ok("seçimde 'Bu sayfada şu an yazılı olan' = formdaki metin", mevcut.includes("ŞU AN YAZILI") || mevcut.toLocaleLowerCase("tr").includes("şu an yazılı") ? mevcut.includes(TYPED.slice(0, 40)) : false);
  ok("seçim beklerken formdaki metin duruyor", (await r.inputValue("[data-deneyim-metin]")) === TYPED);
  await shot(r, "ayni-sekme-secim-390");
  await r.click("[data-taslak-mevcut]"); await r.waitForTimeout(1200);
  ok("'Bu sayfadakiyle devam': formdaki metin korundu ve kaydedildi", (await r.inputValue("[data-deneyim-metin]")) === TYPED && (await r.evaluate((sl) => JSON.parse(localStorage.getItem("gidenler.taslak.v1") ?? "{}")[sl]?.body, SL3)) === TYPED);
  await c2.close();
}
/* ── A4) Yayımlanmış deneyim düzenlenirken aynı sekmede taslak bağlantısı: düzenleme formuna UYGULANMAZ ── */
{
  const auth = { ...HB, cookie: `${U.cookieName}=${U.cookieValue}` };
  const pub0 = ((await (await fetch(`${B}/api/me/reviews/?slug=${SL}`, { headers: auth })).json().catch(() => ({}))).reviews ?? [])[0];
  ok("A4 ön koşul: test kullanıcısının bu mekânda yayımlanmış deneyimi var", !!pub0 && pub0.body === TXT, pub0?.status);
  const INC4 = "Instagram'da yeni yazdığım başka bir ziyaret: bu kez akşam gittik, mercimek ve karnıyarık çok iyiydi, servis biraz yavaştı.";
  const ig = await ctx({ ua: IG }); const p = await ig.newPage();
  await p.goto(`${B}/yaz/${SL}/`, { waitUntil: "load" }); await p.waitForSelector("[data-deneyim-metin]");
  await p.fill("[data-deneyim-metin]", INC4); await p.click("[data-genel-puan] [aria-label='Genel puan: 5']"); await p.waitForTimeout(900);
  const LINK = `${B}/yaz/${SL}/${await p.evaluate(() => location.hash)}`;
  await ig.close();
  const s = await ctx({ ua: SAFARI }); await s.addCookies(cookieOf(U));
  const writes = []; s.on("request", (r) => { if (r.url().includes("/api/reviews") && r.method() !== "GET") writes.push(r.method()); });
  const q = await s.newPage();
  await q.goto(`${B}/yaz/${SL}/`, { waitUntil: "load" }); await q.waitForSelector("[data-yeni-ziyaret]", { timeout: 15000 }).catch(() => {});
  ok("düzenleme kipi açıldı: formda yayımlanmış metin", (await q.locator("[data-yeni-ziyaret]").count()) === 1 && (await q.inputValue("[data-deneyim-metin]")) === TXT);
  const EDITED = TXT + " Düzenleme: tatlı olarak kazandibi de denedik.";
  await q.fill("[data-deneyim-metin]", EDITED); await q.waitForTimeout(300);
  const stored = () => q.evaluate((sl) => JSON.parse(localStorage.getItem("gidenler.taslak.v1") ?? "{}")[sl]?.body ?? null, SL);
  const st0 = await stored();
  /* aynı sekmeye yapıştırma: yalnız # değişir, sayfa yeniden yüklenmez */
  await q.goto(LINK, { waitUntil: "load" }); await q.waitForSelector("[data-aktarim-duzenleme]", { timeout: 6000 }).catch(() => {});
  ok("aynı sekme + düzenleme kipi: gelen taslak kutusu görünüyor", (await q.locator("[data-aktarim-duzenleme]").count()) === 1);
  ok("düzenleme formu DEĞİŞMEDİ (gelen metin uygulanmadı)", (await q.inputValue("[data-deneyim-metin]")) === EDITED && (await q.locator("[data-genel-puan] [aria-label='Genel puan: 5'][aria-checked='true']").count()) === 0);
  ok("düzenleme kipi korunuyor, seçim ekranı ve kayıt uyarısı yok", (await q.locator("[data-yeni-ziyaret]").count()) === 1 && (await q.locator("[data-taslak-secim]").count()) === 0 && (await q.locator("[data-aktarim-kaydedilemedi]").count()) === 0);
  ok("kutuda gelen metin gösteriliyor; # adreste bekliyor; yerel depo değişmedi", (await q.locator("[data-aktarim-bekleyen]").innerText()).includes(INC4.slice(0, 60)) && (await q.evaluate(() => location.hash)).startsWith("#aktar=") && (await stored()) === st0);
  await q.waitForTimeout(1200);
  ok("bekleme sırasında otomatik kayıt / istek yok; sunucudaki deneyim aynen", writes.length === 0 && (((await (await fetch(`${B}/api/me/reviews/?slug=${SL}`, { headers: auth })).json().catch(() => ({}))).reviews ?? [])[0]?.body === TXT));
  await shot(q, "duzenleme-aktarim-390", true);
  await q.click("[data-aktarim-gelen-kopyala]"); await q.waitForTimeout(300);
  ok("'Metni kopyala' gelen metni panoya koyar", (await q.evaluate(() => navigator.clipboard.readText().catch(() => ""))) === INC4);
  await q.click("[data-aktarim-birak]"); await q.waitForTimeout(400);
  ok("'Bırak': kutu kapandı, # silindi, düzenleme metni aynen", (await q.locator("[data-aktarim-duzenleme]").count()) === 0 && (await q.evaluate(() => location.hash)) === "" && (await q.inputValue("[data-deneyim-metin]")) === EDITED);
  /* yeniden yapıştır → 'Ayrı ziyaret olarak yaz' */
  await q.goto(LINK, { waitUntil: "load" }); await q.waitForSelector("[data-aktarim-ayri]", { timeout: 6000 }).catch(() => {});
  await q.click("[data-aktarim-ayri]"); await q.waitForTimeout(800);
  const m4 = await q.inputValue("select[aria-label='Ziyaret ayı']");
  ok("'Ayrı ziyaret olarak yaz': yeni deneyim formu gelen taslakla, farklı ay, düzenleme kipi kapalı", (await q.inputValue("[data-deneyim-metin]")) === INC4 && (await q.locator("[data-genel-puan] [aria-label='Genel puan: 5'][aria-checked='true']").count()) === 1 && (await q.locator("[data-yeni-ziyaret]").count()) === 0 && m4 !== pub0?.visitedOn?.slice(0, 7), `ay ${m4}`);
  ok("ayrı ziyaret taslağı bu cihaza kaydedildi, # silindi; hiçbir şey yayınlanmadı", (await stored()) === INC4 && (await q.evaluate(() => location.hash)) === "" && writes.length === 0);
  await q.evaluate((sl) => { const a = JSON.parse(localStorage.getItem("gidenler.taslak.v1") ?? "{}"); delete a[sl]; localStorage.setItem("gidenler.taslak.v1", JSON.stringify(a)); }, SL);
  /* yeni sekmede açılış: sayfa baştan yüklenir, düzenleme kipi sunucu yanıtıyla sonradan anlaşılır */
  const q2 = await s.newPage();
  await q2.goto(LINK, { waitUntil: "load" }); await q2.waitForSelector("[data-aktarim-duzenleme]", { timeout: 15000 }).catch(() => {});
  ok("yeni sekme + düzenleme kipi: formda sunucudaki metin, gelen taslak kutuda", (await q2.locator("[data-aktarim-duzenleme]").count()) === 1 && (await q2.inputValue("[data-deneyim-metin]")) === TXT && (await q2.locator("[data-taslak-secim]").count()) === 0);
  await q2.reload({ waitUntil: "load" }); await q2.waitForSelector("[data-aktarim-duzenleme]", { timeout: 15000 }).catch(() => {});
  ok("yeniden yükleme: gelen taslak kaybolmadı, form yine sunucudaki metin", (await q2.locator("[data-aktarim-duzenleme]").count()) === 1 && (await q2.inputValue("[data-deneyim-metin]")) === TXT);
  const st2 = () => q2.evaluate((sl) => JSON.parse(localStorage.getItem("gidenler.taslak.v1") ?? "{}")[sl]?.body ?? null, SL);
  await q2.click("[data-aktarim-birak]").catch(() => {}); await q2.waitForTimeout(400);
  ok("yeni sekmede 'Bırak': kutu kapandı, # silindi, bu cihaza yazılan aynı kopya da silindi", (await q2.locator("[data-aktarim-duzenleme]").count()) === 0 && (await q2.evaluate(() => location.hash)) === "" && (await st2()) === null);
  await q2.reload({ waitUntil: "load" }); await q2.waitForSelector("[data-yeni-ziyaret]", { timeout: 15000 }).catch(() => {}); await q2.waitForTimeout(500);
  ok("'Bırak' sonrası yenileme: kutu yok, form sunucudaki metin", (await q2.locator("[data-aktarim-duzenleme]").count()) === 0 && (await q2.inputValue("[data-deneyim-metin]")) === TXT);
  const pub1 = ((await (await fetch(`${B}/api/me/reviews/?slug=${SL}`, { headers: auth })).json().catch(() => ({}))).reviews ?? []);
  ok("A4 sonunda yayımlanmış deneyim tek ve değişmemiş", pub1.length === 1 && pub1[0].body === TXT && writes.length === 0, `istek=${writes.length}`);
  await s.close();
}
const rep = await (await fetch(`${B}/yonetim/kampanya/`, { headers: HB })).text();
ok("kampanya panosunda 'Uygulama içi tarayıcıda açtı' sütunu", rep.includes("Uygulama içi tarayıcıda açtı"));
const cell = (code, step) => Number(rep.match(new RegExp(`data-kampanya-satir="${code}"[\\s\\S]*?data-adim="${step}"[^>]*>(\\d+)<`))?.[1] ?? -1);
ok("ic05: uygulama içi açılış ve SUNUCUDA kaydedilen deneyim ayrı ayrı sayıldı", cell("ic05", "uygulamaici") >= 1 && cell("ic05", "tamam") >= 1, `uygulamaici=${cell("ic05", "uygulamaici")} tamam=${cell("ic05", "tamam")} ziyaret=${cell("ic05", "ziyaret")}`);
const prof = await (await fetch(`${B}/mekan/${SL}/`, { headers: HB })).text();
ok("Instagram'dan başlayan deneyim restoranın profilinde görünüyor", prof.includes("Instagram'dan geldim") || prof.includes("Instagram&#x27;dan geldim"));

/* ── B) Ana sayfa genişlikleri ─────────────────────────────────────── */
const homeIssues = {};
for (const [w, h, m] of [[375, 812, true], [390, 844, true], [768, 1024, true], [1280, 800, false], [1440, 900, false]]) {
  const c = await ctx({ w, h, mobile: m }); const p = await c.newPage();
  await p.goto(`${B}/`, { waitUntil: "networkidle" });
  await shot(p, `ana-${w}-ilk`); await shot(p, `ana-${w}-tam`, true);
  const r = await p.evaluate(() => {
    const vis = (e) => { const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const overflow = document.documentElement.scrollWidth > innerWidth + 1;
    const clipped = [...document.querySelectorAll("h1,h2,h3")].filter((e) => vis(e) && e.scrollWidth > e.clientWidth + 2).map((e) => e.textContent.trim().slice(0, 40));
    const small = [...document.querySelectorAll("a,button")].filter((e) => vis(e) && e.closest("main")).map((e) => [e, e.getBoundingClientRect()]).filter(([, b]) => b.height < 32 && b.width < 32).map(([e]) => (e.getAttribute("aria-label") ?? e.textContent).trim().slice(0, 30));
    const lowres = [...document.querySelectorAll("main img")].filter((i) => vis(i) && i.complete && i.naturalWidth > 0 && i.naturalWidth < i.getBoundingClientRect().width * devicePixelRatio * 0.75).map((i) => `${i.naturalWidth}<${Math.round(i.getBoundingClientRect().width * devicePixelRatio)}`);
    const broken = [...document.querySelectorAll("main img")].filter((i) => i.complete && i.naturalWidth === 0 && vis(i)).length;
    const order = ["[data-ana-hero]", "#h-eniyiler", "[data-ana-pano]", "[data-ana-son-yemek]", "[data-ana-kesif]", "[data-ana-sor]", "#h-explore"].map((s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : -1; });
    const navFits = (() => { const e = [...document.querySelectorAll("nav[aria-label='Bölümler'] a")].pop(); return !e || getComputedStyle(e.parentElement).display === "none" || e.getBoundingClientRect().right <= innerWidth - 4; })();
    const ctaInFirst = (() => { const e = document.querySelector("[data-hero-deneyim]"); return e ? e.getBoundingClientRect().bottom <= innerHeight : false; })();
    return { overflow, clipped, small, lowres, broken, order, ctaInFirst, navFits, height: document.documentElement.scrollHeight };
  });
  homeIssues[w] = r;
  ok(`ana ${w}: yatay taşma yok, kesik başlık yok, kırık görsel yok`, !r.overflow && r.clipped.length === 0 && r.broken === 0, `kesik=${r.clipped.length} küçük=${r.small.length} düşükçöz=${r.lowres.length}`);
  ok(`ana ${w}: deneyim çağrısı ilk ekranda`, r.ctaInFirst);
  ok(`ana ${w}: üst menüde 'Deneyim yaz' ekranda, kesik değil`, r.navFits);
  await c.close();
}

/* ── C) 23 restoran profili ─────────────────────────────────────────── */
const PROF = ["pandeli-fatih", "japon-erdal-beyoglu", "kanaat-lokantasi-uskudar", "cukur-meyhane-beyoglu", "viktor-levi-sarap-evi-kadikoy", "karakoy-lokantasi-beyoglu", "ali-ocakbasi-kadikoy", "bebek-balikci-besiktas", "tarihi-eminonu-balikcisi-kadikoy", "nabu-karakoy-beyoglu", "kronotrop-cihangir-beyoglu", "mandabatmaz-beyoglu", "durak-bufe-besiktas", "700-gram-kadikoy", "halil-lahmacun-kadikoy", "donerci-hamdi-usta-kadikoy", "savoy-beyoglu", "etci-mehmet-bakirkoy", "niwa-tuzla", "bay-manti-uskudar", "geyik-beyoglu", "balkaya-pastanesi-erol-usta-sisli", "refik-beyoglu"];
const matrix = [];
{
  const c = await ctx({ w: 390, h: 844 }); const p = await c.newPage();
  for (const s of PROF) {
    const r0 = await p.goto(`${B}/mekan/${s}/`, { waitUntil: "load" }).catch(() => null); await p.waitForTimeout(1200);
    const m = await p.evaluate((slug) => {
      const T = document.body.innerText;
      const links = [...document.querySelectorAll("main a[href]")].map((a) => a.getAttribute("href"));
      const ext = links.filter((h) => /^https?:/.test(h) && !h.includes(location.host));
      const heroImg = [...document.querySelectorAll("main img")].filter((i) => i.getBoundingClientRect().top < 900 && i.naturalWidth > 0).length;
      /* büyük boşluk: görünür bloklar arasında 260px+ boş dikey alan */
      const blocks = [...document.querySelectorAll("main section, main header, main article, main aside")].map((e) => e.getBoundingClientRect()).filter((b) => b.height > 0).map((b) => [b.top + scrollY, b.bottom + scrollY]).sort((a, b) => a[0] - b[0]);
      let gap = 0, end = blocks[0]?.[1] ?? 0; for (const [t, bt] of blocks) { if (t - end > gap) gap = t - end; end = Math.max(end, bt); }
      const emptySections = [...document.querySelectorAll("main section")].filter((e) => e.getBoundingClientRect().height > 0 && e.innerText.trim().length < 40).length;
      return {
        h1: document.querySelector("h1")?.textContent?.trim().slice(0, 60) ?? "",
        district: /İstanbul|Beyoğlu|Kadıköy|Üsküdar|Fatih|Beşiktaş|Şişli|Sarıyer|Bakırköy|Tuzla/.test(T),
        address: /Adres/.test(T), photo: heroImg > 0,
        google: !!document.querySelector("[data-google-puan]"), gidenler: /Gidenler puanı|\/10/.test(T),
        experiences: /Gidenler deneyimleri|deneyim/i.test(T), write: links.includes(`/yaz/${slug}/`),
        want: /Gitmek istiyorum/.test(T), map: ext.some((h) => /google\.[a-z.]+\/maps|maps\.apple|openstreetmap|goo\.gl\/maps/.test(h)) || /Haritada/.test(T),
        phone: links.some((h) => h.startsWith("tel:")), menu: /Menü/.test(T), reservation: ext.filter((h) => /rezerv|reserv|opentable|yemeksepeti|getir|bookingsuite|tablebooker|resy|sevenrooms|quandoo/i.test(h)).length,
        seckisi: links.some((h) => h.startsWith("/seckisi/")), closedNote: !!document.querySelector("[data-kapanis]"),
        maxGap: Math.round(gap), emptySections, len: document.documentElement.scrollHeight, extDomains: [...new Set(ext.map((h) => { try { return new URL(h).host; } catch { return "?"; } }))],
      };
    }, s);
    matrix.push({ slug: s, status: r0?.status() ?? 0, ...m });
    await shot(p, `profil-${s}`, true);
  }
  await c.close();
}
writeFileSync(`${OUT}/profil-matris.json`, JSON.stringify(matrix, null, 1));
writeFileSync(`${OUT}/ana-sayfa.json`, JSON.stringify(homeIssues, null, 1));
ok(`23 profil 200`, matrix.every((m) => m.status === 200), matrix.filter((m) => m.status !== 200).length);
ok(`profillerde 'Deneyim yaz' bağlantısı`, matrix.every((m) => m.write || m.closedNote), matrix.filter((m) => !m.write).length);
const cnt = (k) => matrix.filter((m) => m[k]).length;
console.log("profil alanları", JSON.stringify({ foto: cnt("photo"), adres: cnt("address"), google: cnt("google"), gidenler: cnt("gidenler"), harita: cnt("map"), telefon: cnt("phone"), menu: cnt("menu"), seckisi: cnt("seckisi"), gitmek: cnt("want"), rezervasyonBag: matrix.reduce((a, m) => a + m.reservation, 0), buyukBosluk: matrix.filter((m) => m.maxGap > 260).length, bosBolum: matrix.reduce((a, m) => a + m.emptySections, 0) }));
ok("Google ücretli uçlarına istek gitmedi (engelli, sayılan)", true, googleCalls);

/* ── D) Yasal sayfalar, paylaşım kartı, dil ────────────────────────── */
const get = async (p) => { const r = await fetch(`${B}${p}`, { headers: HB }); return { s: r.status, t: await r.text() }; };
const gz = await get("/gizlilik/"), kk = await get("/kullanim-kosullari/");
ok("/gizlilik/ ve /kullanim-kosullari/ 200, canonical doğru", gz.s === 200 && kk.s === 200 && gz.t.includes('rel="canonical" href="https://www.gidenler.com/gizlilik/"') && kk.t.includes('href="https://www.gidenler.com/kullanim-kosullari/"'));
const home = await get("/");
ok("altbilgide iki yasal bağlantı", home.t.includes('href="/gizlilik/"') && home.t.includes('href="/kullanim-kosullari/"'));
ok("paylaşım kartı: og:image, og:site_name, og:locale", /property="og:image" content="[^"]*opengraph-image/.test(home.t) && home.t.includes('property="og:site_name" content="Gidenler"') && home.t.includes('content="tr_TR"'));
const ogi = await fetch(`${B}/opengraph-image`, { headers: HB }); ok("paylaşım görseli PNG 200", ogi.status === 200 && (ogi.headers.get("content-type") ?? "").includes("image/png"));
const ny = await get("/nerede-yedin/?k=ic01"); ok("kampanya sayfasında da paylaşım görseli", /og:image" content="[^"]*opengraph-image/.test(ny.t));
const en = await get("/seckisi/en/"); ok("İngilizce Seçki: içerik lang=en, og:locale en_US", en.t.includes('<div lang="en">') && en.t.includes('content="en_US"'));
const sm = await get("/sitemap.xml"); ok("sitemap yasal sayfaları içerir", sm.t.includes("/gizlilik/") && sm.t.includes("/kullanim-kosullari/"));

await browser.close();
writeFileSync(`${OUT}/sonuc.json`, JSON.stringify(sonuc, null, 1));
const k = sonuc.filter(([, c]) => !c).length;
console.log(`\nGECE E2E: ${sonuc.length - k}/${sonuc.length} geçti`);
process.exit(k ? 1 : 0);
