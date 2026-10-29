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
const HB = { ...H, "x-vercel-set-bypass-cookie": "true" };
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
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
  for (const lang of ["tr", "en"]) {
    console.log(`\n── ${dev} · ${lang}`);
    await p.goto(url(lang), { waitUntil: "networkidle" });
    const home = await p.evaluate(() => ({
      text: document.body.innerText.replace(/\s+/g, " "),
      sections: [...document.querySelectorAll("h2[id^=bolum-]")].map((h) => h.id),
      lang: document.querySelector("main [lang]")?.getAttribute("lang"),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      leadTop: (() => { const h = document.querySelector("article h3"); return h ? h.getBoundingClientRect().top : -1; })(),
      nav: [...document.querySelectorAll("header a")].map((a) => a.getAttribute("href")),
    }));
    ok(`${dev}/${lang}: bölüm adı`, home.text.includes(lang === "tr" ? "Gidenler Seçkisi" : "The Gidenler Edit"));
    ok(`${dev}/${lang}: açılış metni`, home.text.includes(lang === "tr" ? "İyi bir sofra için yeni fikirler." : "New ideas for a good table."));
    ok(`${dev}/${lang}: bölüm sırası (puan ve etkinlik verisi yok → kapalı)`, home.sections.join(",") === "bolum-kesif,bolum-sefin-masasi,bolum-semt", home.sections.join(","));
    ok(`${dev}/${lang}: içerik dili işaretli`, home.lang === lang, String(home.lang));
    ok(`${dev}/${lang}: yatay taşma yok`, home.overflow <= 0, `${home.overflow}px`);
    ok(`${dev}/${lang}: ana hikâye başlığı ilk ekranda`, home.leadTop > 0 && home.leadTop < o.viewport.height, `${Math.round(home.leadTop)}px`);
    ok(`${dev}/${lang}: önizleme uyarısı görünür`, home.text.includes(lang === "tr" ? "editör kontrolü bekliyor" : "awaiting editorial review"));
    if (dev === "masaustu") ok(`${dev}/${lang}: üst gezinmede Seçki bağlantısı`, home.nav.includes("/seckisi/"));
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
        alt: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.getAttribute("hreflang")).sort().join(","),
      }));
      const tag = `${dev}/${lang}/${a.slug}`;
      ok(`${tag}: başlık`, d.h1 === a.title[lang].replace(/\s+/g, " "), d.h1);
      const allText = [a.dek[lang], a.why[lang], ...a.know[lang], ...a.body[lang].flatMap((x) => x.list ?? [x.h ?? x.p])].every((s) => d.text.includes(s.replace(/\s+/g, " ").slice(0, 60)));
      ok(`${tag}: gövde ve "gitmeden bilin" bu dilde`, allText);
      ok(`${tag}: kaynaklar (${a.sources.length})`, JSON.stringify(d.sources) === JSON.stringify(a.sources.map((s) => s.url)));
      ok(`${tag}: kaynak başlıkları bu dilde`, a.sources.every((s) => d.text.includes(s.title[lang])));
      ok(`${tag}: kapak künyesi (hak yoksa eksik notu)`, a.cover.state === "var" ? d.text.includes(a.cover.credit) : d.text.includes(a.cover.gap[lang]));
      ok(`${tag}: ziyaret yapılmadı ve ticari ilişki yok notu`, d.text.includes(lang === "tr" ? "mekân ziyareti yapılmadı" : "No visit was made") && d.text.includes(lang === "tr" ? "Ticari ilişki: yok" : "Commercial relationship: none"));
      ok(`${tag}: restoran bağlantıları`, a.venues.every((v) => ["", "#menu", "#deneyimler", "#esik"].every((h) => d.venues.includes(`/mekan/${v.slug}/${h}`))));
      ok(`${tag}: dil düğmesi karşı dile`, d.switchHref === (lang === "tr" ? `/seckisi/en/${a.slug}/` : `/seckisi/${a.slug}/`), d.switchHref);
      ok(`${tag}: hreflang tr/en`, d.alt.includes("en") && d.alt.includes("tr"), d.alt);
      ok(`${tag}: noindex`, (d.robots ?? "").includes("noindex"));
      ok(`${tag}: yatay taşma yok`, d.overflow <= 0, `${d.overflow}px`);
      if (lang === "en") ok(`${tag}: profil dili notu`, d.text.includes("Turkish only"));
      if (lang === "en") ok(`${tag}: Türkçe arayüz etiketi kalmamış`, !/Gitmeden bilin|Kaynaklar|Neden seçtik|Künye/.test(d.text));
      if (a.notice) ok(`${tag}: açıklayıcı not`, d.text.includes(a.notice[lang]));
      for (const v of a.venues) linkStatus.set(`/mekan/${v.slug}/`, null);
      if (a.featured || a.kind === "sefin-masasi") { await p.screenshot({ path: `${OUT}/${dev}-${lang}-${a.slug}.png` }); await p.screenshot({ path: `${OUT}/${dev}-${lang}-${a.slug}-tam.png`, fullPage: true }); }
    }
  }
  ok(`${dev}: sayfa hatası yok`, errs.length === 0, errs.slice(0, 2).join(" | "));
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
