/* RESTORAN PAKETİ DENETİMİ (dalga 7+; kayıtlar data/paket/<klasör>/kayitlar.json, venues.json'a EKLENMEMİŞ).
   Çalıştır: PAKET=data/paket/istanbul-7 npx tsx scripts/restoranpakettest.ts */
import { readFileSync, existsSync } from "node:fs";
import { invalidRecord, type RealVenueRecord } from "../data/real/index";
import { districtOf, type SinirDosyasi } from "../lib/katalog/geo";
import { hasHouseNo } from "../lib/katalog/kalite";
import { fold, meters, addressKey } from "../lib/katalog/aday";
import venues from "../data/real/venues.json";
import isletme from "../data/real/isletme.json";

let pass = 0, fail = 0;
const ok = (n: string, c: unknown, i?: unknown) => { if (c) pass++; else { fail++; console.log("✗", n, i ?? ""); } };
const D = process.env.PAKET ?? "data/paket/istanbul-7";
/* zincir paketinde OSM'de olmayan şubeler işletme kaydıdır (isletme-kayitlari.json → isletme.json) */
const W = [...JSON.parse(readFileSync(`${D}/kayitlar.json`, "utf8")), ...(existsSync(`${D}/isletme-kayitlari.json`) ? JSON.parse(readFileSync(`${D}/isletme-kayitlari.json`, "utf8")) : [])] as RealVenueRecord[];
const P = JSON.parse(readFileSync(`${D}/paket.json`, "utf8"));
const O = JSON.parse(readFileSync(`${D}/ozet.json`, "utf8"));
const IST = JSON.parse(readFileSync("data/katalog/istanbul-ilceler.json", "utf8")) as SinirDosyasi;
const cat = [...(venues as RealVenueRecord[]), ...(isletme as RealVenueRecord[])];
const others = (process.env.KARSILASTIR ?? "").split(",").filter((p) => p && existsSync(p)).flatMap((p) => JSON.parse(readFileSync(p, "utf8")) as RealVenueRecord[]);
const all = [...cat, ...others];
/* B1 paketi: adres sokak (+ mahalle) düzeyinde, kapı numarası yok — sahip onayı 2026-11-11; A gibi gösterilmez */
const B1 = process.env.ADRES_DUZEYI === "sokak";
type B1Rec = RealVenueRecord & { kaliteSinifi?: string; adresDuzeyi?: string };

