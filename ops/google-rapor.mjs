/* CANLI · yalnız okuma: Google eşleşme kayıtları ve puan durumu. Google'a istek atmaz, hiçbir yazım yok. Çıktı şifreli. */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
const HOST = process.env.RAPOR_HOST;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const admin = `https://${HOST}/api/admin/db/`;
mkdirSync("out/grapor", { recursive: true });
for (const rapor of ["google", "google-slug", "puan"]) {
  const r = await fetch(`${admin}?rapor=${rapor}`, { headers: H });
  writeFileSync(`out/grapor/${rapor}.json`, await r.text());
  console.log(rapor, r.status);
}
const slugs = JSON.parse(readFileSync("ops/gidenler-sluglar.json", "utf8"));
const out = []; let i = 0, bad = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (i < slugs.length) {
    const slug = slugs[i++];
    const r = await fetch(`${admin}?rapor=profil&slug=${encodeURIComponent(slug)}`, { headers: H }).catch(() => null);
    if (!r?.ok) { bad++; out.push({ slug, error: r?.status ?? "ag" }); continue; }
    const j = await r.json();
    out.push({ slug, place: j.place, google: j.google });
  }
}));
writeFileSync("out/grapor/kayitlar.json", JSON.stringify(out));
console.log("kayit", out.length, "hata", bad);
