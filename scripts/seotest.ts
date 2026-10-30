/* ARAMA MOTORU KURALLARI — saf testler (veritabanı ve ağ gerektirmez).
   npx tsx scripts/seotest.ts */
import { realEntities } from "../data/real";
import { articles, ALL_ARTICLES } from "../lib/seckisi";
import { inVenueSitemap, openingHoursSpec, venueDescription, venueJsonLd } from "../lib/seo";
import type { Entity } from "../lib/types";

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

/* site haritası */
ok("adressiz kayıt girmez", !inVenueSitemap(bare));
ok("demo girmez", !inVenueSitemap({ ...base, isDemo: true }));
ok("yalnız yayındaki yazılar", articles(false).every((a) => a.status === "yayinda"));
ok("kontrol ve taslak yazı listede yok", ALL_ARTICLES.filter((a) => a.status !== "yayinda").every((a) => !articles(false).includes(a)));
console.log(`\nsitemap mekân: ${realEntities.filter(inVenueSitemap).length}/${realEntities.length}`);
console.log(`\n${pass} geçti, ${fail} kaldı`);
if (fail) process.exit(1);
