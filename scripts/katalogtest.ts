/* KATALOG BORU HATTI DENETİMİ — mutfak kuralları, ilçe sınırları, kalite sınıfı, nüfus dosyaları ve İstanbul paket 6.
   Çalıştır: npx tsx scripts/katalogtest.ts */
import { readFileSync, existsSync } from "node:fs";
import { auditCuisine, sourcedLabels, kindConflict, nameHints } from "../lib/katalog/mutfak";
import { districtOf, type SinirDosyasi } from "../lib/katalog/geo";
import { gradeCandidate, gradeExisting, hasHouseNo } from "../lib/katalog/kalite";
import { toCandidate, matchExisting, type OsmEl, type Mevcut } from "../lib/katalog/aday";
import { invalidRecord, type RealVenueRecord } from "../data/real/index";
import venues from "../data/real/venues.json";
import isletme from "../data/real/isletme.json";

let pass = 0, fail = 0;
const ok = (n: string, c: unknown, i?: unknown) => { if (c) pass++; else { fail++; console.log("✗", n, i ?? ""); } };

/* 1 · mutfak: ad etiket üretmez; kaynak esas */
const je = auditCuisine({ name: "Japon Erdal", amenity: "restaurant", cuisine: "turkish;pide" });
ok("Japon Erdal: kaynak türk + pide, Japon etiketi YOK", je.labels.map((l) => l.id).join() === "turk,pide" && !je.labels.some((l) => l.id === "japon"));
ok("Japon Erdal: addaki 'Japon' çelişki olarak raporlanır", je.nameConflict?.hint === "japon");
ok("Japon Erdal: gösterilen tür 'Pideci' kaynakla uyumlu → çelişki değil", !kindConflict("Pideci", je, "Japon Erdal"));
ok("addan türetilmiş 'Sushi / Japon' + kaynak türk → çelişki", kindConflict("Sushi / Japon", auditCuisine({ name: "Sushi Ahmet", cuisine: "turkish" }), "Sushi Ahmet"));
const only = auditCuisine({ name: "Burger Dünyası", amenity: "restaurant" });
ok("kaynakta mutfak yoksa addaki 'burger' etiket olmaz, yalnız ipucu", !only.labels.length && only.nameOnly.includes("burger"));
ok("çoklu etiket: kebab;turkish → kebap + turk (sırası korunur)", sourcedLabels({ cuisine: "kebab;turkish" }).labels.map((l) => l.id).join() === "kebap,turk");
ok("kafe amenity'si mutfak yoksa 'kafe' etiketi alır (kaynak: amenity)", sourcedLabels({ amenity: "cafe" }).labels[0]?.kaynak === "osm_amenity");
ok("fine dining hiçbir OSM değerinden üretilmez", !sourcedLabels({ cuisine: "fine_dining;luxury;michelin" }).labels.length);
ok("tanınmayan değer raporlanır", sourcedLabels({ cuisine: "molecular" }).unknown.includes("molecular"));
ok("künefe + turkish çelişki değil", !auditCuisine({ name: "Beyzade Künefe", cuisine: "turkish" }).nameConflict);
ok("ad ipucu: 'Asya Pide' → asya ipucu (kaynak kebab ise yalnız not)", nameHints("Asya Pide Kebap").includes("asya"));

/* 2 · ilçe sınırları */
const IST = JSON.parse(readFileSync("data/katalog/istanbul-ilceler.json", "utf8")) as SinirDosyasi;
const ANK = JSON.parse(readFileSync("data/katalog/ankara-ilceler.json", "utf8")) as SinirDosyasi;
ok("İstanbul sınır dosyası: 39 ilçe, ODbL atfı", IST.ilceler.length === 39 && /ODbL/.test(IST.lisans));
ok("Ankara sınır dosyası: 25 ilçe", ANK.ilceler.length === 25);
ok("Galata Kulesi → Beyoğlu", districtOf(41.02562, 28.97418, IST) === "Beyoğlu");
ok("Moda → Kadıköy", districtOf(40.9839, 29.0270, IST) === "Kadıköy");
ok("Kızılay → Çankaya (Ankara)", districtOf(39.9208, 32.8541, ANK) === "Çankaya");
ok("Ankara noktası İstanbul'da değil", districtOf(39.9208, 32.8541, IST) === null);
const all = [...(venues as RealVenueRecord[]), ...(isletme as RealVenueRecord[])];
const geo = all.filter((v) => typeof v.lat === "number");
const agree = geo.filter((v) => districtOf(v.lat!, v.lng!, IST) === v.district).length;
ok(`yayındaki kayıtların ≥ %99'u kendi ilçe sınırında (${agree}/${geo.length})`, agree / geo.length >= 0.99);

