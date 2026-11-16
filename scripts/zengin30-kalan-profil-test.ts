/* ZENGİN 30 — KALAN 18 PROFİL TESTİ. data/katalog/zengin-30-kalan/envanter.json'da "yapildi" işaretli profiller:
   1) içerik denetimi (şema, kaynak alanı ve tarihi, saat JSON-LD, menü fiyat tutarlılığı, yinelenen kalem, sıfır fiyat, video kanıtı),
   2) bilerek bozulmuş kopyalarla denetimin hatayı yakaladığının kanıtı,
   3) gömülü Postgres'te (PGlite) yönetim yolundaki applyProfile ile uygula, oku, geri al, yeniden uygula, tekrar uygula.
   Ağ yok, Production yok. Çalıştır: npx tsx scripts/zengin30-kalan-profil-test.ts */
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
type Kayit = { slug: string; profil: string; durum: string; kontrol: string; videolar: Vid[] };
const ENV = JSON.parse(readFileSync("data/katalog/zengin-30-kalan/envanter.json", "utf8")) as { restoranlar: Kayit[] };
const YAPILDI = ENV.restoranlar.filter((r) => r.profil === "yapildi");
/* PR #39 (14 profil + 3 adres), PR #40 (12 profil) ve Menemen bu paketin dışında */
const DISARIDA = ["turk-fatih-tutak-sisli", "nicole-beyoglu", "mutfakkoz-kadikoy", "cuma-beyoglu", "fauna-atasehir", "aida-vino-e-cucina-kadikoy", "mikla-turkey-fusion-beyoglu",
  "aseka-beyoglu", "calipso-fish-maltepe", "rumelihisari-iskele-sariyer", "sade-bes-denizler-mutfagi-sisli", "deraliye-fatih", "tavaci-recep-usta-bostanci-maltepe",
  "ali-ocakbasi-karakoy-beyoglu", "altin-sofra-kucukcekmece", "bayindir-restoran-pendik", "antula-gurme-beykoz", "menemen-besiktas",
  "ulus-29-besiktas", "sunset-grill-ve-bar-besiktas", "topaz-beyoglu", "murver-beyoglu", "lokanta-1741-fatih", "1924-istanbul-beyoglu", "alaf-besiktas",
  "haci-abdullah-beyoglu", "kanaat-lokantasi-uskudar", "ciya-sofrasi-kadikoy", "tarihi-sultanahmet-koftecisi-selim-usta-fatih", "park-fora-besiktas"];
const KATEGORI = new Set(["video", "yemek", "atmosfer", "ziyaretci", "isletme", "influencer", "editor"]);
const SINGLE = ["description", "address", "phone", "website", "instagram", "hours", "reservation"] as const;
const AMENITY = new Set(["rezervasyon", "evcil_hayvan", "teras", "bahce", "cocuk", "otopark", "alkol", "vegan", "engelli", "paket"]);
const host = (u: string) => new URL(u.startsWith("http") ? u : `https://${u}`).host.replace(/^www\./, "");
let pass = 0, fail = 0;
const ok = (ad: string, k: boolean, d?: unknown) => { if (k) pass++; else { fail++; console.log("  ✗", ad, d ?? ""); } };

