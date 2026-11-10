/* RESTORAN PAKETİ ÜRETİMİ (dalga 7+). Yalnız restoranlar; kafe ve barlar ayrı havuzda sayılır, pakete girmez.
   Kanıt türleri (en az biri + tam adres + kaynaklı restoran türü → A):
     E1 resmî site: ad + (sokak | telefon)                      — site-dogrula.mjs
     E2 OSM yerinde kontrol tarihi ≥ 2025-01                   — check_date / survey:date
     E3 OSM son sürümü yerinde anket uygulamasıyla ≥ 2025-01    — StreetComplete / Every Door (osm-degisiklik.mjs)
     E4 zincir: markanın resmî şube sayfasında bu şubenin sokağı + ilçe/mahallesi aynı bölümde (+ kapı/telefon) — zincir-dogrula.mjs
     E5 resmî işletmeci listesi: İBB Açık Veri (Kent Lokantaları, Sosyal Tesisler) satırı 150 m içinde aynı adla — ibb-acik-veri.mjs
   Zayıf ama kayda geçen (B): mobil düzenleyici (Organic Maps, CoMaps, OsmAnd, Go Map!!, Vespucci) 2025+, sitede ad + ilçe.
   Kayıtlar venues.json'a EKLENMEZ: data/paket/<klasör>/ altında bağımsız dosyalar; birleştirme yayın paketinde yapılır.
   Kullanım: npx tsx scripts/katalog/paket-restoran.mjs <klasör> <dalga> <tarih> <ham-osm.json> <havuz.json> <site-kanit.json> <ters.json> <zincir.json> <changeset.json> [<ibb.json>] -- <mevcut.json...> */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { MUTFAK } from "../../lib/katalog/mutfak.ts";
