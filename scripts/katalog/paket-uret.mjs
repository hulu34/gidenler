/* ADIM 5–9: sınıflandırma → yayına hazır paket (yalnız A) + inceleme kuyruğu (B, C) + ret listesi.
   Kullanım: [SEHIR=ankara] [TERS=ters.json] npx tsx scripts/katalog/paket-uret.mjs <havuz.json> <site-kanit.json> <paket-klasoru> <dalga> <tarih> <mevcut.json...>
   TERS: OSM ters konum önbelleği (adres-ters.mjs). Kaydında sokak/kapı yoksa OSM'deki bina adresi kullanılır ve kanıta yazılır.
   SEHIR: İstanbul dışı il; slug'a il eklenir (aynı adlı mekân başka ilde ayrı kimlik alır), kayda `city` yazılır. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gradeCandidate } from "../../lib/katalog/kalite.ts";
import { MUTFAK } from "../../lib/katalog/mutfak.ts";
import { slugify } from "../osm-select.mjs";
const [hp, kp, dir, waveS, tarih, ...existing] = process.argv.slice(2);
const wave = Number(waveS);
const H = JSON.parse(readFileSync(hp, "utf8")), K = JSON.parse(readFileSync(kp, "utf8"));
const EX = existing.flatMap((p) => JSON.parse(readFileSync(p, "utf8")));
const taken = new Set(EX.map((v) => v.slug));
const KIND = { turk: "Türk mutfağı", esnaf: "Lokanta", kebap: "Kebapçı / Ocakbaşı", doner: "Dönerci", pide: "Pideci", balik: "Balık restoranı", meyhane: "Meyhane", et: "Steakhouse", burger: "Burger", pizza: "Pizza", japon: "Sushi / Japon", asya: "Asya mutfağı", kahvalti: "Kahvaltı", tatli: "Tatlıcı", kafe: "Kahveci", bar: "Bar", dunya: "Dünya mutfağı", vegan: "Vegan", tavuk: "Tavuk", sokak: "Sokak lezzeti", firin: "Fırın" };
const cat = (a) => (a.amenity === "bar" || a.amenity === "pub" || a.amenity === "biergarten") && a.mutfak.labels[0]?.id !== "meyhane" ? "cat.bar" : (a.amenity === "cafe" || a.amenity === "ice_cream") ? "cat.cafe" : "cat.restaurant";
const SEHIR = process.env.SEHIR ?? "istanbul";
const TERS = process.env.TERS ? JSON.parse(readFileSync(process.env.TERS, "utf8")) : {};
const S = { A: [], B: [], C: [] }; const ret = [];
for (const a of H.adaylar) {
  const t = TERS[a.ref];
  if (!(a.street && a.housenumber) && t?.road && t?.house_number) { a.street = t.road; a.housenumber = t.house_number; a.neighbourhood ??= t.suburb ?? undefined; a.adresKaynagi = `OSM bina adresi (ters konum ${t.tarih})`; }
  if (a.esles?.neden === "ayni_osm_kaydi") continue;           // zaten katalogda
  const g = gradeCandidate(a, K[a.ref]);
  if (a.ret.length) { ret.push({ ref: a.ref, ad: a.name, ilce: a.district, neden: a.ret }); continue; }
  S[g.sinif].push({ a, g });
}
/* paket içi: aynı bina adresi (sokak + kapı numarası kökü) ya da küçük yazım farkıyla aynı ad 150 m → ikisi de incelemeye */
const { addressKey, editDistance, fold: f0, meters: m0 } = await import("../../lib/katalog/aday.ts");
const clean = (h) => (h ?? "").replace(/^no\s*[:.]?\s*/i, "").trim();
for (const x of S.A) x.a.housenumber = clean(x.a.housenumber);
const bad = new Set();
for (let i = 0; i < S.A.length; i++) for (let j = i + 1; j < S.A.length; j++) {
  const a = S.A[i].a, b = S.A[j].a; const d = m0(a, b);
  const ka = addressKey(a.street, a.housenumber), kb = addressKey(b.street, b.housenumber);
  const ca = f0(a.name).replace(/\s+/g, ""), cb = f0(b.name).replace(/\s+/g, "");
  if ((ka && ka === kb && d <= 60) || (d <= 150 && ca.length >= 5 && editDistance(ca, cb) <= 1)) { bad.add(i); bad.add(j); }
}
for (const i of [...bad].sort((x, y) => y - x)) { const [x] = S.A.splice(i, 1); S.C.push({ a: x.a, g: { ...x.g, sinif: "C", neden: ["paket_ici_ayni_bina_ya_da_ad"] } }); }
const venues = [], paket = [];
for (const { a, g } of S.A.sort((x, y) => x.a.district.localeCompare(y.a.district, "tr") || x.a.name.localeCompare(y.a.name, "tr"))) {
  const tail = SEHIR === "istanbul" ? slugify(a.district) : `${slugify(a.district)}-${SEHIR}`;
  let slug = `${slugify(a.name)}-${tail}`;
  if (taken.has(slug)) slug = `${slugify(a.name)}-${slugify(a.neighbourhood ?? a.street ?? "")}-${tail}`.replace(/--+/g, "-");
  if (taken.has(slug)) { S.C.push({ a, g: { ...g, sinif: "C", neden: ["slug_cakismasi"] } }); continue; }
  taken.add(slug);
  const m = a.mutfak.labels;
  const v = {
    ref: a.ref, slug, ...(SEHIR !== "istanbul" ? { city: SEHIR } : {}), name: a.name, categoryId: cat(a), kind: KIND[m[0].id] ?? "Restoran", district: a.district,
    ...(a.neighbourhood ? { neighborhood: a.neighbourhood } : {}), lat: a.lat, lng: a.lng,
    address: `${a.street} No:${a.housenumber}${a.neighbourhood ? `, ${a.neighbourhood}` : ""}, ${a.district}`,
    ...(a.phone ? { phone: a.phone } : {}), ...(a.website ? { website: a.website } : {}), ...(a.openingHours ? { openingHours: a.openingHours } : {}),
    cuisine: (a.cuisine ?? "").split(/[;,]/).map((x) => x.trim().toLowerCase()).filter(Boolean), importedAt: tarih,
    osmAmenity: ["restaurant", "cafe", "bar", "pub", "fast_food"].includes(a.amenity) ? a.amenity : "cafe", wave,
    verifiedAt: tarih, confidence: "güçlü", verification: [...g.kanit, ...(a.adresKaynagi ? [`adres: ${a.adresKaynagi}`] : [])].join(" · "),
  };
  if (!v.cuisine.length) delete v.cuisine;
  venues.push(v);
  paket.push({ slug, ref: a.ref, ad: a.name, ilce: a.district, mahalle: a.neighbourhood ?? null, tur: v.kind, mutfak: m.map((l) => ({ id: l.id, ad: MUTFAK[l.id].ad, kaynak: l.kaynak, deger: l.deger })),
    sinif: "A", kanit: g.kanit, adresKaynagi: a.adresKaynagi ?? "OSM kaydı (addr:street + addr:housenumber)", eksik: g.eksik, adNotu: a.mutfak.nameConflict ? `addaki "${a.mutfak.nameConflict.hint}" kaynakla uyuşmuyor; kaynak esas alındı` : undefined,
    kaynak: [`https://www.openstreetmap.org/${a.ref}`, ...(K[a.ref]?.olcum?.ad ? K[a.ref].denenen.filter((d) => d.status === 200).map((d) => d.url) : [])],
    osmSonDuzenleme: a.lastEdit, osmKontrol: a.checkDate ?? null, kontrolTarihi: tarih });
}
const kisa = ({ a, g }) => ({ ref: a.ref, ad: a.name, ilce: a.district, amenity: a.amenity, sinif: g.sinif, eksik: g.eksik, neden: g.neden, kanit: g.kanit, site: a.website ?? null, osmKontrol: a.checkDate ?? null });
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/venues-dalga${wave}.json`, JSON.stringify(venues, null, 1));
writeFileSync(`${dir}/paket.json`, JSON.stringify({ _aciklama: "İstanbul yeni mekân paketi. Yalnız A sınıfı. Kaynak: OpenStreetMap (© OpenStreetMap katkıcıları, ODbL) + işletmelerin resmî siteleri (yalnız eşleşme ölçümü; içerik kopyalanmadı). Google verisi kullanılmadı.", osmTarihi: H.ozet.osm_tarihi, kontrolTarihi: tarih, eklenen: paket }, null, 1));
/* kuyruk: B'nin kanıtlıları ve C'nin tamamı satır satır; kanıtsız B yalnız sayı (OSM'de var, bağımsız kanıt yok) */
const Bk = S.B.filter(({ g }) => g.kanit.length);
const Ck = S.C.filter(({ g }) => g.kanit.length || g.neden.some((n) => /mukerrer|paket_ici/.test(n)));
writeFileSync(`${dir}/inceleme.json`, JSON.stringify({ _aciklama: "B: eksik alanı yazılı, ayrıca değerlendirilir. C: doğrudan yayımlanmaz. Kanıtsız C'ler (OSM'de var, bağımsız faaliyet kanıtı yok) yalnız ozet.json'da sayı olarak.", B_kanitli: Bk.map(kisa), C_kanitli_ya_da_mukerrer: Ck.map(kisa) }, null, 0).replace(/\},\{/g, "},\n{"));
const cnt = (arr) => arr.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {});
const ozet = { osmTarihi: H.ozet.osm_tarihi, havuz_yeni: H.adaylar.filter((a) => a.esles?.neden !== "ayni_osm_kaydi").length, ret: ret.length, A: venues.length, B: S.B.length, B_kanitli: Bk.length, C: S.C.length,
  ret_nedenleri: cnt(ret.flatMap((r) => r.neden.map((n) => n.split(":")[0]))), C_nedenleri: cnt(S.C.flatMap(({ g }) => g.neden.map((n) => n.split(":")[0]))),
  B_eksikleri: cnt(Bk.flatMap(({ g }) => g.eksik)), A_ilce: cnt(venues.map((v) => v.district)), A_tur: cnt(venues.map((v) => v.kind)), A_kategori: cnt(venues.map((v) => v.categoryId)) };
/* mevcut katalog + hazır paketlerle (906, seyrek) son karşılaştırma */
const { fold, meters } = await import("../../lib/katalog/aday.ts");
const exSlug = new Set(EX.map((v) => v.slug)), exRef = new Set(EX.map((v) => v.ref));
const kars = { karsilastirilan: [...new Set(EX.map((v) => v.slug))].length, slug: venues.filter((v) => exSlug.has(v.slug)).length, ref: venues.filter((v) => exRef.has(v.ref)).length,
  yakinAyniAd: venues.filter((v) => EX.some((o) => typeof o.lat === "number" && fold(o.name) === fold(v.name) && meters(v, o) < 150)).length,
  yakin50m: venues.filter((v) => EX.some((o) => typeof o.lat === "number" && meters(v, o) < 50)).map((v) => { const o = EX.find((o) => typeof o.lat === "number" && meters(v, o) < 50); return `${v.slug} ↔ ${o.slug} (${Math.round(meters(v, o))} m)`; }) };
writeFileSync(`${dir}/karsilastirma-906.json`, JSON.stringify(kars, null, 1));
ozet.karsilastirma = { ...kars, yakin50m: kars.yakin50m.length };
writeFileSync(`${dir}/ozet.json`, JSON.stringify(ozet, null, 1));
writeFileSync(`${dir}/ret.json`, "[\n" + ret.map((r) => JSON.stringify(r)).join(",\n") + "\n]\n");
console.log(JSON.stringify(ozet, null, 1));
