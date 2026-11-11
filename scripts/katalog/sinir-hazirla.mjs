/* OSM idari sınır yanıtını (rel admin_level=6, `out geom`) sadeleştirilmiş sınır dosyasına çevirir.
   Kullanım: node scripts/katalog/sinir-hazirla.mjs <overpass.json> <sehir> <cikti.json> <osm_base_tarihi> */
import { readFileSync, writeFileSync } from "node:fs";
const [inp, sehir, out, tarih] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(inp, "utf8"));
const TOL = 0.00025; // ~25 m
function dp(pts) { // Douglas-Peucker
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [y, x] = pts[i], [ay, ax] = a, [by, bx] = b;
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
    if (d > max) { max = d; idx = i; }
  }
  if (max <= TOL) return [a, b];
  return [...dp(pts.slice(0, idx + 1)).slice(0, -1), ...dp(pts.slice(idx))];
}
const r6 = (x) => Math.round(x * 1e5) / 1e5;
const ilceler = raw.elements.filter((e) => e.type === "relation").map((e) => {
  const cizgiler = e.members.filter((m) => m.type === "way" && (m.role === "outer" || m.role === "inner") && m.geometry?.length)
    .map((m) => dp(m.geometry.map((g) => [g.lat, g.lon])).map(([a, b]) => [r6(a), r6(b)]));
  const all = cizgiler.flat();
  const bbox = [Math.min(...all.map((p) => p[0])), Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[0])), Math.max(...all.map((p) => p[1]))];
  return { ad: e.tags.name.replace(/â/g, "a"), osm: `relation/${e.id}`, bbox, cizgiler };
}).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
writeFileSync(out, JSON.stringify({ sehir, kaynak: "OpenStreetMap idari sınırları (admin_level=6), Overpass API", lisans: "© OpenStreetMap katkıcıları, ODbL 1.0", tarih, ilceler }));
console.log(ilceler.length, "ilçe", ilceler.reduce((s, d) => s + d.cizgiler.flat().length, 0), "nokta");
