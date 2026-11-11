/* OVERTURE ADAY ÖN SÜZGECİ (paket 16+). Girdi: overture-cek.py çıktısından restoran/fast food, güven ≥ 0,9, web siteli satırlar (JSON).
   Çıkarılanlar: platform/sosyal medya sitesi, İstanbul dışı, kapsam dışı zincir (lib/katalog/zincir.ts), katalogda ya da açık paketlerde olanlar.
   İşaretlenenler: 906 dalıyla ortak (v906), aynı alan adını paylaşan şubeler (zincirAlan), OSM'de olası kendi kaydı (osm; paket üreticisi sıkı eşleştirmeyle yeniden denetler).
   Kullanım: npx tsx scripts/katalog/overture-aday.ts <aday-ham.json> <cikti.json> <osm-ham.json[,..]> <v906.json[,..]> -- <mevcut.json...> */
import { readFileSync, writeFileSync } from "node:fs";
import { fold, meters, siteKey } from "../../lib/katalog/aday";
import { kapsamDisiOf } from "../../lib/katalog/zincir";
import { districtOf } from "../../lib/katalog/geo";
const argv = process.argv.slice(2); const sep = argv.indexOf("--");
const [hamP, outP, osmP, v906P] = argv.slice(0, sep); const existing = argv.slice(sep + 1);
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const F = J("data/katalog/istanbul-ilceler.json");
const A: any[] = J(hamP); const EX: any[] = existing.flatMap(J); const V906: any[] = v906P.split(",").flatMap(J);
const OSM: any[] = osmP.split(",").flatMap((p) => J(p).elements).filter((e: any) => ["restaurant", "fast_food", "cafe", "bar", "pub"].includes(e.tags?.amenity));
const PLATFORM = /instagram|facebook|linktr\.ee|linkfly|bio\.link|beacons|yemeksepeti|getir|trendyol|tripadvisor|google\.|goo\.gl|business\.site|eatbu|menulux|finedine|qr|adisyo|wa\.me|whatsapp|tiktok|twitter|x\.com|youtube|foursquare|zomato|restaurantguru|letsgo|ticimax|sahibinden|t\.me|yandex|booking|hotels\.com|expedia|marriott|hilton|accor|ihg|wyndham|fourseasons|kempinski|dedeman/i;
const tel = (p?: string) => (p ?? "").replace(/\D/g, "").slice(-10);
const hostCount: Record<string, number> = {}; for (const a of A) { const h = siteKey(a.siteler[0]); if (h) hostCount[h] = (hostCount[h] ?? 0) + 1; }
const out: any[] = []; const st: Record<string, number> = {}; const bump = (k: string) => (st[k] = (st[k] ?? 0) + 1);
for (const a of A) {
  const site = a.siteler.find((u: string) => siteKey(u) && !PLATFORM.test(u)); if (!site) { bump("platform_ya_da_sosyal"); continue; }
  const host = siteKey(site)!; const p = { lat: a.lat, lng: a.lng }; const ilce = districtOf(a.lat, a.lng, F); if (!ilce) { bump("istanbul_disi"); continue; }
  if (kapsamDisiOf(a.ad, a.marka, host)) { bump("kapsam_disi_zincir"); continue; }
  const f = fold(a.ad); const first = f.split(" ")[0]; const t = tel(a.telefonlar[0]);
  const dupEx = EX.find((v) => (typeof v.lat === "number" && meters(v, p) < 150 && fold(v.name).split(" ")[0] === first) || (fold(v.name) === f && v.district === ilce) || (t.length === 10 && tel(v.phone) === t) || (v.website && siteKey(v.website) === host && hostCount[host] === 1));
  if (dupEx) { bump("katalogda_ya_da_pakette"); continue; }
  const dup906 = V906.find((v) => (typeof v.lat === "number" && meters(v, p) < 150 && fold(v.name).split(" ")[0] === first) || (t.length === 10 && tel(v.phone) === t));
  const osm = OSM.map((e) => ({ e, d: meters({ lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon }, p) })).filter((x) => x.d < 120 && (fold(x.e.tags.name ?? x.e.tags["name:en"] ?? "").split(" ")[0] === first || (t.length === 10 && tel(x.e.tags.phone ?? x.e.tags["contact:phone"]) === t))).sort((x, y) => x.d - y.d)[0];
  out.push({ ...a, site, host, ilce, zincirAlan: hostCount[host] > 1 ? hostCount[host] : 0, osm: osm ? { ref: `${osm.e.type}/${osm.e.id}`, ad: osm.e.tags.name ?? osm.e.tags["name:en"], amenity: osm.e.tags.amenity, d: Math.round(osm.d), cuisine: osm.e.tags.cuisine ?? null } : null, v906: dup906?.slug ?? null });
  bump(osm ? "aday_osm_eslesmeli" : "aday_osmsiz");
}
writeFileSync(outP, JSON.stringify(out)); console.log(st, "toplam aday", out.length);
