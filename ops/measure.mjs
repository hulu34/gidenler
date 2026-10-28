/* ÖLÇÜM — eski (statik) ve yeni (dinamik /mekan, /yaz) Preview karşılaştırması.
   Depo herkese açık: loga yalnız sayılar yazılır; ayrıntı out/olcum.json'a gider (iş akışı şifreler).
   Koruma kaldırılmaz: istekler Vercel "Protection Bypass for Automation" başlığıyla, yalnız bu iki
   dağıtım adresine gider (üçüncü taraf kaynaklara başlık gönderilmez; Lighthouse çerezle girer). */
import { mkdirSync, writeFileSync } from "node:fs";

const BYPASS = process.env.VERCEL_BYPASS;
const SITES = { eski: process.env.OLD_HOST, yeni: process.env.NEW_HOST };
if (!BYPASS || !SITES.eski || !SITES.yeni) { console.error("VERCEL_BYPASS / OLD_HOST / NEW_HOST eksik"); process.exit(2); }

/* Daha önce hiç ziyaret edilmemiş restoranlar: yeni dağıtımda ilk istek gerçekten soğuk üretimdir. */
const SLUGS = ["34-restaurant-sisli", "49-cukurcuma-beyoglu", "cozy-etiler-besiktas", "pidepark-besiktas", "pizeria-quattro-beyoglu"];
const LH_SLUGS = ["cukur-meyhane-beyoglu", "aci-biber-kucukcekmece"];
const UNKNOWN = "boyle-bir-mekan-yok-123";
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

async function get(host, path) {
  const t0 = performance.now();
  const r = await fetch(`https://${host}${path}`, { headers: { "x-vercel-protection-bypass": BYPASS, "user-agent": UA }, redirect: "manual" });
  const ttfb = performance.now() - t0;
  const html = await r.text();
  const total = performance.now() - t0;
  const m = (re) => html.match(re)?.[1] ?? null;
  return {
    status: r.status, ttfbMs: Math.round(ttfb), totalMs: Math.round(total), bytes: html.length,
    cache: r.headers.get("x-vercel-cache"), xRobots: r.headers.get("x-robots-tag"),
    seo: {
      title: m(/<title>([^<]*)<\/title>/), description: m(/<meta name="description" content="([^"]*)"/),
      canonical: m(/<link rel="canonical" href="([^"]*)"/), robots: m(/<meta name="robots" content="([^"]*)"/),
      ogTitle: m(/<meta property="og:title" content="([^"]*)"/), h1: (html.match(/<h1[\s>]/g) ?? []).length,
      jsonLd: html.includes("application/ld+json"), ssrName: null,
    },
  };
}

const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const out = { at: new Date().toISOString(), http: {}, lighthouse: {} };

/* 1) HTTP: her sayfa için 1. istek (yeni dağıtımda soğuk) ve 2-3. istek (önbellek) */
for (const [k, host] of Object.entries(SITES)) {
  const rows = [];
  for (const s of SLUGS) for (const base of ["/mekan/", "/yaz/"]) {
    const path = `${base}${s}/`;
    const a = await get(host, path), b = await get(host, path), c = await get(host, path);
    rows.push({ path, first: a, warm: [b, c] });
  }
  const unknown = { mekan: await get(host, `/mekan/${UNKNOWN}/`), yaz: await get(host, `/yaz/${UNKNOWN}/`) };
  out.http[k] = { rows, unknown };
}

/* SEO eşitliği: aynı yol için başlık / açıklama / canonical / robots / h1 / JSON-LD aynı mı */
const seoKeys = ["title", "description", "canonical", "robots", "ogTitle", "h1", "jsonLd"];
const diffs = [];
out.http.eski.rows.forEach((r, i) => {
  const n = out.http.yeni.rows[i];
  for (const key of seoKeys) if (JSON.stringify(r.first.seo[key]) !== JSON.stringify(n.first.seo[key])) diffs.push({ path: r.path, key });
});
out.seoDiffs = diffs;

