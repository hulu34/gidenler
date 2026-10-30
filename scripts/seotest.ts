/* ARAMA MOTORU KURALLARI — saf testler (veritabanı ve ağ gerektirmez).
   npx tsx scripts/seotest.ts */
import { realEntities } from "../data/real";
import { articles, ALL_ARTICLES } from "../lib/seckisi";
import { inVenueSitemap, openingHoursSpec, venueDescription, venueJsonLd } from "../lib/seo";
import type { Entity } from "../lib/types";
import noAddressOk from "../data/real/sitemap-adressiz.json";
import duzeltmeler from "../data/real/duzeltmeler.json";
import rawVenues from "../data/real/venues.json";
import izinli from "../data/real/izinli-fotograflar.json";
import { coverOf } from "../lib/media/cover";
import { existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, info = "") => { cond ? pass++ : fail++; console.log(`${cond ? "✓" : "✗"} ${name}${info ? " · " + info : ""}`); };
const base = realEntities.find((e) => e.address && e.contact?.phone && e.contact?.openingHours)!;
const bare: Entity = { ...base, address: undefined, hours: undefined, contact: {} };

/* açıklama: var olmayan bilgi söylenmez */
ok("adres yoksa adres denmez", !venueDescription(bare, null, false).includes("adres"));
ok("saat yoksa saat denmez", !venueDescription(bare, null, false).includes("saat"));
ok("iletişim yoksa iletişim denmez", !venueDescription(bare, null, false).includes("iletişim"));
ok("hiç alan yoksa açıklama yine anlamlı", venueDescription(bare, null, false).startsWith(`${bare.name} (`));
ok("alan varsa söylenir", /adres, iletişim ve çalışma saatleri bilgisi/.test(venueDescription(base, null, false)));
ok("menü varsa söylenir", venueDescription(base, null, true).includes("menü, adres"));
ok("puan yoksa bekleniyor", venueDescription(base, null, false).endsWith("bekleniyor."));
ok("puan varsa gerçek değer", venueDescription(base, { score: 8.84, reviewCount: 5 }, false).includes("/10 (5 deneyim)"));
const lies = realEntities.filter((e) => { const d = venueDescription(e, null, false);
  return (!e.address && d.includes("adres")) || (!e.contact?.openingHours && !e.hours && d.includes("saat")) || (!e.contact?.phone && !e.contact?.website && d.includes("iletişim")); });
ok("hiçbir mekânda eksik alan vaat edilmez", lies.length === 0, `${realEntities.length} mekân`);

/* saatler: emin olunmayan biçim çevrilmez */
ok("basit biçim", openingHoursSpec("Mo-Su 07:00-23:00")?.[0].dayOfWeek.length === 7);
ok("iki kural", openingHoursSpec("Mo-Sa 09:00-18:00; Su 10:00-14:00")?.length === 2);
ok("gece yarısını geçen", openingHoursSpec("Mo-Su 11:00-02:00")?.[0].closes === "02:00");
ok("hafta başını geçen aralık", openingHoursSpec("We-Mo 10:00-20:00")?.[0].dayOfWeek.length === 6);
for (const x of ["08:00-23:00", "24/7", "Salı-Pazar 10:00-20:00", "Tu-Su 10:00-20:00; PH closed", "07.00", "Mo-Su 11:00-24:00", null, ""])
  ok(`çevrilmez: ${x}`, openingHoursSpec(x) === null);

/* işaretleme */
const ld = venueJsonLd(base, null, false) as Record<string, unknown>;
ok("adres ve ad zorunlu", !!ld.name && !!ld.address);
ok("adressiz kayıtta işaretleme yok", venueJsonLd({ ...base, address: undefined }, null, false) === null);
ok("demo kayıtta işaretleme yok", venueJsonLd({ ...base, isDemo: true }, null, false) === null);
ok("puan yoksa aggregateRating yok", !("aggregateRating" in ld));
const scored = venueJsonLd(base, { score: 8.8, reviewCount: 5 }, false) as { aggregateRating?: { ratingValue: number; bestRating: number } };
ok("puan varsa gerçek değer, ölçek 10", scored.aggregateRating?.ratingValue === 8.8 && scored.aggregateRating?.bestRating === 10);
ok("sahiplik ilişkisinde aggregateRating yok", !("aggregateRating" in (venueJsonLd(base, { score: 8.8, reviewCount: 5 }, true) as object)));
ok("Google alanı yok", !/google/i.test(JSON.stringify(ld)));

