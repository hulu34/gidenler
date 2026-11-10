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
const W = JSON.parse(readFileSync(`${D}/kayitlar.json`, "utf8")) as RealVenueRecord[];
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
ok("venues.json'a eklenmemiş (bağımsız paket)", !W.some((w) => cat.some((c) => c.ref === w.ref)));
ok("hepsi restoran (cat.restaurant); kafe/bar yok", W.every((v) => v.categoryId === "cat.restaurant"));
ok("mevcut doğrulayıcıdan geçer", W.every((v) => invalidRecord(v) === null), W.find((v) => invalidRecord(v)));
ok("koordinat kendi ilçe sınırında", W.every((v) => districtOf(v.lat!, v.lng!, IST) === v.district), W.filter((v) => districtOf(v.lat!, v.lng!, IST) !== v.district).map((v) => v.slug));
if (B1) {
  ok("B1: hepsi kaliteSinifi B1, adresDuzeyi sokak, güven orta (A değil)", (W as B1Rec[]).every((v) => v.kaliteSinifi === "B1" && v.adresDuzeyi === "sokak" && v.confidence === "orta"));
  ok("B1: adreste sokak + mahalle + ilçe var, kapı numarası yok", W.every((v) => !hasHouseNo(v.address) && !!v.neighborhood && (v.address ?? "").split(",").length >= 3 && (v.address ?? "").endsWith(v.district)));
  ok("B1: kanıtta adres düzeyi ve sahip onayı yazılı", W.every((v) => /sokak( \+ mahalle)? düzeyi, kapı numarası yok .*sahip onayı 2026-11-11/.test(v.verification ?? "")));
  ok("B1: paket satırında sınıf B1", P.eklenen.every((e: { sinif: string }) => e.sinif === "B1"));
} else ok("kapı numaralı adres", W.every((v) => hasHouseNo(v.address)));
ok("kaynaklı tür (genel 'Restoran' yok)", W.every((v) => v.kind !== "Restoran" && v.kind !== "Kahveci" && v.kind !== "Bar"));
ok("kanıt tarihli, Google yok; güven A'da güçlü, B1'de orta", W.every((v) => v.confidence === (B1 ? "orta" : "güçlü") && !!v.verifiedAt && !/google/i.test(v.verification ?? "")));
ok("kanıt türü tanımlı (site / yerinde kontrol / anket uygulaması / şube sayfası / resmî işletmeci listesi)", W.every((v) => /resmî site|yerinde kontrol|yerinde anket|resmî şube sayfası|resmî işletmeci listesi/.test(v.verification ?? "")));
ok("her satırda ad, ilçe, adres, koordinat, tür, faaliyet, kaynak, kontrol tarihi, sınıf A", P.eklenen.every((e: Record<string, unknown>) => e.ad && e.ilce && e.adres && Array.isArray(e.koordinat) && e.tur && e.faaliyet && (e.kaynak as string[])[0].startsWith("https://www.openstreetmap.org/") && e.kontrolTarihi && (e.sinif === "A" || (B1 && e.sinif === "B1"))));
ok("kaynaklarda Google bağlantısı yok", P.eklenen.every((e: { kaynak: string[] }) => e.kaynak.every((u) => !/google\.|goo\.gl/i.test(u))));
ok("slug ve OSM kaydı paket içinde tekil", new Set(W.map((v) => v.slug)).size === W.length && new Set(W.map((v) => v.ref)).size === W.length);
ok("katalog + karşılaştırma paketleriyle slug/OSM çakışması yok", W.every((v) => !all.some((o) => o.slug === v.slug || o.ref === v.ref)));
ok("aynı ad 150 m içinde ikinci kayıt yok", W.every((v) => ![...all, ...W].some((o) => o !== v && typeof o.lat === "number" && fold(o.name) === fold(v.name) && meters(v as { lat: number; lng: number }, o as { lat: number; lng: number }) < 150)));
if (!B1) ok("aynı bina adresinde (60 m) ikinci kayıt yok", W.every((v) => ![...all, ...W].some((o) => o !== v && typeof o.lat === "number" && meters(v as { lat: number; lng: number }, o as { lat: number; lng: number }) < 60 && addressKey(undefined, undefined, o.address) === addressKey(undefined, undefined, v.address))));
const tel = (p?: string) => (p ?? "").replace(/\D/g, "").slice(-10);
ok("aynı telefonla ikinci kayıt yok", W.every((v) => tel(v.phone).length < 10 || ![...all, ...W].some((o) => o !== v && tel(o.phone) === tel(v.phone))));
const chains = P.eklenen.filter((e: { zincir: string | null }) => e.zincir);
ok(`zincir şubeleri (${chains.length}): her biri resmî şube sayfası kanıtlı ve slug'ında şube ayrımı`, chains.every((e: { kanit: string[]; slug: string; sube: string | null }) => e.kanit.some((k) => k.startsWith("resmî şube sayfası") || k.startsWith("resmî işletmeci listesi")) && !!e.sube && e.slug.includes(e.sube.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").split("-")[0])));
ok("ilk 456 kayıt değişmedi", (venues as RealVenueRecord[]).filter((v) => (v.wave ?? 0) < 2).length === 456);
console.log(`\nrestoran paketi ${D}: ${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);
