/* Semt haritası kabul testi: sınır verisi, mekân → ilçe/mahalle ataması, tür grupları ve saf yardımcılar.
   Çalıştır: npm run test:semt-harita */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import sinirlar from "../data/harita/ilceler.json";
import { activeEntities } from "../data/real/presentation";
import { haritaSorgusu, mahalleGorunumu, mahalleYukleyici } from "../lib/harita/mahalle-yukleme";
import {
  TUR_GRUPLARI, baskin, bbox, grupOf, grupSay, haritaKoordinati, haritaListesinde, inShape, konumDogrulanmadi, labelAt, mahalleAta, norm, project, sirala,
  type Ilce, type Mahalle, type Proj,
} from "../lib/harita/semt";

let ok = 0;
const t = (name: string, fn: () => void) => { try { fn(); ok++; console.log(`✓ ${name}`); } catch (e) { console.error(`✗ ${name}\n  ${(e as Error).message}`); process.exitCode = 1; } };

const PROJ = sinirlar.proj as Proj;
const ILCELER = sinirlar.ilceler as unknown as Ilce[];
const byNorm = new Map(ILCELER.map((i) => [norm(i.ad), i]));
const MAH = new Map(ILCELER.map((i) => [i.slug, (JSON.parse(fs.readFileSync(path.join("data/harita/mahalle", `${i.slug}.json`), "utf8")) as { mahalleler: Mahalle[] }).mahalleler]));

/* ---------- saf yardımcılar ---------- */
t("norm: Türkçe harf, şapka ve mahalle eki", () => {
  assert.equal(norm("Kâğıthane"), "kagithane");
  assert.equal(norm("Caddebostan Mahallesi"), "caddebostan");
  assert.equal(norm("İçerenköy"), "icerenkoy");
  assert.equal(norm("ŞİŞLİ"), "sisli");
  assert.equal(norm("Kuloğlu Mah."), "kuloglu");
});
t("inShape: delikli kare", () => {
  const s = { outer: [[0, 0, 10, 0, 10, 10, 0, 10]], inner: [[4, 4, 6, 4, 6, 6, 4, 6]] };
  assert.ok(inShape(1, 1, s)); assert.ok(!inShape(5, 5, s)); assert.ok(!inShape(11, 5, s));
});
t("baskin: genel 'Restoran' baskın sayılmaz; boş bölge null", () => {
  assert.equal(baskin(["Restoran", "Restoran", "Restoran", "Burger"]), "burger");
  assert.equal(baskin(["Restoran"]), "diger");
  assert.equal(baskin([]), null);
  assert.equal(baskin(["Kebapçı / Ocakbaşı", "Pideci", "Burger", "Burger"]), "kebap"); // eşitlikte grup sırası
});
t("mahalleAta: poligon, adres adı, kıyı payı ve atanamayan", () => {
  const P: Proj = { lng0: 0, lat0: 0, k: 1, cos: 1 }; // x = lng, y = −lat
  const m: Mahalle[] = [{ ad: "Moda", osm: "r/1", outer: [[0, 0, 100, 0, 100, 100, 0, 100]], inner: [] }, { ad: "Fenerbahçe", osm: "r/2", outer: [[200, 0, 300, 0, 300, 100, 200, 100]], inner: [] }];
  const a = mahalleAta(P, [
    { slug: "ic", lat: -50, lng: 50 }, { slug: "ad", neighborhood: "Fenerbahçe Mahallesi" },
    { slug: "kiyi", lat: -50, lng: 110 }, { slug: "uzak", lat: -50, lng: 150 },
    { slug: "metin", address: "Moda Caddesi No:3, Moda (Çarşı), Kadıköy" }, { slug: "ilceadi", address: "Bir Sokak No:1, Fenerbahçe" },
  ], m);
  assert.deepEqual(a.get("metin"), { ad: "Moda", kaynak: "adres" });
  assert.equal(a.get("ilceadi"), undefined); // son parça ilçe sayılır, mahalle diye okunmaz
  assert.deepEqual(a.get("ic"), { ad: "Moda", kaynak: "konum" });
  assert.deepEqual(a.get("ad"), { ad: "Fenerbahçe", kaynak: "adres" });
  assert.deepEqual(a.get("kiyi"), { ad: "Moda", kaynak: "yakin" });
  assert.equal(a.get("uzak"), undefined);
});
t("sirala: Google puanı olan önce, az değerlendirmeli puan sonra", () => {
  const r = sirala([
    { name: "C", g: null }, { name: "A", g: { rating: 4.9, count: 12 } }, { name: "B", g: { rating: 4.5, count: 900 } }, { name: "D", g: { rating: 4.7, count: 300 } },
  ]).map((x) => x.name);
  assert.deepEqual(r, ["D", "B", "A", "C"]);
});