ok(`${D}: ${W.length} kayıt = paket satırı = özet`, W.length > 0 && W.length === P.eklenen.length && W.length === (O.A ?? O.kayit));
ok("venues.json / isletme.json'a eklenmemiş (bağımsız paket)", !W.some((w) => cat.some((c) => c.ref === w.ref)));
/* KONUMSUZ İŞLETME KAYDI (paket 15+): koordinatı doğrulanamayan, kimliği/adresi/türü doğrulanmış restoran; sınıf "A-konumsuz", A DEĞİLDİR */
type KRec = RealVenueRecord & { kaliteSinifi?: string; kalite?: { koordinat?: string } };
const KZ = (W as KRec[]).filter((v) => v.kaliteSinifi === "A-konumsuz");
const geoW = W.filter((v) => !KZ.includes(v as KRec));
const BIZ = geoW.filter((v) => v.ref.startsWith("isletme/"));
if (BIZ.length) {
  ok(`işletme kayıtları (${BIZ.length}): resmî site/şube sayfası kaynaklı, konum yalnız OSM adres/bina noktası`, BIZ.every((v) => v.sourceKind === "official_site" && /^https:\/\//.test(v.sourceUrl ?? "") && v.location?.provider === "osm" && /^(node|way|relation)\/\d+$/.test(v.location.ref) && v.ref === `isletme/${v.slug}`));
  /* zincir şubesi (resmî şube listesi) slug'ında şube ayrımı zorunlu; tek konumlu işletmede ad-ilçe yeterli */
  ok("işletme kayıtlarında kapı numaralı adres; zincir şubesinde şube ayrımlı slug", BIZ.every((v) => hasHouseNo(v.address) && v.slug.split("-").length >= (/resmî şube listesi/.test(v.verification ?? "") ? 3 : 2)));
}
ok("hepsi restoran (cat.restaurant); kafe/bar yok", W.every((v) => v.categoryId === "cat.restaurant"));
ok("mevcut doğrulayıcıdan geçer", W.every((v) => invalidRecord(v) === null), W.find((v) => invalidRecord(v)));
if (KZ.length) {
  ok(`konumsuz kayıtlar (${KZ.length}): işletme kaydı, resmî site kaynaklı, lat/lng ve location YOK`, KZ.every((v) => v.ref === `isletme/${v.slug}` && v.sourceKind === "official_site" && /^https:\/\//.test(v.sourceUrl ?? "") && v.lat === undefined && v.lng === undefined && v.location === undefined && v.kalite?.koordinat === "yok"));
  ok("konumsuz kayıtlar: ilçe geçerli İstanbul ilçesi, kapı numaralı adres ilçeyle biter", KZ.every((v) => IST.ilceler.some((d) => d.ad === v.district) && hasHouseNo(v.address) && (v.address ?? "").endsWith(v.district)));
  ok("konumsuz kayıtlar: kanıtta koordinatın neden yazılmadığı açık", KZ.every((v) => /koordinat yazılmadı/.test(v.verification ?? "")));
  ok("konumsuz kayıtlar: paket satırında sınıf A-konumsuz, koordinat null (A gibi gösterilmez)", P.eklenen.filter((e: { sinif: string }) => e.sinif === "A-konumsuz").length === KZ.length && P.eklenen.every((e: { sinif: string; koordinat: unknown }) => e.sinif !== "A-konumsuz" || e.koordinat === null));
  ok("konumsuz kayıtlar: aynı ilçede aynı adlı ikinci kayıt yok", KZ.every((v) => ![...all, ...W].some((o) => o !== v && fold(o.name) === fold(v.name) && o.district === v.district)));
}
ok("koordinat kendi ilçe sınırında", geoW.every((v) => districtOf(v.lat!, v.lng!, IST) === v.district), geoW.filter((v) => districtOf(v.lat!, v.lng!, IST) !== v.district).map((v) => v.slug));
if (B1) {
  ok("B1: hepsi kaliteSinifi B1, adresDuzeyi sokak, güven orta (A değil)", (W as B1Rec[]).every((v) => v.kaliteSinifi === "B1" && v.adresDuzeyi === "sokak" && v.confidence === "orta"));
  ok("B1: adreste sokak + mahalle + ilçe var, kapı numarası yok", W.every((v) => !hasHouseNo(v.address) && !!v.neighborhood && (v.address ?? "").split(",").length >= 3 && (v.address ?? "").endsWith(v.district)));
  ok("B1: kanıtta adres düzeyi ve sahip onayı yazılı", W.every((v) => /sokak( \+ mahalle)? düzeyi, kapı numarası yok .*sahip onayı 2026-11-11/.test(v.verification ?? "")));
  ok("B1: paket satırında sınıf B1", P.eklenen.every((e: { sinif: string }) => e.sinif === "B1"));
} else ok("kapı numaralı adres", W.every((v) => hasHouseNo(v.address)));
ok("kaynaklı tür (genel 'Restoran' yok)", W.every((v) => v.kind !== "Restoran" && v.kind !== "Kahveci" && v.kind !== "Bar"));
ok("kanıt tarihli, Google yok; güven A'da güçlü, B1'de orta", W.every((v) => v.confidence === (B1 ? "orta" : "güçlü") && !!v.verifiedAt && !/google/i.test(v.verification ?? "")));
ok("kanıt türü tanımlı (site / yerinde kontrol / anket uygulaması / şube sayfası / resmî işletmeci listesi / Michelin Rehberi)", W.every((v) => /resmî site|yerinde kontrol|yerinde anket|resmî şube sayfası|resmî şube listesi|resmî işletmeci listesi|Michelin Rehberi 2026/.test(v.verification ?? "")));
ok("her satırda ad, ilçe, adres, koordinat, tür, faaliyet, kaynak, kontrol tarihi, sınıf A", P.eklenen.every((e: Record<string, unknown>) => e.ad && e.ilce && e.adres && (Array.isArray(e.koordinat) || (e.sinif === "A-konumsuz" && e.koordinat === null)) && e.tur && e.faaliyet && ((e.kaynak as string[]).some((u) => u.startsWith("https://www.openstreetmap.org/")) || e.sinif === "A-konumsuz") && e.kontrolTarihi && (e.sinif === "A" || e.sinif === "A-konumsuz" || (B1 && e.sinif === "B1"))));
ok("kaynaklarda Google bağlantısı yok", P.eklenen.every((e: { kaynak: string[] }) => e.kaynak.every((u) => !/google\.|goo\.gl/i.test(u))));
ok("slug ve OSM kaydı paket içinde tekil", new Set(W.map((v) => v.slug)).size === W.length && new Set(W.map((v) => v.ref)).size === W.length);
ok("katalog + karşılaştırma paketleriyle slug/OSM çakışması yok", W.every((v) => !all.some((o) => o.slug === v.slug || o.ref === v.ref)));
ok("aynı ad 150 m içinde ikinci kayıt yok", W.every((v) => ![...all, ...W].some((o) => o !== v && typeof o.lat === "number" && fold(o.name) === fold(v.name) && meters(v as { lat: number; lng: number }, o as { lat: number; lng: number }) < 150)));
/* AVM / yemek katı: iki FARKLI markanın kendi resmî şube listesinden gelen şubeleri aynı binada olabilir; aynı marka aynı binada olamaz */
const tel = (p?: string) => (p ?? "").replace(/\D/g, "").slice(-10);
const listed = (x: RealVenueRecord) => /resmî şube listesi/.test(x.verification ?? "");
/* aynı otel/kompleks: iki FARKLI restoranın ikisi de MICHELIN Rehberi 2026 seçkisinde ayrı kayıtsa (ör. Divan İstanbul'da Lokanta by Divan + Maromi) ayrı mekândır */
const MICH = new Set((JSON.parse(readFileSync("data/katalog/michelin-istanbul-2026.json", "utf8")).restoranlar as { ad: string }[]).map((r) => fold(r.ad)));
const michelinPair = (v: RealVenueRecord, o: RealVenueRecord) => MICH.has(fold(v.name)) && MICH.has(fold(o.name)) && fold(v.name) !== fold(o.name);
/* aynı otel/kompleks içinde ayrı restoranlar (ör. Wyndham Grand Kalamış: Perran Ocakbaşı + Ouzo Roof): ad, telefon ve resmî site alanı ÜÇÜ de farklıysa ayrı mekândır */
const host = (u?: string) => { try { return new URL(u!).host.replace(/^www\./, ""); } catch { return null; } };
const separateBiz = (v: RealVenueRecord, o: RealVenueRecord) => fold(v.name).split(" ")[0] !== fold(o.name).split(" ")[0] && !!v.phone && !!o.phone && tel(v.phone) !== tel(o.phone) && !!host(v.website) && !!host(o.website) && host(v.website) !== host(o.website);
const mallOk = (v: RealVenueRecord, o: RealVenueRecord) => (listed(v) && listed(o) && fold(v.name).split(" ")[0] !== fold(o.name).split(" ")[0]) || michelinPair(v, o) || separateBiz(v, o);
if (!B1) ok("aynı bina adresinde (60 m) ikinci kayıt yok (farklı markaların resmî listeli AVM şubeleri hariç)", W.every((v) => ![...all, ...W].some((o) => o !== v && typeof o.lat === "number" && meters(v as { lat: number; lng: number }, o as { lat: number; lng: number }) < 60 && addressKey(undefined, undefined, o.address) === addressKey(undefined, undefined, v.address) && !mallOk(v, o))));
ok("aynı telefonla ikinci kayıt yok", W.every((v) => tel(v.phone).length < 10 || ![...all, ...W].some((o) => o !== v && tel(o.phone) === tel(v.phone))));
const chains = P.eklenen.filter((e: { zincir: string | null }) => e.zincir);
ok(`zincir şubeleri (${chains.length}): her biri resmî şube sayfası kanıtlı ve slug'ında şube ayrımı`, chains.every((e: { kanit: string[]; slug: string; sube: string | null }) => e.kanit.some((k) => k.startsWith("resmî şube sayfası") || k.startsWith("resmî şube listesi") || k.startsWith("resmî işletmeci listesi")) && !!e.sube && e.slug.includes(e.sube.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").split("-")[0])));
/* MICHELIN ayrımı yalnız rehber dosyasından; yıldızsız restoran yıldızlı gösterilmez */
const MR = new Map((JSON.parse(readFileSync("data/katalog/michelin-istanbul-2026.json", "utf8")).restoranlar as { michelinUrl: string; ayrim: string; yesilYildiz?: boolean }[]).map((r) => [r.michelinUrl, r]));
type MRec = RealVenueRecord & { michelin?: { ayrim: string; url: string; yesilYildiz?: boolean; yil: number } };
const MW = (W as MRec[]).filter((v) => v.michelin);
if (MW.length) {
  ok(`Michelin kayıtları (${MW.length}): ayrım ve Yeşil Yıldız rehber dosyasıyla birebir`, MW.every((v) => { const r = MR.get(v.michelin!.url); return !!r && r.ayrim === v.michelin!.ayrim && !!r.yesilYildiz === !!v.michelin!.yesilYildiz && v.michelin!.yil === 2026; }));
  ok("yıldız ifadesi yalnız yıldızlı restoranın kanıtında", MW.every((v) => /Yıldız/.test((v.verification ?? "").split("·")[0]) === ["iki_yildiz", "bir_yildiz"].includes(v.michelin!.ayrim) || !!v.michelin!.yesilYildiz));
}
/* OVERTURE kaynaklı kayıtlar (paket 16+): kayıt düzeyinde kaynak, lisans ve atıf korunur; Overture koordinatı kayda yazılmaz */
type ORec = RealVenueRecord & { overture?: { gersId: string; release: string; lisans: string[]; kaynaklar: string[]; guven: number }; kaliteSinifi?: string };
const OW = (W as ORec[]).filter((v) => v.overture);
if (OW.length) {
  ok(`Overture kayıtları (${OW.length}): GERS kimliği, sürüm, kaynak ve lisans var`, OW.every((v) => /^[0-9a-f-]{20,}$/i.test(v.overture!.gersId) && !!v.overture!.release && v.overture!.lisans.length > 0 && v.overture!.lisans.every((l) => ["CDLA-Permissive-2.0", "Apache-2.0", "CC0-1.0"].includes(l)) && v.overture!.kaynaklar.length > 0));
  ok("Overture kimliği paket içinde tekil", new Set(OW.map((v) => v.overture!.gersId)).size === OW.length);
  ok("Overture güveni tek başına kanıt değil: her kayıtta resmî site ölçümü var", OW.every((v) => /resmî (site|şube sayfası) [^ ]+: ad \+ (telefon|sokak)/.test(v.verification ?? "")));
  ok("koordinat yalnız OSM kaydından (Overture noktası kayda yazılmadı)", OW.every((v) => (v.kaliteSinifi === "A" && /^(node|way|relation)\/\d+$/.test(v.ref) && typeof v.lat === "number") || (v.kaliteSinifi === "A-konumsuz" && v.lat === undefined && v.location === undefined)));
  ok("paket açıklamasında Overture ve OSM atfı var", /Overture Maps Foundation/.test(P._aciklama ?? "") && /OpenStreetMap/.test(P._aciklama ?? ""));
}
ok("ilk 456 kayıt değişmedi", (venues as RealVenueRecord[]).filter((v) => (v.wave ?? 0) < 2).length === 456);
console.log(`\nrestoran paketi ${D}: ${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);
