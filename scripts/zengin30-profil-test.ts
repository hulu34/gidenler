/* ZENGİN 30 PROFİL TESTİ — data/katalog/zengin-30/envanter.json'da "yapildi" işaretli profiller gömülü Postgres'te (PGlite)
   yönetim yolundaki applyProfile ile uygulanır. Video kayıtları envanterdeki doğrulama kanıtıyla karşılaştırılır.
   Ağ yok, Production yok. Çalıştır: npx tsx scripts/zengin30-profil-test.ts */
import { readFileSync, existsSync } from "node:fs";
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
import { parseVideoUrl } from "../lib/media/embed";

type Vid = { id: string; gomulebilir: boolean; ucretliTanitimIsareti: boolean; profilde: boolean; yayin: string | null };
const ENV = JSON.parse(readFileSync("data/katalog/zengin-30/envanter.json", "utf8")) as { restoranlar: { slug: string; profil: string; videolar: Vid[]; secimNedeni: string[] }[] };
const YAPILDI = ENV.restoranlar.filter((r) => r.profil === "yapildi");
/* PR #39 (14 profil + 3 adres) ve Menemen (PR #38) bu çalışmanın dışında */
const DISARIDA = ["turk-fatih-tutak-sisli", "nicole-beyoglu", "mutfakkoz-kadikoy", "cuma-beyoglu", "fauna-atasehir", "aida-vino-e-cucina-kadikoy", "mikla-turkey-fusion-beyoglu",
  "aseka-beyoglu", "calipso-fish-maltepe", "rumelihisari-iskele-sariyer", "sade-bes-denizler-mutfagi-sisli", "deraliye-fatih", "tavaci-recep-usta-bostanci-maltepe",
  "ali-ocakbasi-karakoy-beyoglu", "altin-sofra-kucukcekmece", "bayindir-restoran-pendik", "antula-gurme-beykoz", "menemen-besiktas"];
const KATEGORI = new Set(["video", "yemek", "atmosfer", "ziyaretci", "isletme", "influencer", "editor"]);
const SINGLE = ["description", "address", "phone", "website", "instagram", "hours", "reservation"] as const;
const AMENITY = new Set(["rezervasyon", "evcil_hayvan", "teras", "bahce", "cocuk", "otopark", "alkol", "vegan", "engelli", "paket"]);
let pass = 0, fail = 0;
const ok = (ad: string, k: boolean, d?: unknown) => { if (k) pass++; else { fail++; console.log("  ✗", ad, d ?? ""); } };

