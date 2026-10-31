/* Fotoğraf sistemi uçtan uca · YALNIZ PREVIEW. Veritabanı izolasyonu doğrulanmadan başlamaz. Görseller tuvalde üretilmiş test karesidir.
   Chromium mobil öykünmesi gerçek iPhone/Safari testi DEĞİLDİR. Çıktı şifreli; log yalnız doğru/yanlış. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const HOST = process.env.PREVIEW_HOST, BASE = `https://${HOST}`;
const OUT = "out/medya"; mkdirSync(OUT, { recursive: true });
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const adminUrl = `${BASE}/api/admin/db/`;
const SLUG = "pidem-fatih", JAPON = "japon-erdal-beyoglu";
const sonuc = []; const ok = (n, c, i = "") => { sonuc.push([n, !!c]); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const admin = async (b) => { const r = await fetch(adminUrl, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", confirm: "EVET", ...b }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

const durum = await (await fetch(adminUrl, { headers: HB })).json().catch(() => ({}));
const izole = durum.env === "preview" && durum.db?.writeGuard?.ok === true;
ok("izolasyon: Preview ortamı ve üretim dışı veritabanı", izole, `env=${durum.env} kilit=${durum.db?.writeGuard?.reason ?? "açık"}`);
writeFileSync(`${OUT}/ortam.json`, JSON.stringify({ env: durum.env, db: durum.db, migrations: durum.migrations }, null, 1));
if (!izole) process.exit(1);
const mg = await admin({ action: "migrate" });
ok("geçiş 0002 Preview'a uygulandı", mg.s === 200 && (mg.j.status?.pending ?? ["?"]).length === 0, JSON.stringify(mg.j.status?.pending));

const hesap = async (mode) => { const { s, j } = await admin({ action: "medya-test-oturum", mode }); if (s !== 200) throw new Error(`oturum ${s} ${JSON.stringify(j)}`); return j; };
const [D, I, A, Y, M] = [await hesap(), await hesap(), await hesap(), await hesap(), await hesap("moderator")];
ok("test hesapları", [D, I, A, Y, M].every((x) => x.cookieName));
const ck = (u) => `${u.cookieName}=${u.cookieValue}`;
const api = (path, { u, method = "GET", body, origin = BASE, headers = {} } = {}) => fetch(`${BASE}${path}`, { method, body, redirect: "manual", headers: { ...HB, ...(u ? { cookie: ck(u) } : {}), ...(method !== "GET" && origin ? { origin } : {}), ...headers } });
const jsonBody = (o) => ({ body: JSON.stringify(o), headers: { "content-type": "application/json" } });

const br = await chromium.launch();
/* test karesi: tuvalde üretilir, üzerinde "test" yazar */
const tp = await (await br.newContext()).newPage();
const kare = async (hue, label, w = 1400, h = 1000) => Buffer.from((await tp.evaluate(([hue, label, w, h]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${hue} 60% 40%)`); g.addColorStop(1, `hsl(${(hue + 60) % 360} 60% 60%)`); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { x.fillStyle = `hsla(${(hue + i) % 360} 70% 50% / .25)`; x.fillRect((i * 97) % w, (i * 53) % h, 60, 60); } x.fillStyle = "#fff"; x.font = "bold 64px sans-serif"; x.fillText("TEST GÖRSELİ", 80, 140); x.fillText(label, 80, 230); return c.toDataURL("image/jpeg", 0.9); }, [hue, label, w, h])).split(",")[1], "base64");
const form = (buf, rights = "own", name = "foto.jpg", type = "image/jpeg") => { const f = new FormData(); f.set("file", new Blob([buf], { type }), name); if (rights) f.set("rights", rights); return f; };
const yukle = (u, rid, buf, o = {}) => api(`/api/reviews/${rid}/photos/`, { u, method: "POST", body: form(buf, o.rights ?? "own", o.name, o.type), origin: o.origin ?? BASE });
const modListe = async (status = "pending") => (await (await api(`/api/moderation/photos/?status=${status}`, { u: M })).json()).rows ?? [];
const mod = async (id, action, extra = {}) => { const b = jsonBody({ id, action, ...extra }); return api("/api/moderation/photos/", { u: M, method: "POST", body: b.body, headers: b.headers }); };
const adres = (s) => `${BASE}/mekan/${s}/`;

/* ── oturumsuz ve yetkisiz ── */
const YOK = "00000000-0000-7000-8000-000000000000";
ok("oturumsuz yükleme 401", (await api(`/api/reviews/${YOK}/photos/`, { method: "POST", body: form(await kare(10, "x")) })).status === 401);
ok("başka kökenden yükleme 403", (await yukle(D, YOK, await kare(10, "x"), { origin: "https://kotu.example" })).status === 403);
ok("oturumsuz moderasyon 401", (await api("/api/moderation/photos/")).status === 401);
ok("kullanıcı moderasyon listesi 403", (await api("/api/moderation/photos/", { u: D })).status === 403);
const b0 = jsonBody({ id: YOK, action: "approve" });
ok("kullanıcı onaylayamaz 403", (await api("/api/moderation/photos/", { u: D, method: "POST", body: b0.body, headers: b0.headers })).status === 403);
ok("istemci rol başlığı işe yaramaz", (await api("/api/moderation/photos/", { u: D, headers: { "x-role": "admin" } })).status === 403);
ok("moderasyon sayfası kullanıcıya 404", (await api("/yonetim/fotograf-moderasyon/", { u: D })).status === 404);
ok("sağlık sayfası kullanıcıya 404", (await api("/yonetim/medya-saglik/", { u: D })).status === 404);
ok("yönetim sayfası oturumsuz 404", (await api("/yonetim/fotograf-moderasyon/")).status === 404);
ok("yükleme durumu açık", (await (await api("/api/media/status/")).json()).enabled === true);

/* ── arayüz: üç boyut ── */
const CIHAZ = [["masaustu", D, { viewport: { width: 1366, height: 900 } }], ["iphone-emulasyon", I, { ...devices["iPhone 14"], defaultBrowserType: undefined }], ["android-emulasyon", A, { ...devices["Pixel 7"], defaultBrowserType: undefined }]];
const hatalar = [];
const baglam = async (u, o = {}) => { const ctx = await br.newContext(o); await yetkiliBaslik(ctx, HOST, { ...HB, "x-vercel-set-bypass-cookie": "true" }); if (u) await ctx.addCookies([{ name: u.cookieName, value: u.cookieValue, domain: HOST, path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]); return ctx; };
const izle = (p, ad) => { p.on("pageerror", (e) => hatalar.push(`${ad}: ${e.message.slice(0, 160)}`)); };
const puanMetni = async (p) => ((await p.locator("main").first().innerText().catch(() => "")).replace(/\s+/g, " ").match(/Gidenler puanı [^·]{0,60}/) ?? [""])[0];

const on = await baglam(null); const onP = await on.newPage(); await onP.goto(adres(SLUG), { waitUntil: "networkidle" });
const puan0 = await puanMetni(onP); await on.close();

let hue = 20;
for (const [ad, u, o] of CIHAZ) {
  const ctx = await baglam(u, o); const p = await ctx.newPage(); izle(p, ad);
  await p.goto(`${BASE}/yaz/${SLUG}/`, { waitUntil: "networkidle" });
  await p.locator('[aria-label="Deneyim metni"]').fill(`${ad} testinde yazılan örnek metin; öğle saatinde gidildi, servis hızlıydı ve pide sıcaktı.`);
  await p.locator('[aria-label="Ziyaret ayı"]').selectOption({ index: 1 });
  await p.locator('[aria-label="Genel puan: 8"]').click();
  await p.getByRole("button", { name: "evet", exact: true }).first().click();
  ok(`${ad}: fotoğraf alanı görünür ve restoran yazılı`, (await p.locator("#fotograf").innerText()).includes("Pidem"));
  const girdi = p.locator('#fotograf input[type="file"]');
  await girdi.setInputFiles([{ name: "a.jpg", mimeType: "image/jpeg", buffer: await kare(hue += 40, `${ad} 1`) }, { name: "b.jpg", mimeType: "image/jpeg", buffer: await kare(hue += 40, `${ad} 2`) }, { name: "c.jpg", mimeType: "image/jpeg", buffer: await kare(hue += 40, `${ad} 3`) }]);
  await p.waitForTimeout(400);
  ok(`${ad}: üç önizleme`, (await p.locator('#fotograf img[alt^="Seçilen"]').count()) === 3);
  await p.locator('#fotograf [aria-label="Bu fotoğrafı kaldır"]').last().click();
  ok(`${ad}: kaldırınca iki önizleme`, (await p.locator('#fotograf img[alt^="Seçilen"]').count()) === 2);
  const yay = p.getByRole("button", { name: "Deneyimi yayınla" });
  ok(`${ad}: hak onayı olmadan yayın kapalı`, await yay.isDisabled());
  await p.locator('#fotograf input[type="checkbox"]').check();
  await p.locator("#fotograf").scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/1-onizleme-${ad}.png` });
  ok(`${ad}: yatay kaydırma yok`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await yay.click();
  await p.locator("[data-photo-results]").waitFor({ timeout: 20000 });
  await p.getByText(/2 fotoğraf incelemeye alındı/).waitFor({ timeout: 60000 }).then(() => ok(`${ad}: iki fotoğrafın gerçek sonucu`, true), async () => ok(`${ad}: iki fotoğrafın gerçek sonucu`, false, (await p.locator("[data-photo-results]").innerText()).slice(0, 200)));
  await p.screenshot({ path: `${OUT}/2-sonuc-${ad}.png`, fullPage: true });
  await ctx.close();
}

const bekleyen = (await modListe()).filter((r) => r.slug === SLUG);
ok("kuyrukta altı fotoğraf", bekleyen.length === 6, bekleyen.length);
ok("listede e-posta yok", !JSON.stringify(bekleyen).includes("example.invalid"));
const rid = bekleyen.find((r) => r.uploader.startsWith("Test"))?.reviewId;
const sahipD = bekleyen[bekleyen.length - 1];

/* ── sunucu doğrulaması ── */
const Dr = (await (await api(`/api/reviews/${sahipD.reviewId}/photos/`, { u: D })).json()).photos?.length ? sahipD.reviewId : bekleyen.map((r) => r.reviewId).find((x) => x);
const benim = async (u) => { for (const r of new Set(bekleyen.map((x) => x.reviewId))) { const j = await (await api(`/api/reviews/${r}/photos/`, { u })).json(); if (j.photos?.length) return { r, ph: j.photos }; } return null; };
const dBen = await benim(D), iBen = await benim(I);
ok("kişi yalnız kendi fotoğraflarını görür", dBen && iBen && dBen.r !== iBen.r);
ok("başkasının deneyimine yükleme 403", (await yukle(I, dBen.r, await kare(300, "yabancı"))).status === 403);
ok("hak onayı yok 400", (await yukle(D, dBen.r, await kare(301, "haksız"), { rights: "yok" })).status === 400);
ok("metin dosyası jpg adıyla reddedilir", (await yukle(D, dBen.r, Buffer.from("bu bir görsel değil ama .jpg adını taşıyor"))).status === 415);
ok("svg reddedilir", (await yukle(D, dBen.r, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'), { name: "a.svg", type: "image/svg+xml" })).status === 415);
const iyi = await kare(302, "kes");
ok("bozuk jpeg reddedilir", (await yukle(D, dBen.r, iyi.subarray(0, 400))).status === 422);
ok("boş dosya reddedilir", (await yukle(D, dBen.r, Buffer.alloc(0))).status >= 400);
ok("küçük görsel reddedilir", (await yukle(D, dBen.r, await kare(303, "k", 200, 200))).status === 422);
ok("4 MB üstü reddedilir", (await yukle(D, dBen.r, Buffer.concat([iyi, Buffer.alloc(4.1 * 1024 * 1024)]))).status === 413);
/* EXIF: sahte konum işaretli dosya işlenince iz kalmamalı */
const IZ = "GIZLI_KONUM_41_0082";
const tiff = Buffer.concat([Buffer.from("Exif\0\0"), Buffer.from([0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0]), Buffer.from(IZ)]);
const seg = Buffer.concat([Buffer.from([0xff, 0xe1, (tiff.length + 2) >> 8, (tiff.length + 2) & 255]), tiff]);
const exifli = Buffer.concat([iyi.subarray(0, 2), seg, iyi.subarray(2)]);
ok("kaynak dosyada iz var (sınama kendisi)", exifli.includes(IZ));
const ex = await yukle(D, dBen.r, exifli); const exj = await ex.json();
ok("EXIF'li dosya kabul edildi", ex.status === 201, ex.status);
const exv = (await (await api(`/api/reviews/${dBen.r}/photos/`, { u: D })).json()).photos.find((x) => x.id === exj.id);
const exFile = await api(`/api/media/file/${exv.thumb}`, { u: D });
const exB = Buffer.from(await exFile.arrayBuffer());
ok("yükleyen kendi bekleyenini görür; webp", exFile.status === 200 && exB.subarray(8, 12).toString() === "WEBP" && exFile.headers.get("cache-control").includes("no-store"));
ok("işlenen dosyada EXIF ve konum izi yok", !exB.includes(IZ) && !exB.includes("Exif"));
ok("aynı dosya tekrar 409", (await yukle(D, dBen.r, exifli)).status === 409);
ok("başkası aynı dosyayı aynı mekâna 409", (await yukle(I, iBen.r, exifli)).status === 409);
ok("bekleyen dosya oturumsuz 404", (await api(`/api/media/file/${exv.thumb}`)).status === 404);
ok("bekleyen dosya başka kullanıcıya 404", (await api(`/api/media/file/${exv.thumb}`, { u: I })).status === 404);
ok("bekleyen dosya moderatöre 200", (await api(`/api/media/file/${exv.thumb}`, { u: M })).status === 200);
ok("anahtar kaçışı reddedilir", (await api(`/api/media/file/pending/..%2F..%2Fetc/480.webp`, { u: M })).status === 404);
const sayfa0 = await (await api(`/mekan/${SLUG}/?v=${Date.now()}`)).text();
ok("onaysız fotoğraf profilde yok", !bekleyen.some((r) => sayfa0.includes(r.id)));
const delB = await api(`/api/reviews/${dBen.r}/photos/${exj.id}/`, { u: I, method: "DELETE" });
ok("başkasının fotoğrafını kaldıramaz", delB.status === 404);
ok("kendi fotoğrafını kaldırır", (await api(`/api/reviews/${dBen.r}/photos/${exj.id}/`, { u: D, method: "DELETE" })).status === 200);

/* ── moderasyon arayüzü ── */
const mCtx = await baglam(M, { viewport: { width: 1366, height: 1000 } }); const mp = await mCtx.newPage(); izle(mp, "moderator");
await mp.goto(`${BASE}/yonetim/fotograf-moderasyon/`, { waitUntil: "networkidle" });
await mp.screenshot({ path: `${OUT}/3-moderasyon-kuyruk.png` });
mp.on("dialog", (d) => d.accept());
const [x1, x2, x3] = bekleyen.map((r) => r.id);
const kart = (id) => mp.locator(`[data-photo="${id}"]`);
ok("kuyrukta büyük önizleme açılır", await kart(x1).locator("img").first().evaluate((i) => i.complete && i.naturalWidth > 0));
await kart(x1).getByRole("button", { name: "Onayla" }).click(); await mp.getByText("Kaydedildi.").waitFor();
ok("gerekçesiz red düğmesi kapalı", await kart(x2).getByRole("button", { name: "Reddet" }).isDisabled());
await kart(x2).getByLabel("Gerekçe").fill("Yanlış restoran"); await kart(x2).getByRole("button", { name: "Reddet" }).click(); await mp.waitForTimeout(1500);
const rj = await modListe("rejected"); ok("red gerekçesiyle kaydedildi", rj.find((r) => r.id === x2)?.rejectReason === "Yanlış restoran");
ok("reddedilen dosya kalmadı", rj.find((r) => r.id === x2) && (await api(`/api/media/file/pending/${x2}/480.webp`, { u: M })).status === 404);
await mp.getByRole("tab", { name: "Onaylı" }).click(); await kart(x1).waitFor();
await mp.screenshot({ path: `${OUT}/5-kapak-secimi.png` });
ok("onay kapağı değiştirmez", !(await modListe("approved")).find((r) => r.id === x1)?.isCover);

const profil = async (s, o = {}) => { const ctx = await baglam(null, o); const p = await ctx.newPage(); izle(p, "profil"); const g = []; p.on("request", (r) => { if (/\/api\/google\/|googleapis/.test(r.url())) g.push(r.url()); }); await p.goto(`${adres(s)}?v=${Date.now()}`, { waitUntil: "networkidle" }); await p.waitForTimeout(1000); return { ctx, p, g }; };
{
  const { ctx, p, g } = await profil(SLUG, { ...devices["iPhone 14"], defaultBrowserType: undefined });
  const html = await p.content();
  ok("onaylı fotoğraf galeride", html.includes(x1));
  ok("reddedilen galeride yok", !html.includes(x2));
  ok("bekleyen galeride yok", !html.includes(x3));
  ok("mobil: yatay kaydırma yok", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await p.locator("#fotograflar").scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/4-onayli-galeri-iphone-emulasyon.png` });
  await p.locator('#fotograflar button[aria-label^="Fotoğrafı büyüt"]').first().click(); await p.waitForTimeout(600);
  ok("görüntüleyicide atıf ve bildirim", (await p.locator("body").innerText()).includes("Bildir"));
  await p.screenshot({ path: `${OUT}/6-lightbox-iphone-emulasyon.png` });
  ok("sayfada ücretli Google isteği yok (Preview kapalı)", g.filter((u) => /part=(view|media)/.test(u)).length === 0, g.length);
  await ctx.close();
}
const galeri = await baglam(null, { viewport: { width: 1366, height: 900 } }); const gp = await galeri.newPage(); await gp.goto(`${BASE}/mekan/${SLUG}/fotograflar/?v=${Date.now()}`, { waitUntil: "networkidle" });
ok("Fotoğraflar sayfasında onaylı", (await gp.content()).includes(x1)); await gp.screenshot({ path: `${OUT}/4-galeri-masaustu.png` }); await galeri.close();

/* mobil panel ve sorunlu kayıtlar */
{ const c = await baglam(M, { ...devices["iPhone 14"], defaultBrowserType: undefined }); const p = await c.newPage(); await p.goto(`${BASE}/yonetim/fotograf-moderasyon/`, { waitUntil: "networkidle" });
  ok("panel mobilde taşmaz", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); const on = p.locator("[data-photo] button", { hasText: "Onayla" }).first(); ok("Onayla düğmesi dokunmaya uygun", (await on.boundingBox()).height >= 40); await p.screenshot({ path: `${OUT}/3-moderasyon-mobil.png` });
  await p.getByRole("tab", { name: "Sorunlu kayıtlar" }).click(); await p.locator("[data-problems]").waitFor(); await p.screenshot({ path: `${OUT}/3-sorunlu-kayitlar.png` }); ok("sorunlu kayıtlar açılır", (await p.locator("[data-problems]").innerText()).includes("kırık dosya")); await c.close(); }
const hist = await (await api(`/api/moderation/photos/?history=${x1}`, { u: M })).json();
ok("işlem geçmişi gerçek kayıt", hist.history?.some((h) => h.action === "photo_approve") && !JSON.stringify(hist).includes(D.userId), hist.history?.length);
ok("kullanıcı geçmişi göremez", (await api(`/api/moderation/photos/?history=${x1}`, { u: D })).status === 403);
/* bildirim */
const rep = (u, id, reason) => { const b = jsonBody({ reason }); return api(`/api/photos/${id}/report/`, { u, method: "POST", body: b.body, headers: b.headers }); };
ok("oturumsuz bildirim 401", (await rep(null, x1, "telif")).status === 401);
ok("bildirim kaydedildi", (await rep(Y, x1, "telif")).status === 200);
ok("çift bildirim 409", (await rep(Y, x1, "telif")).status === 409);
ok("bildirim personel listesinde", (await (await api("/api/moderation/photos/?status=approved", { u: M })).json()).reported.includes(x1));
ok("bekleyen fotoğraf bildirilemez", (await rep(Y, x3, "telif")).status === 404);

/* kapak */
const og = (h) => (h.match(/property="og:image" content="([^"]+)"/) ?? [])[1] ?? null;
const ld = (h) => [...h.matchAll(/application\/ld\+json">(.*?)<\/script>/gs)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).find((x) => x?.url?.includes("/mekan/"));
const html0 = await (await api(`/mekan/${SLUG}/?v=${Date.now()}`)).text();
ok("aday değilken SEO görseli üretilmez", !og(html0) && !ld(html0)?.image, og(html0));
ok("aday işaretlendi", (await mod(x1, "candidate")).status === 200);
ok("onaylanmamış kapak olamaz", (await mod(x3, "cover")).status === 409);
ok("kapak seçildi", (await mod(x1, "cover", { focus: "50% 50%" })).status === 200);
await new Promise((r) => setTimeout(r, 1500));
const html1 = await (await api(`/mekan/${SLUG}/?v=${Date.now()}`)).text();
ok("kapak SEO görseli oldu", (og(html1) ?? "").includes(x1), og(html1));
ok("yapılandırılmış veri image", ld(html1) ? (ld(html1).image ?? "").includes(x1) : true, ld(html1)?.image ?? "kayıt yok");
ok("canonical değişmedi", /rel="canonical" href="[^"]*\/mekan\/pidem-fatih\/"/.test(html1));
{
  const { ctx, p, g } = await profil(SLUG, { viewport: { width: 1366, height: 900 } });
  const ilk = p.locator('#fotograflar button[aria-label^="Fotoğrafı büyüt"] img').first();
  ok("profilde ilk kare seçili kapak", (await ilk.getAttribute("src")).includes(x1));
  ok("görünür kapak geç yüklenmez", (await ilk.getAttribute("loading")) === "eager");
  ok("kendi kapağında Google kapak isteği yok", !g.some((u) => u.includes("part=cover")), g.length);
  ok("kapak görseli yüklendi", await ilk.evaluate((i) => i.complete && i.naturalWidth > 0));
  await p.screenshot({ path: `${OUT}/5-kapak-profil-masaustu.png` });
  const kay = await p.evaluate(() => new Promise((res) => { let c = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) c += e.value; }).observe({ type: "layout-shift", buffered: true }); setTimeout(() => res(c), 800); }));
  console.log(`  sayfa kayması (Chromium, masaüstü): ${Number(kay).toFixed(3)}`);
  await ctx.close();
}
{
  const ctx = await baglam(null, { viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); await p.goto(`${BASE}/ara/?q=Pidem`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
  const v = await p.locator(`a[href*="/mekan/${SLUG}"] img`).first().getAttribute("src").catch(() => null);
  ok("arama kartı aynı kapağı kullanır", (v ?? "").includes(x1), v ?? "yok"); await p.screenshot({ path: `${OUT}/5-kapak-arama-kart.png` }); await ctx.close();
}
/* Japon Erdal: yeni fotoğraf kapağı değiştirmez */
{
  const { ctx: c0, p: p0, g: g0 } = await profil(JAPON, { viewport: { width: 1366, height: 900 } });
  const once = await p0.locator('#fotograflar button[aria-label^="Fotoğrafı büyüt"] img').first().getAttribute("src"); await c0.close();
  ok("Japon Erdal: kendi kapağında Google kapak isteği yok", !g0.some((u) => u.includes("part=cover")));
  const c = await baglam(Y, { viewport: { width: 1366, height: 900 } }); const p = await c.newPage();
  await p.goto(`${BASE}/yaz/${JAPON}/`, { waitUntil: "networkidle" });
  await p.locator('[aria-label="Deneyim metni"]').fill("Japon Erdal için örnek test metni; akşam saatinde gidildi, tezgâhta oturuldu ve servis sakindi.");
  await p.locator('[aria-label="Ziyaret ayı"]').selectOption({ index: 1 });
  await p.locator('[aria-label="Genel puan: 7"]').click(); await p.getByRole("button", { name: "evet", exact: true }).first().click();
  await p.locator('#fotograf input[type="file"]').setInputFiles([{ name: "j.jpg", mimeType: "image/jpeg", buffer: await kare(200, "Japon") }]);
  await p.locator('#fotograf input[type="checkbox"]').check();
  await p.getByRole("button", { name: "Deneyimi yayınla" }).click();
  await p.getByText(/1 fotoğraf incelemeye alındı/).waitFor({ timeout: 40000 }); await c.close();
  const jid = (await modListe()).find((r) => r.slug === JAPON)?.id;
  ok("Japon Erdal fotoğrafı onaylandı", jid && (await mod(jid, "approve")).status === 200);
  await new Promise((r) => setTimeout(r, 1500));
  const { ctx, p: p2 } = await profil(JAPON, { viewport: { width: 1366, height: 900 } });
  const sonra = await p2.locator('#fotograflar button[aria-label^="Fotoğrafı büyüt"] img').first().getAttribute("src");
  ok("Japon Erdal kapağı korundu", once === sonra && !sonra.includes(jid), sonra);
  ok("Japon Erdal galerisinde yeni fotoğraf", (await p2.content()).includes(jid));
  await ctx.close();
  await mod(jid, "remove", { reason: "test sonu" });
}
/* puan ayrımı */
const pz = await baglam(null); const pzp = await pz.newPage(); await pzp.goto(`${adres(SLUG)}?v=${Date.now()}`, { waitUntil: "networkidle" });
ok("puan metni fotoğraftan etkilenmedi (test hesapları puana girmez)", (await puanMetni(pzp)) === puan0, puan0); await pz.close();

/* sağlık raporu */
await mp.goto(`${BASE}/yonetim/medya-saglik/`, { waitUntil: "networkidle" });
const sag = (await mp.locator("main").innerText()).replace(/\s+/g, " ");
ok("sağlık raporu açılır, toplam 457", /Toplam restoran 457/.test(sag), sag.slice(0, 150));
await mp.screenshot({ path: `${OUT}/7-medya-saglik.png`, fullPage: true }); writeFileSync(`${OUT}/saglik.txt`, sag);

/* kaldırma */
await mp.goto(`${BASE}/yonetim/fotograf-moderasyon/`, { waitUntil: "networkidle" }); await mp.getByRole("tab", { name: "Onaylı" }).click(); await kart(x1).waitFor();
await kart(x1).getByLabel("Gerekçe").fill("Telif bildirimi"); await kart(x1).getByRole("button", { name: "Kaldır" }).click(); await mp.waitForTimeout(1500);
await new Promise((r) => setTimeout(r, 1500));
const html2 = await (await api(`/mekan/${SLUG}/?v=${Date.now()}`)).text();
ok("kaldırılan galeriden düştü", !html2.includes(x1));
ok("kaldırılan kapak ve SEO görselinden düştü", !og(html2) && !ld(html2)?.image);
ok("kaldırılan dosya 404", (await api(`/api/media/file/public/${x1}/480.webp?v=${Date.now()}`)).status === 404);
{ const ctx = await baglam(null, { viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); await p.goto(`${BASE}/ara/?q=Pidem&v=${Date.now()}`, { waitUntil: "networkidle" }); await p.waitForTimeout(800); ok("kaldırılan arama kartından düştü", !(await p.content()).includes(x1)); await ctx.close(); }
/* deneyim silinince */
const iRev = iBen.r;
for (const f of (await modListe()).filter((r) => r.reviewId === iRev)) await mod(f.id, "approve");
const delR = await api(`/api/reviews/${iRev}/`, { u: I, method: "DELETE" });
ok("deneyim silinince fotoğrafları yayından çıkar", delR.status === 200 && !(await modListe("approved")).some((r) => r.reviewId === iRev && r.status === "approved"));
/* hız sınırı */
const rl = []; for (let i = 0; i < 34; i++) rl.push((await yukle(A, YOK, Buffer.from("x"))).status);
console.log(`  hız sınırı: ${rl.filter((x) => x === 429).length}/34 istek 429`);
ok("hız sınırı çalışır", rl.includes(429), rl.slice(-3).join());
/* site haritası */
const sm = await (await api("/sitemap.xml")).text();
const n = (sm.match(/<loc>/g) ?? []).length; ok("site haritası 431 ve üzeri", n >= 431, n);
/* temizlik: test fotoğrafları */
let t = 0; for (const st of ["pending", "approved"]) for (const r of await modListe(st)) if ((await mod(r.id, "remove", { reason: "test sonu" })).status === 200) t++;
console.log(`  temizlik: ${t} test fotoğrafı kaldırıldı`);
await mCtx.close(); await br.close();
console.log(`JS hataları: ${hatalar.length}`); [...new Set(hatalar)].slice(0, 6).forEach((h) => console.log("  " + h));
writeFileSync(`${OUT}/sonuc.json`, JSON.stringify({ sonuc, hatalar }, null, 1));
const k = sonuc.filter((x) => !x[1]).length; console.log(`SONUÇ ${sonuc.length - k}/${sonuc.length}`); process.exit(k ? 1 : 0);