/* ---------- sınır verisi ---------- */
t("39 ilçe; 14 Anadolu, 25 Avrupa; her ilçenin halkası ve mahalle dosyası var", () => {
  assert.equal(ILCELER.length, 39);
  assert.equal(ILCELER.filter((i) => i.yaka === "anadolu").length, 14);
  for (const i of ILCELER) { assert.ok(i.outer.length > 0, i.ad); assert.ok((MAH.get(i.slug) ?? []).length > 0, `mahalle yok: ${i.ad}`); }
});
t("etiket noktası kendi bölgesinin içinde", () => {
  const bad: string[] = [];
  for (const i of ILCELER) { const [x, y] = labelAt(i); if (!inShape(x, y, i)) bad.push(i.ad); }
  for (const [slug, ms] of MAH) for (const m of ms) { const [x, y] = labelAt(m); if (!inShape(x, y, m)) bad.push(`${slug}/${m.ad}`); }
  assert.ok(bad.length <= 5, `dışarıda kalan etiket: ${bad.join(", ")}`);
});
t("sınır dosyaları hafif (ilçe < 120 KB, mahalle dosyası < 120 KB)", () => {
  assert.ok(fs.statSync("data/harita/ilceler.json").size < 120_000);
  for (const i of ILCELER) assert.ok(fs.statSync(path.join("data/harita/mahalle", `${i.slug}.json`)).size < 120_000, i.ad);
});

