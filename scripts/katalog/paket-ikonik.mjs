/* İKONİK RESTORAN PAKETİ (paket 11): Michelin dışı, adı bilinen İstanbul restoranları; elle karar tablosu (data/paket/<klasör>/karar.json).
   Kimlik: OSM restoran kaydı (tip osm) ya da OSM'de restoran noktası yoksa işletme kaydı (tip isletme; konum OSM adres/bina noktası).
   A şartı: resmî sitede ad + (telefon | sokak) + resmî siteden kapı numaralı adres + OSM konumu + ilçe sınırı + kaynaklı tür + mükerrer yok.
   Tür kanıtı düzeyi ayrı yazılır: "şube" (bu şubenin/tek konumun kendi sayfası) ya da "marka" (tek konseptli markanın genel tanımı).
   Koordinat YALNIZ OSM'den. Google verisi yok. Addan tür üretilmez.
   Kullanım: npx tsx scripts/katalog/paket-ikonik.mjs <klasör> <dalga> <tarih> <ham-osm.json> <adres-noktalari.json> -- <mevcut.json...> */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fold, meters } from "../../lib/katalog/aday.ts";
import { districtOf } from "../../lib/katalog/geo.ts";
import { slugify } from "../osm-select.mjs";
const argv = process.argv.slice(2); const sep = argv.indexOf("--");
const [dir, waveS, tarih, rawP, adrP] = argv.slice(0, sep); const existing = argv.slice(sep + 1); const wave = Number(waveS);
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const K = J(`${dir}/karar.json`); const F = J("data/katalog/istanbul-ilceler.json");
const OSM = new Map([...J(rawP).elements, ...J(adrP).elements].map((e) => [`${e.type}/${e.id}`, e]));
const EX = existing.flatMap(J); const taken = new Set(EX.map((v) => v.slug)), exRef = new Set(EX.map((v) => v.ref));
const pt = (e) => ({ lat: Math.round((e.lat ?? e.center?.lat) * 1e6) / 1e6, lng: Math.round((e.lon ?? e.center?.lon) * 1e6) / 1e6 });
const recs = [], rows = [], drop = [];
for (const k of K.kayitlar) {
  const locRef = k.tip === "osm" ? k.ref : k.konum; const e = OSM.get(locRef);
  if (!e) { drop.push({ ad: k.ad, neden: `OSM öğesi bulunamadı: ${locRef}` }); continue; }
  if (k.tip === "osm" && exRef.has(k.ref)) { drop.push({ ad: k.ad, neden: "OSM kaydı katalogda" }); continue; }
  if (!/No:\s*\d/.test(k.adres)) { drop.push({ ad: k.ad, neden: "kapı numarası yok" }); continue; }
  if (!k.tur?.kind || !k.tur?.ifade || !["sube", "marka"].includes(k.tur.duzey)) { drop.push({ ad: k.ad, neden: "tür kanıtı eksik" }); continue; }
  const p = pt(e); const ilce = districtOf(p.lat, p.lng, F);
  if (!ilce) { drop.push({ ad: k.ad, neden: "konum İstanbul ilçe sınırında değil" }); continue; }
  const near = [...EX, ...recs].find((v) => typeof v.lat === "number" && fold(v.name).split(" ")[0] === fold(k.ad).split(" ")[0] && meters(v, p) < 150);
  if (near) { drop.push({ ad: k.ad, neden: `yakında aynı adlı kayıt: ${near.slug}` }); continue; }
  const slug = `${slugify(k.ad)}-${slugify(ilce)}`.replace(/--+/g, "-");
  if (taken.has(slug)) { drop.push({ ad: k.ad, neden: "slug çakışması" }); continue; } taken.add(slug);
  const address = [k.adres, k.mahalle ? `${k.mahalle} Mahallesi` : null, ilce].filter(Boolean).join(", ");
  const host = new URL(k.site).host.replace(/^www\./, "");
  const siteTxt = k.zincir ? `resmî şube sayfası ${host} (${k.kanit})` : `resmî site ${host} (${k.kanit})`;
  const konumTxt = k.tip === "osm" ? `konum: OSM restoran kaydı ${k.ref}` : `konum: ${k.konumNot} — ${k.konum} (${k.hassasiyet === "address" ? "adres" : "bina"} düzeyi)`;
  const turTxt = `tür: resmî site "${k.tur.ifade}" (${k.tur.duzey === "sube" ? "şube düzeyi kanıt" : "marka düzeyi kanıt, tek konseptli markada bu şubeye uygulandı"})`;
  const verification = `${siteTxt} · ${konumTxt} · adres: resmî site · ${turTxt}`;
  const base = { slug, name: k.ad, categoryId: "cat.restaurant", kind: k.tur.kind, district: ilce, ...(k.mahalle ? { neighborhood: `${k.mahalle} Mahallesi` } : {}), lat: p.lat, lng: p.lng, address,
    ...(k.telefon ? { phone: k.telefon } : {}), website: k.site, cuisine: k.tur.cuisine, importedAt: tarih };
  const v = k.tip === "osm"
    ? { ref: k.ref, ...base, osmAmenity: "restaurant", wave, verifiedAt: tarih, confidence: "güçlü", verification }
    : { ref: `isletme/${slug}`, ...base, sourceKind: "official_site", sourceUrl: k.site, location: { provider: "osm", ref: k.konum, precision: k.hassasiyet }, wave, verifiedAt: tarih, confidence: "güçlü", verification };
  recs.push(v);
  rows.push({ slug, ref: v.ref, tip: k.tip === "osm" ? "osm_kaydi" : "isletme_kaydi", ad: k.ad, ilce, adres: address, koordinat: [p.lat, p.lng], tur: k.tur.kind,
    turKanitDuzeyi: k.tur.duzey === "sube" ? "şube" : "marka", faaliyet: "açık (resmî sitede güncel iletişim bilgisi, kontrol tarihi)", sinif: "A",
    zincir: k.zincir ?? null, sube: k.sube ?? null, kanit: [siteTxt, konumTxt, turTxt, ...(k.not ? [k.not] : [])],
    kaynak: [`https://www.openstreetmap.org/${locRef}`, k.site], kontrolTarihi: tarih });
}
mkdirSync(dir, { recursive: true });
const lines = (arr) => "[\n" + arr.map((r) => JSON.stringify(r)).join(",\n") + "\n]\n";
writeFileSync(`${dir}/kayitlar.json`, lines(recs.filter((v) => !v.ref.startsWith("isletme/"))));
writeFileSync(`${dir}/isletme-kayitlari.json`, lines(recs.filter((v) => v.ref.startsWith("isletme/"))));
writeFileSync(`${dir}/paket.json`, JSON.stringify({ _aciklama: `İstanbul ikonik restoran paketi (dalga ${wave}): Michelin dışı, adı bilinen restoranlardan katalogda olmayan ve kanıtı tam olanlar. kayitlar.json → venues.json, isletme-kayitlari.json → isletme.json (yayın paketinde). Konum: OSM (© OpenStreetMap katkıcıları, ODbL). Kanıt resmî sitelerden ölçüldü; sayfa içeriği saklanmadı. Google verisi kullanılmadı.`, kontrolTarihi: tarih, eklenen: rows }, null, 1));
writeFileSync(`${dir}/elenen.json`, lines(drop));
const cnt = (a) => a.reduce((m, x) => (m[x] = (m[x] ?? 0) + 1, m), {});
const oz = { dalga: wave, A: recs.length, osmKaydi: recs.filter((v) => !v.ref.startsWith("isletme/")).length, isletmeKaydi: recs.filter((v) => v.ref.startsWith("isletme/")).length, elenen: drop.length,
  turKanitDuzeyi: cnt(rows.map((r) => r.turKanitDuzeyi)), ilce: cnt(recs.map((v) => v.district)), tur: cnt(recs.map((v) => v.kind)) };
writeFileSync(`${dir}/ozet.json`, JSON.stringify(oz, null, 1));
console.log(JSON.stringify(oz, null, 1)); if (drop.length) console.log("elenen:", JSON.stringify(drop, null, 1));