/* tür düzeltmesi: yalnız listedeki kayıt değişir */
const fixed = Object.keys(duzeltmeler);
const kindChanged = (rawVenues as { slug: string; kind: string }[]).filter((r) => realEntities.find((e) => e.slug === r.slug)?.subcategory !== r.kind).map((r) => r.slug);
ok("tür yalnız düzeltme listesindekilerde değişir", kindChanged.join() === fixed.join(), kindChanged.join());
ok("Seyirtepe Restoran, kategori aynı", realEntities.find((e) => e.slug === fixed[0])?.subcategory === "Restoran" && realEntities.find((e) => e.slug === fixed[0])?.categoryId === "cat.restaurant");
ok("457 kayıt korunur", realEntities.length === 457);

/* kapak kararı */
const hasCover = realEntities.filter((e) => coverOf(e));
ok("kapağı olanlar yalnız hak kaydı olan beş mekân", hasCover.map((e) => e.slug).sort().join() === "beyti-lokanta-bakirkoy,ismet-baba-uskudar,japon-erdal-beyoglu,savoy-beyoglu,viktor-levi-sarap-evi-kadikoy", hasCover.map((e) => e.slug).join());
ok("Japon Erdal kapağı işletme izni, 3 fotoğraf", coverOf(realEntities.find((e) => e.slug === "japon-erdal-beyoglu")!)?.source === "isletme" && realEntities.find((e) => e.slug === "japon-erdal-beyoglu")!.photos?.length === 3);
ok("kayıttaki her görselin hak kaydı var ve kendi sunucumuzda", Object.values(izinli).flat().every((p) => (p.addedBy === "commons" ? /CC BY/.test(p.rightsRef) && !!p.license : /restoran profili/i.test(p.rightsRef)) && p.src.startsWith("/") && existsSync(new URL(`../public${p.src}`, import.meta.url))));
ok("Google görseli kapağa giremez", !realEntities.some((e) => e.photos?.some((p) => /googleusercontent|googleapis/.test(p.src))));
ok("demo kayıtta kapak yok", coverOf({ ...hasCover[0], isDemo: true }) === null);
ok("fotoğrafsız kayıtta kapak yok", coverOf(bare) === null || !!bare.photos?.length);

/* site haritası */
ok("adressiz kayıt girmez", !inVenueSitemap(bare));
ok("demo girmez", !inVenueSitemap({ ...base, isDemo: true }));
const bySlug = new Map(realEntities.map((e) => [e.slug, e]));
ok("adressiz liste 39 tekil gerçek mekân", noAddressOk.length === 39 && new Set(noAddressOk).size === 39 && noAddressOk.every((s) => bySlug.has(s)));
ok("listedekilerin hepsi haritada", noAddressOk.every((s) => inVenueSitemap(bySlug.get(s)!)));
ok("listede demo girmez", !inVenueSitemap({ ...bySlug.get(noAddressOk[0])!, isDemo: true }));
ok("listede olmayan adressiz kayıt girmez", !inVenueSitemap(bySlug.get("barba-yani-adalar")!));
ok("listedekilerde adres vaadi ve işaretleme yok", noAddressOk.every((s) => { const e = bySlug.get(s)!; return e.address || (venueJsonLd(e, null, false) === null && !venueDescription(e, null, false).includes("adres")); }));
ok("yalnız yayındaki yazılar", articles(false).every((a) => a.status === "yayinda"));
ok("kontrol ve taslak yazı listede yok", ALL_ARTICLES.filter((a) => a.status !== "yayinda").every((a) => !articles(false).includes(a)));
console.log(`\nsitemap mekân: ${realEntities.filter(inVenueSitemap).length}/${realEntities.length}`);
console.log(`\n${pass} geçti, ${fail} kaldı`);
if (fail) process.exit(1);