/* 3 · aday ve kalite */
const el = (tags: Record<string, string>, id = 1, lat = 40.99, lon = 29.03): OsmEl => ({ type: "node", id, lat, lon, tags: { amenity: "restaurant", ...tags } });
const brand = toCandidate(el({ name: "Zincir Burger", brand: "Zincir" }), "Kadıköy");
ok("marka etiketi → ret (zincir)", brand.ret.includes("zincir_marka_etiketi"));
ok("genel ad → ret", toCandidate(el({ name: "Restoran" }), "Kadıköy").ret.includes("genel_ad"));
ok("disused → ret", toCandidate(el({ name: "Eski Yer", disused: "yes" }), "Kadıköy").ret.includes("osm_kapali_isareti"));
const ex: Mevcut[] = [{ slug: "x-kadikoy", ref: "node/9", name: "Çiya Sofrası", district: "Kadıköy", lat: 40.99, lng: 29.03, phone: "+90 216 330 31 90" }];
ok("aynı OSM kaydı → kesin mükerrer", matchExisting(toCandidate(el({ name: "Çiya" }, 9), "Kadıköy"), ex)?.neden === "ayni_osm_kaydi");
ok("aynı ad 150 m → mükerrer şüphesi", matchExisting(toCandidate(el({ name: "Çiya Sofrası" }, 10, 40.9905, 29.0302), "Kadıköy"), ex)?.neden === "ayni_ad_150m");
ok("aynı telefon → mükerrer şüphesi", matchExisting(toCandidate(el({ name: "Başka Ad", phone: "0216 330 31 90" }, 11, 41.05, 29.0), "Kadıköy"), ex)?.neden === "ayni_telefon");
const good = toCandidate(el({ name: "Örnek Ocakbaşı", cuisine: "kebab", "addr:street": "Moda Caddesi", "addr:housenumber": "12", phone: "+90 216 000 00 00", opening_hours: "Mo-Su 12:00-23:00" }, 20), "Kadıköy");
const siteOk = { tarih: "2026-11-10", denenen: [{ url: "https://ornek.example", status: 200 }], olcum: { ad: true, sokak: true, mahalle: false, ilce: true, telefon: false }, alan: "ornek.example" };
ok("resmî site ad+sokak + tam adres + kaynaklı tür → A", gradeCandidate(good, siteOk).sinif === "A");
ok("kanıtsız aday → C (faaliyet kanıtı yok)", gradeCandidate(good).sinif === "C");
const noNo = toCandidate(el({ name: "Örnek Lokanta", cuisine: "turkish", "addr:street": "Moda Caddesi", check_date: "2025-06-01" }, 21), "Kadıköy");
ok("yerinde kontrol var ama kapı numarası yok → B, eksik yazılı", (() => { const g = gradeCandidate(noNo); return g.sinif === "B" && g.eksik.includes("kapı numarası"); })());
const noCuisine = toCandidate(el({ name: "Örnek Yer", "addr:street": "Moda Caddesi", "addr:housenumber": "3", check_date: "2026-01-01" }, 22), "Kadıköy");
ok("tam adres + yerinde kontrol ama mutfak yok → B", gradeCandidate(noCuisine).sinif === "B");
const base = { cuisineLabels: 1, nameConflict: false, ref: "node/1", isBusiness: false, polygonOk: true, osmNow: "var" as const, closure: null, googleChip: true, dup: null };
ok("Google eşleşmesi var ama kapı numarası yok → A DEĞİL (B)", gradeExisting({ ...base, address: "Moda Caddesi, Kadıköy" }).sinif === "B");
ok("tam adres + kaynaklı tür + eşleşme → A", gradeExisting({ ...base, address: "Moda Caddesi No:12, Kadıköy" }).sinif === "A");
ok("kalıcı kapalı → C", gradeExisting({ ...base, address: "Moda Caddesi No:12", closure: "closed_confirmed" }).sinif === "C");
ok("OSM kaydı silinmiş → C", gradeExisting({ ...base, address: "Moda Caddesi No:12", osmNow: "yok" }).sinif === "C");
ok("kapı numarası biçimleri", hasHouseNo("Moda Cd. No:12") && hasHouseNo("Bahariye No. 5") && !hasHouseNo("Moda Caddesi, Kadıköy"));

