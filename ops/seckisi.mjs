/* Gidenler Seçkisi · Preview denetimi (yalnız okuma; hiçbir yazım yok).
   Beklenen değerler ops/seckisi/*.json içerik dosyalarından gelir. Ekran testi masaüstü ve MOBİL EMÜLASYON
   (Playwright); gerçek cihaz testi değildir. Test başlığı yalnız SECKI_HOST'a gider.
   Ayrıca canlı sitede (www.gidenler.com, başlıksız) bölümün kapalı olduğu doğrulanır. */
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { yetkiliBaslik, baslikSizintisi } from "./yetkili.mjs";
const OUT = "out/seckisi"; mkdirSync(OUT, { recursive: true });
const HOST = process.env.SECKI_HOST;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
/* ARAC=0: Vercel'in Preview araç çubuğunu kapat (x-vercel-skip-toolbar). Hidrasyon uyarısının kaynağını ayırmak için. */
const ARAC = process.env.ARAC !== "0";
const HB = { ...H, "x-vercel-set-bypass-cookie": "true", ...(ARAC ? {} : { "x-vercel-skip-toolbar": "1" }) };
console.log(`  araç çubuğu: ${ARAC ? "açık (varsayılan Preview)" : "kapalı (x-vercel-skip-toolbar)"}`);
const res = []; const ok = (n, c, i = "") => { res.push(c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const dir = new URL("./seckisi/", import.meta.url);
const all = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));
const pkg = all.filter((a) => a.status === "kontrol");
const drafts = all.filter((a) => a.status === "taslak");
const url = (lang, slug) => `https://${HOST}/seckisi/${lang === "en" ? "en/" : ""}${slug ? `${slug}/` : ""}`;
const get = (u, h = H) => fetch(u, { headers: h, redirect: "manual" });