/** İçerik denetimi: hata listesini döner (boş = geçerli). Veritabanına dokunmaz. */
function denetle(slug: string, raw: Record<string, unknown>, kayit: Kayit): string[] {
  const e: string[] = [];
  const { videos, _kaynak_notu, ...rest } = raw as { videos?: { url: string; credit: string; category: string; sponsored: boolean }[]; _kaynak_notu?: string };
  const p = ProfileInput.safeParse(rest);
  if (!p.success) return [`şema: ${p.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`];
  const input = p.data;
  if (input.slug !== slug) e.push("slug dosya adıyla aynı değil");
  if (typeof _kaynak_notu !== "string" || _kaynak_notu.length < 40) e.push("kaynak notu yok");
  const alanlar = [...SINGLE.map((k) => input[k]), ...(input.notes ?? []), input.amenities, input.menu].filter(Boolean) as { provider: string; checkedAt: string; url: string }[];
  if (!alanlar.every((f) => f.provider === "official_site" && f.checkedAt === kayit.kontrol)) e.push("resmî site dışı kaynak ya da envanterdekinden farklı kontrol tarihi");
  const kat = realVenueRecords.find((v) => v.slug === slug);
  const izinli = new Set([kat?.website && host(kat.website), input.website && host(input.website.value)].filter(Boolean));
  const yabanci = alanlar.filter((f) => !izinli.has(host(f.url))).map((f) => host(f.url));
  if (yabanci.length) e.push(`kaynak alanı resmî siteyle aynı değil: ${[...new Set(yabanci)].join(", ")}`);
  if (input.hours && !openingHoursSpec(input.hours.value)) e.push(`saat JSON-LD'ye çevrilemiyor: ${input.hours.value}`);
  if (input.amenities && !Object.keys(input.amenities.items).every((k) => AMENITY.has(k))) e.push("tanımsız olanak anahtarı");
  if (input.menu) {
    const items = input.menu.sections.flatMap((s) => s.items);
    if (input.menu.pricesPublished ? !items.some((i) => i.priceTry) : items.some((i) => i.priceTry != null)) e.push("fiyat bayrağı ile kalem fiyatları tutarsız");
    if (items.some((i) => i.priceTry != null && !(i.priceTry > 0))) e.push("sıfır ya da negatif fiyat");
    if (input.menu.archivedAt) e.push("arşiv menü güncel menü gibi kullanılmış");
    for (const s of input.menu.sections) if (new Set(s.items.map((i) => i.name.toLocaleLowerCase("tr"))).size !== s.items.length) e.push(`bölümde yinelenen kalem: ${s.title}`);
    /* aynı başlıklı iki bölüm olmamalı (aynı ürünün iki kez yazılması); farklı biçimler (nigiri / sashimi gibi) ayrı bölümde ayrı üründür */
    const basliklar = input.menu.sections.map((s) => s.title.toLocaleLowerCase("tr"));
    if (new Set(basliklar).size !== basliklar.length) e.push("aynı başlıklı iki menü bölümü");
  }
  for (const v of videos ?? []) {
    const pv = parseVideoUrl(v.url); const ev = pv && kayit.videolar.find((x) => x.id === pv.id);
    if (!pv || !ev || !ev.gomulebilir || !ev.profilde) { e.push(`video kanıtsız ya da gömülemez: ${v.url}`); continue; }
    if (!(typeof v.credit === "string" && v.credit.length > 3 && KATEGORI.has(v.category) && typeof v.sponsored === "boolean")) e.push(`video atfı/kategorisi eksik: ${v.url}`);
    if (ev.ucretliTanitimIsareti && !v.sponsored) e.push(`ücretli tanıtım işaretli video sponsorlu gösterilmemiş: ${v.url}`);
    if (ev.yayin && !v.credit.includes(ev.yayin.slice(0, 4))) e.push(`video atfındaki yıl yayın yılıyla aynı değil: ${v.url}`);
  }
  if (new Set((videos ?? []).map((v) => parseVideoUrl(v.url)?.id)).size !== (videos ?? []).length) e.push("aynı video iki kez");
  return e;
}