import { addressKey, editDistance, fold, meters, siteKey } from "../../lib/katalog/aday.ts";
import { kapsamDisiOf } from "../../lib/katalog/zincir.ts";
import { slugify } from "../osm-select.mjs";
const argv = process.argv.slice(2); const sep = argv.indexOf("--");
const [dir, waveS, tarih, rawP, hp, kp, tp, zp, cp, ibbP] = argv.slice(0, sep); const existing = argv.slice(sep + 1);
const wave = Number(waveS);
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const RAW = new Map(J(rawP).elements.map((e) => [`${e.type}/${e.id}`, e]));
const H = J(hp), K = J(kp), T = J(tp), Z = J(zp), CS = J(cp), IBB = ibbP ? J(ibbP).eslesen : {};
const EX = existing.flatMap(J); const taken = new Set(EX.map((v) => v.slug)), exRef = new Set(EX.map((v) => v.ref));
const NOT_RESTAURANT = new Set(["kafe", "bar", "tatli", "firin"]);
const PRIORITY = new Set(["turk", "esnaf", "kebap", "doner", "pide", "balik", "meyhane", "pizza", "japon", "asya", "et", "kahvalti", "dunya", "burger", "sokak", "tavuk", "vegan"]);
const ONSITE = /^(StreetComplete|Every ?Door)/i, MOBILE = /^(Organic ?Maps|CoMaps|OsmAnd|Go ?Map|Vespucci|MAPS\.ME)/i;
const KIND = { turk: "Türk mutfağı", esnaf: "Lokanta", kebap: "Kebapçı / Ocakbaşı", doner: "Dönerci", pide: "Pideci", balik: "Balık restoranı", meyhane: "Meyhane", et: "Steakhouse", burger: "Burger", pizza: "Pizza", japon: "Sushi / Japon", asya: "Asya mutfağı", kahvalti: "Kahvaltı", dunya: "Dünya mutfağı", vegan: "Vegan", tavuk: "Tavuk", sokak: "Sokak lezzeti" };
const cnt = (arr) => arr.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {});
const clean = (h) => (h ?? "").replace(/^no\s*[:.]?\s*/i, "").trim();
const out = { A: [], B: [], C: [] }; const ret = []; const kafeBar = { kafe: 0, bar: 0, tatli_firin: 0, ornek: [] }; const zincirOzet = { dogrulanan: [], kanitsiz: 0, kapsamDisi: {} };
for (const a of H.adaylar) {
  if (a.esles?.neden === "ayni_osm_kaydi" || exRef.has(a.ref)) continue;
  const e = RAW.get(a.ref); if (!e) continue;
  const labels = a.mutfak.labels.map((l) => l.id);
  /* kapsam: restoran ya da öncelikli türlü fast food; kafe/bar ayrı havuz */
  const primary = labels[0];
  const isRest = (a.amenity === "restaurant" || a.amenity === "fast_food") && !(primary && NOT_RESTAURANT.has(primary));
  if (!isRest) { if (a.amenity === "cafe" || primary === "kafe") kafeBar.kafe++; else if (["bar", "pub", "biergarten"].includes(a.amenity) || primary === "bar") kafeBar.bar++; else kafeBar.tatli_firin++; continue; }
  if (a.amenity === "fast_food" && !labels.some((l) => PRIORITY.has(l))) { ret.push({ ref: a.ref, ad: a.name, ilce: a.district, neden: ["fast_food_turu_belirsiz_ya_da_kapsam_disi"] }); continue; }
  /* zincir */
  const z = Z.kanit[a.ref]; const brandKey = fold(e.tags.brand ?? "") || null;
  const chainTagged = a.ret.includes("zincir_marka_etiketi"); const chainSusp = a.inceleme.filter((x) => x.startsWith("zincir_suphesi"));
  const otherRet = a.ret.filter((r) => r !== "zincir_marka_etiketi");
  if (otherRet.length) { ret.push({ ref: a.ref, ad: a.name, ilce: a.district, neden: otherRet }); continue; }
  const kd = kapsamDisiOf(a.name, e.tags.brand, siteKey(a.website));
  if (kd) { { const kk = brandKey || fold(a.name).split(" ").slice(0, 2).join(" "); zincirOzet.kapsamDisi[kk] = (zincirOzet.kapsamDisi[kk] ?? 0) + 1; } ret.push({ ref: a.ref, ad: a.name, ilce: a.district, neden: [`zincir_kapsam_disi:${kd}`] }); continue; }
  const isChain = chainTagged || chainSusp.length > 0;
  /* adres: OSM ya da OSM bina adresi (ters konum) */
  let street = a.street, house = clean(a.housenumber), hood = a.neighbourhood, adresKaynagi = "OSM kaydı (addr:street + addr:housenumber)";
  const t = T[a.ref];
  const ibb = IBB[a.ref];
  if (!(street && house) && ibb) { const mm = /([^,]*?(?:Cad|Cd|Sok|Sk|Bulvar|Blv|Yolu)[^,]*?)[,\s]+No[:.\s]*([0-9]+[A-Za-z]?)/i.exec(ibb.adres ?? ""); if (mm) { street = mm[1].trim(); house = mm[2]; adresKaynagi = `İBB Açık Veri adresi (${ibb.kaynak})`; } }
  if (!(street && house) && t?.road && t?.house_number) { street = t.road; house = clean(t.house_number); hood ??= t.suburb ?? undefined; adresKaynagi = `OSM bina adresi (ters konum ${t.tarih})`; }
  const fullAddr = !!(street && /\d/.test(house ?? ""));
  /* kanıtlar */
  const kanit = [], zayif = []; let strong = false;
  const so = K[a.ref]?.olcum;
  if (so?.ad && (so.sokak || so.telefon)) { strong = true; kanit.push(`resmî site (${K[a.ref].tarih}): ad + ${[so.sokak && "sokak", so.telefon && "telefon"].filter(Boolean).join(" + ")} eşleşti`); }
  else if (so?.ad && (so.ilce || so.mahalle)) zayif.push(`resmî site (${K[a.ref].tarih}): ad + ${so.mahalle ? "mahalle" : "ilçe"}`);
  if (a.checkDate && a.checkDate >= "2025-01") { strong = true; kanit.push(`OSM yerinde kontrol tarihi ${a.checkDate}`); }
  const cs = CS[e.changeset];
  if (cs && cs.tarih >= "2025-01" && ONSITE.test(cs.uygulama ?? "")) { strong = true; kanit.push(`OSM son düzenleme yerinde anket uygulamasıyla (${(cs.uygulama ?? "").split(" ")[0]}, ${cs.tarih}, changeset ${e.changeset})`); }
  else if (cs && cs.tarih >= "2025-01" && MOBILE.test(cs.uygulama ?? "")) zayif.push(`OSM son düzenleme mobil uygulamadan (${(cs.uygulama ?? "").split(" ")[0]}, ${cs.tarih})`);
  if (ibb) { strong = true; kanit.push(`resmî işletmeci listesi: ${ibb.kaynak} — "${ibb.ibbAd}", ${ibb.m} m`); }
  let chainOk = !!ibb;   // İBB tesisleri: resmî liste şube kanıtıdır
  if (isChain) {
    if (chainOk) { /* İBB listesi */ }
    else if (z?.strong) { chainOk = true; strong = true; kanit.push(`resmî şube sayfası (${z.tarih}): sokak + ${z.olcum.bolge ? "ilçe/mahalle" : ""}${z.olcum.kapi ? " + kapı no" : ""}${z.olcum.telefon ? " + telefon" : ""} aynı bölümde`); }
    else zincirOzet.kanitsiz++;
  }
  const eksik = [], neden = [];
  /* aynı site alanı: İBB gibi tek alan adlı resmî işletmecinin farklı adlı tesisleri mükerrer değildir (ad farklı + İBB satırı) */
  const sameSiteOk = a.esles?.neden === "ayni_site_alani" && ibb && fold(EX.find((o) => o.slug === a.esles.slug)?.name ?? "") !== fold(a.name);
  if (a.esles && !sameSiteOk) neden.push(`mukerrer_suphesi:${a.esles.neden}:${a.esles.slug}`);
  if (isChain && !chainOk) neden.push(chainTagged ? "zincir_subesi_resmi_listede_dogrulanmadi" : `zincir_suphesi_kanitsiz:${chainSusp.join(",")}`);
  for (const x of a.inceleme) if (!x.startsWith("zincir_suphesi")) neden.push(x);
  if (!strong && !zayif.length) neden.push("faaliyet_kaniti_yok");
  if (!fullAddr) eksik.push(street ? "kapı numarası" : "sokak adresi");
  if (!labels.length) eksik.push("mutfak türü (kaynakta yok)");
  if (!a.phone) eksik.push("telefon"); if (!a.openingHours) eksik.push("çalışma saatleri");
  const core = eksik.filter((x) => x !== "telefon" && x !== "çalışma saatleri");
  const sinif = neden.length ? "C" : strong && !core.length ? "A" : "B";
  out[sinif].push({ a, e, street, house, hood, adresKaynagi, kanit, zayif, eksik, neden, isChain, brand: isChain ? (brandKey || z?.marka || fold(a.name)) : null, z });
}
/* paket içi: aynı bina adresi ya da yazım farkıyla aynı ad 150 m → incelemeye */
const bad = new Set(); const A = out.A;
for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
  const x = A[i], y = A[j], d = meters(x.a, y.a);
  const kx = addressKey(x.street, x.house), ky = addressKey(y.street, y.house);
  const cx = fold(x.a.name).replace(/\s+/g, ""), cy = fold(y.a.name).replace(/\s+/g, "");
  if ((kx && kx === ky && d <= 60) || (d <= 150 && cx.length >= 5 && editDistance(cx, cy) <= 1)) { bad.add(i); bad.add(j); }
}
for (const i of [...bad].sort((p, q) => q - p)) { const [x] = A.splice(i, 1); x.neden.push("paket_ici_ayni_bina_ya_da_ad"); out.C.push(x); }
/* kayıtlar */
const recs = [], rows = [];
for (const x of A.sort((p, q) => p.a.district.localeCompare(q.a.district, "tr") || p.a.name.localeCompare(q.a.name, "tr"))) {
  const { a } = x; const m = a.mutfak.labels;
  const tail = slugify(a.district);
  let slug = x.isChain ? `${slugify(a.name)}-${slugify(x.hood ?? x.street ?? "")}-${tail}`.replace(/--+/g, "-") : `${slugify(a.name)}-${tail}`;
  if (taken.has(slug)) slug = `${slugify(a.name)}-${slugify(x.hood ?? x.street ?? "")}-${tail}`.replace(/--+/g, "-");
  if (taken.has(slug)) slug = `${slug}-${a.ref.replace("/", "-")}`;
  taken.add(slug);
  const v = { ref: a.ref, slug, name: a.name, categoryId: "cat.restaurant", kind: KIND[m.find((l) => !NOT_RESTAURANT.has(l.id))?.id ?? m[0].id] ?? "Restoran", district: a.district,
    ...(x.hood ? { neighborhood: x.hood } : {}), lat: a.lat, lng: a.lng, address: `${x.street} No:${x.house}${x.hood ? `, ${x.hood}` : ""}, ${a.district}`,
    ...(a.phone ? { phone: a.phone } : {}), ...(a.website ? { website: a.website } : {}), ...(a.openingHours ? { openingHours: a.openingHours } : {}),
    cuisine: (a.cuisine ?? "").split(/[;,]/).map((s) => s.trim().toLowerCase()).filter(Boolean), importedAt: tarih,
    osmAmenity: a.amenity === "fast_food" ? "fast_food" : "restaurant", wave, verifiedAt: tarih, confidence: "güçlü",
    verification: [...x.kanit, `adres: ${x.adresKaynagi}`].join(" · ") };
  if (!v.cuisine.length) delete v.cuisine;
  recs.push(v);
  if (x.isChain) zincirOzet.dogrulanan.push({ slug, marka: x.brand, sayfa: x.z?.url });
  rows.push({ slug, ref: a.ref, ad: a.name, sube: x.isChain ? (x.hood ?? x.street) : null, zincir: x.brand, ilce: a.district, mahalle: x.hood ?? null, adres: v.address, koordinat: [a.lat, a.lng],
    tur: v.kind, mutfak: m.map((l) => ({ id: l.id, ad: MUTFAK[l.id].ad, kaynak: l.kaynak, deger: l.deger })), faaliyet: "açık (kanıt tarihli)", sinif: "A", kanit: x.kanit, zayifKanit: x.zayif, eksik: x.eksik,
    adresKaynagi: x.adresKaynagi, kaynak: [`https://www.openstreetmap.org/${a.ref}`, ...(K[a.ref]?.olcum?.ad ? K[a.ref].denenen.filter((d) => d.status === 200).map((d) => d.url) : []), ...(x.z?.strong && x.z.url ? [x.z.url] : []), ...(IBB[a.ref] ? [IBB[a.ref].url] : []), ...(CS[x.e.changeset] ? [`https://www.openstreetmap.org/changeset/${x.e.changeset}`] : [])],
    adNotu: a.mutfak.nameConflict ? `addaki "${a.mutfak.nameConflict.hint}" kaynakla uyuşmuyor; kaynak esas alındı` : undefined,
    mukerrer: "yok (Production, PR #4, 906, seyrek; aynı OSM kaydı, ad 150 m, yazım farkı, aynı bina, telefon, site alanı)", kontrolTarihi: tarih });
}
const kisa = (x) => ({ ref: x.a.ref, ad: x.a.name, ilce: x.a.district, amenity: x.a.amenity, zincir: x.brand, eksik: x.eksik, neden: x.neden, kanit: x.kanit, zayifKanit: x.zayif, site: x.a.website ?? null });
mkdirSync(dir, { recursive: true });
const lines = (arr) => "[\n" + arr.map((r) => JSON.stringify(r)).join(",\n") + "\n]\n";
writeFileSync(`${dir}/kayitlar.json`, lines(recs));
writeFileSync(`${dir}/paket.json`, JSON.stringify({ _aciklama: `İstanbul restoran paketi (dalga ${wave}). Yalnız A sınıfı restoran. venues.json'a eklenmedi; birleştirme yayın paketinde yapılır. Kaynak: OpenStreetMap (© OpenStreetMap katkıcıları, ODbL), İBB Açık Veri Portalı (İstanbul Büyükşehir Belediyesi, İBB Açık Veri Lisansı: Kent Lokantaları ve Sosyal Tesis Konumları), işletmelerin ve markaların resmî siteleri (yalnız eşleşme ölçümü). Google verisi kullanılmadı.`, osmTarihi: H.ozet.osm_tarihi, kontrolTarihi: tarih, eklenen: rows }, null, 1));
const Bk = out.B.filter((x) => x.kanit.length || x.zayif.length); const Ck = out.C.filter((x) => x.kanit.length || x.zayif.length || x.neden.some((n) => /mukerrer|paket_ici|zincir_subesi/.test(n)));
writeFileSync(`${dir}/inceleme.json`, JSON.stringify({ _aciklama: "B: eksik alanı yazılı, ayrıca değerlendirilir. C: doğrudan yayımlanmaz. Kanıtsız C'ler yalnız ozet.json'da sayı.", B: Bk.map(kisa), C: Ck.map(kisa) }).replace(/\},\{/g, "},\n{"));
writeFileSync(`${dir}/ret.json`, lines(ret));
/* B1: güçlü kanıt + kaynaklı tür + sokak ve mahalle bilinir, YALNIZ kapı numarası yok → sahip kararı (sokak düzeyinde adresle yayın?) */
const B1 = out.B.filter((x) => x.kanit.length && x.a.mutfak.labels.length && x.eksik.every((k) => ["kapı numarası", "sokak adresi", "telefon", "çalışma saatleri"].includes(k)) && (x.a.street || T[x.a.ref]?.road))
  .map((x) => ({ ref: x.a.ref, ad: x.a.name, ilce: x.a.district, mahalle: x.a.neighbourhood ?? T[x.a.ref]?.suburb ?? null, sokak: x.a.street ?? T[x.a.ref]?.road, tur: KIND[x.a.mutfak.labels[0].id] ?? null, kanit: x.kanit, eksik: x.eksik }));
