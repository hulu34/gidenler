/* GOOGLE PUAN EXCEL SİSTEMİ TESTLERİ — gömülü Postgres (PGlite) + sahte kaynak. Ağ yok, Google yok.
   Çalıştır: npm run test:gpuan */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import ExcelJS from "exceljs";
import * as schema from "../lib/db/schema";
import type { Db } from "../lib/db/client";
import { applyMigrations, type Executor } from "../lib/db/migrate";
import { seedRealVenues } from "../lib/db/seed";
import { realVenueRecords } from "../data/real";
import { applyResult, baseRow, trDay, typeMismatch, checkConsistency, checkFile, CONFIDENCE, dueRows, HEADERS, importable, pickGoogleId, reconcile, STATUS, type GoogleId, type RatingSource, type Row, type SourceResult, type Venue } from "../lib/gpuan/core";
import { readWorkbook, writeWorkbook } from "../lib/gpuan/excel";
import { sheetVenues } from "../lib/gpuan/venues";
import { acquireLock, holdsLock, importFile, releaseLock, saveFile, getFile, googleIds } from "../lib/gpuan/store";
import { loadGoogleRatings } from "../lib/gpuan/read";
import { runDaily, type RunnerApi } from "../lib/gpuan/runner";
import { classifyUrl, coordsFromUrl, parseRaw } from "../lib/gpuan/sources/mapsPage";
import { googleRankedThemes } from "../lib/homeBoard";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, info?: unknown) => { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name}`, info ?? ""); } };

const venues = sheetVenues();
const V = (slug: string) => venues.find((v) => v.slug === slug)!;
const pid = (i: number) => `ChIJtest${String(i).padStart(12, "0")}`;
/** Sahte kaynak: her place ID için belirlenmiş yanıt; varsayılan "doğru mekân, 4,5 / 200". */
function fakeSource(over: Record<string, SourceResult | "throw"> = {}, calls: string[] = []): RatingSource {
  return { id: "sahte", label: "Sahte kaynak (test)", async fetch(t) {
    calls.push(t.placeId);
    const o = over[t.placeId]; if (o === "throw") throw new Error("ağ koptu"); if (o) return o;
    const v = venues.find((x) => x.name === t.name)!;
    return { kind: "ok", seen: { name: v.name, address: v.address ?? "", rating: 4.5, reviews: 200, lat: v.lat + 0.0002, lng: v.lng } };
  } };
}

async function main() {
  console.log("\n1) Excel oluşturma ve 456 satır");
  ok("venues.json'dan 456 mekân (414 restoran, 38 kafe, 4 bar)", venues.length === 456
    && venues.filter((v) => v.categoryId === "cat.restaurant").length === 414 && venues.filter((v) => v.categoryId === "cat.cafe").length === 38 && venues.filter((v) => v.categoryId === "cat.bar").length === 4, venues.length);
  const ids = new Map<string, GoogleId[]>(venues.map((v, i) => [v.slug, i % 5 === 0 ? [] : [{ externalId: pid(i), status: i % 5 === 1 ? "pending" : i % 7 === 0 ? "confirmed" : "auto" }]]));
  const first = reconcile([], venues, ids);
  ok("ilk karşılaştırmada 456 yeni satır", first.rows.length === 456 && first.added.length === 456 && !first.removed.length);
  const buf = await writeWorkbook(first.rows, { generatedAt: new Date().toISOString() });
  const back = await readWorkbook(buf);
  { const wb0 = new ExcelJS.Workbook(); await wb0.xlsx.load(buf as unknown as ArrayBuffer); const w0 = wb0.getWorksheet("Mekânlar")!; w0.spliceColumns(HEADERS.indexOf("Google'daki tür") + 1, 1); const old = await readWorkbook(Buffer.from(await wb0.xlsx.writeBuffer()));
    ok("yeni sütunu olmayan eski Excel de okunur", old.rows.length === 456 && !old.errors.length && old.rows[0].seenCategory === "", old.errors); }
  ok("Excel geri okununca 456 satır, hata yok", back.rows.length === 456 && !back.errors.length, back.errors);
  ok("bütün Gidenler ID'leri eksiksiz ve aynı sırada", back.rows.every((r, i) => r.slug === first.rows[i].slug));
  ok("Eşleşme yoksa place ID boş", back.rows.filter((r) => r.confidence === CONFIDENCE.none).every((r) => r.placeId === "" && r.mapsUrl === ""));
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("Mekânlar")!;
  ok("başlıklar istenen alanları içeriyor", HEADERS.slice(0, 16).every((h, i) => ws.getRow(1).getCell(i + 1).value === h));
  ok("filtre ve sabit başlık var", !!ws.autoFilter && ws.views[0]?.state === "frozen" && (ws.views[0] as { ySplit?: number }).ySplit === 1);
  ok("özet, hatalar, değişimler, açıklama sayfaları", ["Özet", "Hatalar", "Değişimler", "Açıklama"].every((n) => !!wb.getWorksheet(n)));
  const statusCol = HEADERS.indexOf("Güncelleme durumu") + 1;
  ok("durum hücreleri renkli", (ws.getRow(2).getCell(statusCol).fill as { fgColor?: { argb?: string } })?.fgColor?.argb?.length === 8);

  console.log("\n2) Place ID seçimi ve şube eşleştirme");
  ok("onaylı > otomatik > bekleyen", pickGoogleId([{ externalId: pid(1), status: "auto" }, { externalId: pid(2), status: "confirmed" }]).placeId === pid(2));
  ok("reddedilmiş kimlik kullanılmaz", pickGoogleId([{ externalId: pid(1), status: "rejected" }]).placeId === "" && pickGoogleId([{ externalId: pid(1), status: "rejected" }]).confidence === CONFIDENCE.rejected);
  ok("aynı mekânda iki farklı onaylı kimlik → hiçbiri", pickGoogleId([{ externalId: pid(1), status: "confirmed" }, { externalId: pid(2), status: "confirmed" }]).placeId === "");
  const v0 = V("nelipide-kadikoy");
  ok("doğru mekân geçer", checkConsistency(v0, { name: v0.name, address: v0.address!, rating: 4.4, reviews: 900, lat: v0.lat, lng: v0.lng }).ok);
  ok("1 km uzaktaki aynı adlı şube engellenir", !checkConsistency(v0, { name: v0.name, address: "", rating: 4.4, reviews: 900, lat: v0.lat + 0.01, lng: v0.lng }).ok);
  ok("ad tutmayan mekân engellenir", !checkConsistency(v0, { name: "Tamamen Başka Kebap", address: "", rating: 4.4, reviews: 900, lat: v0.lat, lng: v0.lng }).ok);
  const cv = V("donerci-celal-usta-umraniye-atakent-subesi-umraniye");
  ok("adı farklı şube söyleyen ve konumu uzak aday engellenir", !checkConsistency({ ...cv, name: "Dönerci Celal Usta" }, { name: "Dönerci Celal Usta Suadiye", address: "", rating: 4.4, reviews: 900, lat: cv.lat + 0.003, lng: cv.lng }).ok);

  console.log("\n3) Güncelleme kuralları");
  const src = fakeSource();
  const row0 = { ...baseRow(v0, { placeId: pid(9), confidence: CONFIDENCE.auto }), rating: 4.2, reviews: 800, checkedAt: "2026-11-01T03:00:00.000Z" };
  const up = applyResult(row0, v0, { kind: "ok", seen: { name: v0.name, address: "", rating: 4.4, reviews: 900, lat: v0.lat, lng: v0.lng } }, "2026-11-06T03:00:00.000Z", src);
  ok("puan güncellenir, önceki değer saklanır", up.rating === 4.4 && up.reviews === 900 && up.prevRating === 4.2 && up.status === STATUS.fresh && up.checkedAt.startsWith("2026-11-06"));
  for (const [name, res, st] of [
    ["veri bulunamazsa", { kind: "not_found", reason: "yok" }, STATUS.error], ["erişim engelinde", { kind: "blocked", reason: "CAPTCHA" }, STATUS.blocked],
    ["şube uyuşmazsa", { kind: "ok", seen: { name: v0.name, address: "", rating: 3.1, reviews: 10, lat: v0.lat + 0.02, lng: v0.lng } }, STATUS.branch],
    ["puan okunamazsa", { kind: "ok", seen: { name: v0.name, address: "", rating: null, reviews: null, lat: v0.lat, lng: v0.lng } }, STATUS.error],
  ] as const) {
    const r = applyResult(row0, v0, res as SourceResult, "2026-11-06T03:00:00.000Z", src);
    ok(`${name} eski puan korunur, sıfırlanmaz, başarılı gösterilmez`, r.rating === 4.2 && r.reviews === 800 && r.checkedAt === row0.checkedAt && r.status === st && !!r.error, r);
  }
  ok("başarısız satır siteye aktarılabilir sayılmaz (şube)", !importable({ ...row0, status: STATUS.branch }).ok);
  const nc = applyResult(row0, v0, { kind: "ok", seen: { name: v0.name, address: "", rating: 4.3, reviews: null, lat: v0.lat, lng: v0.lng } }, new Date(Date.now() - 36e5).toISOString(), src);
  ok("değerlendirme sayısı görünmüyorsa uydurulmaz: puan güncel, sayı boş, not düşülür", nc.rating === 4.3 && nc.reviews === null && nc.status === STATUS.fresh && /görünmüyor/.test(nc.error) && importable(nc).ok);
  const ak = { name: "Akıntı Burnu", address: "Bebek Arnavutköy Caddesi No:115, Arnavutköy, Beşiktaş", lat: 41.07, lng: 29.04 };
  ok("konum yoksa adres doğrularsa şube eki engel olmaz", checkConsistency(ak, { name: "AkıntıBurnu Balık Restoranı | Arnavutköy", address: "Arnavutköy, Bebek Arnavutköy Cd No:115, 34345 Beşiktaş/İstanbul, Türkiye", rating: 4.2, reviews: null }).ok);
  ok("Google'da otel olarak kayıtlı eşleşme aktarılmaz", (() => { const t = applyResult(row0, v0, { kind: "ok", seen: { name: v0.name, address: "", rating: 5, reviews: null, lat: v0.lat, lng: v0.lng, category: "Hotel" } }, new Date(Date.now() - 36e5).toISOString(), src); return t.status === STATUS.typeMismatch && t.rating === 4.2 && !importable(t).ok; })());
  ok("yeme-içme türleri tür uyuşmazlığı sayılmaz", ["Coffee shop", "Fish restaurant", "Meat dish restaurant", "Fast food restaurant", "Pastry shop", "Hotel restaurant", "Fish market"].every((c) => typeMismatch(c) === null) && ["Hotel", "Mosque", "Barber shop", "Supermarket"].every((c) => typeMismatch(c) !== null));
  const al = V("alacati-balikcisi-atasehir");
  ok("adındaki ilçe adı şube eki sayılmaz (170 m)", !!al && checkConsistency(al, { name: "Alaçatı Balıkçısı Ataşehir", address: "", rating: 4.4, reviews: null, lat: al.lat + 0.0015, lng: al.lng }).ok);
  ok("başka semt adı taşıyan uzak aday yine engellenir", !!al && !checkConsistency(al, { name: "Alaçatı Balıkçısı Suadiye", address: "", rating: 4.4, reviews: null, lat: al.lat + 0.0015, lng: al.lng }).ok);
  ok("konum yoksa kapı numarası farklıysa engellenir", !checkConsistency(ak, { name: "Akıntı Burnu", address: "Bebek Arnavutköy Cd No:42, Beşiktaş", rating: 4.2, reviews: null }).ok);

  console.log("\n4) Yeni mekân, kaldırılan mekân, değişen place ID");
  const withNew = [...venues, { slug: "yeni-mekan-test", name: "Yeni Mekân", categoryId: "cat.restaurant", kind: "Lokanta", district: "Kadıköy", address: "Test Sk. No:1", lat: 41, lng: 29 } as Venue].filter((v) => v.slug !== venues[3].slug);
  const ids2 = new Map(ids); ids2.set("yeni-mekan-test", [{ externalId: pid(999), status: "auto" }]);
  const changedId = venues[2].slug; ids2.set(changedId, [{ externalId: pid(777), status: "auto" }]);
  const rated = first.rows.map((r) => (r.slug === changedId ? { ...r, rating: 4.1, reviews: 300, checkedAt: "2026-11-01T00:00:00Z" } : r));
  const rec = reconcile(rated, withNew, ids2);
  ok("yeni mekân satır olarak eklenir", rec.added.includes("yeni-mekan-test") && rec.rows.some((r) => r.slug === "yeni-mekan-test" && r.status === STATUS.isNew));
  ok("listeden çıkan mekân silinmez, işaretlenir", rec.removed.includes(venues[3].slug) && rec.rows.find((r) => r.slug === venues[3].slug)?.record === "Kaldırıldı");
  const ch = rec.rows.find((r) => r.slug === changedId)!;
  ok("place ID değişince eski puan aktarılmaz, yeniden kontrol beklenir", ch.placeId === pid(777) && ch.rating === null && ch.prevRating === 4.1);
  ok("Excel otomatik genişler (457 satır)", rec.rows.length === 457);

  console.log("\n5) Veritabanı: kilit, dosya, atomik aktarım (PGlite)");
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as Db;
  const x: Executor = { async query<T>(t: string) { return (await pg.query(t)).rows as T[]; }, async transaction(st: string[]) { await pg.transaction(async (tx) => { for (const s of st) { if (s.startsWith("SELECT pg_advisory")) continue; await tx.query(s); } }); } };
  await applyMigrations(x);
  await seedRealVenues(db, realVenueRecords);
  const pl = await db.select({ id: schema.places.id, slug: schema.places.slug }).from(schema.places);
  const idOf = new Map(pl.map((p) => [p.slug, p.id]));
  const idVals = venues.flatMap((v) => (ids.get(v.slug) ?? []).map((g) => ({ id: uuidv7(), placeId: idOf.get(v.slug)!, provider: "google", externalId: g.externalId, status: g.status })));
  for (let i = 0; i < idVals.length; i += 200) await db.insert(schema.placeIdentifiers).values(idVals.slice(i, i + 200));
  const dbIds = await googleIds(db);
  ok("kimlik raporu doğrulama kayıtlarını verir", Object.keys(dbIds).length === [...ids.values()].filter((x) => x.length).length);

  const a = await acquireLock(db, "calisma-a"), b = await acquireLock(db, "calisma-b");
  ok("ikinci güncelleme kilidi alamaz", a.ok && !b.ok && b.holder === "calisma-a");
  await db.update(schema.googleRatingLock).set({ expiresAt: new Date(Date.now() - 1000) });
  const b2 = await acquireLock(db, "calisma-b");
  ok("süresi dolan kilit devralınır, eski sahibi yazamaz", b2.ok && !(await holdsLock(db, "calisma-a")));
  await releaseLock(db, "calisma-b");

  /* api: sunucu ucunun yaptığını doğrudan çağırır (kilit kontrolü dahil) */
  const mkApi = (holder: string, hooks: { failUploadAt?: number } = {}): RunnerApi & { uploads: number } => {
    const api = { uploads: 0,
      lock: async (op: "al" | "birak") => (op === "al" ? (await acquireLock(db, holder)).ok : (await releaseLock(db, holder), true)),
      latest: async () => (await getFile(db, "en-yeni"))?.buf ?? null,
      ids: async () => googleIds(db),
      upload: async (b: Buffer, kind: "taslak" | "son") => { api.uploads++; if (hooks.failUploadAt === api.uploads) throw new Error("bağlantı koptu"); if (!(await holdsLock(db, holder))) return { ok: false, errors: ["lock_not_held"] }; const r = await saveFile(db, b, kind, holder); return r.ok ? { ok: true, id: r.id } : { ok: false, errors: r.errors }; },
      importFile: async (id: string) => { if (!(await holdsLock(db, holder))) return { status: "lock_not_held" }; return importFile(db, id, venues, `test:${holder}`) as unknown as Promise<Record<string, unknown> & { status: string }>; },
    };
    return api;
  };
  const BASE = Date.now();
  const day1 = () => new Date(BASE - 2 * 864e5);
  const calls1: string[] = [];
  const blockedPid = [...ids.entries()].find(([, g]) => g[0]?.status === "auto")![1][0].externalId;
  const r1 = await runDaily("calisma-1", venues, mkApi("calisma-1"), fakeSource({ [blockedPid]: { kind: "blocked", reason: "CAPTCHA" } }, calls1), { max: 500, checkpoint: 50, now: day1 });
  const withPid = venues.filter((v) => ids.get(v.slug)?.length).length;
  ok("bir kayıt engellense de diğerlerine devam edilir", r1.report.attempted === withPid && r1.report.blocked === 1 && r1.report.fresh === withPid - 1, r1.report);
  ok("aktarım uygulandı", (r1.report.import as { status: string }).status === "applied", r1.report.import);
  const m1 = await loadGoogleRatings(db);
  const expectSite = venues.filter((v) => { const g = ids.get(v.slug)?.[0]; return g && g.status !== "pending" && g.externalId !== blockedPid; }).length;
  ok("sitede yalnız onaylı/otomatik eşleşmenin puanı görünür (bekleyen görünmez)", Object.keys(m1).length === expectSite, { got: Object.keys(m1).length, expectSite });
  ok("Google puanı Gidenler puan tablosuna yazılmaz", Number((await pg.query<{ n: number }>("select count(*)::int n from rating_history")).rows[0].n) === 0);

  console.log("\n6) Kesinti ve kaldığı yerden devam");
  const day2 = () => new Date(BASE - 864e5);
  const calls2: string[] = [];
  let crashed = false;
  try { await runDaily("calisma-2", venues, mkApi("calisma-2", { failUploadAt: 3 }), fakeSource({}, calls2), { max: 500, checkpoint: 50, now: day2 }); } catch { crashed = true; }
  ok("ikinci ara kayıttan sonra çalışma kesildi", crashed && calls2.length >= 100);
  ok("kesilen çalışmanın kilidi bırakıldı", !(await db.select().from(schema.googleRatingLock)).length);
  const calls3: string[] = [];
  const r3 = await runDaily("calisma-3", venues, mkApi("calisma-3"), fakeSource({}, calls3), { max: 500, checkpoint: 50, now: day2 });
  ok("devam eden çalışma bugün denenmiş satırları atlar", calls3.length === withPid - 100 && r3.report.attempted === withPid - 100, { calls3: calls3.length });

  console.log("\n7) Bozuk, eksik ya da şüpheli Excel çalışan veriyi silmez");
  const before = await loadGoogleRatings(db);
  const holder = "elle-test-1"; await acquireLock(db, holder);
  const bad = await saveFile(db, Buffer.from("bu bir excel değil"), "elle", holder);
  ok("bozuk dosya depoya bile alınmaz", !bad.ok);
  const latest = (await readWorkbook((await getFile(db, "son"))!.buf)).rows;
  const short = await saveFile(db, await writeWorkbook(latest.slice(0, 200), { generatedAt: new Date().toISOString() }), "elle", holder);
  const repShort = await importFile(db, (short as { id: string }).id, venues, "test");
  ok("eksik dosya (200/456) reddedilir", repShort.status === "rejected" && repShort.errors.some((e) => e.includes("eksik")), repShort.errors);
  const wild = latest.map((r) => (r.rating != null ? { ...r, rating: 1.2, checkedAt: new Date(BASE - 18e5).toISOString() } : r));
  const w = await saveFile(db, await writeWorkbook(wild, { generatedAt: new Date().toISOString() }), "elle", holder);
  const repWild = await importFile(db, (w as { id: string }).id, venues, "test");
  ok("toplu ayrıştırma hatası şüphesi reddedilir", repWild.status === "rejected", repWild.errors);
  const dup = await saveFile(db, await writeWorkbook([...latest, latest[0]], { generatedAt: new Date().toISOString() }), "elle", holder);
  const repDup = await importFile(db, (dup as { id: string }).id, venues, "test");
  ok("tekrarlanan Gidenler ID reddedilir", repDup.status === "rejected");
  const after = await loadGoogleRatings(db);
  ok("reddedilen aktarımlar sitedeki veriyi değiştirmedi", JSON.stringify(after) === JSON.stringify(before));
  const rej = await pg.query<{ n: number }>("select count(*)::int n from audit_log where action='google_rating_import_rejected'");
  ok("ret kararları denetim kaydında", Number(rej.rows[0].n) === 3);
  const old = latest.map((r) => (r.rating != null ? { ...r, checkedAt: new Date(BASE - 30 * 864e5).toISOString() } : r));
  const o = await saveFile(db, await writeWorkbook(old.slice(0, 456), { generatedAt: new Date().toISOString() }), "elle", holder);
  const repOld = await importFile(db, (o as { id: string }).id, venues, "test");
  ok("eski tarihli dosya yeni veriyi ezemez", repOld.status === "applied" && repOld.written === 0, { status: repOld.status, written: repOld.written });
  await releaseLock(db, holder);
  const hist = await pg.query<{ n: number }>("select count(*)::int n from google_rating_history");
  ok("değişen puanlar geçmiş tablosunda", Number(hist.rows[0].n) >= expectSite);

  console.log("\n8) Arka arkaya engelde nazikçe durma");
  const day3 = () => new Date(BASE - 36e5);
  const allBlocked: Record<string, SourceResult> = Object.fromEntries([...ids.values()].flat().map((g) => [g.externalId, { kind: "blocked", reason: "olağandışı trafik" } as SourceResult]));
  const siteBefore = Object.keys(await loadGoogleRatings(db)).length;
  const callsB: string[] = [];
  const rb = await runDaily("calisma-4", venues, mkApi("calisma-4"), fakeSource(allBlocked, callsB), { max: 500, now: day3 });
  ok("3 engelden sonra durur, kalanlar ertelenir, puan silinmez", callsB.length === 3 && rb.report.deferred === withPid - 3 && rb.report.stoppedEarly !== null && Object.keys(await loadGoogleRatings(db)).length === siteBefore, { calls: callsB.length, deferred: rb.report.deferred, stopped: rb.report.stoppedEarly, site: Object.keys(await loadGoogleRatings(db)).length, expectSite });
  ok("hiç puan alınamayan çalışma başarılı sayılmaz", rb.report.fresh + rb.report.same === 0);
  const rowsB = (await readWorkbook(rb.workbook)).rows;
  ok("ertelenen satırlar ertesi gün yeniden denenir", dueRows(rowsB, trDay(new Date(BASE + 864e5)), 1000).length === withPid);

  console.log("\n9) Kaynak adaptörü ayrıştırma (çevrimdışı)");
  ok("koordinat mekân işaretçisinden okunur", JSON.stringify(coordsFromUrl("https://www.google.com/maps/place/X/@41.0,29.0,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d41.0312!4d28.9824")) === JSON.stringify({ lat: 41.0312, lng: 28.9824 }));
  ok("CAPTCHA / izin / giriş sayfası tanınır", classifyUrl("https://www.google.com/sorry/index?continue=") === "sorry" && classifyUrl("https://consent.google.com/m?x") === "consent" && classifyUrl("https://accounts.google.com/v3/signin") === "login");
  const p = parseRaw({ name: " Nelipide ", ratingLabel: "4.6 stars ", ratingText: null, reviewsLabel: "1,234 reviews", reviewsText: null, address: "Address: Moda Cd. No:5, Kadıköy", closed: false }, "https://www.google.com/maps/place/@41,29,17z/data=!3d40.99!4d29.02");
  ok("puan, sayı ve adres ayrıştırılır", p.rating === 4.6 && p.reviews === 1234 && p.address === "Moda Cd. No:5, Kadıköy" && p.name === "Nelipide" && p.lat === 40.99);

  console.log("\n10) Sıralama (Google verisi, 100+ değerlendirme)");
  const fake: Record<string, { rating: number; count: number; checkedAt: string; mapsUrl: string | null }> = {};
  const balik = realVenueRecords.filter((r) => r.kind === "Balık restoranı").slice(0, 6).map((r) => r.slug);
  balik.forEach((s, i) => (fake[s] = { rating: 4 + i * 0.1, count: i === 5 ? 40 : 500, checkedAt: new Date().toISOString(), mapsUrl: null }));
  const th = googleRankedThemes(fake, new Set()).find((t) => t.key === "balik");
  ok("tür içinde yüksek puan önde, 100'den az değerlendirme sıralamaya girmez", !!th && th.items[0].slug === balik[4] && !th.items.some((i) => i.slug === balik[5]) && th.few.some((i) => i.slug === balik[5]), th);

  console.log(`\n${pass} geçti, ${fail} başarısız`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