async function main() {
  ok("envanter 18 farklı restoran", ENV.restoranlar.length === 18 && new Set(ENV.restoranlar.map((r) => r.slug)).size === 18);
  ok("en az 9 yeni profil (8 + Matbah)", YAPILDI.length >= 9, YAPILDI.length);
  ok("kontrol tarihleri 13 ya da 14.11.2026", YAPILDI.every((r) => r.kontrol === "2026-11-13" || r.kontrol === "2026-11-14"));
  ok("PR #39, PR #40 ve Menemen kayıtları bu pakette yok", ENV.restoranlar.every((r) => !DISARIDA.includes(r.slug)));
  ok("profil dosyası olan her restoran 'yapildi' işaretli", ENV.restoranlar.every((r) => r.profil === "yapildi" || !existsSync(`content/profiles/${r.slug}.json`)));
  ok("riskli kayıtların profili açılmadı", ENV.restoranlar.every((r) => r.durum !== "riskli" || r.profil !== "yapildi"));

  /* 1) içerik denetimi */
  const ham: Record<string, Record<string, unknown>> = {};
  for (const r of YAPILDI) { ham[r.slug] = JSON.parse(readFileSync(`content/profiles/${r.slug}.json`, "utf8")); const e = denetle(r.slug, ham[r.slug], r); ok(`${r.slug}: içerik denetimi`, e.length === 0, e); }

  /* 2) bozulmuş kopyalar yakalanmalı */
  const kopya = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  const yan = YAPILDI.find((r) => r.slug === "yanyali-fehmi-lokantasi-kadikoy")!, bor = YAPILDI.find((r) => r.slug === "borsa-restaurant-adile-sultan-uskudar")!, mar = YAPILDI.find((r) => r.slug === "maromi-istanbul-sisli")!;
  const bozuk: [string, Kayit, (x: any) => void][] = [
    ["fiyatsız menüye fiyat", yan, (x) => { x.menu.sections[0].items[0].priceTry = 150; }],
    ["sıfır TL fiyat", bor, (x) => { x.menu.sections[0].items[0].priceTry = 0; }],
    ["24:00 kapanış", bor, (x) => { x.hours.value = "Mo-Su 12:00-24:00"; }],
    ["bölümde yinelenen kalem", bor, (x) => { x.menu.sections[1].items.push(kopya(x.menu.sections[1].items[0])); }],
    ["aynı başlıklı iki bölüm", bor, (x) => { x.menu.sections.push(kopya(x.menu.sections[0])); }],
    ["üçüncü taraf kaynak", bor, (x) => { x.notes[0].url = "https://www.tripadvisor.com/x"; }],
    ["arşiv menü", bor, (x) => { x.menu.archivedAt = "2024-01-01"; }],
    ["kanıtsız video", mar, (x) => { x.videos.push({ url: "https://www.youtube.com/watch?v=Z5HlMYrNvB4", credit: "Divan Life · 2021", category: "isletme", sponsored: false }); }],
    ["yanlış yıl atfı", mar, (x) => { x.videos[0].credit = "Divan Life · 2024"; }],
    ["tanımsız olanak", bor, (x) => { x.amenities = { items: { valet: true }, provider: "official_site", url: x.notes[0].url, checkedAt: "2026-11-13" }; }],
  ];
  for (const [ad, k, boz] of bozuk) { const x = kopya(ham[k.slug]); boz(x); ok(`bozuk kopya yakalanır: ${ad}`, denetle(k.slug, x, k).length > 0); }

  /* 3) yönetim yolu: uygula, oku, geri al, yeniden uygula, tekrar uygula */
  const pg = new PGlite(); const db = drizzle(pg, { schema }) as unknown as Db;
  const x: Executor = { async query<T>(t: string) { return (await pg.query(t)).rows as T[]; }, async transaction(st: string[]) { await pg.transaction(async (tx) => { for (const s of st) { if (s.startsWith("SELECT pg_advisory")) continue; await tx.query(s); } }); } };
  await applyMigrations(x); await seedRealVenues(db, realVenueRecords);
  const n = async (t: string) => Number((await pg.query<{ n: number }>(`select count(*)::int as n from ${t}`)).rows[0].n);
  const placeRow = async (slug: string) => (await db.select().from(schema.places).where(eq(schema.places.slug, slug)))[0];
  const COLS = ["address", "phone", "website", "instagram", "openingHours"] as const;
  for (const r of YAPILDI) {
    const slug = r.slug;
    const { videos: _v, _kaynak_notu: _n, ...rest } = ham[slug];
    const input = ProfileInput.parse(rest);
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
    ok(`${slug}: hedefli geri alma: profil kalkar, kimlik alanları eski haline döner`, rb.ok && (await readProfile(db, slug)) === null && COLS.every((c) => back[c] === before[c]), rb);
    const a3 = await applyProfile(db, input);
    const m1 = await n("menu_items"), f1 = await n("field_provenance");
    const a2 = await applyProfile(db, input);
    ok(`${slug}: yeniden uygulanır; tekrar uygulama değişiklik yapmaz`, a3.ok && a2.ok && a2.unchanged === true && (await n("menu_items")) === m1 && (await n("field_provenance")) === f1);
  }
  for (const s of DISARIDA) ok(`${s}: bu pakette profili uygulanmadı`, (await readProfile(db, s)) === null);
  console.log(`zengin30-kalan-profil-test: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
