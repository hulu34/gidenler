/* İSTANBUL ENVANTERİ — 39 ilçe ve ~1 km hücre (semt) düzeyinde kapsama.
   Katalog: yayındaki kayıtlar (+ istenirse hazır paket). Evren: OSM'deki adlı, zincir olmayan yeme-içme noktaları
   (gerçek yoğunluğun alt sınırı; OSM eksikse evren de eksiktir). Canlı tarama: profilde Google puanı ve görsel ölçümü.
   Kullanım: npx tsx scripts/katalog/envanter.mjs <venues.json> <havuz.json> <canli.json|-> <kalite.json|-> <cikti.json> <cikti.md> [etiket] */
import { readFileSync, writeFileSync } from "node:fs";
import { auditCuisine, KIND_TO_MUTFAK, MUTFAK } from "../../lib/katalog/mutfak.ts";
import { hasHouseNo } from "../../lib/katalog/kalite.ts";
const [vp, hp, lp, kp, outJ, outM, etiket = "Production"] = process.argv.slice(2);
const V = JSON.parse(readFileSync(vp, "utf8"));
const isl = JSON.parse(readFileSync("data/real/isletme.json", "utf8"));
const all = [...V, ...isl.filter((b) => !V.some((v) => v.slug === b.slug))];
const H = JSON.parse(readFileSync(hp, "utf8"));
const LIVE = lp !== "-" ? JSON.parse(readFileSync(lp, "utf8")) : null;
const KAL = kp !== "-" ? Object.fromEntries(JSON.parse(readFileSync(kp, "utf8")).kayitlar.map((r) => [r.slug, r])) : {};
const KAP = JSON.parse(readFileSync("data/real/kapanis.json", "utf8"));
const FOTO = JSON.parse(readFileSync("data/real/izinli-fotograflar.json", "utf8"));
const F = JSON.parse(readFileSync("data/katalog/istanbul-ilceler.json", "utf8"));
const P = JSON.parse(readFileSync("data/katalog/istanbul-ilce-nufus-2025.json", "utf8")).ilceler;
const D = F.ilceler.map((d) => d.ad);
const row = () => ({ toplam: 0, restoran: 0, kafe: 0, bar: 0, tamAdres: 0, koordinat: 0, mutfakKaynakli: 0, addanTur: 0, google: 0, kapali: 0, supheli: 0, gorsel: 0, doluProfil: 0, A: 0, B: 0, C: 0, osmEvren: 0, osmRestoran: 0 });
const T = Object.fromEntries(D.map((d) => [d, row()]));
const mut = {}; const mutIlce = {};
for (const v of all) {
  const r = T[v.district]; if (!r) { console.log("ilçe dışı", v.slug, v.district); continue; }
  r.toplam++;
  if (v.categoryId === "cat.cafe") r.kafe++; else if (v.categoryId === "cat.bar") r.bar++; else r.restoran++;
  const full = hasHouseNo(v.address); if (full) r.tamAdres++;
  if (typeof v.lat === "number") r.koordinat++;
  const m = auditCuisine({ name: v.name, amenity: v.osmAmenity, cuisine: v.cuisine });
  const biz = v.ref.startsWith("isletme/");
  const labels = m.labels.length ? m.labels.map((l) => l.id) : biz && KIND_TO_MUTFAK[v.kind] ? [KIND_TO_MUTFAK[v.kind]] : [];
  if (labels.length) r.mutfakKaynakli++;
  else if (KIND_TO_MUTFAK[v.kind]) r.addanTur++;
  for (const id of labels) { mut[id] = (mut[id] ?? 0) + 1; (mutIlce[v.district] ??= {})[id] = ((mutIlce[v.district] ?? {})[id] ?? 0) + 1; }
  if (!labels.length) { mut._yok = (mut._yok ?? 0) + 1; }
  const k = KAP[v.slug]?.state; if (k === "closed_confirmed") r.kapali++; if (k === "closed_suspected") r.supheli++;
  const g = LIVE?.[v.slug]; if (g?.g) r.google++;
  if (v.image || FOTO[v.slug] || (g && g.img > 0)) r.gorsel++;
  const contact = v.phone || v.website || v.instagram;
  if (full && labels.length && typeof v.lat === "number" && contact && v.openingHours && k !== "closed_confirmed") r.doluProfil++;
  const q = KAL[v.slug]?.sinif; if (q) r[q]++;
}
/* evren: istanbul içi, zincir/genel ad/kapalı olmayan OSM noktaları */
const cells = new Map(); const cellKey = (lat, lng) => `${Math.floor(lat / 0.009)}:${Math.floor(lng / 0.012)}`;
for (const a of H.adaylar) {
  if (a.ret.length && !a.esles) continue;
  const r = T[a.district]; r.osmEvren++; if (a.amenity === "restaurant" || a.amenity === "fast_food") r.osmRestoran++;
  const c = cellKey(a.lat, a.lng); const x = cells.get(c) ?? { ilce: a.district, evren: 0, katalog: 0, semtler: {}, lat: a.lat, lng: a.lng };
  x.evren++; if (a.neighbourhood) x.semtler[a.neighbourhood] = (x.semtler[a.neighbourhood] ?? 0) + 1; cells.set(c, x);
}
for (const v of all) { if (typeof v.lat !== "number") continue; const x = cells.get(cellKey(v.lat, v.lng)); if (x) x.katalog++; }
const ilceler = D.map((d) => ({ ilce: d, nufus: P[d] ?? null, ...T[d], kapsama: T[d].osmEvren ? Math.round((T[d].toplam / T[d].osmEvren) * 1000) / 10 : null, onBinKisiyeKatalog: P[d] ? Math.round((T[d].toplam / P[d]) * 1e5 * 10) / 10 : null }));
const toplam = Object.fromEntries(Object.keys(row()).map((k) => [k, ilceler.reduce((s, r) => s + r[k], 0)]));
/* zayıf bölge: evreni büyük (≥ 40 nokta) ama kapsaması düşük hücreler */
const zayif = [...cells.values()].filter((c) => c.evren >= 40).map((c) => ({ ilce: c.ilce, semt: Object.entries(c.semtler).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "(adsız)", evren: c.evren, katalog: c.katalog, oran: Math.round((c.katalog / c.evren) * 1000) / 10, lat: Math.round(c.lat * 1000) / 1000, lng: Math.round(c.lng * 1000) / 1000 }))
  .sort((a, b) => a.oran - b.oran || b.evren - a.evren);
