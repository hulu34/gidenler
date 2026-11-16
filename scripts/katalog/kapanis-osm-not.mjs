/* KAPANIŞ · OSM notları: kaydın koordinatı çevresinde (~60 m) açık ve kapalı notlar; yalnız tarih, durum ve ilk yorum metni.
   Kullanım: node scripts/katalog/kapanis-osm-not.mjs <hedef-slug.txt> <cikti.json> */
import { readFileSync, writeFileSync } from "node:fs";
const [hedefP, out] = process.argv.slice(2);
const V = new Map(JSON.parse(readFileSync("data/real/venues.json", "utf8")).map((v) => [v.slug, v]));
const H = readFileSync(hedefP, "utf8").split(/\s+/).filter(Boolean);
const R = {};
for (const s of H) {
  const v = V.get(s); if (typeof v.lat !== "number") continue;
  const d = 0.0006; const bb = [v.lng - d, v.lat - d, v.lng + d, v.lat + d].map((x) => x.toFixed(6)).join(",");
  const r = await fetch(`https://api.openstreetmap.org/api/0.6/notes.json?bbox=${bb}&closed=-1&limit=50`, { headers: { "user-agent": "gidenler-katalog/1.0 (+https://www.gidenler.com/)" } });
  await new Promise((z) => setTimeout(z, 1100));
  const j = r.ok ? await r.json() : { features: [] };
  R[s] = j.features.map((f) => ({ id: f.properties.id, durum: f.properties.status, tarih: f.properties.date_created?.slice(0, 10), kapanis: f.properties.closed_at?.slice(0, 10) ?? null, yorumlar: f.properties.comments.map((c) => ({ tarih: c.date?.slice(0, 10), islem: c.action, metin: (c.text ?? "").slice(0, 300) })) }));
}
writeFileSync(out, JSON.stringify(R, null, 1));
const n = Object.values(R).flat(); console.log({ kayit: Object.keys(R).length, not: n.length });