async function main() {
  ok("envanter 30 farklı restoran", ENV.restoranlar.length === 30 && new Set(ENV.restoranlar.map((r) => r.slug)).size === 30);
  ok("en az 10 profil geliştirildi", YAPILDI.length >= 10, YAPILDI.length);
  ok("her restoranın seçim nedeni var", ENV.restoranlar.every((r) => r.secimNedeni.length > 0), ENV.restoranlar.filter((r) => !r.secimNedeni.length).map((r) => r.slug));
  ok("PR #39 ve Menemen kayıtları envanterde yok", ENV.restoranlar.every((r) => !DISARIDA.includes(r.slug)));
  ok("profil dosyası olan ama 'yapildi' işaretli olmayan restoran yok", ENV.restoranlar.every((r) => r.profil === "yapildi" || !existsSync(`content/profiles/${r.slug}.json`)));

  const pg = new PGlite(); const db = drizzle(pg, { schema }) as unknown as Db;
  const x: Executor = { async query<T>(t: string) { return (await pg.query(t)).rows as T[]; }, async transaction(st: string[]) { await pg.transaction(async (tx) => { for (const s of st) { if (s.startsWith("SELECT pg_advisory")) continue; await tx.query(s); } }); } };
  await applyMigrations(x); await seedRealVenues(db, realVenueRecords);
  const n = async (t: string) => Number((await pg.query<{ n: number }>(`select count(*)::int as n from ${t}`)).rows[0].n);
  const placeRow = async (slug: string) => (await db.select().from(schema.places).where(eq(schema.places.slug, slug)))[0];
  const COLS = ["address", "phone", "website", "instagram", "openingHours"] as const;

  for (const r of YAPILDI) {
    const slug = r.slug;
    const raw = JSON.parse(readFileSync(`content/profiles/${slug}.json`, "utf8"));
    const { videos, _kaynak_notu, ...rest } = raw as { videos?: { url: string; credit: string; category: string; sponsored: boolean }[]; _kaynak_notu?: string };
    const p = ProfileInput.safeParse(rest);
    ok(`${slug}: şema geçerli, kaynak notu var`, p.success && typeof _kaynak_notu === "string" && _kaynak_notu.length > 40, p.success ? "" : p.error.issues);
    if (!p.success) continue;
    const input = p.data;
    ok(`${slug}: tüm alanlar resmî siteden, 13.11.2026 kontrollü`, [...SINGLE.map((k) => input[k]), ...(input.notes ?? []), input.amenities, input.menu].filter(Boolean).every((f) => f!.provider === "official_site" && f!.checkedAt === "2026-11-13"));
    ok(`${slug}: kaynak alan adı kayıttaki resmî siteyle aynı`, (() => { const h = (u: string) => new URL(u).host.replace(/^www\./, ""); const site = h(realVenueRecords.find((v) => v.slug === slug)!.website!.replace(/^(?!https?:)/, "https://")); return [...SINGLE.map((k) => input[k]), ...(input.notes ?? []), input.amenities, input.menu].filter(Boolean).every((f) => h(f!.url) === site); })());
    if (input.hours) ok(`${slug}: saat JSON-LD'ye çevrilir`, !!openingHoursSpec(input.hours.value), input.hours.value);
    if (input.amenities) ok(`${slug}: olanak anahtarları sayfada tanımlı`, Object.keys(input.amenities.items).every((k) => AMENITY.has(k)));
    if (input.menu) {
      const items = input.menu.sections.flatMap((s) => s.items);
      ok(`${slug}: fiyatsız menüde fiyat yok / fiyatlı menüde fiyat var`, input.menu.pricesPublished ? items.some((i) => i.priceTry) : items.every((i) => i.priceTry == null));
      ok(`${slug}: menü arşiv kopyası değil (güncel resmî kaynak)`, !input.menu.archivedAt);
      ok(`${slug}: bölüm içinde aynı kalem iki kez yok`, input.menu.sections.every((s) => new Set(s.items.map((i) => i.name)).size === s.items.length));
    }
    /* video: yalnız envanterde gömülebilir doğrulanan, ücretli tanıtım işareti olmayan (ya da sponsorlu işaretlenen) kayıtlar */
    for (const v of videos ?? []) {
      const pv = parseVideoUrl(v.url);
      const ev = pv && r.videolar.find((e) => e.id === pv.id);
      ok(`${slug}: video ${v.url} tanınır ve envanterde doğrulanmış`, !!pv && !!ev && ev.gomulebilir && ev.profilde, ev);
      ok(`${slug}: video atfı, kategori ve sponsorluk`, typeof v.credit === "string" && v.credit.length > 3 && KATEGORI.has(v.category) && typeof v.sponsored === "boolean" && (!ev || !ev.ucretliTanitimIsareti || v.sponsored));
      ok(`${slug}: video atfındaki yıl yayın yılıyla aynı`, !ev?.yayin || v.credit.includes(ev.yayin.slice(0, 4)), [v.credit, ev?.yayin]);
    }
    ok(`${slug}: aynı video iki kez yok`, new Set((videos ?? []).map((v) => parseVideoUrl(v.url)?.id)).size === (videos ?? []).length);

    const before = await placeRow(slug);
    ok(`${slug}: Production kataloğunda var, profil yok`, !!before && (await readProfile(db, slug)) === null);
    const a1 = await applyProfile(db, input);
    const pr = await readProfile(db, slug);
    ok(`${slug}: uygulandı`, a1.ok, a1);
    for (const k of SINGLE) if (input[k]) ok(`${slug}: ${k} okunur`, pr?.[k]?.value === input[k]!.value && pr?.[k]?.url === input[k]!.url);
    ok(`${slug}: not sayısı`, (pr?.notes.length ?? 0) === (input.notes?.length ?? 0));
    if (input.menu) ok(`${slug}: menü kalem sayısı, fiyat bayrağı, geçerlilik`, pr?.menu?.sections.reduce((a, s) => a + s.items.length, 0) === input.menu.sections.reduce((a, s) => a + s.items.length, 0) && pr?.menu?.pricesPublished === input.menu.pricesPublished && (pr?.menu?.validFrom ?? null) === (input.menu.validFrom ?? null));
    const after = await placeRow(slug);
    ok(`${slug}: profilde olmayan kimlik alanı değişmez`, COLS.every((c) => { const k = c === "openingHours" ? "hours" : c; return input[k as (typeof SINGLE)[number]] ? true : after[c] === before[c]; }));
    ok(`${slug}: adres ve konum değişmez`, after.address === before.address && after.lat === before.lat && after.lng === before.lng);
    const rb = await rollbackProfile(db, a1.ok ? a1.auditId : "");
    const back = await placeRow(slug);
    ok(`${slug}: geri alınınca profil kalkar, kimlik alanları eski haline döner`, rb.ok && (await readProfile(db, slug)) === null && COLS.every((c) => back[c] === before[c]), rb);
    const a3 = await applyProfile(db, input);
    const m1 = await n("menu_items"), f1 = await n("field_provenance");
    const a2 = await applyProfile(db, input);
    ok(`${slug}: yeniden uygulanır; tekrar uygulama değişiklik yapmaz`, a3.ok && a2.ok && a2.unchanged === true && (await n("menu_items")) === m1 && (await n("field_provenance")) === f1);
  }
  for (const s of DISARIDA) ok(`${s}: bu çalışmada profili uygulanmadı`, (await readProfile(db, s)) === null);
  console.log(`zengin30-profil-test: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
