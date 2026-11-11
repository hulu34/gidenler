/* ZİNCİR ŞUBE PAKETİ (paket 9). Kaynak: markanın resmî şube listesi (zincir-liste.mjs çıktısı).
   1) OSM'de bulunan şube: kimlik OSM kaydı; adres resmî listeden (kapı no dahil); konum OSM. Kanıt: resmî liste adresi + konum uyumu.
   2) OSM'de olmayan şube: işletme kaydı (ref "isletme/<slug>", sourceKind official_site, sourceUrl = şube sayfası).
      Koordinat YALNIZ OSM'nin bina/adres noktasından (Nominatim; kapı numarası ve sokak birebir) — location.provider "osm".
   Tür: OSM şubesinde kendi etiketi; işletme kaydında markanın OSM'deki şubelerinin ortak mutfak etiketi (addan değil).
   Her şube ayrı kimlik: slug = <marka>-<mahalle|sokak>-<ilçe>. venues.json / isletme.json'a EKLENMEZ.
   Kullanım: npx tsx scripts/katalog/paket-zincir.mjs <klasör> <dalga> <tarih> <ham-osm.json> <havuz.json> <zincir-liste.json> -- <mevcut.json...> */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { sourcedLabels, MUTFAK } from "../../lib/katalog/mutfak.ts";
