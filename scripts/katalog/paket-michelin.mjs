/* YÜKSEK PROFİL PAKETİ (paket 10): MICHELIN Rehberi İstanbul 2026 seçkisi.
   Girdi: data/katalog/michelin-istanbul-2026.json (rehber ayrımı) + data/paket/istanbul-10/karar.json (elle karar: kimlik, adres, resmî site ölçümü).
   Kimlik: OSM restoran kaydı (tip osm) ya da OSM'de restoran noktası yoksa işletme kaydı (tip isletme; konum OSM bina/adres noktası).
   Koordinat YALNIZ OSM'den. Michelin koordinatı, metni, fotoğrafı kayda yazılmaz. Google verisi yok.
   A şartı: Michelin 2026 kaydı + (resmî sitede ad ile telefon/sokak ya da OSM kaydında tam adres) + OSM konumu + ilçe sınırı uyumu + mükerrer yok.
   Kullanım: npx tsx scripts/katalog/paket-michelin.mjs <klasör> <dalga> <tarih> <ham-osm.json> <bina.json> -- <mevcut.json...> */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fold, meters } from "../../lib/katalog/aday.ts";
import { districtOf } from "../../lib/katalog/geo.ts";
import { slugify } from "../osm-select.mjs";
const argv = process.argv.slice(2); const sep = argv.indexOf("--");
const [dir, waveS, tarih, rawP, binaP] = argv.slice(0, sep); const existing = argv.slice(sep + 1); const wave = Number(waveS);
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const M = J("data/katalog/michelin-istanbul-2026.json"); const K = J(`${dir}/karar.json`);
const F = J("data/katalog/istanbul-ilceler.json");
const OSM = new Map([...J(rawP).elements, ...J(binaP).elements].map((e) => [`${e.type}/${e.id}`, e]));
const EX = existing.flatMap(J); const taken = new Set(EX.map((v) => v.slug)), exRef = new Set(EX.map((v) => v.ref));
const pt = (e) => ({ lat: Math.round((e.lat ?? e.center?.lat) * 1e6) / 1e6, lng: Math.round((e.lon ?? e.center?.lon) * 1e6) / 1e6 });
const AYRIM = { iki_yildiz: "İki Yıldız", bir_yildiz: "Bir Yıldız", bib_gourmand: "Bib Gourmand", secki: "Rehber seçkisi" };
/* Michelin mutfak kategorisi → Gidenler türü (açık gastronomi tanımı; addan değil) */
const MUTFAK = {
  "Turkish": ["Türk mutfağı", "turkish"], "Modern Cuisine": ["Modern mutfak", null], "Contemporary": ["Çağdaş mutfak", null],
  "Mediterranean Cuisine": ["Akdeniz mutfağı", "mediterranean"], "Fish and Seafood": ["Balık restoranı", "seafood"],
  "Japanese": ["Sushi / Japon", "japanese"], "Japanese Contemporary": ["Sushi / Japon", "japanese"], "Sushi": ["Sushi / Japon", "sushi"],
  "Italian": ["İtalyan", "italian"], "Grills": ["Izgara", null], "Seasonal Cuisine": ["Mevsimsel mutfak", null],
  "Asian Influences": ["Asya etkili mutfak", "asian"], "International": ["Uluslararası mutfak", "international"], "Russian": ["Rus mutfağı", "russian"],
  "Traditional Cuisine": ["Geleneksel mutfak", null], "Creative": ["Yaratıcı mutfak", null], "Fusion": ["Füzyon", "fusion"], "Vegan": ["Vegan", "vegan"],
  "European Contemporary": ["Çağdaş Avrupa mutfağı", null], "Regional European": ["Avrupa bölge mutfağı", null],
};
const bySlug = new Map(M.restoranlar.map((r) => [r.michelinSlug, r]));
const recs = [], rows = [], drop = [];
for (const k of K.kayitlar) {
  const mi = bySlug.get(k.m); if (!mi) { drop.push({ m: k.m, neden: "Michelin listesinde yok" }); continue; }
  /* KONUMSUZ İŞLETME KAYDI (paket 15+): kimlik, faaliyet, kapı numaralı adres ve tür doğrulanmış; açık ve izinli kaynakta
     doğrulanmış koordinat yok. lat/lng ve location YAZILMAZ; harita noktası gösterilmez. Sınıf "A-konumsuz" (A değildir). */
  if (k.tip === "konumsuz") {
    const ilce = k.ilce ?? mi.ilce;
    if (!F.ilceler.some((d) => d.ad === ilce)) { drop.push({ m: k.m, neden: `geçersiz ilçe: ${ilce}` }); continue; }
    if (!k.site || !/No:\s*\d/.test(k.adres)) { drop.push({ m: k.m, neden: "resmî site ya da kapı numarası yok" }); continue; }
    const [kind, cuisine] = MUTFAK[mi.mutfakMichelin] ?? [null, null];
    if (!kind) { drop.push({ m: k.m, neden: `mutfak kategorisi eşlenmedi: ${mi.mutfakMichelin}` }); continue; }
    if ([...EX, ...recs].some((v) => fold(v.name) === fold(k.ad) && fold(v.district ?? "") === fold(ilce))) { drop.push({ m: k.m, neden: "aynı ilçede aynı adlı kayıt" }); continue; }
    const slug = `${slugify(k.ad)}-${slugify(ilce)}`.replace(/--+/g, "-");
    if (taken.has(slug)) { drop.push({ m: k.m, neden: "slug çakışması" }); continue; } taken.add(slug);
    const address = [k.adres, k.mahalle ? `${k.mahalle} Mahallesi` : null, ilce].filter(Boolean).join(", ");
    const siteTxt = `resmî site ${new URL(k.site).host.replace(/^www\./, "")} (${k.kanit})`;
    const verification = `Michelin Rehberi 2026: ${AYRIM[mi.ayrim]}${mi.yesilYildiz ? " + Yeşil Yıldız" : ""} (resmî rehber sayfası, ${K.kontrolTarihi}) · ${siteTxt} · adres: rehber + resmî site (kapı numaralı) · tür: rehber mutfak kategorisi "${mi.mutfakMichelin}" · koordinat yazılmadı: OSM'de doğrulanmış konum yok, bugünkü şema yalnız OSM konumunu kabul ediyor; harita noktası gösterilmez`;
    const michelin = { ayrim: mi.ayrim, ...(mi.yesilYildiz ? { yesilYildiz: true } : {}), yil: 2026, url: mi.michelinUrl };
    const v = { ref: `isletme/${slug}`, slug, name: k.ad, categoryId: "cat.restaurant", kind, district: ilce, ...(k.mahalle ? { neighborhood: `${k.mahalle} Mahallesi` } : {}), address,
      ...(k.telefon ? { phone: k.telefon } : {}), website: k.site, ...(cuisine ? { cuisine: [cuisine] } : {}), importedAt: tarih,
      sourceKind: "official_site", sourceUrl: k.site, wave, verifiedAt: tarih, confidence: "güçlü", verification, michelin,
      kaliteSinifi: "A-konumsuz", kalite: { kimlik: "resmî site + Michelin 2026", faaliyet: "Michelin 2026 + resmî site", adres: "kapı numaralı (rehber + resmî site)", koordinat: "yok" } };
    recs.push(v);
    rows.push({ slug, ref: v.ref, tip: "isletme_kaydi_konumsuz", ad: k.ad, ilce, adres: address, koordinat: null, tur: kind, faaliyet: "açık (Michelin Rehberi 2026 seçkisinde; resmî site)", sinif: "A-konumsuz",
      michelin: AYRIM[mi.ayrim] + (mi.yesilYildiz ? " + Yeşil Yıldız" : ""), zincir: null, sube: k.sube ?? null, kanit: [verification, ...(k.not ? [k.not] : [])],
      kaynak: [mi.michelinUrl, k.site], kontrolTarihi: tarih });
    continue;
  }
  const locRef = k.tip === "osm" ? k.ref : k.konum; const e = OSM.get(locRef);
  if (!e) { drop.push({ m: k.m, neden: `OSM öğesi bulunamadı: ${locRef}` }); continue; }
  if (k.tip === "osm" && exRef.has(k.ref)) { drop.push({ m: k.m, neden: "OSM kaydı katalogda" }); continue; }
  const p = pt(e); const ilce = districtOf(p.lat, p.lng, F);
  if (!ilce) { drop.push({ m: k.m, neden: "konum İstanbul ilçe sınırında değil" }); continue; }
  if (fold(ilce) !== fold(mi.ilce) && !(mi.ilce === "Beyoğlu" && ilce === "Şişli")) { drop.push({ m: k.m, neden: `ilçe uyuşmuyor: rehber ${mi.ilce}, OSM konumu ${ilce}` }); continue; }
  const [kind, cuisine] = MUTFAK[mi.mutfakMichelin] ?? [null, null];
  if (!kind) { drop.push({ m: k.m, neden: `mutfak kategorisi eşlenmedi: ${mi.mutfakMichelin}` }); continue; }
  const near = [...EX, ...recs].find((v) => typeof v.lat === "number" && fold(v.name).split(" ")[0] === fold(k.ad).split(" ")[0] && meters(v, p) < 150);
  if (near) { drop.push({ m: k.m, neden: `yakında aynı adlı kayıt: ${near.slug}` }); continue; }
  let slug = `${slugify(k.ad)}-${slugify(ilce)}`.replace(/--+/g, "-"); if (taken.has(slug)) slug = `${slugify(k.ad)}-${slugify(k.mahalle ?? k.adres.split(" ")[0])}-${slugify(ilce)}`;
  if (taken.has(slug)) { drop.push({ m: k.m, neden: "slug çakışması" }); continue; } taken.add(slug);
  const address = [k.adres, k.mahalle ? `${k.mahalle} Mahallesi` : null, ilce].filter(Boolean).join(", ");
  const siteTxt = k.site ? `resmî site ${new URL(k.site).host.replace(/^www\./, "")} (${k.kanit})` : `resmî site yok (${k.kanit})`;
  const konumTxt = k.tip === "osm" ? `konum: OSM restoran kaydı ${k.ref}` : `konum: ${k.konumNot} — ${k.konum} (${k.hassasiyet === "address" ? "adres" : "bina"} düzeyi)`;
  const verification = `Michelin Rehberi 2026: ${AYRIM[mi.ayrim]}${mi.yesilYildiz ? " + Yeşil Yıldız" : ""} (resmî rehber sayfası, ${K.kontrolTarihi}) · ${siteTxt} · ${konumTxt} · adres: rehber + resmî site/OSM · tür: rehber mutfak kategorisi "${mi.mutfakMichelin}"`;
  const osmTags = k.tip === "osm" ? e.tags : {};
  const cu = (osmTags.cuisine ? osmTags.cuisine.split(";").map((x) => x.trim()) : cuisine ? [cuisine] : []);
  const base = { slug, name: k.ad, categoryId: "cat.restaurant", kind, district: ilce, ...(k.mahalle ? { neighborhood: `${k.mahalle} Mahallesi` } : {}), lat: p.lat, lng: p.lng, address,
    ...(k.telefon ? { phone: k.telefon } : {}), ...(k.site ? { website: k.site } : {}), ...(cu.length ? { cuisine: cu } : {}), importedAt: tarih };
  const michelin = { ayrim: mi.ayrim, ...(mi.yesilYildiz ? { yesilYildiz: true } : {}), yil: 2026, url: mi.michelinUrl };
  const v = k.tip === "osm"
    ? { ref: k.ref, ...base, osmAmenity: e.tags.amenity === "fast_food" ? "fast_food" : "restaurant", wave, verifiedAt: tarih, confidence: "güçlü", verification, michelin }
    : { ref: `isletme/${slug}`, ...base, sourceKind: "official_site", sourceUrl: k.site, location: { provider: "osm", ref: k.konum, precision: k.hassasiyet }, wave, verifiedAt: tarih, confidence: "güçlü", verification, michelin };
  recs.push(v);
  rows.push({ slug, ref: v.ref, tip: k.tip === "osm" ? "osm_kaydi" : "isletme_kaydi", ad: k.ad, ilce, adres: address, koordinat: [p.lat, p.lng], tur: kind, faaliyet: "açık (Michelin Rehberi 2026 seçkisinde; resmî site/OSM)", sinif: "A",
    michelin: AYRIM[mi.ayrim] + (mi.yesilYildiz ? " + Yeşil Yıldız" : ""), zincir: null, sube: k.sube ?? null, kanit: [verification, ...(k.not ? [k.not] : [])],
    kaynak: [`https://www.openstreetmap.org/${locRef}`, mi.michelinUrl, ...(k.site ? [k.site] : [])], kontrolTarihi: tarih });
}
mkdirSync(dir, { recursive: true });
const lines = (arr) => "[\n" + arr.map((r) => JSON.stringify(r)).join(",\n") + "\n]\n";
writeFileSync(`${dir}/kayitlar.json`, lines(recs.filter((v) => !v.ref.startsWith("isletme/"))));
writeFileSync(`${dir}/isletme-kayitlari.json`, lines(recs.filter((v) => v.ref.startsWith("isletme/"))));
writeFileSync(`${dir}/paket.json`, JSON.stringify({ _aciklama: `İstanbul yüksek profil paketi (dalga ${wave}): MICHELIN Rehberi 2026 İstanbul seçkisinden katalogda olmayan, kanıtı tam restoranlar. kayitlar.json → venues.json, isletme-kayitlari.json → isletme.json (yayın paketinde). Konum: OSM (© OpenStreetMap katkıcıları, ODbL). Michelin ayrımı rehberin resmî sayfasından; rehber metni/fotoğrafı/koordinatı kopyalanmadı. Google verisi kullanılmadı.`, kontrolTarihi: tarih, eklenen: rows }, null, 1));
writeFileSync(`${dir}/elenen.json`, lines(drop));
const cnt = (a) => a.reduce((m, x) => (m[x] = (m[x] ?? 0) + 1, m), {});
const oz = { dalga: wave, A: recs.length, osmKaydi: recs.filter((v) => !v.ref.startsWith("isletme/")).length, isletmeKaydi: recs.filter((v) => v.ref.startsWith("isletme/")).length, elenen: drop.length, michelin: cnt(recs.map((v) => v.michelin.ayrim)), ilce: cnt(recs.map((v) => v.district)), tur: cnt(recs.map((v) => v.kind)) };
writeFileSync(`${dir}/ozet.json`, JSON.stringify(oz, null, 1));
console.log(JSON.stringify(oz, null, 1)); if (drop.length) console.log("elenen:", JSON.stringify(drop, null, 1));
