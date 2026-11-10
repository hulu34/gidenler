/* ÇOK ŞEHİR + ÇOK KATEGORİ PROTOTİPİ denetimi. İki kipte çalıştırılır:
     npx tsx scripts/sehirtest.ts                         (Production gibi: pilot kapalı)
     NEXT_PUBLIC_SEHIR_PILOT=1 npx tsx scripts/sehirtest.ts (pilot Preview gibi) */
import { realEntities, activeEntities, realVenueRecords, invalidRecord, type RealVenueRecord } from "../data/real/index";
import { pilotAcik, sehirOf, gorunur, SEHIRLER } from "../lib/sehir";
import { genislemeSirasi } from "../lib/katalog/sehirSirasi";
import { searchV3 } from "../lib/search";
import { fromRealVenue, kategoriPuani, DEGERLENDIRME, KATEGORI_AGACI } from "../lib/kategori/sema";
import { venueDescription } from "../lib/seo";
import raw from "../data/real/venues.json";
import ankara from "../data/sehir-pilot/ankara/venues-dalga7.json";

let pass = 0, fail = 0;
const ok = (n: string, c: unknown, i?: unknown) => { if (c) pass++; else { fail++; console.log("✗", n, i ?? ""); } };
const PILOT = process.env.NEXT_PUBLIC_SEHIR_PILOT === "1";
const ist = realEntities.filter((e) => e.location?.city === "İstanbul");
const ank = realEntities.filter((e) => e.location?.city === "Ankara");

/* ortak: Production koruması */
ok("Production ortamında pilot bayrak olsa da kapalı", !pilotAcik({ NEXT_PUBLIC_SEHIR_PILOT: "1", VERCEL_ENV: "production" }) && !pilotAcik({ NEXT_PUBLIC_SEHIR_PILOT: "1", NEXT_PUBLIC_VERCEL_ENV: "production" }));
ok("bayrak yoksa kapalı; Preview + bayrak açık", !pilotAcik({}) && pilotAcik({ NEXT_PUBLIC_SEHIR_PILOT: "1", VERCEL_ENV: "preview" }));
ok("İstanbul yayında, Ankara pilot", sehirOf("istanbul")?.durum === "yayinda" && sehirOf("ankara")?.durum === "pilot" && sehirOf(undefined)?.id === "istanbul");
ok(`İstanbul kayıtları değişmedi (${ist.length} = venues.json + işletme)`, ist.length === (raw as unknown[]).length + 1);
ok("mevcut kayıtlarda city alanı yok (kimlik ve slug değişmez)", (raw as RealVenueRecord[]).every((r) => r.city === undefined));
ok("öneri havuzunda (ana sayfa, Keşfet) yalnız İstanbul", activeEntities.every((e) => e.location?.city === "İstanbul"));
ok("Kadıköy kebap → yalnız İstanbul", searchV3("Kadıköy kebap", { limit: 30 }).exact.every((h) => h.card.entity.location?.city === "İstanbul"));
const sira = genislemeSirasi();
ok("genişleme sırası nüfustan hesaplanır: 81 il, ilk 10 görevdeki gibi", sira.length === 81 && sira.slice(0, 10).map((s) => s.ad).join() === "İstanbul,Ankara,İzmir,Bursa,Antalya,Konya,Adana,Şanlıurfa,Gaziantep,Kocaeli");
ok("şehir durumları sıraya yansır", sira[0].durum === "yayinda" && sira[1].durum === "pilot" && sira[2].durum === "plan");

