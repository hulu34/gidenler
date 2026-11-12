/* TÜR VE KATEGORİ · KARAR — katalog denetiminde tür ("Restoran", "Kafe", "Bar" gibi genel tür) ya da kategori sorunu çıkan
   kayıtlar için kaynaklı karar. Standart paket kurallarıyla aynıdır; addan tür üretilmez.
   TÜR (yalnız genel türlü kayıt):
     S  resmî sitede işletmenin kendi açık tür tanımı (site-tanimlari-*.json, elle okunmuş; ifade ölçümde yeniden aranır).
        OSM mutfak etiketiyle uyumsuzsa uygulanmaz, sahibe gider.
     O  OSM'nin BUGÜNKÜ cuisine etiketi (paket 7+ eşlemesi: turkish → Türk mutfağı …). Belirsiz değerler (american, meat,
        mediterranean, greek, world) tür seçmez; varsa sıradaki açık değer kullanılır.
        - Restoran kategorisinde ilk etiket kafe/tatlı/fırın/bar ise tür yazılmaz (kategori sorusu, sahibe).
        - Kafe kategorisinde yalnız kafe ailesi tür olur: coffee_shop → Kahveci, tatlı → Tatlıcı, fırın → Fırın, kahvaltı.
        - Bar kategorisinde OSM amenity=pub → Pub.
     Addaki tür ipucu kaynaktaki etiketle çelişirse uygulanmaz.
   KATEGORİ: OSM amenity=cafe olan ve türü Tatlıcı ya da Kahvaltı olan restoran kayıtları kafe kategorisine alınır
     (katalogda aynı tür ve amenity'deki kayıtların kategorisi kafe). Diğer kategori sorunları sahibe gider.
   Uygulanmaz: kapanış kaydı olan, OSM öğesi silinmiş ya da adı değişmiş, türü daha önce elle düzeltilmiş (duzeltmeler.json) kayıt.
   Kullanım: npx tsx scripts/katalog/tur-karar.mjs <osm.json> <site.json> <site-tanimlari.json> <denetim.json> <tarih> <cikti.json> */