/* 4 · nüfus dosyaları: toplamlar resmî toplamla birebir */
const IL = JSON.parse(readFileSync("data/katalog/iller-tuik-2025.json", "utf8"));
ok("TÜİK 2025: 81 il, plakalar tekil", IL.iller.length === 81 && new Set(IL.iller.map((i: { plaka: number }) => i.plaka)).size === 81);
ok("TÜİK 2025: il toplamı = Türkiye 86.092.168", IL.iller.reduce((s: number, i: { nufus: number }) => s + i.nufus, 0) === IL.turkiyeToplam && IL.turkiyeToplam === 86092168);
ok("sıra nüfusa göre azalan; ilk 10 görevdeki sırayla aynı", IL.iller.every((i: { nufus: number }, k: number, a: { nufus: number }[]) => !k || a[k - 1].nufus >= i.nufus)
  && IL.iller.slice(0, 10).map((i: { id: string }) => i.id).join() === "istanbul,ankara,izmir,bursa,antalya,konya,adana,sanliurfa,gaziantep,kocaeli");
ok("kaynak, referans ve güncelleme tarihi yazılı", IL.kaynak && IL.referansTarihi === "2025-12-31" && IL.dosyaGuncelleme);
const IP = JSON.parse(readFileSync("data/katalog/istanbul-ilce-nufus-2025.json", "utf8")).ilceler as Record<string, number>;
ok("İstanbul 39 ilçe toplamı = il nüfusu 15.754.053", Object.keys(IP).length === 39 && Object.values(IP).reduce((s, n) => s + n, 0) === 15754053);
ok("ilçe adları sınır dosyasıyla aynı", IST.ilceler.every((d) => d.ad in IP));

/* 5 · İstanbul paket 6 */
const PD = "data/paket/istanbul-6";
if (existsSync(`${PD}/venues-dalga6.json`)) {
  const W = JSON.parse(readFileSync(`${PD}/venues-dalga6.json`, "utf8")) as RealVenueRecord[];
  const P = JSON.parse(readFileSync(`${PD}/paket.json`, "utf8"));
  ok(`paket 6: ${W.length} kayıt = paket satırı`, W.length === P.eklenen.length && W.length > 0);
  ok("her kayıt mevcut doğrulayıcıdan geçer (invalidRecord)", W.every((v) => invalidRecord(v) === null), W.find((v) => invalidRecord(v)));
  ok("her kayıt kendi ilçe sınırında", W.every((v) => districtOf(v.lat!, v.lng!, IST) === v.district));
  ok("her kayıtta kapı numaralı adres ve kaynaklı tür", W.every((v) => hasHouseNo(v.address) && v.kind !== "Restoran"));
  ok("kanıtta Google yok; güven güçlü; tarih yazılı", W.every((v) => v.confidence === "güçlü" && !!v.verifiedAt && !/google/i.test(v.verification ?? "")));
  ok("paket satırında OSM kaynak bağlantısı ve A sınıfı", P.eklenen.every((e: { kaynak: string[]; sinif: string }) => e.sinif === "A" && e.kaynak[0].startsWith("https://www.openstreetmap.org/")));
  ok("kaynaklarda Google bağlantısı yok", P.eklenen.every((e: { kaynak: string[] }) => e.kaynak.every((u) => !/google\.|goo\.gl/i.test(u))));
  const prior = all.filter((v) => (v.wave ?? 0) !== 6), cat = new Set(prior.map((v) => v.slug)), refs = new Set(prior.map((v) => v.ref));
  ok("yayındaki katalogla slug ve OSM kaydı çakışmıyor", W.every((v) => !cat.has(v.slug) && !refs.has(v.ref)));
  const r906 = existsSync(`${PD}/karsilastirma-906.json`) ? JSON.parse(readFileSync(`${PD}/karsilastirma-906.json`, "utf8")) : null;
  ok("906 ve seyrek paketleriyle çakışma 0 (karşılaştırma dosyası)", r906 && r906.slug === 0 && r906.ref === 0 && r906.yakinAyniAd === 0, r906);
  ok("slug ve OSM kaydı paket içinde tekil", new Set(W.map((v) => v.slug)).size === W.length && new Set(W.map((v) => v.ref)).size === W.length);
  const inCat = all.filter((v) => v.wave === 6);
  ok("katalogdaki dalga 6 = paket (eklendiyse birebir)", !inCat.length || (inCat.length === W.length && W.every((w) => inCat.some((c) => JSON.stringify(c) === JSON.stringify(w)))));
  ok("ilk 456 kayıt değişmedi (dalga 0–1)", all.filter((v) => (v.wave ?? 0) < 2 && !v.ref.startsWith("isletme/")).length === 456);
  ok("zincir/franchise etiketi yok", P.eklenen.every((e: { eksik: string[] }) => !e.eksik.some((x) => /zincir/.test(x))));
}
console.log(`\nkatalog: ${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);