/* pilot verisi (kip bağımsız) */
const A = ankara as RealVenueRecord[];
ok(`Ankara pilot: ${A.length} kayıt, hepsi city=ankara, slug '-ankara' ile biter`, A.length > 0 && A.every((r) => r.city === "ankara" && r.slug.endsWith("-ankara")));
ok("Ankara kayıtları doğrulayıcıdan geçer (il sınır kutusu)", A.every((r) => invalidRecord(r) === null), A.find((r) => invalidRecord(r)));
ok("city'si düşürülen Ankara kaydı İstanbul sayılmaz → geçersiz konum", invalidRecord({ ...A[0], city: undefined }) === "location");
ok("bilinmeyen il → geçersiz", invalidRecord({ ...A[0], city: "atlantis" }) === "location");
ok("Ankara kayıtlarının hepsi A sınıfı kanıtlı, Google yok", A.every((r) => r.confidence === "güçlü" && !/google/i.test(r.verification ?? "")));
const istSlugs = new Set(realVenueRecords.filter((r) => !r.city).map((r) => r.slug));
ok("Ankara slug'ları İstanbul slug'larıyla çakışmaz", A.every((r) => !istSlugs.has(r.slug)));
/* aynı ad iki şehirde: kimlik ayrı */
const twin: RealVenueRecord = { ...A[0], ref: "node/1", slug: "", city: undefined, district: "Kadıköy", lat: 40.99, lng: 29.03 };
const slugOf = (r: RealVenueRecord) => r.city && r.city !== "istanbul" ? `x-${r.district}-${r.city}` : `x-${r.district}`;
ok("aynı ad iki şehirde → iki ayrı slug", slugOf(twin) !== slugOf(A[0]));

if (!PILOT) {
  ok("pilot kapalı: Ankara mekânı yüklenmez", ank.length === 0 && !pilotAcik());
  ok("pilot kapalı: şehir sayfası yalnız İstanbul", SEHIRLER.filter((s) => gorunur(s)).map((s) => s.id).join() === "istanbul");
  ok("pilot kapalı: 'ankara' aramasında Ankara mekânı yok", searchV3("ankara kafe", { limit: 30 }).exact.every((h) => h.card.entity.location?.city !== "Ankara"));
} else {
  ok(`pilot açık: ${ank.length} Ankara mekânı yüklendi`, ank.length === A.length);
  ok("pilot açık: şehir sayfaları istanbul + ankara", SEHIRLER.filter((s) => gorunur(s)).map((s) => s.id).join() === "istanbul,ankara");
  const r = searchV3("Çankaya kafe", { limit: 30 }).exact;
  ok("'Çankaya kafe' → Ankara/Çankaya", r.length > 0 && r.every((h) => h.card.entity.location?.district === "Çankaya"), r.slice(0, 3).map((h) => h.card.entity.slug));
  const c = searchV3("ankara", { limit: 60 }).exact;
  ok("'ankara' (yalnız şehir) → Ankara mekânları", c.length > 0 && c.every((h) => h.card.entity.location?.city === "Ankara"));
  const one = ank[0]; const n = searchV3(one.name, { limit: 10 }).exact.slice(0, 5).some((h) => h.card.entity.slug === one.slug);
  ok(`pilot mekân kendi adıyla bulunur (${one.name})`, n);
  ok("açıklama ve yapılandırılmış veride il Ankara", venueDescription(one, null, false).includes("Ankara)"));
  ok("İstanbul kartları hâlâ İstanbul", searchV3("Moda kahve", { limit: 20 }).exact.every((h) => h.card.entity.location?.city === "İstanbul"));
}

/* çok kategori şeması */
const r0 = (raw as RealVenueRecord[])[0];
const m = fromRealVenue(r0);
ok("restoran kaydı ortak şemaya kayıpsız eşlenir (ham kayıt aynen)", m.ham === r0 && m.id === r0.slug && m.konum.ilce === r0.district && m.ek.tip === "restoran");
ok("bugün yalnız gastronomi yayında; diğerleri taslak", KATEGORI_AGACI.gastronomi.durum === "yayinda" && ["konaklama", "kisisel-bakim", "spor"].every((k) => KATEGORI_AGACI[k as keyof typeof KATEGORI_AGACI].durum === "taslak"));
ok("her kategorinin ölçüt ağırlığı 1", Object.values(DEGERLENDIRME).every((d) => Math.abs(d.olcutler.reduce((s, o) => s + o.agirlik, 0) - 1) < 1e-9));
let threw = false; try { kategoriPuani("otel", { yemek: 9 }); } catch { threw = true; }
ok("restoran ölçütü otel puanına aktarılamaz (hata)", threw);
ok("otel puanı kendi ölçütleriyle", kategoriPuani("otel", { oda: 8, temizlik: 9, hizmet: 7, konum: 10, fiyat: 6 }) === 8.1);
console.log(`\nşehir/kategori (${PILOT ? "pilot açık" : "pilot kapalı"}): ${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);
