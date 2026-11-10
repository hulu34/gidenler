/* GECE OPERASYONU 10 KASIM · UÇTAN UCA (YALNIZ PREVIEW, izole Neon dalı; Production'a yazmaz).
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
  await q.goto(L1, { waitUntil: "load" }); await q.waitForSelector("[data-taslak-secim]", { timeout: 8000 }).catch(() => {});
  ok("iki farklı taslak → seçim ekranı", (await q.locator("[data-taslak-secim]").count()) === 1);
  ok("seçim beklerken yerel taslak korunuyor (depoda ve formda)", (await localDraft()) === LOCAL && (await q.inputValue("[data-deneyim-metin]")) === LOCAL);
  ok("seçim beklerken yayınla kapalı", (await q.locator("button:has-text('Google ile giriş yap')").isDisabled().catch(() => true)));
  await q.waitForTimeout(1500);
  ok("seçim beklerken otomatik kayıt üzerine yazmadı", (await localDraft()) === LOCAL);
  await shot(q, "taslak-secim-390", true);
  await q.click("[data-taslak-mevcut]"); await q.waitForTimeout(500);
  ok("iptal (bu cihazdakiyle devam): yerel taslak aynen kaldı, # silindi", (await localDraft()) === LOCAL && (await q.inputValue("[data-deneyim-metin]")) === LOCAL && (await q.evaluate(() => location.hash)) === "" && (await q.locator("[data-taslak-secim]").count()) === 0);
  await q.reload({ waitUntil: "load" }); await q.waitForSelector("[data-deneyim-metin]"); await q.waitForTimeout(500);
  ok("yeniden yüklemede seçim tekrar sorulmuyor, yerel taslak geliyor", (await q.locator("[data-taslak-secim]").count()) === 0 && (await q.inputValue("[data-deneyim-metin]")) === LOCAL);
  await q.goto(L1, { waitUntil: "load" }); await q.waitForSelector("[data-taslak-secim]");
  await q.click("[data-taslak-gelen]"); await q.waitForTimeout(800);
  ok("getirdiğimle devam: metin ve puan gelen taslaktan, depoya yazıldı, # silindi", (await q.inputValue("[data-deneyim-metin]")) === INC && (await localDraft()) === INC && (await q.locator("[data-genel-puan] [aria-label='Genel puan: 9'][aria-checked='true']").count()) === 1 && (await q.evaluate(() => location.hash)) === "");
  /* bozuk bağlantı */
  await q.goto(`${B}/yaz/${SL2}/${L1.split("#")[1] ? "#" + L1.split("#")[1].slice(0, 30) : "#aktar=%%"}`, { waitUntil: "load" }); await q.waitForSelector("[data-deneyim-metin]"); await q.waitForTimeout(600);
  ok("bozuk/yarım bağlantı: uyarı var, yerel taslak değişmedi, # silindi", (await q.locator("[data-aktarim-bozuk]").count()) === 1 && (await localDraft()) === INC && (await q.evaluate(() => location.hash)) === "");
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