/* 2) Lighthouse mobil (varsayılan: Moto G Power benzetimi, yavaş 4G). Çerezle giriş; ısınmış sayfa, 3 koşu medyanı. */
const { default: lighthouse } = await import("lighthouse");
const chromeLauncher = await import("chrome-launcher");
const puppeteer = await import("puppeteer-core");
const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
for (const [k, host] of Object.entries(SITES)) {
  /* bypass çerezi yalnız bu alan adına */
  const r = await fetch(`https://${host}/`, { headers: { "x-vercel-protection-bypass": BYPASS, "x-vercel-set-bypass-cookie": "true" }, redirect: "manual" });
  const ck = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).filter(Boolean);
  out.lighthouse[k] = {};
  for (const s of LH_SLUGS) for (const base of ["/mekan/", "/yaz/"]) {
    const path = `${base}${s}/`;
    await get(host, path);                                   // ısıt (yeni dağıtımda ilk üretim burada)
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const page = await browser.newPage();
      for (const c of ck) { const [name, ...v] = c.split("="); await page.setCookie({ name, value: v.join("="), domain: host, path: "/", secure: true, httpOnly: true }); }
      const res = await lighthouse(`https://${host}${path}`, { output: "json", logLevel: "error", onlyCategories: ["performance", "seo"], disableStorageReset: true }, undefined, page);
      const a = res.lhr.audits;
      runs.push({
        perf: Math.round(res.lhr.categories.performance.score * 100), seo: Math.round(res.lhr.categories.seo.score * 100),
        fcp: Math.round(a["first-contentful-paint"].numericValue), lcp: Math.round(a["largest-contentful-paint"].numericValue),
        tbt: Math.round(a["total-blocking-time"].numericValue), cls: +a["cumulative-layout-shift"].numericValue.toFixed(3),
        ttfb: Math.round(a["server-response-time"].numericValue), bytes: Math.round(a["total-byte-weight"].numericValue / 1024),
        seoFails: Object.values(res.lhr.categories.seo.auditRefs).map((x) => a[x.id]).filter((x) => x.score === 0).map((x) => x.id),
      });
      await page.close();
    }
    out.lighthouse[k][path] = { runs, median: Object.fromEntries(["perf", "seo", "fcp", "lcp", "tbt", "cls", "ttfb", "bytes"].map((m) => [m, med(runs.map((x) => x[m]))])), seoFails: runs[0].seoFails };
  }
}
await browser.disconnect();
await chrome.kill();

mkdirSync("out", { recursive: true });
writeFileSync("out/olcum.json", JSON.stringify(out, null, 1));

/* Herkese açık log: yalnız sayılar ve sabit yol türleri */
const summary = {};
for (const k of Object.keys(SITES)) {
  const h = out.http[k];
  for (const base of ["/mekan/", "/yaz/"]) {
    const rs = h.rows.filter((r) => r.path.startsWith(base));
    summary[`${k} ${base}`] = {
      ilkTTFBms: med(rs.map((r) => r.first.ttfbMs)), sicakTTFBms: med(rs.flatMap((r) => r.warm.map((w) => w.ttfbMs))),
      ilkCache: [...new Set(rs.map((r) => r.first.cache))].join("/"), sicakCache: [...new Set(rs.flatMap((r) => r.warm.map((w) => w.cache)))].join("/"),
      htmlKB: Math.round(med(rs.map((r) => r.first.bytes)) / 1024), durum: [...new Set(rs.map((r) => r.first.status))].join("/"),
    };
  }
  summary[`${k} bilinmeyen`] = { mekan: h.unknown.mekan.status, yaz: h.unknown.yaz.status };
  for (const [p, v] of Object.entries(out.lighthouse[k])) summary[`${k} LH ${p.startsWith("/mekan") ? "mekan" : "yaz"}#${LH_SLUGS.findIndex((s) => p.includes(s)) + 1}`] = { ...v.median, seoFails: v.seoFails.join(",") };
}
console.table(summary);
console.log("SEO farkı (eski ↔ yeni, aynı yol):", diffs.length, [...new Set(diffs.map((d) => d.key))].join(",") || "yok");
