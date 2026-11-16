/* KAPANIŞ · OSM geçmişi: öğenin bütün sürümleri ve son 2025+ düzenlemelerin changeset açıklaması (yalnız etiket/özet).
   Kullanım: node scripts/katalog/kapanis-osm-gecmis.mjs <hedef-slug.txt> <cikti.json> */
import { readFileSync, writeFileSync } from "node:fs";
const [hedefP, out] = process.argv.slice(2);
const V = new Map(JSON.parse(readFileSync("data/real/venues.json", "utf8")).map((v) => [v.slug, v]));
const H = readFileSync(hedefP, "utf8").split(/\s+/).filter(Boolean);
const UA = { "user-agent": "gidenler-katalog/1.0 (+https://www.gidenler.com/)" };
const bekle = () => new Promise((z) => setTimeout(z, 1100));
const R = {};
for (const s of H) {
  const v = V.get(s); const [t, id] = v.ref.split("/");
  const r = await fetch(`https://api.openstreetmap.org/api/0.6/${t}/${id}/history.json`, { headers: UA }); await bekle();
  if (!r.ok) { R[s] = { status: r.status }; continue; }
  const el = (await r.json()).elements.map((e) => ({ v: e.version, ts: e.timestamp?.slice(0, 10), visible: e.visible !== false, cs: e.changeset, user: e.user, name: e.tags?.name, amenity: e.tags?.amenity, shop: e.tags?.shop, dis: Object.keys(e.tags ?? {}).filter((k) => /^(disused|was|abandoned|removed):/.test(k)), check: e.tags?.check_date, opening: e.tags?.opening_hours }));
  const son = el.filter((e) => e.ts >= "2025").slice(-3);
  const cs = {};
  for (const e of son) { const c = await fetch(`https://api.openstreetmap.org/api/0.6/changeset/${e.cs}.json`, { headers: UA }); await bekle(); const j = c.ok ? (await c.json()).changeset ?? (await c.json()).elements?.[0] : null; cs[e.cs] = { comment: j?.tags?.comment ?? null, source: j?.tags?.source ?? null, app: j?.tags?.created_by ?? null }; }
  R[s] = { surumler: el, changeset: cs };
}
writeFileSync(out, JSON.stringify(R, null, 1));
