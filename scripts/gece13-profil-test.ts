/* GECE 13 KASIM PROFİL TESTİ — bu gece eklenen 14 Michelin/Seçki restoran profili gömülü Postgres'te (PGlite)
   yönetim yolundaki applyProfile ile uygulanır. Ağ yok, Production yok. Çalıştır: npx tsx scripts/gece13-profil-test.ts */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import type { Db } from "../lib/db/client";
import { seedRealVenues } from "../lib/db/seed";
import { applyMigrations, type Executor } from "../lib/db/migrate";
import { realVenueRecords } from "../data/real";
import { applyProfile, readProfile, rollbackProfile, ProfileInput } from "../lib/profile";
import { openingHoursSpec } from "../lib/seo";

const GECE13 = ["turk-fatih-tutak-sisli", "nicole-beyoglu", "mutfakkoz-kadikoy", "cuma-beyoglu", "fauna-atasehir", "aida-vino-e-cucina-kadikoy", "mikla-turkey-fusion-beyoglu",
  "aseka-beyoglu", "calipso-fish-maltepe", "rumelihisari-iskele-sariyer", "sade-bes-denizler-mutfagi-sisli", "deraliye-fatih", "tavaci-recep-usta-bostanci-maltepe", "ali-ocakbasi-karakoy-beyoglu"];
let pass = 0, fail = 0;
const ok = (ad: string, k: boolean, d?: unknown) => { if (k) pass++; else { fail++; console.log("  ✗", ad, d ?? ""); } };
const SINGLE = ["description", "address", "phone", "website", "instagram", "hours", "reservation"] as const;

async function main() {
const pg = new PGlite(); const db = drizzle(pg, { schema }) as unknown as Db;
const x: Executor = { async query<T>(t: string) { return (await pg.query(t)).rows as T[]; }, async transaction(st: string[]) { await pg.transaction(async (tx) => { for (const s of st) { if (s.startsWith("SELECT pg_advisory")) continue; await tx.query(s); } }); } };
await applyMigrations(x); await seedRealVenues(db, realVenueRecords);
const n = async (t: string) => Number((await pg.query<{ n: number }>(`select count(*)::int as n from ${t}`)).rows[0].n);
const placeRow = async (slug: string) => (await db.select().from(schema.places).where(eq(schema.places.slug, slug)))[0];
const MENU_DESC_MAX = 300;

for (const slug of GECE13) {
  const raw = JSON.parse(readFileSync(`content/profiles/${slug}.json`, "utf8"));
  const { videos, _kaynak_notu, ...rest } = raw;
  const input = ProfileInput.parse(rest);
  ok(`${slug}: şema geçerli, video yok, kaynak notu var`, !videos && typeof _kaynak_notu === "string" && _kaynak_notu.length > 40);
  ok(`${slug}: tüm alanlar resmî siteden ve 13.11.2026 kontrollü`, [...SINGLE.map((k) => input[k]), ...(input.notes ?? []), input.amenities, input.menu].filter(Boolean).every((f) => f!.provider === "official_site" && f!.checkedAt === "2026-11-13"));
  if (input.hours) ok(`${slug}: saat JSON-LD'ye çevrilir`, !!openingHoursSpec(input.hours.value), input.hours.value);
  if (input.menu) {
    const items = input.menu.sections.flatMap((s) => s.items);
    ok(`${slug}: fiyatsız menüde fiyat yok / fiyatlı menüde en az bir fiyat`, input.menu.pricesPublished ? items.some((i) => i.priceTry) : items.every((i) => i.priceTry == null));
    ok(`${slug}: menü açıklamaları sınır içinde`, items.every((i) => (i.description ?? "").length <= MENU_DESC_MAX));
  }
  const before = await placeRow(slug);
  ok(`${slug}: Production kataloğunda var, profil yok`, !!before && (await readProfile(db, slug)) === null);
  const a1 = await applyProfile(db, input);
  const pr = await readProfile(db, slug);
  ok(`${slug}: uygulandı`, a1.ok, a1);
  for (const k of SINGLE) if (input[k]) ok(`${slug}: ${k} okunur`, pr?.[k]?.value === input[k]!.value && pr?.[k]?.url === input[k]!.url);
  ok(`${slug}: not sayısı`, (pr?.notes.length ?? 0) === (input.notes?.length ?? 0));
  if (input.menu) ok(`${slug}: menü kalem sayısı ve fiyat bayrağı`, pr?.menu?.sections.reduce((a, s) => a + s.items.length, 0) === input.menu.sections.reduce((a, s) => a + s.items.length, 0) && pr?.menu?.pricesPublished === input.menu.pricesPublished && (pr?.menu?.validFrom ?? null) === (input.menu.validFrom ?? null));
  const after = await placeRow(slug);
  ok(`${slug}: bilinmeyen alan uydurulmaz (profilde olmayan kimlik alanı değişmez)`, (["address", "phone", "website", "instagram", "openingHours"] as const).every((c) => { const k = c === "openingHours" ? "hours" : c; return input[k as (typeof SINGLE)[number]] ? true : after[c] === before[c]; }));
  /* geri dönüş: yalnız en son uygulama geri alınabilir */
  const rb = await rollbackProfile(db, a1.ok ? a1.auditId : "");
  const back = await placeRow(slug);
  ok(`${slug}: geri alınınca profil kalkar, kimlik alanları eski haline döner`, rb.ok && (await readProfile(db, slug)) === null && (["address", "phone", "website", "instagram", "openingHours"] as const).every((c) => back[c] === before[c]), rb);
  const a3 = await applyProfile(db, input);
  const m1 = await n("menu_items"), f1 = await n("field_provenance");
  const a2 = await applyProfile(db, input);
  ok(`${slug}: yeniden uygulanır; tekrar uygulama değişiklik yapmaz`, a3.ok && a2.ok && a2.unchanged === true && (await n("menu_items")) === m1 && (await n("field_provenance")) === f1);
}
ok("başka mekân etkilenmez (Pandeli profili yok)", (await readProfile(db, "pandeli-fatih")) === null);
console.log(`gece13-profil-test: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