/* ---------- katalog ataması ---------- */
const yerler = activeEntities.map((e) => ({ slug: e.slug, kind: e.subcategory, district: e.location?.district, neighborhood: e.location?.neighborhood, address: e.address, lat: e.location?.geo?.lat, lng: e.location?.geo?.lng }));
t("her aktif mekânın ilçesi haritada var", () => {
  const miss = yerler.filter((y) => !y.district || !byNorm.has(norm(y.district))).map((y) => `${y.slug} (${y.district})`);
  assert.deepEqual(miss, []);
});
t("koordinatlı mekânların en az %95'i kendi ilçe poligonunda", () => {
  const geo = yerler.filter((y) => typeof y.lat === "number");
  const out = geo.filter((y) => { const [x, yy] = project(PROJ, y.lat!, y.lng!); return !inShape(x, yy, byNorm.get(norm(y.district!))!); });
  console.log(`  koordinatlı ${geo.length}, ilçe dışında ${out.length}${out.length ? `: ${out.slice(0, 8).map((y) => y.slug).join(", ")}` : ""}`);
  assert.ok(out.length / geo.length <= 0.05);
});
t("mahalle ataması: koordinatlı mekânların en az %90'ı bir mahallede", () => {
  let geo = 0, konum = 0, adres = 0, yakin = 0, yok = 0;
  for (const i of ILCELER) {
    const xs = yerler.filter((y) => y.district && norm(y.district) === norm(i.ad));
    const a = mahalleAta(PROJ, xs, MAH.get(i.slug)!);
    for (const y of xs) {
      const hit = a.get(y.slug); if (typeof y.lat === "number") geo++;
      if (!hit) yok++; else if (hit.kaynak === "konum") konum++; else if (hit.kaynak === "yakin") yakin++; else adres++;
    }
  }
  console.log(`  konumdan ${konum}, adres adından ${adres}, kıyı payıyla ${yakin}, atanamayan ${yok} (koordinatlı ${geo})`);
  assert.ok(konum / geo >= 0.9);
  assert.ok(yakin / geo <= 0.05, "kıyı payıyla atama çok fazla: sınır verisi bozuk olabilir");
});
t("katalogdaki her tür bir gruba bağlı (yalnız genel 'Restoran' diğer)", () => {
  const kinds = [...new Set(activeEntities.map((e) => e.subcategory).filter(Boolean))] as string[];
  const diger = kinds.filter((k) => grupOf(k) === "diger");
  assert.deepEqual(diger, ["Restoran"], `gruba bağlanmamış tür: ${diger.filter((k) => k !== "Restoran").join(", ")} — lib/harita/semt.ts TUR_GRUPLARI'na ekle`);
  assert.equal(new Set(TUR_GRUPLARI.map((g) => g.key)).size, TUR_GRUPLARI.length);
});
t("her tür grubu için harita rengi tanımlı", () => {
  const css = fs.readFileSync("app/globals.css", "utf8");
  for (const g of TUR_GRUPLARI) assert.ok(css.includes(`--map-${g.key}:`), `--map-${g.key} yok`);
});
t("Kadıköy örneği: mahallelere dağılım ve baskın tür", () => {
  const kad = ILCELER.find((i) => i.slug === "kadikoy")!;
  const xs = yerler.filter((y) => y.district === "Kadıköy");
  const a = mahalleAta(PROJ, xs, MAH.get("kadikoy")!);
  const mahs = new Set([...a.values()].map((v) => v.ad));
  console.log(`  Kadıköy: ${xs.length} mekân, ${mahs.size} mahalle; baskın ${baskin(xs.map((y) => y.kind))}; ilk üç grup ${grupSay(xs.map((y) => y.kind)).slice(0, 3).map((g) => `${g.key}:${g.n}`).join(" ")}`);
  assert.ok(mahs.size >= 8); assert.ok(bbox([kad]).w > 0);
});

t("Tuğbiş tek Üsküdar kaydı; konumu doğrulanmadı, pin ve mahalle ataması yok", () => {
  const matches = activeEntities.filter((e) => e.slug === "tugbis-manti-uskudar");
  assert.equal(matches.length, 1);
  const e = matches[0]!;
  assert.equal(e.location?.district, "Üsküdar");
  const geo = e.location?.geo;
  assert.ok(geo, "ham katalog koordinatı korunmalı");
  assert.ok(konumDogrulanmadi(e.slug));
  assert.equal(haritaKoordinati(e.slug, geo), undefined);
  assert.equal(haritaListesinde(e.slug, true, false), true);
  assert.equal(haritaListesinde(e.slug, true, true), false);
  assert.equal(haritaListesinde(e.slug, false, false), false);
  const v = { slug: e.slug, neighborhood: e.location?.neighborhood, address: e.address, ...geo };
  for (const slug of ["uskudar", "kadikoy"]) {
    assert.equal(mahalleAta(PROJ, [v], MAH.get(slug)!).has(e.slug), false);
    assert.equal(mahalleAta(PROJ, [{ ...v, lat: 41.006759, lng: 29.047067 }], MAH.get(slug)!).has(e.slug), false);
  }
  // An unreviewed slug is not inferred to be a conflict merely from this coordinate.
  assert.equal(haritaKoordinati("baska-mekan", geo), geo);
  assert.equal(haritaListesinde("baska-mekan", true, true), true);
});