writeFileSync(`${dir}/b1-yalniz-kapi-no-eksik.json`, lines(B1));
/* B1 PAKETİ (sahip onayı 2026-11-11: kapı numarası olmayan, sokak düzeyinde adresli yayın). A DEĞİLDİR: kaliteSinifi "B1",
   adresDuzeyi "sokak", güven "orta". Yalnız B1_DIR verilince üretilir. */
if (process.env.B1_DIR) {
  const bd = process.env.B1_DIR, bw = Number(process.env.B1_DALGA ?? wave + 1);
  const B1x = out.B.filter((x) => x.kanit.length && x.a.mutfak.labels.length && x.eksik.every((k) => ["kapı numarası", "sokak adresi", "telefon", "çalışma saatleri"].includes(k)) && (x.a.street || T[x.a.ref]?.road));
  const pool = [...recs, ...EX];
  const keep = [], drop = [];
  for (const x of B1x) {
    const st = x.a.street ?? T[x.a.ref].road, hood = x.a.neighbourhood ?? T[x.a.ref]?.suburb ?? null;
    const cx = fold(x.a.name).replace(/\s+/g, "");
    const twin = [...pool, ...keep.map((k) => k.v)].find((o) => typeof o.lat === "number" && meters(x.a, o) < 150 && (fold(o.name) === fold(x.a.name) || editDistance(cx, fold(o.name).replace(/\s+/g, "")) <= 1));
    const inPkg = B1x.find((y) => y !== x && meters(x.a, y.a) < 150 && editDistance(cx, fold(y.a.name).replace(/\s+/g, "")) <= 1);
    if (twin || inPkg) { drop.push({ ref: x.a.ref, ad: x.a.name, neden: twin ? `yakın_ayni_ad:${twin.slug ?? twin.ref}` : "paket_ici_ayni_ad" }); continue; }
    let slug = x.isChain ? `${slugify(x.a.name)}-${slugify(hood ?? st)}-${slugify(x.a.district)}`.replace(/--+/g, "-") : `${slugify(x.a.name)}-${slugify(x.a.district)}`;
    if (taken.has(slug)) slug = `${slugify(x.a.name)}-${slugify(hood ?? st)}-${slugify(x.a.district)}`.replace(/--+/g, "-");
    if (taken.has(slug)) slug = `${slug}-${x.a.ref.replace("/", "-")}`;
    taken.add(slug);
    const m = x.a.mutfak.labels;
    const v = { ref: x.a.ref, slug, name: x.a.name, categoryId: "cat.restaurant", kind: KIND[m.find((l) => !NOT_RESTAURANT.has(l.id))?.id ?? m[0].id] ?? "Restoran", district: x.a.district,
      ...(hood ? { neighborhood: hood } : {}), lat: x.a.lat, lng: x.a.lng, address: `${st}${hood ? `, ${hood}` : ""}, ${x.a.district}`,
      ...(x.a.phone ? { phone: x.a.phone } : {}), ...(x.a.website ? { website: x.a.website } : {}), ...(x.a.openingHours ? { openingHours: x.a.openingHours } : {}),
      cuisine: (x.a.cuisine ?? "").split(/[;,]/).map((q) => q.trim().toLowerCase()).filter(Boolean), importedAt: tarih,
      osmAmenity: x.a.amenity === "fast_food" ? "fast_food" : "restaurant", wave: bw, verifiedAt: tarih, confidence: "orta", kaliteSinifi: "B1", adresDuzeyi: "sokak",
      verification: [...x.kanit, `adres: sokak${hood ? " + mahalle" : ""} düzeyi, kapı numarası yok (${x.a.street ? "OSM kaydı" : `OSM ters konum ${T[x.a.ref].tarih}`}; sahip onayı 2026-11-11)`].join(" · ") };
    if (!v.cuisine.length) delete v.cuisine;
    keep.push({ v, x, hood, st });
  }
  mkdirSync(bd, { recursive: true });
  writeFileSync(`${bd}/kayitlar.json`, lines(keep.map((k) => k.v)));
  writeFileSync(`${bd}/paket.json`, JSON.stringify({ _aciklama: `İstanbul restoran B1 paketi (dalga ${bw}). A DEĞİL: faaliyet güçlü kanıtlı ve tür kaynaklı; adres sokak (+ mahalle) düzeyinde, kapı numarası yok. Sahip onayı 2026-11-11. venues.json'a eklenmedi. Kaynak: OpenStreetMap (© OpenStreetMap katkıcıları, ODbL). Google verisi kullanılmadı.`, osmTarihi: H.ozet.osm_tarihi, kontrolTarihi: tarih,
    eklenen: keep.map(({ v, x, hood, st }) => ({ slug: v.slug, ref: v.ref, ad: v.name, zincir: x.isChain ? x.brand : null, sube: x.isChain ? hood : null, ilce: v.district, mahalle: hood, sokak: st, adres: v.address, koordinat: [v.lat, v.lng], tur: v.kind,
      mutfak: x.a.mutfak.labels.map((l) => ({ id: l.id, ad: MUTFAK[l.id].ad, kaynak: l.kaynak, deger: l.deger })), faaliyet: "açık (kanıt tarihli)", sinif: "B1", adresDuzeyi: "sokak", kanit: x.kanit, eksik: x.eksik,
      kaynak: [`https://www.openstreetmap.org/${v.ref}`, ...(CS[x.e.changeset] ? [`https://www.openstreetmap.org/changeset/${x.e.changeset}`] : [])], kontrolTarihi: tarih })) }, null, 1));
  const ex2 = new Set(EX.map((o) => o.slug)), exr2 = new Set(EX.map((o) => o.ref)), a7 = new Set(recs.map((r) => r.ref));
  const bo = { dalga: bw, sinif: "B1", kayit: keep.length, elenen: drop, mahalleli: keep.filter((k) => k.hood).length, ilce: cnt(keep.map((k) => k.v.district)), tur: cnt(keep.map((k) => k.v.kind)),
    karsilastirma: { slug: keep.filter((k) => ex2.has(k.v.slug)).length, ref: keep.filter((k) => exr2.has(k.v.ref) || a7.has(k.v.ref)).length } };
  writeFileSync(`${bd}/ozet.json`, JSON.stringify(bo, null, 1));
  console.error("B1 paketi:", JSON.stringify({ ...bo, elenen: drop.length }));
}
writeFileSync(`${dir}/zincir.json`, JSON.stringify(zincirOzet, null, 1));
const exSlug = new Set(EX.map((v) => v.slug));
const kars = { karsilastirilan: exSlug.size, slug: recs.filter((v) => exSlug.has(v.slug)).length, ref: recs.filter((v) => exRef.has(v.ref)).length,
  yakinAyniAd: recs.filter((v) => EX.some((o) => typeof o.lat === "number" && fold(o.name) === fold(v.name) && meters(v, o) < 150)).length,
  ayniBina: recs.filter((v) => EX.some((o) => typeof o.lat === "number" && meters(v, o) < 60 && addressKey(undefined, undefined, o.address) === addressKey(undefined, undefined, v.address))).map((v) => v.slug) };
