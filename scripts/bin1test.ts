/* 1.000 MEKÂN · DALGA 2 testleri (ağsız): yeni mekânlar aranabilir, Sor'da doğru semt/tür, kapalı/mükerrer yok, sitemap. */
import raw from "../data/real/venues.json";
import { realEntities } from "../data/real";
import { CLOSED_CONFIRMED } from "../lib/closure";
import { searchV3 } from "../lib/search";
import { VENUES, parseQuery, answer } from "../lib/sor/engine";
import { inVenueSitemap } from "../lib/seo";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, info?: unknown) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}`, info ?? ""); } };
type R = { slug: string; ref: string; name: string; district: string; kind: string; address?: string; phone?: string; wave?: number; verifiedAt?: string; confidence?: string; verification?: string };
const all = raw as R[]; const w2 = all.filter((v) => (v.wave ?? 0) >= 2);
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();

ok("ilk 456 kayıt korunur (dalga 0–1)", all.filter((v) => (v.wave ?? 0) < 2).length === 456);
if (!w2.length) { console.log("  · yeni dalga yok (456 sürüm) — dalga testleri atlandı"); console.log(`\ndalga 2: ${pass} geçti, ${fail} kaldı`); process.exit(fail ? 1 : 0); }
/* dalga 2–4: Google sayfasında güçlü doğrulama; dalga 5+ (seyrek ilçe, İstanbul paket 6): Google'sız — resmî site / OSM yerinde kontrol */
ok(`dalga 2+: ${w2.length} yeni mekân, hepsi doğrulama kaydıyla (tarih, güven, kanıt)`, w2.length > 0 && w2.every((v) => v.verifiedAt && ((v.wave ?? 0) >= 5
  ? (v.confidence === "güçlü" || v.confidence === "orta") && /web sitesi|resmî site|yerinde kontrol|yerinde anket|resmî şube sayfası|resmî şube listesi|resmî işletmeci listesi|Sipariş platform/i.test(v.verification ?? "") && !/Google/i.test(v.verification ?? "")
  : v.confidence === "güçlü" && /Google sayfası/.test(v.verification ?? ""))));
ok("tekrarlı slug / OSM kaydı yok", new Set(all.map((v) => v.slug)).size === all.length && new Set(all.map((v) => v.ref)).size === all.length);
ok("yeni mekânların hepsinde açık adres (Google'dan kopyalanmadı, OSM)", w2.every((v) => !!v.address && /^(node|way|relation)\//.test(v.ref)));
const near = (a: R & { lat?: number; lng?: number }, b: R & { lat?: number; lng?: number }) => { const r = Math.PI / 180; const x = Math.sin(((b.lat! - a.lat!) * r) / 2) ** 2 + Math.cos(a.lat! * r) * Math.cos(b.lat! * r) * Math.sin(((b.lng! - a.lng!) * r) / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(x)); };
/* aynı ad: 150 m içinde ya da aynı ilçede 1 km içinde → mükerrer. Daha uzaktaki aynı adlı kayıt ayrı şubedir (zincir şubesi resmî listeyle doğrulanır; paket 7+) */
const dupNear = w2.filter((v) => all.some((e) => e !== v && fold(e.name) === fold(v.name) && (near(e, v) <= 150 || (e.district === v.district && near(e, v) <= 1000))));
ok("aynı ad aynı semtte ya da 150 m içinde iki kayıt yok (mükerrer)", dupNear.length === 0, dupNear.map((v) => v.slug));
const tel = (p?: string) => (p ?? "").replace(/\D/g, "").slice(-10);
const dupTel = w2.filter((v) => tel(v.phone).length === 10 && all.some((e) => e !== v && tel(e.phone) === tel(v.phone)));
ok("aynı telefonla iki kayıt yok", dupTel.length === 0, dupTel.map((v) => v.slug));
ok("yeni mekânların hiçbiri kesin kapalı listesinde değil", !w2.some((v) => CLOSED_CONFIRMED.has(v.slug)));
ok("otel/kurum yemekhanesi adı yok", !w2.some((v) => /\b(hotel|otel|hostel|pansiyon|yemekhane|kantin|sosyal tesis)\b/i.test(v.name)));
/* arama */
/* çok şubeli marka (adı 5'ten fazla kayıtta): kendi adıyla aranınca bütün şubeler ilk 20'de olmalı; tek şubelide ilk 5 */
const sameName = (v: R) => all.filter((e) => fold(e.name) === fold(v.name)).length;
const found = w2.filter((v) => searchV3(v.name, { limit: 30 }).exact.slice(0, sameName(v) > 5 ? 20 : 5).some((h) => h.card.entity.slug === v.slug));
ok(`her yeni mekân kendi adıyla ilk 5'te (${found.length}/${w2.length})`, found.length === w2.length, w2.filter((v) => !found.includes(v)).map((v) => v.name).slice(0, 8));
const brands = Object.values(all.reduce<Record<string, R[]>>((m, v) => ((m[fold(v.name)] ??= []).push(v), m), {})).filter((xs) => xs.length > 1 && xs.some((x) => x.wave === 2));
const brandOk = brands.filter((xs) => { const r = searchV3(xs[0].name, { limit: 20 }).exact.map((h) => h.card.entity.slug); return xs.every((x) => r.includes(x.slug)); });
ok(`çok şubeli markalar: aramada bütün şubeler (${brandOk.length}/${brands.length})`, brandOk.length === brands.length);
const sample = w2.slice(0, 60);
const asciiOk = sample.filter((v) => searchV3(fold(v.name), { limit: 10 }).exact.slice(0, 5).some((h) => h.card.entity.slug === v.slug));
ok(`ASCII yazımla bulunur (${asciiOk.length}/${sample.length})`, asciiOk.length >= Math.ceil(sample.length * 0.95));
/* Sor Gidenler */
const inSor = w2.filter((v) => VENUES.some((x) => x.slug === v.slug));
ok(`Sor dizininde yeni mekânlar (${inSor.length}/${w2.length})`, inSor.length === w2.length);
ok("Sor dizininde kesin kapalı yok", !VENUES.some((x) => CLOSED_CONFIRMED.has(x.slug)));
const kebapK = answer(parseQuery("Kadıköy'de kebap")).items ?? [];
ok("Sor: 'Kadıköy'de kebap' önerileri Kadıköy'de", kebapK.length > 0 && kebapK.every((x: { district: string }) => x.district === "Kadıköy"), kebapK.map((x: { name: string; district: string }) => `${x.name}/${x.district}`));
const pick = w2.find((v) => v.kind === "Pideci" && v.district === "Bağcılar") ?? w2.find((v) => v.kind === "Pideci");
if (pick) { const a = answer(parseQuery(`${pick.district}'da pide`)).items ?? []; ok(`Sor: yeni pideciler semt + türle bulunabilir (${pick.district})`, a.some((x: { slug: string; district: string }) => x.district === pick.district)); }
/* çok şubeli ad tek mekâna bağlanmaz (motorun belirsizlik kuralı); genel sözcüklü adlar da ad sayılmaz — mevcut kayıtlarda oran ~%85 */
const multi = new Set(brands.flat().map((v) => v.slug));
const single = w2.filter((v) => !multi.has(v.slug));
const named = single.filter((v) => parseQuery(v.name).name === v.slug).length;
ok(`Sor: tek şubeli yeni mekân adıyla tanınır (${named}/${single.length}, %${Math.round((100 * named) / single.length)})`, named / single.length >= 0.7);
/* sitemap ve profil */
const ents = new Map(realEntities.map((e) => [e.slug, e]));
ok("yeni mekânlar sitemap kuralına uyar (adresli → sitemapte)", w2.every((v) => inVenueSitemap(ents.get(v.slug)!)));
ok("yeni mekânların profil kimliği var (profil sayfası oluşur)", w2.every((v) => ents.has(v.slug)));

console.log(`\ndalga 2: ${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);