/* 1) HTTP: durumlar, noindex, taslaklar */
for (const lang of ["tr", "en"]) {
  const r = await get(url(lang)); const h = await r.text();
  ok(`${lang}: ana sayfa 200`, r.status === 200, String(r.status));
  ok(`${lang}: arama motorlarına kapalı (noindex)`, /<meta name="robots" content="noindex/.test(h));
  ok(`${lang}: taslak listede yok`, drafts.every((d) => !h.includes(d.slug)));
  ok(`${lang}: kontrol bekleyen 6 yazı listede`, pkg.every((a) => h.includes(`/${a.slug}/`)), `${pkg.length}`);
  for (const d of drafts) { const x = await get(url(lang, d.slug)); ok(`${lang}: taslak adresi 404 (${d.slug})`, x.status === 404, String(x.status)); }
}

/* 2) Tarayıcı: iki görünüm, iki dil */
const b = await chromium.launch({ channel: "chrome" });
const DEV = [
  ["masaustu", { viewport: { width: 1366, height: 900 }, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" }],
  ["mobil-emulasyon", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }],
];
const linkStatus = new Map();
for (const [dev, o] of DEV) {
  const ctx = await b.newContext(o);
  await yetkiliBaslik(ctx, HOST, HB); const sizinti = baslikSizintisi(ctx, HOST);
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(`${new URL(p.url()).pathname} ${e.message.slice(0, 160)}`));
  const toolbar = new Set();
  p.on("request", (r) => { const u = new URL(r.url()); if (/vercel\.live$|vercel\.com$/.test(u.hostname) || u.pathname.includes("_vercel/")) toolbar.add(`${u.hostname}${u.pathname.split("/").slice(0, 3).join("/")}`); });
  p.on("response", (r) => { if (r.status() >= 400) { const u = new URL(r.url()); console.log(`  istek(${dev}) ${new URL(p.url()).pathname} → ${r.status()} ${u.hostname === HOST ? "" : u.hostname}${u.pathname}`); } });
  p.on("console", (m) => { if (m.type() === "error") console.log(`  konsol(${dev}) ${new URL(p.url()).pathname}: ${m.text().slice(0, 300)}`); });
  for (const lang of ["tr", "en"]) {
    console.log(`\n── ${dev} · ${lang}`);
    await p.goto(url(lang), { waitUntil: "networkidle" });
    const home = await p.evaluate(() => ({
      text: document.body.innerText.replace(/\s+/g, " "),
      sections: [...document.querySelectorAll("h2[id^=bolum-]")].map((h) => h.id),
      lang: document.querySelector("main [lang]")?.getAttribute("lang"),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      leadTop: (() => { const h = document.querySelector("article h3"); return h ? h.getBoundingClientRect().top : -1; })(),
      nav: [...document.querySelectorAll("header a")].filter((a) => a.getBoundingClientRect().width > 0).map((a) => a.getAttribute("href")),
      search: Math.round(document.querySelector("header input")?.getBoundingClientRect().width ?? 0),
      bolum: document.querySelector("#bolum-mutfak")?.innerText.trim(),
    }));
    ok(`${dev}/${lang}: bölüm adı`, home.text.includes(lang === "tr" ? "Gidenler Seçkisi" : "The Gidenler Edit"));
    ok(`${dev}/${lang}: açılış metni`, home.text.includes(lang === "tr" ? "İyi bir sofra için yeni fikirler." : "Fresh ideas for your next great meal."));
    ok(`${dev}/${lang}: bölüm sırası (puan ve etkinlik verisi yok → kapalı)`, home.sections.join(",") === "bolum-kesif,bolum-mutfak,bolum-semt", home.sections.join(","));
    ok(`${dev}/${lang}: içerik dili işaretli`, home.lang === lang, String(home.lang));
    ok(`${dev}/${lang}: yatay taşma yok`, home.overflow <= 0, `${home.overflow}px`);
    ok(`${dev}/${lang}: ana hikâye başlığı ilk ekranda`, home.leadTop > 0 && home.leadTop < o.viewport.height, `${Math.round(home.leadTop)}px`);
    ok(`${dev}/${lang}: önizleme uyarısı görünür`, home.text.includes(lang === "tr" ? "editör kontrolü bekliyor" : "awaiting editorial review"));
    ok(`${dev}/${lang}: üst gezinmede görünür Seçki bağlantısı`, home.nav.includes("/seckisi/"));
    ok(`${dev}/${lang}: arama kutusu daralmadı`, home.search >= (dev === "masaustu" ? 300 : 60), `${home.search}px`);
    ok(`${dev}/${lang}: "Mutfaktan" bölümü`, home.bolum === (lang === "tr" ? "Mutfaktan" : "From the Kitchen") || home.bolum?.toLowerCase() === (lang === "tr" ? "mutfaktan" : "from the kitchen"), home.bolum);
    await p.screenshot({ path: `${OUT}/${dev}-${lang}-ana.png` });
    await p.screenshot({ path: `${OUT}/${dev}-${lang}-ana-tam.png`, fullPage: true });

    for (const a of pkg) {
      await p.goto(url(lang, a.slug), { waitUntil: "networkidle" });
      const d = await p.evaluate(() => ({
        text: document.body.innerText.replace(/\s+/g, " "),
        h1: document.querySelector("h1")?.innerText.replace(/\s+/g, " ").trim(),
        sources: [...document.querySelectorAll("#h-kaynak + ol a")].map((x) => x.getAttribute("href")),
        venues: [...document.querySelectorAll("#h-gidenlerde ~ ul a")].map((x) => x.getAttribute("href")),
        switchHref: document.querySelector("a[hreflang]")?.getAttribute("href"),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        robots: document.querySelector('meta[name="robots"]')?.getAttribute("content"),
        links: [...document.querySelectorAll("figcaption a")].map((x) => x.getAttribute("href")),
        img: document.querySelector("header figure img")?.naturalWidth ?? 0,
        alt: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.getAttribute("hreflang")).sort().join(","),
      }));
      const tag = `${dev}/${lang}/${a.slug}`;
      ok(`${tag}: başlık`, d.h1 === a.title[lang].replace(/\s+/g, " "), d.h1);
      const allText = [a.dek[lang], a.why[lang], ...a.know[lang], ...a.body[lang].flatMap((x) => x.list ?? [x.h ?? x.p])].every((s) => d.text.includes(s.replace(/\s+/g, " ").slice(0, 60)));
      ok(`${tag}: gövde ve "gitmeden bilin" bu dilde`, allText);
      ok(`${tag}: kaynaklar (${a.sources.length})`, JSON.stringify(d.sources) === JSON.stringify(a.sources.map((s) => s.url)));
      ok(`${tag}: kaynak başlıkları bu dilde`, a.sources.every((s) => d.text.includes(s.title[lang])));
      ok(`${tag}: kapak künyesi (hak yoksa eksik notu)`, a.cover.state === "var" ? d.text.includes(a.cover.credit) && d.links.includes(a.cover.licenseUrl ?? a.cover.sourceUrl) && d.links.includes(a.cover.sourceUrl) : d.text.includes(a.cover.gap[lang]));
      if (a.cover.state === "var") ok(`${tag}: kapak fotoğrafı yüklendi`, d.img > 0, `${d.img}px`);
      if (a.label) ok(`${tag}: biçim etiketi`, d.text.includes(a.label[lang].toUpperCase()) || d.text.includes(a.label[lang]));
      ok(`${tag}: künyede ziyaret durumu`, d.text.includes(lang === "tr" ? "ziyaret edilmedi" : "not visited"));
      ok(`${tag}: doğrulanmamış ticari ilişki "yok" diye gösterilmiyor`, a.commercial.state !== "dogrulanmadi" || (d.text.includes(lang === "tr" ? "Ticari ilişki: henüz doğrulanmadı" : "Commercial relationship: not yet verified") && !d.text.includes(lang === "tr" ? "Ticari ilişki: yok" : "Commercial relationship: none")));
      ok(`${tag}: restoran bağlantıları`, a.venues.every((v) => ["", "#menu", "#deneyimler", "#esik"].every((h) => d.venues.includes(`/mekan/${v.slug}/${h}`))));
      ok(`${tag}: dil düğmesi karşı dile`, d.switchHref === (lang === "tr" ? `/seckisi/en/${a.slug}/` : `/seckisi/${a.slug}/`), d.switchHref);
      ok(`${tag}: hreflang tr/en`, d.alt.includes("en") && d.alt.includes("tr"), d.alt);
      ok(`${tag}: noindex`, (d.robots ?? "").includes("noindex"));
      ok(`${tag}: yatay taşma yok`, d.overflow <= 0, `${d.overflow}px`);
      if (lang === "en") ok(`${tag}: profil dili notu`, d.text.includes("Turkish only"));
      if (lang === "en") ok(`${tag}: Türkçe arayüz etiketi kalmamış`, !/Gitmeden bilin|Kaynaklar|Neden seçtik|Künye|Mutfaktan|ziyaret edilmedi/.test(d.text));
      if (a.notice) ok(`${tag}: açıklayıcı not`, d.text.includes(a.notice[lang]));
      for (const v of a.venues) linkStatus.set(`/mekan/${v.slug}/`, null);
      if (a.featured || a.kind === "mutfak" || a.kind === "semt") { await p.screenshot({ path: `${OUT}/${dev}-${lang}-${a.slug}.png` }); await p.screenshot({ path: `${OUT}/${dev}-${lang}-${a.slug}-tam.png`, fullPage: true }); }
    }
  }
  console.log(`  araç çubuğu istekleri (${dev}): ${[...toolbar].slice(0, 6).join(", ") || "yok"}`);
  ok(`${dev}: sayfa hatası yok`, errs.length === 0, errs.slice(0, 4).join(" | "));
  ok(`${dev}: test başlığı başka alan adına gitmedi`, sizinti.size === 0, [...sizinti].join(","));
  await ctx.close();
}
await b.close();

/* 3) Bağlı restoran profilleri Preview'da açılıyor */
for (const path of linkStatus.keys()) { const r = await get(`https://${HOST}${path}`); ok(`restoran profili açılıyor ${path}`, r.status === 200, String(r.status)); }

/* 4) Canlı site etkilenmedi: bölüm yayımlanmadı (başlıksız, yalnız okuma) */
for (const path of ["/seckisi/", "/seckisi/en/", `/seckisi/${pkg[0].slug}/`]) {
  const r = await fetch(`https://www.gidenler.com${path}`, { redirect: "manual" });
  ok(`canlıda kapalı ${path}`, r.status === 404, String(r.status));
}
const live = await (await fetch("https://www.gidenler.com/")).text();
ok("canlı gezinmede Seçki bağlantısı yok", !live.includes('href="/seckisi/"'));

console.log(`\nSONUÇ ${res.filter(Boolean).length}/${res.length}`);
process.exit(res.every(Boolean) ? 0 : 1);