import { fold, meters } from "../../lib/katalog/aday.ts";
import { districtOf } from "../../lib/katalog/geo.ts";
import { slugify } from "../osm-select.mjs";
const argv = process.argv.slice(2); const sep = argv.indexOf("--");
const [dir, waveS, tarih, rawP, hp, zp] = argv.slice(0, sep); const existing = argv.slice(sep + 1); const wave = Number(waveS);
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const RAW = new Map(J(rawP).elements.map((e) => [`${e.type}/${e.id}`, e])); const H = new Map(J(hp).adaylar.map((a) => [a.ref, a]));
const Z = J(zp); const EX = existing.flatMap(J); const F = J("data/katalog/istanbul-ilceler.json");
const taken = new Set(EX.map((v) => v.slug)), exRef = new Set(EX.map((v) => v.ref));
const KIND = { turk: "Türk mutfağı", esnaf: "Lokanta", kebap: "Kebapçı / Ocakbaşı", doner: "Dönerci", pide: "Pideci", balik: "Balık restoranı", meyhane: "Meyhane", et: "Steakhouse", burger: "Burger", pizza: "Pizza", japon: "Sushi / Japon", asya: "Asya mutfağı", kahvalti: "Kahvaltı", dunya: "Dünya mutfağı", vegan: "Vegan", tavuk: "Tavuk", sokak: "Sokak lezzeti" };
const NOT_R = new Set(["kafe", "bar", "tatli", "firin"]);
const cnt = (a) => a.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {});
/* markanın OSM şubelerindeki mutfak etiketleri (çoğunluk) */
const brandCuisine = {};
for (const a of H.values()) { const e = RAW.get(a.ref); if (!e?.tags?.cuisine) continue; const key = fold(e.tags.brand ?? a.name).replace(/\s+/g, ""); (brandCuisine[key] ??= []).push(e.tags.cuisine.split(";")[0].trim()); }
const cuisineOfBrand = (b) => { const k = fold(b).replace(/\s+/g, ""); const hits = Object.entries(brandCuisine).filter(([x]) => x.startsWith(k.slice(0, Math.max(5, k.length)))).flatMap(([, v]) => v); const c = cnt(hits); const top = Object.entries(c).sort((x, y) => y[1] - x[1])[0]; return top && top[1] >= 2 ? { deger: top[0], n: top[1], toplam: hits.length } : null; };
const BRAND_NAME = { "hd iskender": "HD İskender", "etiler marmaris": "Etiler Marmaris", "bigchefs": "BigChefs", "pidem": "Pidem", "burger yiyelim": "Burger Yiyelim", "bursa kebap evi": "Bursa Kebap Evi", "happy moon s": "Happy Moon's", "usta donerci": "Usta Dönerci", "cookshop": "Cookshop", "durumle": "Dürümle", "gala kokorec": "Gala Kokoreç" };
const cleanHood = (h) => (h ? h.replace(/\s+(Mahallesi|Mah\.?|Mh\.?)$/i, "").trim() : null);
const fmtAddr = (x) => { const hood = cleanHood(x.mahalle) ? `${cleanHood(x.mahalle)} Mahallesi` : null; return [x.sokak ? `${x.sokak} No:${x.no}` : null, hood, x.ilce].filter(Boolean).join(", "); };
const recs = [], rows = [], drop = [];
const nearExisting = (pt, brand) => { const b = fold(brand).replace(/\s+/g, ""); return [...EX, ...recs].find((v) => typeof v.lat === "number" && fold(v.name).replace(/\s+/g, "").startsWith(b.slice(0, 6)) && meters(v, pt) < 400); };
/* 1) OSM'de bulunan şubeler */
for (const [ref, z] of Object.entries(Z.eslesen)) {
  const a = H.get(ref), e = RAW.get(ref); if (!a || !e || exRef.has(ref)) { drop.push({ ref, neden: "katalogda ya da havuzda yok" }); continue; }
  const L = sourcedLabels({ amenity: a.amenity, cuisine: e.tags.cuisine }).labels.filter((l) => !NOT_R.has(l.id));
  const bc = !L.length ? cuisineOfBrand(z.marka) : null;
  const labels = L.length ? L : bc ? sourcedLabels({ cuisine: bc.deger }).labels : [];
  if (!labels.length) { drop.push({ ref, ad: a.name, neden: "tür kaynakta yok" }); continue; }
  const slug0 = `${slugify(BRAND_NAME[z.marka] ?? a.name)}-${slugify(cleanHood(z.mahalle) ?? cleanHood(a.neighbourhood) ?? z.sokak)}-${slugify(a.district)}`.replace(/--+/g, "-");
  let slug = slug0; if (taken.has(slug)) slug = `${slug0}-${ref.replace("/", "-")}`; taken.add(slug);
  if (!z.sokak) { drop.push({ ref, ad: a.name, neden: "resmî listede sokak çıkarılamadı" }); continue; }
  const v = { ref, slug, name: a.name, categoryId: "cat.restaurant", kind: KIND[labels[0].id] ?? "Restoran", district: a.district, ...(a.neighbourhood ? { neighborhood: a.neighbourhood } : {}), lat: a.lat, lng: a.lng,
    address: fmtAddr({ sokak: z.sokak, no: z.kapiNo, mahalle: z.mahalle ?? a.neighbourhood?.replace(/ Mahallesi$/, ""), ilce: a.district }), ...(a.phone ? { phone: a.phone } : {}), ...(a.website ? { website: a.website } : {}), ...(a.openingHours ? { openingHours: a.openingHours } : {}),
    cuisine: (e.tags.cuisine ?? bc?.deger ?? "").split(";").map((x) => x.trim()).filter(Boolean), importedAt: tarih, osmAmenity: a.amenity === "fast_food" ? "fast_food" : "restaurant", wave,
    verifiedAt: tarih, confidence: "güçlü", verification: `resmî şube listesi (${z.tarih}): adres kapı no dahil ve OSM şubesiyle ${z.m} m uyumlu (${z.konum === "bina" ? "bina" : "sokak"} düzeyi konum) · tür: ${L.length ? "OSM şube etiketi" : `markanın OSM şubeleri (${bc.n}/${bc.toplam})`} · adres: resmî şube listesi` };
  if (!v.cuisine.length) delete v.cuisine;
  recs.push(v);
  rows.push({ slug, ref, tip: "osm_subesi", marka: BRAND_NAME[z.marka] ?? z.marka, sube: a.neighbourhood ?? z.ilce, ad: a.name, ilce: a.district, adres: v.address, koordinat: [a.lat, a.lng], tur: v.kind, faaliyet: "açık (resmî şube listesinde, kontrol tarihi)", sinif: "A",
    kanit: [v.verification], kaynak: [`https://www.openstreetmap.org/${ref}`, z.sayfa], kontrolTarihi: tarih });
}
/* 2) yalnız resmî listede olan şubeler → işletme kaydı */
for (const x of Z.eslesmeyenListe) {
  if (!x.neden.startsWith("ilçede OSM") || !x.geo?.house || !x.sokak) continue;
  const exact = x.geo.house.toUpperCase().replace(/\s/g, "") === x.no.replace(/\s/g, "");
  const roadOk = x.geo.road && fold(x.sokak).split(" ")[0] === fold(x.geo.road).split(" ")[0] && fold(x.sokak).split(" ").filter((w) => !/^(caddesi|cad|cd|sokak|sokagi|sk|sok|bulvari|bulvar|blv)$/.test(w)).length > 0;
  if (!exact || !roadOk) { drop.push({ marka: x.marka, adres: x.adres, neden: !exact ? "kapı no OSM adresinde yok" : "OSM sokağı listedekiyle uyuşmuyor" }); continue; }
  if (districtOf(x.geo.lat, x.geo.lng, F) !== x.ilce) { drop.push({ marka: x.marka, adres: x.adres, neden: "konum başka ilçede" }); continue; }
  const name = BRAND_NAME[x.marka] ?? x.marka;
  const near = nearExisting(x.geo, name); if (near) { drop.push({ marka: x.marka, adres: x.adres, neden: `katalogda yakın şube: ${near.slug}` }); continue; }
  const bc = cuisineOfBrand(x.marka); if (!bc) { drop.push({ marka: x.marka, adres: x.adres, neden: "markanın OSM şubelerinde ortak tür yok" }); continue; }
  const labels = sourcedLabels({ cuisine: bc.deger }).labels.filter((l) => !NOT_R.has(l.id)); if (!labels.length) { drop.push({ marka: x.marka, neden: "tür restoran değil" }); continue; }
  const hood = cleanHood(x.mahalle);
  let slug = `${slugify(name)}-${slugify(hood ?? x.sokak)}-${slugify(x.ilce)}`.replace(/--+/g, "-"); if (taken.has(slug)) slug = `${slug}-${slugify(x.no)}`; if (taken.has(slug)) { drop.push({ marka: x.marka, neden: "slug çakışması" }); continue; } taken.add(slug);
  const v = { ref: `isletme/${slug}`, slug, name, categoryId: "cat.restaurant", kind: KIND[labels[0].id] ?? "Restoran", district: x.ilce, ...(hood ? { neighborhood: `${hood} Mahallesi` } : {}),
    lat: Math.round(x.geo.lat * 1e6) / 1e6, lng: Math.round(x.geo.lng * 1e6) / 1e6, address: fmtAddr(x), cuisine: [bc.deger], importedAt: tarih, sourceKind: "official_site", sourceUrl: x.sayfa,
    location: { provider: "osm", ref: x.geo.osm, precision: "address" }, wave, verifiedAt: tarih, confidence: "güçlü",
    verification: `resmî şube listesi (${tarih}): şube adresi kapı no dahil; konum OSM adres noktası ${x.geo.osm} (sokak ve kapı no birebir) · tür: markanın OSM şubeleri (${bc.n}/${bc.toplam})` };
  recs.push(v);
  rows.push({ slug, ref: v.ref, tip: "isletme_kaydi", marka: name, sube: hood ?? x.sokak, ad: name, ilce: x.ilce, adres: v.address, koordinat: [v.lat, v.lng], tur: v.kind, faaliyet: "açık (resmî şube listesinde, kontrol tarihi)", sinif: "A",
    kanit: [v.verification], kaynak: [x.sayfa, `https://www.openstreetmap.org/${x.geo.osm}`], kontrolTarihi: tarih });
}
/* paket içi: aynı marka 150 m → ikisini de bırak */
const bad = new Set(); for (let i = 0; i < recs.length; i++) for (let j = i + 1; j < recs.length; j++) if (fold(recs[i].name).slice(0, 6) === fold(recs[j].name).slice(0, 6) && meters(recs[i], recs[j]) < 150) { bad.add(i); bad.add(j); }
const keepR = recs.filter((_, i) => !bad.has(i)), keepRows = rows.filter((_, i) => !bad.has(i));
for (const i of bad) drop.push({ slug: recs[i].slug, neden: "paket içinde aynı marka 150 m" });
mkdirSync(dir, { recursive: true });
const lines = (arr) => "[\n" + arr.map((r) => JSON.stringify(r)).join(",\n") + "\n]\n";
writeFileSync(`${dir}/kayitlar.json`, lines(keepR.filter((v) => !v.ref.startsWith("isletme/"))));
writeFileSync(`${dir}/isletme-kayitlari.json`, lines(keepR.filter((v) => v.ref.startsWith("isletme/"))));
writeFileSync(`${dir}/paket.json`, JSON.stringify({ _aciklama: `İstanbul zincir şube paketi (dalga ${wave}). Her şube ayrı kimlik; kaynak markanın resmî şube listesi. kayitlar.json → venues.json, isletme-kayitlari.json → isletme.json (yayın paketinde). Konum: OSM (© OpenStreetMap katkıcıları, ODbL; Nominatim). Google verisi kullanılmadı.`, kontrolTarihi: tarih, eklenen: keepRows }, null, 1));
writeFileSync(`${dir}/elenen.json`, lines(drop));
const oz = { dalga: wave, A: keepR.length, osmSubesi: keepR.filter((v) => !v.ref.startsWith("isletme/")).length, isletmeKaydi: keepR.filter((v) => v.ref.startsWith("isletme/")).length, elenen: drop.length, elenenNeden: cnt(drop.map((d) => d.neden.split(":")[0])), marka: cnt(keepRows.map((r) => r.marka)), ilce: cnt(keepR.map((v) => v.district)), tur: cnt(keepR.map((v) => v.kind)), markaListeleri: Z.markalar };
writeFileSync(`${dir}/ozet.json`, JSON.stringify(oz, null, 1));
console.log(JSON.stringify({ ...oz, markaListeleri: undefined }, null, 1));
