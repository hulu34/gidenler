/* On restoran karşılaştırması · YALNIZ PREVIEW. Preview'da Google kapalı; Google uç noktası tarayıcıda kesilir, görseller "SAHTE GOOGLE" yazılı üretilmiş karelerdir. Gerçek Google çağrısı yapılmaz. */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { yetkiliBaslik } from "./yetkili.mjs";
const HOST = process.env.PREVIEW_HOST, SURUM = process.env.SURUM, OUT = "out/kars10"; mkdirSync(OUT, { recursive: true });
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS, "x-vercel-set-bypass-cookie": "true" };
const S = ["japon-erdal-beyoglu", "pandeli-fatih", "yeni-lokanta-beyoglu", "balikci-sabahattin-fatih", "kanaat-lokantasi-uskudar", "viktor-levi-sarap-evi-kadikoy", "cukur-meyhane-beyoglu", "savoy-beyoglu", "pidem-fatih", "maltepe-belediyesi-seyirtepe-sosyal-tesisleri-maltepe"];
const SVG = (n) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#c33"/><text x="600" y="400" font-size="70" fill="#fff" text-anchor="middle">SAHTE GOOGLE ${n}</text></svg>`)}`;
const foto = (i) => ({ src: SVG(i), author: "SAHTE", mapsUri: "https://maps.google.com/", flagUri: "https://maps.google.com/" });
const ref = (i) => ({ name: `places/x/photos/${i}`, author: "SAHTE" });
const br = await chromium.launch(); const out = [];
for (const slug of S) for (const [ad, vp] of [["mobil", { width: 390, height: 844 }], ["masaustu", { width: 1366, height: 900 }]]) {
  const c = await br.newContext({ viewport: vp }); await yetkiliBaslik(c, HOST, H);
  const cagri = [];
  await c.route("**/api/google/place/**", async (r) => {
    const u = new URL(r.request().url()), part = u.searchParams.get("part"), n = Number(u.searchParams.get("n") || 0);
    cagri.push(`${r.request().method()} ${part}${n ? ` n=${n}` : ""}`);
    if (part === "status") return r.fulfill({ json: { available: true } });
    if (part === "cover") return r.fulfill({ json: { photos: [foto(1)], photoTotal: 8, refs: [2, 3, 4].map(ref), hours: [], reviews: [] } });
    if (part === "media") return r.fulfill({ json: { photos: [foto(9)] } });
    return r.fulfill({ json: { rating: 4.2, count: 100, mapsUri: "https://maps.google.com/", hours: [], reviews: [], photos: Array.from({ length: n || 1 }, (_, i) => foto(i + 1)), photoTotal: 8, refs: [ref(7)] } });
  });
  const p = await c.newPage(); const hata = []; p.on("pageerror", (e) => hata.push(e.message.slice(0, 200)));
  const r = await p.goto(`https://${HOST}/mekan/${slug}/`, { waitUntil: "networkidle" }); await p.waitForTimeout(700);
  const d = await p.evaluate(() => { const im = [...document.querySelectorAll('button[aria-label^="Fotoğrafı büyüt"] img')].map((i) => i.getAttribute("src")?.slice(0, 80)); const t = document.querySelector("section[aria-label$='fotoğrafları']")?.innerText ?? ""; return { im, kendi: im.filter((x) => x?.startsWith("/")).length, sahte: im.filter((x) => x?.startsWith("data:")).length, serit: /Henüz Gidenler fotoğrafı yok|yüklenemedi/.test(document.body.innerText), atif: t.slice(0, 90), tasma: document.documentElement.scrollWidth > innerWidth + 1 }; });
  await p.screenshot({ path: `${OUT}/${SURUM}-${slug}-${ad}.png` });
  out.push({ surum: SURUM, slug, ad, http: r.status(), cagri, ...d, hata }); console.log(`${slug} ${ad} http=${r.status()} kendi=${d.kendi} sahteGoogle=${d.sahte} serit=${d.serit} cagri=${cagri.filter((x) => !x.includes("status")).join("|") || "-"} hata=${hata.length} tasma=${d.tasma}`);
  await c.close();
}
await br.close(); writeFileSync(`${OUT}/${SURUM}.json`, JSON.stringify(out, null, 1));
