/* Canlı doğrulama · YALNIZ OKUMA. Google uçları tarayıcıda kesilir, hiçbir ücretli çağrı yapılmaz; kare "SAHTE GOOGLE" yazılıdır. Form gönderilmez. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";
const BASE = "https://www.gidenler.com", FAZ = process.env.FAZ ?? "sonra", OUT = `out/canli-${FAZ}`; mkdirSync(OUT, { recursive: true });
const sonra = FAZ === "sonra"; const sonuc = []; const ok = (n, c, i = "") => { sonuc.push([n, !!c]); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#c33"/><text x="600" y="400" font-size="70" fill="#fff" text-anchor="middle">SAHTE GOOGLE</text></svg>')}`;
const foto = { src: SVG, author: "SAHTE", mapsUri: "https://maps.google.com/" };
const br = await chromium.launch(); const hatalar = []; const cagrilar = {};
const CIHAZ = [["mobil", { ...devices["iPhone 14"], defaultBrowserType: undefined }], ["masaustu", { viewport: { width: 1366, height: 900 } }]];
const KENDI = { "japon-erdal-beyoglu": ["kapali-pide", "Japon Erdal arşivi"], "kanaat-lokantasi-uskudar": ["kanaat", "John Lubbock"], "cukur-meyhane-beyoglu": ["cukur", "Jwslubbock"], "viktor-levi-sarap-evi-kadikoy": ["viktor", "Chromehoney"], "beyti-lokanta-bakirkoy": ["beyti", "Nicoleon"], "ismet-baba-uskudar": ["ismet", "Oxorca"] };
const ctx = async (o) => { const c = await br.newContext(o); await c.route(/\/api\/google\//, (r) => { const u = new URL(r.request().url()), part = u.searchParams.get("part") ?? "view", n = Number(u.searchParams.get("n") || 0), s = u.searchParams.get("slug"); (cagrilar[s] ??= []).push(`${part}${n ? `:${n}` : ""}`); if (part === "status") return r.fulfill({ json: { available: true } }); const kendi = sonra && !!KENDI[s]; return r.fulfill({ json: { rating: 4.2, count: 100, mapsUri: "https://maps.google.com/", hours: [], reviews: [], photos: kendi ? [] : Array.from({ length: n || 1 }, () => foto), photoTotal: kendi ? 0 : 5, refs: [] } }); }); await c.route(/googleapis|googleusercontent|ggpht/, (r) => r.abort()); return c; };
const FOTO = 'button[aria-label^="Fotoğrafı büyüt"] img';
const DIGER = ["pandeli-fatih", "yeni-lokanta-beyoglu", "pidem-fatih"];
for (const [ad, o] of CIHAZ) {
  const c = await ctx(o);
  for (const slug of [...Object.keys(KENDI), "savoy-beyoglu", ...DIGER]) {
    const p = await c.newPage(); p.on("pageerror", (e) => hatalar.push(`${ad} ${slug}: ${e.message.slice(0, 160)}`)); delete cagrilar[slug];
    const r = await p.goto(`${BASE}/mekan/${slug}/`, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
    const d = await p.evaluate((F) => { const m = document.querySelector("section[aria-label$='fotoğrafları']"); return { src: [...document.querySelectorAll(F)].map((i) => i.getAttribute("src")?.slice(0, 70)), yazi: m?.innerText ?? "", can: document.querySelector('link[rel="canonical"]')?.href, tasma: document.documentElement.scrollWidth > innerWidth + 1 }; }, FOTO);
    await p.screenshot({ path: `${OUT}/${slug}-${ad}.png` }); writeFileSync(`${OUT}/${slug}-${ad}.json`, JSON.stringify({ ...d, cagri: cagrilar[slug] ?? [] }, null, 1));
    ok(`${ad} ${slug}: 200, canonical, taşma yok`, r.status() === 200 && d.can === `${BASE}/mekan/${slug}/` && !d.tasma, d.can);
    if (sonra && KENDI[slug]) {
      ok(`${ad} ${slug}: kendi kapağı ve atıf`, d.src[0]?.includes(KENDI[slug][0]) && d.yazi.includes(KENDI[slug][1]), d.src[0]);
      ok(`${ad} ${slug}: ekranda Google karesi yok`, !d.src.some((x) => x?.startsWith("data:")));
    }
    if (sonra && slug === "japon-erdal-beyoglu") ok(`${ad} Japon Erdal: üç gerçek fotoğraf`, ["kapali-pide", "hamur", "havuz"].every((k) => d.src.some((x) => x?.includes(k))), d.src.length);
    if (sonra && slug === "savoy-beyoglu") ok(`${ad} Savoy: fotoğraf bağlı değil`, !d.src.some((x) => x?.includes("savoy")));
    if (DIGER.includes(slug)) { const v = (cagrilar[slug] ?? []).find((x) => x.startsWith("view")); ok(`${ad} ${slug}: Google akışı aynı`, !!v && d.src.some((x) => x?.startsWith("data:")), (cagrilar[slug] ?? []).join(",")); }
    await p.close();
  }
  /* arama */
  for (const [q, ad2] of [["Çiya", "Çiya"], ["Nusret", "Nusr"]]) { const p = await c.newPage(); p.on("pageerror", (e) => hatalar.push(`${ad} ara: ${e.message.slice(0, 160)}`)); await p.goto(`${BASE}/ara/?q=${encodeURIComponent(q)}`, { waitUntil: "networkidle" }); ok(`${ad} arama ${q}`, (await p.locator('main a[href*="/mekan/"]').first().innerText()).includes(ad2)); if (ad === "mobil") await p.screenshot({ path: `${OUT}/arama-${q}.png` }); await p.close(); }
  /* deneyim formu: gönderilmez */
  { const p = await c.newPage(); p.on("pageerror", (e) => hatalar.push(`${ad} yaz: ${e.message.slice(0, 160)}`)); await p.goto(`${BASE}/yaz/pidem-fatih/`, { waitUntil: "networkidle" }); ok(`${ad} deneyim formu açılır`, (await p.locator('[aria-label="Deneyim metni"]').count()) === 1 || /giriş/i.test(await p.locator("main").innerText())); ok(`${ad} fotoğraf yükleme alanı yok`, (await p.locator('input[type="file"]').count()) === 0); await p.close(); }
  /* seçki */
  { const p = await c.newPage(); p.on("pageerror", (e) => hatalar.push(`${ad} seçki: ${e.message.slice(0, 160)}`)); const r = await p.goto(`${BASE}/seckisi/japon-erdal-dort-pide-bir-efsane/`, { waitUntil: "networkidle" }); const h = await p.content(); ok(`${ad} Seçki yazısı`, r.status() === 200); ok(`${ad} Seçki altı video`, (await p.locator("[data-video]").count()) === 6); ok(`${ad} Flu 44:42`, h.includes("t=2682s")); const fig = await p.evaluate(async () => { const a = [...document.querySelectorAll("article img, figure img, main img")].filter((i) => /japon-erdal/.test(i.src)); a.forEach((i) => { i.loading = "eager"; }); await new Promise((r) => setTimeout(r, 1500)); return { n: a.length, kirik: a.filter((i) => !i.naturalWidth).length, src: a.map((i) => i.getAttribute("src")) }; }); ok(`${ad} Seçki görselleri`, fig.n >= 3 && fig.kirik === 0 && (!sonra || fig.src.every((s) => s.startsWith("/media/foto/"))), JSON.stringify(fig.src)); await p.screenshot({ path: `${OUT}/secki-${ad}.png` }); await p.close(); }
  await c.close();
}
/* kapalı kalması gerekenler */
{ const j = await (await fetch(`${BASE}/api/media/status/`)).json().catch(() => ({})); ok("yükleme kapalı: durum ucu yükleme bilgisi vermez", j.enabled !== true, JSON.stringify(j).slice(0, 60)); }
for (const u of ["/api/moderation/photos/", "/api/photos/mine/", "/yonetim/fotograf-moderasyon/", "/yonetim/medya-saglik/", "/yonetim/medya-editor/", "/api/moderation/storage/"]) { const s = (await fetch(`${BASE}${u}`, { redirect: "manual" })).status; ok(`kapalı: ${u}`, s === 404 || s === 401 || s === 403, s); }
/* gerçek sunucu kuralı: Google'a gitmeden 409 döner, ücret doğmaz */
for (const slug of Object.keys(KENDI)) { const ua = { "user-agent": "Mozilla/5.0 Chrome/131", "content-type": "application/json" }; const r = await fetch(`${BASE}/api/google/place/?slug=${slug}&part=media`, { method: "POST", headers: ua, body: JSON.stringify({ refs: [] }) }); const j = await r.json().catch(() => ({})); ok(`${slug}: doğrudan Google fotoğraf isteği sunucuda reddedilir`, r.status === 409 && j.error === "own_cover", `${r.status} ${JSON.stringify(j).slice(0, 40)}`); }
{ const s = (await fetch(`${BASE}/api/google/place/?slug=pandeli-fatih&part=status`)); const j = await s.json(); ok("Pandeli Google eşleşmesi korunuyor (ücretsiz durum ucu)", j.available === true, JSON.stringify(j)); }
const sm = await (await fetch(`${BASE}/sitemap.xml`)).text(); const n = (sm.match(/<loc>/g) ?? []).length; ok("sitemap 431", n === 431, n);
await br.close(); console.log(`JS hataları: ${hatalar.length}`); [...new Set(hatalar)].slice(0, 8).forEach((h) => console.log(" " + h)); writeFileSync(`${OUT}/sonuc.json`, JSON.stringify({ sonuc, hatalar, cagrilar }, null, 1));
const k = sonuc.filter((x) => !x[1]).length; console.log(`SONUÇ ${sonuc.length - k}/${sonuc.length}`); process.exit(k || hatalar.length ? 1 : 0);