/* ---------- yükleme ve doğrudan bağlantı regresyonları ---------- */
const kad = { ilce: "kadikoy", mahalleKey: "acibadem" };
const usk = { ilce: "uskudar" };
const kadDosya = { ilce: "Kadıköy", mahalleler: MAH.get("kadikoy")! };
const uskDosya = { ilce: "Üsküdar", mahalleler: MAH.get("uskudar")! };

t("Acıbadem bağlantısı yükleme ve hata sırasında mahalle ve türü korur", () => {
  for (const durum of ["bekliyor", "hata"] as const) {
    const v = mahalleGorunumu(kad, { ilce: "kadikoy", durum });
    assert.equal(v.yuklemeDurumu, durum);
    assert.equal(v.mahalle, undefined);
    assert.equal(haritaSorgusu(kad, v.urlMahalle, "kebap"), "ilce=kadikoy&mahalle=acibadem&tur=kebap");
  }
});
t("geç Kadıköy sonucu Üsküdar'a taşınmaz; iki Acıbadem farklıdır", () => {
  const a = kadDosya.mahalleler.find((m) => norm(m.ad) === "acibadem");
  const b = uskDosya.mahalleler.find((m) => norm(m.ad) === "acibadem");
  assert.ok(a && b);
  assert.notEqual(a.osm, b.osm);
  const gec = mahalleGorunumu(usk, { ilce: "kadikoy", durum: "hazir", dosya: kadDosya });
  assert.equal(gec.mah, null);
  assert.equal(gec.yuklemeDurumu, "bekliyor");
  const hazir = mahalleGorunumu(usk, { ilce: "uskudar", durum: "hazir", dosya: uskDosya });
  assert.equal(hazir.mahalle, undefined);
  assert.equal(haritaSorgusu(usk, hazir.urlMahalle, "tumu"), "ilce=uskudar");
  const secim = { ...usk, mahalleKey: "acibadem" };
  assert.equal(mahalleGorunumu(secim, { ilce: "uskudar", durum: "hazir", dosya: uskDosya }).mahalle, "Acıbadem");
});
t("geçersiz mahalle yalnız dosya yüklendikten sonra URL'den temizlenir", () => {
  const d = { ...kad, mahalleKey: "olmayan" };
  assert.equal(mahalleGorunumu(d, null).urlMahalle, "olmayan");
  const sonuc = mahalleGorunumu(d, { ilce: "kadikoy", durum: "hazir", dosya: kadDosya });
  assert.equal(sonuc.mahalle, undefined);
  assert.equal(haritaSorgusu(d, sonuc.urlMahalle, "tumu"), "ilce=kadikoy");
});

async function tekrarDeneTesti() {
  let cagrilar = 0;
  const yukle = mahalleYukleyici(async () => {
    if (++cagrilar === 1) throw new Error("geçici yükleme hatası");
    return kadDosya;
  });
  const ilk = yukle("kadikoy");
  assert.equal(yukle("kadikoy"), ilk);
  await assert.rejects(ilk, /geçici yükleme hatası/);
  const ikinci = yukle("kadikoy");
  assert.notEqual(ikinci, ilk);
  const dosya = await ikinci;
  assert.equal(yukle("kadikoy"), ikinci);
  assert.equal(cagrilar, 2);
  const v = mahalleGorunumu(kad, { ilce: "kadikoy", durum: "hazir", dosya });
  assert.equal(v.mahalle, "Acıbadem");
  assert.equal(haritaSorgusu(kad, v.urlMahalle, "tumu"), "ilce=kadikoy&mahalle=acibadem");
}

tekrarDeneTesti().then(() => {
  ok++;
  console.log("✓ reddedilen yükleme önbellekten çıkar ve gerçek deneme Acıbadem'i geri getirir");
}, (e: unknown) => {
  console.error("✗ mahalle içe aktarma yeniden denemesi", e);
  process.exitCode = 1;
}).then(() => console.log(`\n${ok} test geçti${process.exitCode ? ", hata var" : ""}`));