const out = { etiket, osmTarihi: H.ozet.osm_tarihi, toplam, ilceler, mutfak: Object.fromEntries(Object.entries(mut).sort((a, b) => b[1] - a[1])), mutfakIlce: mutIlce, hucreler: { toplam: cells.size, katalogsuzEvren40: zayif.filter((z) => z.katalog === 0).length, zayif: zayif.slice(0, 40) } };
writeFileSync(outJ, JSON.stringify(out, null, 1));
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "–");
let md = `### ${etiket}: ${toplam.toplam} kayıt · OSM ${H.ozet.osm_tarihi.slice(0, 10)}\n\n| İlçe | Nüfus | Toplam | Rest. | Kafe | Bar | Tam adres | Koord. | Kaynaklı tür | Addan tür | Google | Kapalı | Şüpheli | Görsel | Dolu profil | A/B/C | OSM evreni | Kapsama |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|\n`;
for (const r of [...ilceler].sort((a, b) => b.toplam - a.toplam)) md += `| ${r.ilce} | ${r.nufus?.toLocaleString("tr-TR") ?? "?"} | ${r.toplam} | ${r.restoran} | ${r.kafe} | ${r.bar} | ${r.tamAdres} | ${r.koordinat} | ${r.mutfakKaynakli} | ${r.addanTur} | ${LIVE ? r.google : "–"} | ${r.kapali} | ${r.supheli} | ${r.gorsel} | ${r.doluProfil} | ${r.A}/${r.B}/${r.C} | ${r.osmEvren} | ${r.kapsama ?? "–"}% |\n`;
md += `| **Toplam** | | **${toplam.toplam}** | ${toplam.restoran} | ${toplam.kafe} | ${toplam.bar} | ${toplam.tamAdres} (${pct(toplam.tamAdres, toplam.toplam)}) | ${toplam.koordinat} | ${toplam.mutfakKaynakli} (${pct(toplam.mutfakKaynakli, toplam.toplam)}) | ${toplam.addanTur} | ${LIVE ? toplam.google : "–"} | ${toplam.kapali} | ${toplam.supheli} | ${toplam.gorsel} | ${toplam.doluProfil} (${pct(toplam.doluProfil, toplam.toplam)}) | ${toplam.A}/${toplam.B}/${toplam.C} | ${toplam.osmEvren} | ${pct(toplam.toplam, toplam.osmEvren)} |\n\n`;
md += `**Mutfak etiketleri (kaynaklı, çoklu):** ${Object.entries(mut).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k === "_yok" ? "kaynakta tür yok" : MUTFAK[k].ad} ${n}`).join(" · ")}\n\n`;
md += `**En zayıf semtler (~1 km hücre, OSM'de ≥ 40 nokta):**\n\n| İlçe | Semt | OSM noktası | Katalog | Oran |\n|---|---|---:|---:|---:|\n` + zayif.slice(0, 20).map((z) => `| ${z.ilce} | ${z.semt} | ${z.evren} | ${z.katalog} | ${z.oran}% |`).join("\n") + "\n";
writeFileSync(outM, md);
console.log(JSON.stringify(toplam), "hücre", cells.size, "katalogsuz büyük hücre", out.hucreler.katalogsuzEvren40);
