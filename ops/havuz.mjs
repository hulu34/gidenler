/* Aday havuzu (yalnız okuma, canlı veritabanı): Google içeriği onaylı restoranlar + ad/semt/eksik alanlar.
   Places çağrısı YOK. Çıktı şifreli dosyada; logda yalnız sayılar. */
import { writeFileSync, mkdirSync } from "node:fs";
const HOST = process.env.ADAY_HOST;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const a = `https://${HOST}/api/admin/db/`;
const g = await (await fetch(`${a}?rapor=google-slug`, { headers: H })).json();
const e = await (await fetch(`${a}?rapor=eksik`, { headers: H })).json();
const ok = new Set(g.slugs ?? []);
const rows = (e.restaurants ?? []).map((r) => ({ ...r, google: ok.has(r.slug) }));
mkdirSync("out/havuz", { recursive: true });
writeFileSync("out/havuz/havuz.json", JSON.stringify({ env: e.env, at: new Date().toISOString(), rows }, null, 1));
console.log(`ortam=${e.env} · restoran ${rows.length} · Google onaylı ${rows.filter((r) => r.google).length}`);