const ozet = { dalga: wave, osmTarihi: H.ozet.osm_tarihi, kontrolTarihi: tarih,
  B1_yalniz_kapi_no: B1.length, restoran_adayi: out.A.length + out.B.length + out.C.length + ret.length, A: recs.length, B: out.B.length, B_kanitli: Bk.length, C: out.C.length, ret: ret.length, kafeBarHavuzu: kafeBar,
  A_kanit: cnt(rows.flatMap((r) => r.kanit.map((k) => k.split(/[ (]/)[0] + (k.includes("anket") ? " anket" : k.includes("şube") ? " şube" : k.includes("kontrol") ? " kontrol" : "")))),
  A_ilce: cnt(recs.map((v) => v.district)), A_tur: cnt(recs.map((v) => v.kind)), A_zincir: cnt(zincirOzet.dogrulanan.map((z) => z.marka)),
  B_ilce: cnt(out.B.map((x) => x.a.district)), B_eksik: cnt(Bk.flatMap((x) => x.eksik)), C_neden: cnt(out.C.flatMap((x) => x.neden.map((n) => n.split(":")[0]))), ret_neden: cnt(ret.flatMap((r) => r.neden.map((n) => n.split(":")[0]))),
  zincir: { dogrulanan: zincirOzet.dogrulanan.length, kanitsiz: zincirOzet.kanitsiz, kapsamDisi: zincirOzet.kapsamDisi }, karsilastirma: { ...kars, ayniBina: kars.ayniBina.length } };
writeFileSync(`${dir}/ozet.json`, JSON.stringify(ozet, null, 1));
writeFileSync(`${dir}/karsilastirma.json`, JSON.stringify(kars, null, 1));
console.log(JSON.stringify({ A: ozet.A, B: ozet.B, B_kanitli: ozet.B_kanitli, C: ozet.C, ret: ozet.ret, A_kanit: ozet.A_kanit, A_ilce: ozet.A_ilce, A_tur: ozet.A_tur, zincir: ozet.zincir, kars: ozet.karsilastirma, kafeBar: { ...kafeBar, ornek: undefined } }, null, 1));
