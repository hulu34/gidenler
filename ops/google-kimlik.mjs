/* CANLI · yalnız okuma: 456 mekânın Google eşleşme kimlikleri (place ID + durum + eşleşme puanı). Google'a istek yok, yazım yok. Çıktı şifreli. */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
const HOST = process.env.PROD_DEPLOY;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const admin = `https://${HOST}/api/admin/db/`;
mkdirSync("out/kimlik", { recursive: true });
const venues = JSON.parse(readFileSync("app/data/real/venues.json", "utf8"));
const slugs = venues.map((v) => v.slug);
const u = await fetch(`${admin}?rapor=google-slug`, { headers: H });
writeFileSync("out/kimlik/usable.json", await u.text());
const out = []; let i = 0, bad = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (i < slugs.length) {
    const slug = slugs[i++];
    let r = null;
    for (let t = 0; t < 3 && !r?.ok; t++) r = await fetch(`${admin}?rapor=profil&slug=${encodeURIComponent(slug)}`, { headers: H }).catch(() => null);
    if (!r?.ok) { bad++; out.push({ slug, error: r?.status ?? "ag" }); continue; }
    const j = await r.json();
    out.push({ slug, address: j.place?.address ?? null, google: j.google?.identifiers ?? [] });
  }
}));
writeFileSync("out/kimlik/kimlik.json", JSON.stringify(out));
console.log("usable", u.status, "kayit", out.length, "hata", bad, "google_kaydi", out.filter((x) => x.google?.length).length);
