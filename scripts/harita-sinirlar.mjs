#!/usr/bin/env node
/* SEMT HARİTASI SINIRLARI — OpenStreetMap idari sınırlarından (© OpenStreetMap katkıcıları, ODbL) sade SVG geometrisi üretir.
   Sayfa açılışında hiçbir dış servise istek gitmez; bu betik elle, seyrek çalıştırılır ve çıktısı depoya girer.

   Girdi (Overpass "out geom;" JSON dökümleri):
     <girdi>/ilce.json            area["name"="İstanbul"]["admin_level"="4"]->.a;
                                  rel(area.a)["boundary"="administrative"]["admin_level"="6"];out geom;
     <girdi>/mah/<ilçe-rel>.json  area(id:3600000000+<ilçe-rel>)->.a;
                                  rel(area.a)["boundary"="administrative"]["admin_level"="8"];out geom;
                                  (Overpass yoğunsa aynı biçim, ilçe ilişkisinin "subarea" üyeleri için OSM API
                                  /api/0.6/relation/<id>/full yanıtlarından da kurulabilir; 21.11.2026 üretimi böyle yapıldı.)
   Çıktı:
     data/harita/ilceler.json           39 ilçe (yaka, ad, slug, halkalar)
     data/harita/mahalle/<slug>.json    ilçenin mahalleleri (ilçe seçilince ayrı parça olarak yüklenir)

   Kullanım: node scripts/harita-sinirlar.mjs <girdi-dizini>
   Koordinatlar düzlem izdüşümünde tamsayı: x = (lng − LNG0)·cos(41°)·K, y = (LAT0 − lat)·K. */
import fs from "node:fs";
import path from "node:path";

const [, , inDir] = process.argv;
if (!inDir) { console.error("kullanım: node scripts/harita-sinirlar.mjs <girdi-dizini>"); process.exit(2); }

export const PROJ = { lng0: 27.9, lat0: 41.65, k: 4000, cos: Math.cos((41 * Math.PI) / 180) };
const prj = (lon, lat) => [Math.round((lon - PROJ.lng0) * PROJ.cos * PROJ.k), Math.round((PROJ.lat0 - lat) * PROJ.k)];

const ANADOLU = new Set(["Adalar", "Ataşehir", "Beykoz", "Çekmeköy", "Kadıköy", "Kartal", "Maltepe", "Pendik", "Sancaktepe", "Sultanbeyli", "Şile", "Tuzla", "Ümraniye", "Üsküdar"]);
const TR = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
const slugify = (s) => s.toLocaleLowerCase("tr").replace(/[çğıİöşüâîû]/g, (c) => TR[c] ?? c).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const mahAdi = (s) => s.replace(/\s+Mahallesi$/i, "").replace(/\s+Mah\.?$/i, "").trim();

/* Üyelik yollarını uç uca ekleyip kapalı halkalar kur. */
function rings(rel, role) {
  const ways = rel.members.filter((m) => m.type === "way" && (m.role || "outer") === role && m.geometry?.length > 1).map((m) => m.geometry.map((g) => [g.lon, g.lat]));
  const out = [];
  const key = (p) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;
  while (ways.length) {
    let ring = ways.shift();
    let guard = 0;
    while (key(ring[0]) !== key(ring[ring.length - 1]) && guard++ < 5000) {
      const end = key(ring[ring.length - 1]);
      const i = ways.findIndex((w) => key(w[0]) === end || key(w[w.length - 1]) === end);
      if (i < 0) break;
      const w = ways.splice(i, 1)[0];
      ring = ring.concat((key(w[0]) === end ? w : w.slice().reverse()).slice(1));
    }
    if (ring.length >= 4) out.push(ring);
  }
  return out;
}

/* Kapalı halka: ilk nokta = son nokta olduğu için en uzak noktadan ikiye bölüp iki açık zinciri ayrı sadeleştir. */
function simplify(pts, tol) {
  if (pts.length < 5) return pts;
  const [x0, y0] = pts[0]; let k = 1, md = -1;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.hypot(pts[i][0] - x0, pts[i][1] - y0); if (d > md) { md = d; k = i; } }
  const a = dp(pts.slice(0, k + 1), tol), b = dp(pts.slice(k), tol);
  return a.concat(b.slice(1));
}
/* Douglas–Peucker (tamsayı düzlemde, açık zincir). */
function dp(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay; const L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = (r) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(s / 2); };

