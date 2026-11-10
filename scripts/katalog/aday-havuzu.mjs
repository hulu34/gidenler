/* ADIM 1–3: OSM ham verisi → ilçe ataması → mevcut katalogla karşılaştırma → aday havuzu.
   Kullanım: npx tsx scripts/katalog/aday-havuzu.mjs <overpass.json> <cikti.json> <mevcut1.json> [mevcut2.json ...]
   (mevcut*.json: venues.json biçiminde kayıtlar; Production 456 + işletme kayıtları + 906 dalı + diğer paketler) */
import { readFileSync, writeFileSync } from "node:fs";
import { districtOf } from "../../lib/katalog/geo.ts";
import { toCandidate, matchExisting, fold, coreName, meters, siteKey } from "../../lib/katalog/aday.ts";
const [inp, out, ...existingPaths] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(inp, "utf8"));
const SEHIR = process.env.SEHIR ?? "istanbul";
const F = JSON.parse(readFileSync(`data/katalog/${SEHIR}-ilceler.json`, "utf8"));
const seen = new Set(); const mevcut = [];
for (const p of existingPaths) for (const v of JSON.parse(readFileSync(p, "utf8"))) if (!seen.has(v.slug)) { seen.add(v.slug); mevcut.push(v); }
const cands = [];
let disi = 0;
for (const e of raw.elements) {
  const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
  if (typeof lat !== "number" || !e.tags?.name) continue;
  const d = districtOf(lat, lng, F);
  if (!d) { disi++; continue; }
  const a = toCandidate(e, d);
  a.esles = matchExisting(a, mevcut);
  cands.push(a);
}
/* aday içi: aynı alan adını paylaşan ≥3 aday ya da aynı ad ≥3 ilçede → zincir şüphesi; aynı ad 150 m içinde ikinci aday → çift */
const byDomain = new Map(), byName = new Map();
for (const a of cands) { const k = siteKey(a.website); if (k) byDomain.set(k, [...(byDomain.get(k) ?? []), a]); const n = fold(a.name); byName.set(n, [...(byName.get(n) ?? []), a]); }
for (const a of cands) {
  const k = siteKey(a.website);
  if (k && byDomain.get(k).length >= 2) a.inceleme.push(`zincir_suphesi_site:${byDomain.get(k).length}`);   // aynı site 2+ noktada → şube/franchise: şube listesiyle ayrıca doğrulanmalı
  const same = byName.get(fold(a.name));
  if (same.length >= 3 && new Set(same.map((x) => x.district)).size >= 2) a.inceleme.push(`zincir_suphesi_ad:${same.length}`);
  const twin = same.find((b) => b !== a && meters(a, b) <= 150);
  if (twin && a.ref > twin.ref) a.ret.push(`aday_ici_cift:${twin.ref}`);
}
const yeni = cands.filter((a) => !a.esles);
const sum = {
  osm_tarihi: raw.osm3s?.timestamp_osm_base, ham: raw.elements.length, il_disi: disi, il_ici: cands.length,
  katalogda_var: cands.filter((a) => a.esles?.neden === "ayni_osm_kaydi").length,
  mukerrer_suphesi: cands.filter((a) => a.esles && a.esles.neden !== "ayni_osm_kaydi").length,
  yeni: yeni.length, yeni_retli: yeni.filter((a) => a.ret.length).length, yeni_temiz: yeni.filter((a) => !a.ret.length).length,
  yeni_temiz_siteli: yeni.filter((a) => !a.ret.length && siteKey(a.website)).length,
  yeni_temiz_tam_adres: yeni.filter((a) => !a.ret.length && a.street && a.housenumber).length,
  yeni_temiz_yerinde_kontrol: yeni.filter((a) => !a.ret.length && a.checkDate).length,
};
const retNedeni = {}; for (const a of yeni) for (const r of a.ret) { const k = r.split(":")[0]; retNedeni[k] = (retNedeni[k] ?? 0) + 1; }
writeFileSync(out, JSON.stringify({ ozet: sum, retNedeni, adaylar: cands }, null, 0));
console.log(JSON.stringify(sum, null, 1)); console.log(retNedeni);