import { readFileSync, writeFileSync } from "node:fs";
import { sourcedLabels, auditCuisine, cuisineValues, COMPATIBLE } from "../../lib/katalog/mutfak.ts";
import { fold } from "../../lib/katalog/aday.ts";
const [osmP, siteP, tanimP, denP, tarih, out] = process.argv.slice(2);
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const V = J("data/real/venues.json"), FIX = J("data/real/duzeltmeler.json"), KAP = J("data/real/kapanis.json");
const O = J(osmP), S = J(siteP), T = J(tanimP), D = J(denP);
const KIND = { turk: "Türk mutfağı", esnaf: "Lokanta", kebap: "Kebapçı / Ocakbaşı", doner: "Dönerci", pide: "Pideci", balik: "Balık restoranı", meyhane: "Meyhane", et: "Steakhouse", burger: "Burger", pizza: "Pizza", japon: "Sushi / Japon", asya: "Asya mutfağı", kahvalti: "Kahvaltı", dunya: "Dünya mutfağı", vegan: "Vegan", tavuk: "Tavuk", sokak: "Sokak lezzeti" };
const KAFE_KIND = { kafe: "Kahveci", tatli: "Tatlıcı", firin: "Fırın", kahvalti: "Kahvaltı" };
const KIND_ID = { ...Object.fromEntries(Object.entries(KIND).map(([k, v]) => [v, k])), Kahveci: "kafe", Tatlıcı: "tatli", Fırın: "firin", Pub: "bar", "Karadeniz mutfağı": "turk" };
const NOT_RESTAURANT = new Set(["kafe", "bar", "tatli", "firin"]);
const GENERIC = new Set(["Restoran", "Kafe", "Bar"]);
const ZAYIF = new Set(["american", "meat", "mediterranean", "greek", "world"]);
const TR_DEGER = { dondurma: "ice_cream", "tatlı": "dessert", kahve: "coffee_shop" };
const KAHVE = new Set(["coffee_shop", "coffee"]);
const uyumlu = (a, b) => a === b || COMPATIBLE[a]?.includes(b) || COMPATIBLE[b]?.includes(a);
const osmUrl = (ref) => `https://www.openstreetmap.org/${ref}`;
const hedef = new Map(D.kayitlar.filter((r) => r.sorunlar.some((s) => ["tür", "kategori"].includes(s.eksen))).map((r) => [r.slug, r]));
const bySlug = new Map(V.map((v) => [v.slug, v]));
/* emsal: OSM amenity=cafe olup kafe kategorisinde duran Tatlıcı/Kahvaltı kayıtları */
const emsal = (kind) => V.filter((v) => v.kind === kind && v.osmAmenity === "cafe" && v.categoryId === "cat.cafe").length;
const sonuc = { tur: [], kategori: [], uygulanmayan: [], sahip: [] };
for (const [slug, d] of hedef) {
  const v0 = bySlug.get(slug); if (!v0) continue;
  const kind = FIX[slug]?.kind ?? v0.kind; const v = { ...v0, kind };
  const o = O.ogeler[v.ref]; const t = o?.tags ?? {};
  const turSorunu = d.sorunlar.some((s) => s.eksen === "tür"), katSorunu = d.sorunlar.filter((s) => s.eksen === "kategori");
  const satir = { slug, ad: v.name, ilce: v.district, kategori: v.categoryId, tur: kind, dalga: v.wave ?? 0 };
  const engel = [];
  const k = KAP[slug]; if (k?.state === "closed_confirmed" || k?.state === "closed_suspected") engel.push(`kapanış kaydı (${k.state})`);
  if (!o?.visible) engel.push("OSM öğesi silinmiş");
  else if (t.name && !(fold(t.name).includes(fold(v.name)) || fold(v.name).includes(fold(t.name)))) engel.push(`OSM adı değişmiş ("${t.name}")`);
  const surum = o?.visible ? `sürüm ${o.version}, ${o.timestamp?.slice(0, 10)}` : "";
  /* ---- TÜR ---- */
  if (turSorunu) {
    let karar = null, neden = null;
    const degerler = cuisineValues(t.cuisine).map((x) => TR_DEGER[x] ?? x);
    const acik = degerler.filter((x) => !ZAYIF.has(x)), zayif = degerler.filter((x) => ZAYIF.has(x));
    const etiket = sourcedLabels({ cuisine: acik }).labels;
    const tanim = T.kabul[slug], ret = T.ret[slug];
    if (FIX[slug]?.kind) neden = `türü daha önce elle düzeltilmiş (duzeltmeler.json, ${FIX[slug].checkedAt}): ${FIX[slug].why}`;
    else if (engel.length) neden = engel.join("; ");
    else if (tanim) {
      const s = S[slug]; const p = s?.sayfalar?.[tanim.sayfa]; const metin = p?.[tanim.alan] ?? "";
      const kimlik = s?.ad || fold(tanim.ifade).includes(fold(v.name.split(" ")[0]));
      const yeniId = KIND_ID[tanim.kind] ?? null; const osmId = etiket[0]?.id;
      if (!metin || !fold(metin).includes(fold(tanim.ifade))) neden = `site tanımı ölçümde bulunamadı (${tanim.alan})`;
      else if (!kimlik) neden = "sitede ad eşleşmesi yok";
      else if (osmId && yeniId && !uyumlu(osmId, yeniId) && !(v.categoryId === "cat.bar" && t.amenity === "pub")) { neden = `site tanımı (${tanim.kind}) OSM mutfak etiketiyle (${t.cuisine}) uyumsuz`; sonuc.sahip.push({ ...satir, eksen: "tür", soru: neden }); }
      else karar = { kind: tanim.kind, kaynak: "resmî site", sourceUrl: p.url, kanit: `resmî site (${s.tarih}, ${tanim.yer}): "${tanim.ifade}"`, duzey: tanim.duzey, osm: t.cuisine ?? null };
    } else if (v.categoryId === "cat.restaurant") {
      const L = etiket[0]; const ad = auditCuisine({ name: v.name, amenity: t.amenity, cuisine: acik });
      if (!L) neden = zayif.length ? `OSM mutfak etiketi belirsiz (${zayif.join(";")}), sitede açık tür tanımı yok` : ret ?? (S[slug] ? "OSM'de mutfak etiketi yok; sitede açık tür tanımı yok" : "OSM'de mutfak etiketi yok; kayıtlı resmî site yok");
      else if (NOT_RESTAURANT.has(L.id)) { neden = `OSM mutfağının ilki ${L.deger} (kafe/tatlı); restoran türü yazılmadı`; sonuc.sahip.push({ ...satir, eksen: "kategori", soru: `restoran kategorisinde, OSM mutfağı ${t.cuisine}, amenity ${t.amenity}` }); }
      else if (ad.nameConflict) neden = `addaki ipucu (${ad.nameConflict.hint}) OSM etiketiyle (${t.cuisine}) çelişiyor`;
      else karar = { kind: KIND[L.id], kaynak: "OSM", sourceUrl: osmUrl(v.ref), kanit: `OSM cuisine=${t.cuisine} (${L.deger} → ${KIND[L.id]}; ${surum})`, osm: t.cuisine };
    } else if (v.categoryId === "cat.cafe") {
      const L = etiket[0];
      if (L && KAFE_KIND[L.id] && (L.id !== "kafe" || KAHVE.has(L.deger))) karar = { kind: KAFE_KIND[L.id], kaynak: "OSM", sourceUrl: osmUrl(v.ref), kanit: `OSM cuisine=${t.cuisine} (${cuisineValues(t.cuisine).find((x) => (TR_DEGER[x] ?? x) === L.deger)} → ${KAFE_KIND[L.id]}; ${surum})`, osm: t.cuisine };
      else if (L) { neden = `kafe kategorisinde restoran mutfağı (OSM cuisine=${t.cuisine}); kafe türü yazılmadı`; sonuc.sahip.push({ ...satir, eksen: "kategori", soru: `kafe kategorisinde, OSM amenity ${t.amenity}, mutfak ${t.cuisine}` }); }
      else neden = ret ?? (S[slug] ? "OSM'de mutfak etiketi yok; sitede açık tür tanımı yok" : "OSM'de mutfak etiketi yok; kayıtlı resmî site yok");
    } else if (v.categoryId === "cat.bar") {
      if (t.amenity === "pub") karar = { kind: "Pub", kaynak: "OSM", sourceUrl: osmUrl(v.ref), kanit: `OSM amenity=pub (${surum})`, osm: null };
      else neden = ret ?? "OSM amenity=bar, mutfak/alt tür etiketi yok; sitede açık bar türü tanımı yok";
    }
    if (ret && /sahipte/.test(ret)) sonuc.sahip.push({ ...satir, eksen: /kategori/i.test(ret) ? "kategori" : "kapsam", soru: ret });
    if (karar) sonuc.tur.push({ ...satir, yeni: karar.kind, kaynak: karar.kaynak, kanit: karar.kanit, duzey: karar.duzey, alanlar: { kind: karar.kind, sourceUrl: karar.sourceUrl, why: `Genel tür "${kind}" kaynaklı türle değiştirildi: ${karar.kanit}. Kontrol ${tarih}.` } });
    else sonuc.uygulanmayan.push({ ...satir, eksen: "tür", neden });
  }
  /* ---- KATEGORİ ---- */
  for (const ks of katSorunu.slice(0, 1)) {
    if (!engel.length && t.amenity === "cafe" && v.categoryId === "cat.restaurant" && ["Tatlıcı", "Kahvaltı"].includes(kind)) {
      const kanit = `OSM amenity=cafe${t.cuisine ? `, cuisine=${t.cuisine}` : ""} (${surum}); katalogda amenity=cafe olan ${emsal(kind)} ${kind} kaydı kafe kategorisinde`;
      sonuc.kategori.push({ ...satir, yeni: "cat.cafe", kanit, alanlar: { categoryId: "cat.cafe" } });
    } else {
      const neden = engel.length ? engel.join("; ") : `${ks.not}; OSM amenity ${t.amenity ?? "—"}, mutfak ${t.cuisine ?? "—"}`;
      sonuc.uygulanmayan.push({ ...satir, eksen: "kategori", neden });
      if (!engel.length && !sonuc.sahip.some((x) => x.slug === slug && x.eksen === "kategori")) sonuc.sahip.push({ ...satir, eksen: "kategori", soru: neden });
    }
  }
}
const say = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const ozet = {
  hedef: hedef.size, turSorunu: [...hedef.values()].filter((r) => r.sorunlar.some((s) => s.eksen === "tür")).length, kategoriSorunu: [...hedef.values()].filter((r) => r.sorunlar.some((s) => s.eksen === "kategori")).length,
  turUygulanan: sonuc.tur.length, turKaynak: say(sonuc.tur, (x) => x.kaynak), yeniTur: say(sonuc.tur, (x) => x.yeni), eskiTur: say(sonuc.tur, (x) => x.tur),
  kategoriUygulanan: sonuc.kategori.length, turUygulanmayan: sonuc.uygulanmayan.filter((x) => x.eksen === "tür").length,
  turUygulanmayanNeden: say(sonuc.uygulanmayan.filter((x) => x.eksen === "tür"), (x) => (x.neden ?? "—").replace(/ \(.*$/, "").replace(/: .*$/, "").replace(/;.*$/, "")),
  kategoriUygulanmayan: sonuc.uygulanmayan.filter((x) => x.eksen === "kategori").length, sahip: sonuc.sahip.length,
};
writeFileSync(out, JSON.stringify({ _aciklama: `Tür ve kategori düzeltme paketi (${tarih}): katalog denetiminde genel türlü ya da kategori çelişkili ${hedef.size} kayıt. Kaynak: OpenStreetMap API'nin bugünkü etiketleri (© OpenStreetMap katkıcıları, ODbL) ve işletmelerin resmî sitelerindeki kendi tanımları (yalnız kısa ifade). Google verisi kullanılmadı; addan tür üretilmedi. Dosyalar değiştirilmedi: tür duzeltmeler.json'a, kategori venues.json'a yayın sırasında tur-uygula.mjs ile yazılır.`, tarih, osmTarihi: O.tarih, ozet, ...sonuc }, null, 1) + "\n");
console.log(JSON.stringify(ozet, null, 1));
