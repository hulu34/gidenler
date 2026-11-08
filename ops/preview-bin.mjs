/* 1.000 MEKÂN · AŞAMA DENETİMİ (yalnız PREVIEW). ADIM=tohum: yeni mekânları Preview veritabanına tohumlar (slugs).
   ADIM=denetim: yeni profiller, arama API'si, sitemap, canonical, yönetici raporu. Log: yalnız sayılar. */
import { readFileSync } from "node:fs";
const B = `https://${process.env.HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const J = { ...H, "content-type": "application/json", "sec-fetch-site": "same-origin" };
const P = JSON.parse(readFileSync(process.env.PAKET, "utf8"));
const slugs = P.yeni.map((x) => x.slug);
if (process.env.ADIM === "tohum") {
  const r = await fetch(`${B}/api/admin/db/`, { method: "POST", headers: J, body: JSON.stringify({ action: "seed", confirm: "EVET", target: "preview", slugs }) });
  const j = await r.json().catch(() => ({}));
  console.log("tohum", r.status, JSON.stringify({ env: j.env, inserted: j.inserted, updated: j.updated, total: j.total, integrity: j.integrity && { ok: j.integrity.ok, missing: j.integrity.missing?.length, extra: j.integrity.extra?.length } }));
  process.exit(r.ok && j.env === "preview" ? 0 : 1);
}
const get = async (p) => { const r = await fetch(B + p, { headers: H }); return { s: r.status, t: r.ok ? await r.text() : "" }; };
let ok200 = 0, canon = 0, google = 0, noFakeScore = 0;
for (const s of slugs) {
  const r = await get(`/mekan/${s}/`);
  if (r.s === 200) ok200++;
  if (new RegExp(`rel="canonical" href="https://www\\.gidenler\\.com/mekan/${s}/"`).test(r.t)) canon++;
  if (/data-google-kayitli/.test(r.t)) google++;
  /* Gidenler puanı uydurulmaz: deneyimi olmayan yeni mekânda 10 üzerinden puan görünmemeli */
  if (!/data-score-hero/.test(r.t)) noFakeScore++;
}
const sm = (await get("/sitemap.xml")).t; const inSm = slugs.filter((s) => sm.includes(`/mekan/${s}/`)).length;
let found = 0; const sample = slugs.slice(0, 40);
for (const s of sample) { const name = P.yeni.find((x) => x.slug === s).name ?? s; const j = await (await fetch(`${B}/api/ara/?q=${encodeURIComponent(name)}&limit=6`, { headers: H })).json().catch(() => ({ items: [] })); if (j.items?.some((i) => i.slug === s)) found++; }
const rp = await (await fetch(`${B}/api/admin/google-puan/?rapor=gunluk`, { headers: H })).json().catch(() => ({}));
console.log("yeni", JSON.stringify({ n: slugs.length, profil200: ok200, canonical: canon, googlePuani: google, uydurmaPuanYok: noFakeScore, sitemap: inSm, aramaAdla: `${found}/${sample.length}` }));
console.log("rapor", JSON.stringify({ env: rp.env, shown: rp.site?.shown, hidden: rp.site?.hidden, final: rp.final }));
