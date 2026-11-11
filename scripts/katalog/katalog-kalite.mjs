/* KATALOG KALİTE DENETİMİ — yayındaki ve hazır paketlerdeki kayıtlar için A/B/C (kimlik, konum, faaliyet, tür, mükerrer).
   Kayıtlar DEĞİŞTİRİLMEZ; yalnız rapor ve inceleme kuyruğu üretilir.
   Kullanım: npx tsx scripts/katalog/katalog-kalite.mjs <venues.json> <overpass.json> <cikti.json> [canli-tarama.json] */
import { readFileSync, writeFileSync } from "node:fs";
import { districtOf } from "../../lib/katalog/geo.ts";
import { auditCuisine, kindConflict } from "../../lib/katalog/mutfak.ts";
import { gradeExisting } from "../../lib/katalog/kalite.ts";
import { fold, coreName, meters, phoneKey, checkDateOf } from "../../lib/katalog/aday.ts";
const [vp, op, out, livePath] = process.argv.slice(2);
const V = JSON.parse(readFileSync(vp, "utf8"));
const isl = JSON.parse(readFileSync("data/real/isletme.json", "utf8"));
const all = [...V, ...isl.filter((b) => !V.some((v) => v.slug === b.slug))];
const OSM = new Map(JSON.parse(readFileSync(op, "utf8")).elements.map((e) => [`${e.type}/${e.id}`, e]));
const F = JSON.parse(readFileSync("data/katalog/istanbul-ilceler.json", "utf8"));
const K = JSON.parse(readFileSync("data/real/kapanis.json", "utf8"));
const LIVE = livePath ? JSON.parse(readFileSync(livePath, "utf8")) : {};
const rows = [];
for (const v of all) {
  const biz = v.ref.startsWith("isletme/");
  const e = OSM.get(v.ref);
  const osmNow = biz ? "isletme" : !e ? "yok" : (e.tags.disused === "yes" || e.tags["disused:amenity"]) ? "kapali" : "var";
  const tags = e?.tags ?? {};
  const mut = auditCuisine({ name: v.name, amenity: v.osmAmenity ?? tags.amenity, cuisine: v.cuisine ?? tags.cuisine });
  /* katalog içi çift: aynı ad 150 m, benzer çekirdek ad 80 m ya da aynı telefon */
  let dup = null;
  for (const o of all) {
    if (o === v) continue;
    if (typeof v.lat === "number" && typeof o.lat === "number") {
      const d = meters(v, o);
      if (d <= 150 && fold(o.name) === fold(v.name)) { dup = `${o.slug}(${Math.round(d)}m)`; break; }
      const a = coreName(v.name), b = coreName(o.name);
      if (d <= 80 && a.length >= 4 && a === b) { dup = `${o.slug}(${Math.round(d)}m)`; break; }
    }
    if (phoneKey(v.phone) && phoneKey(v.phone) === phoneKey(o.phone)) { dup = `${o.slug}(tel)`; break; }
  }
  const vm = /konum (\d+) m · ad ([\d.]+)/.exec(v.verification ?? "");
  const g = gradeExisting({
    address: v.address, cuisineLabels: mut.labels.length + (biz && v.cuisine?.length ? 1 : 0), nameConflict: !biz && kindConflict(v.kind, mut, v.name), ref: v.ref, isBusiness: biz,
    polygonOk: typeof v.lat === "number" ? (districtOf(v.lat, v.lng, F) ?? v.district) === v.district : null, osmNow,
    closure: K[v.slug]?.state ?? null, googleChip: LIVE[v.slug] ? !!LIVE[v.slug].g : null,
    verification: vm ? { m: +vm[1], ad: +vm[2], date: v.verifiedAt } : null, dup, checkDate: checkDateOf(tags), siteVerified: /resmî site \([^)]*\): ad \+ (sokak|telefon)/.test(v.verification ?? ""),
  });
  rows.push({ slug: v.slug, name: v.name, district: v.district, wave: v.wave ?? (biz ? "işletme" : 0), kind: v.kind, mutfak: mut.labels.map((l) => l.id), adIpucu: mut.nameOnly, adNotu: mut.nameConflict ? `${mut.nameConflict.hint}≠${mut.nameConflict.sourced.join("+")}` : undefined, ...g });
}
const by = (f) => { const o = {}; for (const r of rows) { const k = f(r); o[k] ??= { A: 0, B: 0, C: 0 }; o[k][r.sinif]++; } return o; };
const cnt = (arr) => arr.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {});
const ozet = {
  toplam: rows.length, sinif: cnt(rows.map((r) => r.sinif)), dalga: by((r) => String(r.wave)),
  C_nedenleri: cnt(rows.flatMap((r) => r.neden.map((n) => n.split(":")[0]))),
  eksik_alanlar: cnt(rows.flatMap((r) => r.eksik)),
  addan_tur: rows.filter((r) => r.kind !== "Restoran" && !r.mutfak.length && r.kind && !["Kafe", "Bar", "Pub"].includes(r.kind)).length,
};
writeFileSync(out, JSON.stringify({ ozet, kayitlar: rows }, null, 1));
console.log(JSON.stringify(ozet, null, 1));