function shape(rel, tol, minArea) {
  const conv = (role) => rings(rel, role).map((r) => {
    const p = []; for (const [lon, lat] of r) { const q = prj(lon, lat); const l = p[p.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) p.push(q); }
    return simplify(p, tol);
  }).filter((r) => r.length >= 4 && area(r) >= minArea);
  const outer = conv("outer");
  const inner = conv("inner");
  return { outer: outer.map((r) => r.flat()), inner: inner.map((r) => r.flat()), lbl: label(outer, inner) };
}

/* Etiket noktası: en büyük dış halkanın içinde, kenarlara en uzak ızgara noktası (kaba "pole of inaccessibility"). */
function inRing(x, y, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }
function segDist(x, y, [ax, ay], [bx, by]) { const dx = bx - ax, dy = by - ay; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - ax - t * dx, y - ay - t * dy); }
function label(outer, inner) {
  if (!outer.length) return undefined;
  const big = outer.reduce((a, r) => (area(r) > area(a) ? r : a));
  const xs = big.map((p) => p[0]), ys = big.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const edges = [big, ...inner];
  let best = [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)], bd = -1;
  const N = 28;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const x = x0 + ((x1 - x0) * i) / N, y = y0 + ((y1 - y0) * j) / N;
    if (!inRing(x, y, big) || inner.some((r) => inRing(x, y, r))) continue;
    let d = Infinity; for (const r of edges) for (let k = 0, l = r.length - 1; k < r.length; l = k++) d = Math.min(d, segDist(x, y, r[l], r[k]));
    if (d > bd) { bd = d; best = [Math.round(x), Math.round(y)]; }
  }
  return best;
}

const ilce = JSON.parse(fs.readFileSync(path.join(inDir, "ilce.json"), "utf8")).elements.filter((e) => e.type === "relation" && e.tags?.name);
const outDir = path.resolve("data/harita");
fs.mkdirSync(path.join(outDir, "mahalle"), { recursive: true });

const ilceler = [];
let mahToplam = 0;
for (const rel of ilce.sort((a, b) => a.tags.name.localeCompare(b.tags.name, "tr"))) {
  const ad = rel.tags.name; const slug = slugify(ad);
  const s = shape(rel, 3, 400);
  if (!s.outer.length) { console.error(`ilçe halkası kurulamadı: ${ad}`); process.exit(1); }
  ilceler.push({ ad, slug, yaka: ANADOLU.has(ad) ? "anadolu" : "avrupa", osm: `relation/${rel.id}`, ...s });

  const f = path.join(inDir, "mah", `${rel.id}.json`);
  if (!fs.existsSync(f) || !fs.readFileSync(f, "utf8").includes('"elements"')) {
    if (process.env.HARITA_EKSIK === "1") { console.warn(`uyarı: mahalle dökümü yok, boş yazıldı: ${ad}`); fs.writeFileSync(path.join(outDir, "mahalle", `${slug}.json`), JSON.stringify({ ilce: ad, mahalleler: [] })); continue; }
    console.error(`mahalle dökümü yok: ${ad} (${f})`); process.exit(1);
  }
  const seen = new Set();
  const mah = JSON.parse(fs.readFileSync(f, "utf8")).elements
    .filter((e) => e.type === "relation" && e.tags?.name && !seen.has(e.id) && seen.add(e.id))
    .map((r) => ({ ad: mahAdi(r.tags.name), osm: `relation/${r.id}`, ...shape(r, 1.5, 20) }))
    .filter((m) => m.outer.length)
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  mahToplam += mah.length;
  fs.writeFileSync(path.join(outDir, "mahalle", `${slug}.json`), JSON.stringify({ ilce: ad, mahalleler: mah }));
}
const meta = { kaynak: "© OpenStreetMap katkıcıları (ODbL), idari sınırlar admin_level 6 ve 8", uretim: new Date().toISOString().slice(0, 10), proj: PROJ };
fs.writeFileSync(path.join(outDir, "ilceler.json"), JSON.stringify({ ...meta, ilceler }));
console.log(`ilçe ${ilceler.length}, mahalle ${mahToplam}`);
