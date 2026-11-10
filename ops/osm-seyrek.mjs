/* SEYREK İLÇELER · OSM ham verisi (salt okuma, Overpass). amenity=restaurant (+ adlı), meta ile (son düzenleme tarihi).
   Çıktı: out/seyrek/<ilçe>.json { district, elements }. Kaynak: © OpenStreetMap katkıcıları (ODbL). Google çağrısı yok. */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
const D = (process.env.ILCELER ?? "").split(",").filter(Boolean);
const out = process.env.CIKTI ?? "out/seyrek"; mkdirSync(out, { recursive: true });
const q = (d) => `[out:json][timeout:120];area["boundary"="administrative"]["admin_level"="6"]["name"="${d}"]->.a;nwr["amenity"~"^(restaurant|cafe|fast_food)$"]["name"](area.a);out tags center meta;`;
const EP = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
let ok = 0;
for (const d of D) {
  const f = `${out}/${d}.json`; if (existsSync(f)) { ok++; continue; }
  for (let a = 0; a < 10; a++) {
    let r; try { r = await fetch(EP[a % EP.length], { method: "POST", headers: { "user-agent": "gidenler-osm-import/1.0 (+https://www.gidenler.com)" }, body: new URLSearchParams({ data: q(d) }), signal: AbortSignal.timeout(150000) }); }
    catch (e) { console.log(d, "hata", String(e).slice(0, 60)); await new Promise((x) => setTimeout(x, 8000 * (a + 1))); continue; }
    if (r.ok) { const j = await r.json().catch(() => null); if (j?.elements) { writeFileSync(f, JSON.stringify({ district: d, elements: j.elements.map(({ user, uid, changeset, ...e }) => e) })); console.log(d, j.elements.length); ok++; break; } }
    console.log(d, "http", r.status); await new Promise((x) => setTimeout(x, 10000 * (a + 1)));
  }
  await new Promise((x) => setTimeout(x, 4000));
}
console.log(`SONUÇ ${ok}/${D.length}`); process.exit(ok === D.length ? 0 : 1);
