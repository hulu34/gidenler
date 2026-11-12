/* GOOGLE PUAN EXCEL SİSTEMİ TESTLERİ — gömülü Postgres (PGlite) + sahte kaynak. Ağ yok, Google yok.
   Çalıştır: npm run test:gpuan */
import { PGlite } from "@electric-sql/pglite";
import rawVenues from "../data/real/venues.json";
import { isClosed } from "../lib/closure";
import { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import ExcelJS from "exceljs";
import * as schema from "../lib/db/schema";
import type { Db } from "../lib/db/client";
import { applyMigrations, type Executor } from "../lib/db/migrate";
import { seedRealVenues } from "../lib/db/seed";
import { realVenueRecords } from "../data/real";
import { applyResult, baseRow, trDay, typeMismatch, typeCheck, finalState, hideReason, FINAL, withDerived, MAIN, mainStatus, duplicatePlaceIds, checkConsistency, checkFile, CONFIDENCE, dueRows, HEADERS, importable, pickGoogleId, reconcile, STATUS, type GoogleId, type RatingSource, type Row, type SourceResult, type Venue } from "../lib/gpuan/core";
import { readWorkbook, writeWorkbook } from "../lib/gpuan/excel";
import { sheetVenues } from "../lib/gpuan/venues";
import { acquireLock, holdsLock, importFile, releaseLock, saveFile, getFile, googleIds, recordDecision, latestDecisions, dailyReport, addMatch } from "../lib/gpuan/store";
import { CLOSED_CONFIRMED, CLOSURES } from "../lib/closure";
import { activeEntities, realEntities } from "../data/real";
import { VENUES as SOR_VENUES } from "../lib/sor/engine";
import { loadGoogleRatings } from "../lib/gpuan/read";
import { runDaily, type RunnerApi } from "../lib/gpuan/runner";
import { classifyUrl, coordsFromUrl, parseRaw, placeIdFromFtid, ftidFromUrl } from "../lib/gpuan/sources/mapsPage";
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
    /* aynı adlı farklı şubeler (ör. iki semtte aynı ad) karışmasın: test kimliği pid(i) → venues[i], yoksa ad */
    const m = /^ChIJtest(\d{12})$/.exec(t.placeId); const vi = m ? venues[Number(m[1])] : undefined;
    const v = vi && vi.name === t.name ? vi : venues.find((x) => x.name === t.name)!;
    return { kind: "ok", seen: { name: v.name, address: v.address ?? "", rating: 4.5, reviews: 200, lat: v.lat + 0.0002, lng: v.lng, category: "Restaurant" } };
  } };
}

async function main() {
  /* mekân sayısı veriden: büyüme (dalga 2+) eklendikçe testler kendiliğinden genişler; ilk 456 kayıt korunur */
  const N = venues.length;
  console.log(`\n1) Excel oluşturma ve ${N} satır`);
  const base456 = (rawVenues as Array<{ slug: string; wave?: number }>).filter((v) => (v.wave ?? 0) < 2).map((v) => v.slug);
  ok("ilk 456 mekân (dalga 0–1) korunur ve Excel listesinde", base456.length === 456 && base456.every((s) => venues.some((v) => v.slug === s)), base456.length);
  ok("Excel listesi venues.json ile aynı boyda", N === (rawVenues as unknown[]).length, N);
  const ids = new Map<string, GoogleId[]>(venues.map((v, i) => [v.slug, i % 5 === 0 ? [] : [{ externalId: pid(i), status: i % 5 === 1 ? "pending" : i % 7 === 0 ? "confirmed" : "auto" }]]));
  const first = reconcile([], venues, ids);
  ok(`ilk karşılaştırmada ${N} yeni satır`, first.rows.length === N && first.added.length === N && !first.removed.length);
  const buf = await writeWorkbook(first.rows, { generatedAt: new Date().toISOString() });
  const back = await readWorkbook(buf);
  { const wb0 = new ExcelJS.Workbook(); await wb0.xlsx.load(buf as unknown as ArrayBuffer); const w0 = wb0.getWorksheet("Tüm Mekânlar")!; w0.spliceColumns(HEADERS.indexOf("Google'daki tür") + 1, 7); w0.name = "Mekânlar"; const old = await readWorkbook(Buffer.from(await wb0.xlsx.writeBuffer()));
    ok("yeni sütunu olmayan eski Excel de okunur", old.rows.length === N && !old.errors.length && old.rows[0].seenCategory === "", old.errors); }
  ok(`Excel geri okununca ${N} satır, hata yok`, back.rows.length === N && !back.errors.length, back.errors);
  ok("bütün Gidenler ID'leri eksiksiz ve aynı sırada", back.rows.every((r, i) => r.slug === first.rows[i].slug));
  ok("Eşleşme yoksa place ID boş", back.rows.filter((r) => r.confidence === CONFIDENCE.none).every((r) => r.placeId === "" && r.mapsUrl === ""));
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("Tüm Mekânlar")!;
  ok("başlıklar istenen alanları içeriyor", HEADERS.slice(0, 16).every((h, i) => ws.getRow(1).getCell(i + 1).value === h));
  ok("filtre ve sabit başlık var", !!ws.autoFilter && ws.views[0]?.state === "frozen" && (ws.views[0] as { ySplit?: number }).ySplit === 1);
  ok("istenen 9 sayfa + değişimler ve açıklama", ["Tüm Mekânlar", "Google Puanı Aktif", "Onay Bekleyenler", "Eşleşmesi Olmayanlar", "Yanlış Şube ve Tür", "Kapanma İncelemesi", "Değerlendirme Sayısı Eksik", "Güncelleme Geçmişi", "Yönetici Özeti", "Değişimler", "Açıklama"].every((n) => !!wb.getWorksheet(n)), wb.worksheets.map((w) => w.name));
  const statusCol = HEADERS.indexOf("Güncelleme durumu") + 1;
  ok("durum hücreleri renkli", (ws.getRow(2).getCell(statusCol).fill as { fgColor?: { argb?: string } })?.fgColor?.argb?.length === 8);

  console.log("\n2) Place ID seçimi ve şube eşleştirme");
  ok("onaylı > otomatik > bekleyen", pickGoogleId([{ externalId: pid(1), status: "auto" }, { externalId: pid(2), status: "confirmed" }]).placeId === pid(2));
  ok("reddedilmiş kimlik kullanılmaz", pickGoogleId([{ externalId: pid(1), status: "rejected" }]).placeId === "" && pickGoogleId([{ externalId: pid(1), status: "rejected" }]).confidence === CONFIDENCE.rejected);
  ok("aynı mekânda iki farklı onaylı kimlik → hiçbiri", pickGoogleId([{ externalId: pid(1), status: "confirmed" }, { externalId: pid(2), status: "confirmed" }]).placeId === "");
  const v0 = V("nelipide-kadikoy");
  ok("doğru mekân geçer", checkConsistency(v0, { name: v0.name, address: v0.address!, rating: 4.4, reviews: 900, lat: v0.lat, lng: v0.lng, category: "Restaurant" }).ok);
  ok("1 km uzaktaki aynı adlı şube engellenir", !checkConsistency(v0, { name: v0.name, address: "", rating: 4.4, reviews: 900, lat: v0.lat + 0.01, lng: v0.lng }).ok);
  ok("ad tutmayan mekân engellenir", !checkConsistency(v0, { name: "Tamamen Başka Kebap", address: "", rating: 4.4, reviews: 900, lat: v0.lat, lng: v0.lng, category: "Restaurant" }).ok);
  const cv = V("donerci-celal-usta-umraniye-atakent-subesi-umraniye");
  ok("adı farklı şube söyleyen ve konumu uzak aday engellenir", !checkConsistency({ ...cv, name: "Dönerci Celal Usta" }, { name: "Dönerci Celal Usta Suadiye", address: "", rating: 4.4, reviews: 900, lat: cv.lat + 0.003, lng: cv.lng }).ok);

  console.log("\n3) Güncelleme kuralları");
  const src = fakeSource();
  const row0 = { ...baseRow(v0, { placeId: pid(9), confidence: CONFIDENCE.auto }), rating: 4.2, reviews: 800, checkedAt: "2026-11-01T03:00:00.000Z" };
  const up = applyResult(row0, v0, { kind: "ok", seen: { name: v0.name, address: "", rating: 4.4, reviews: 900, lat: v0.lat, lng: v0.lng, category: "Restaurant" } }, "2026-11-06T03:00:00.000Z", src);
  ok("puan güncellenir, önceki değer saklanır", up.rating === 4.4 && up.reviews === 900 && up.prevRating === 4.2 && up.status === STATUS.fresh && up.checkedAt.startsWith("2026-11-06"));
  for (const [name, res, st] of [
    ["veri bulunamazsa", { kind: "not_found", reason: "yok" }, STATUS.error], ["erişim engelinde", { kind: "blocked", reason: "CAPTCHA" }, STATUS.blocked],
    ["şube uyuşmazsa", { kind: "ok", seen: { name: v0.name, address: "", rating: 3.1, reviews: 10, lat: v0.lat + 0.02, lng: v0.lng } }, STATUS.branch],
    ["puan okunamazsa", { kind: "ok", seen: { name: v0.name, address: "", rating: null, reviews: null, lat: v0.lat, lng: v0.lng, category: "Restaurant" } }, STATUS.error],
  ] as const) {
    const r = applyResult(row0, v0, res as SourceResult, "2026-11-06T03:00:00.000Z", src);
    ok(`${name} eski puan korunur, sıfırlanmaz, başarılı gösterilmez`, r.rating === 4.2 && r.reviews === 800 && r.checkedAt === row0.checkedAt && r.status === st && !!r.error, r);
  }
  ok("başarısız satır siteye aktarılabilir sayılmaz (şube)", !importable({ ...row0, status: STATUS.branch }).ok);
  const nc = applyResult(row0, v0, { kind: "ok", seen: { name: v0.name, address: "", rating: 4.3, reviews: null, lat: v0.lat, lng: v0.lng, category: "Restaurant" } }, new Date(Date.now() - 36e5).toISOString(), src);
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
  ok(`Excel otomatik genişler (${N + 1} satır)`, rec.rows.length === N + 1);

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
  const r1 = await runDaily("calisma-1", venues, mkApi("calisma-1"), fakeSource({ [blockedPid]: { kind: "blocked", reason: "CAPTCHA" } }, calls1), { max: 5000, checkpoint: 50, now: day1 });
  const withPid = venues.filter((v) => ids.get(v.slug)?.length).length;
  ok("bir kayıt engellense de diğerlerine devam edilir", r1.report.attempted === withPid && r1.report.blocked === 1 && r1.report.fresh === withPid - 1, r1.report);
  ok("aktarım uygulandı", (r1.report.import as { status: string }).status === "applied", r1.report.import);
  const m1 = await loadGoogleRatings(db);
  const writtenAll = venues.filter((v) => { const g = ids.get(v.slug)?.[0]; return g && g.status !== "pending" && g.externalId !== blockedPid; });
  /* kesin kapalı işletmede puan yazılmış olsa da sitede gösterilmez */
  const expectSite = writtenAll.filter((v) => !isClosed(v.slug)).length;
  ok("sitede yalnız onaylı/otomatik eşleşmenin puanı görünür (bekleyen görünmez)", Object.keys(m1).length === expectSite, { got: Object.keys(m1).length, expectSite });
  ok("kesin kapalı işletmenin puanı sitede yok", writtenAll.some((v) => isClosed(v.slug)) && !Object.keys(m1).some((s) => isClosed(s)));
  ok("Google puanı Gidenler puan tablosuna yazılmaz", Number((await pg.query<{ n: number }>("select count(*)::int n from rating_history")).rows[0].n) === 0);

  console.log("\n6) Kesinti ve kaldığı yerden devam");
  const day2 = () => new Date(BASE - 864e5);
  const calls2: string[] = [];
  let crashed = false;
  try { await runDaily("calisma-2", venues, mkApi("calisma-2", { failUploadAt: 3 }), fakeSource({}, calls2), { max: 5000, checkpoint: 50, now: day2 }); } catch { crashed = true; }
  ok("ikinci ara kayıttan sonra çalışma kesildi", crashed && calls2.length >= 100);
  ok("kesilen çalışmanın kilidi bırakıldı", !(await db.select().from(schema.googleRatingLock)).length);
  const calls3: string[] = [];
  const r3 = await runDaily("calisma-3", venues, mkApi("calisma-3"), fakeSource({}, calls3), { max: 5000, checkpoint: 50, now: day2 });
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
  const o = await saveFile(db, await writeWorkbook(old.slice(0, N), { generatedAt: new Date().toISOString() }), "elle", holder);
  const repOld = await importFile(db, (o as { id: string }).id, venues, "test");
  ok("eski tarihli dosya yeni veriyi ezemez", repOld.status === "applied" && repOld.written === 0, { status: repOld.status, written: repOld.written });
  await releaseLock(db, holder);
  const hist = await pg.query<{ n: number }>("select count(*)::int n from google_rating_history");
  ok("değişen puanlar geçmiş tablosunda", Number(hist.rows[0].n) >= writtenAll.length);

  console.log("\n8) Arka arkaya engelde nazikçe durma");
  /* Gece yarısından sonraki ilk saatte de day2'den farklı İstanbul günü. */
  const day3 = () => new Date(BASE);
  const allBlocked: Record<string, SourceResult> = Object.fromEntries([...ids.values()].flat().map((g) => [g.externalId, { kind: "blocked", reason: "olağandışı trafik" } as SourceResult]));
  const siteBefore = Object.keys(await loadGoogleRatings(db)).length;
  const callsB: string[] = [];
  const rb = await runDaily("calisma-4", venues, mkApi("calisma-4"), fakeSource(allBlocked, callsB), { max: 5000, now: day3 });
  ok("3 engelden sonra durur, kalanlar ertelenir, puan silinmez", callsB.length === 3 && rb.report.deferred === withPid - 3 && rb.report.stoppedEarly !== null && Object.keys(await loadGoogleRatings(db)).length === siteBefore, { calls: callsB.length, deferred: rb.report.deferred, stopped: rb.report.stoppedEarly, site: Object.keys(await loadGoogleRatings(db)).length, expectSite });
  ok("hiç puan alınamayan çalışma başarılı sayılmaz", rb.report.fresh + rb.report.same === 0);
  const rowsB = (await readWorkbook(rb.workbook)).rows;
  ok("ertelenen satırlar ertesi gün yeniden denenir", dueRows(rowsB, trDay(new Date(BASE + 864e5)), 1000).length === withPid);

  console.log("\n9) Kaynak adaptörü ayrıştırma (çevrimdışı)");
  ok("koordinat mekân işaretçisinden okunur", JSON.stringify(coordsFromUrl("https://www.google.com/maps/place/X/@41.0,29.0,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d41.0312!4d28.9824")) === JSON.stringify({ lat: 41.0312, lng: 28.9824 }));
  ok("CAPTCHA / izin / giriş sayfası tanınır", classifyUrl("https://www.google.com/sorry/index?continue=") === "sorry" && classifyUrl("https://consent.google.com/m?x") === "consent" && classifyUrl("https://accounts.google.com/v3/signin") === "login");
  const p = parseRaw({ name: " Nelipide ", ratingLabel: "4.6 stars ", ratingText: null, reviewsLabel: "1,234 reviews", reviewsText: null, address: "Address: Moda Cd. No:5, Kadıköy", closed: false }, "https://www.google.com/maps/place/@41,29,17z/data=!3d40.99!4d29.02");
  ok("puan, sayı ve adres ayrıştırılır", p.rating === 4.6 && p.reviews === 1234 && p.address === "Moda Cd. No:5, Kadıköy" && p.name === "Nelipide" && p.lat === 40.99);

  console.log("\n11) Veri kalitesi: tür, konaklama, sınırlı görünüm, kapanma, yönetici kararı");
  const at = new Date(Date.now() - 36e5).toISOString();
  const seenOk = (o: object) => ({ kind: "ok" as const, seen: { name: v0.name, address: "", rating: 4.6, reviews: 351, lat: v0.lat, lng: v0.lng, category: "Restaurant", ...o } });
  const tu = applyResult(row0, v0, seenOk({ category: "" }), at, src);
  ok("türü okunamayan kayıt: puan saklanır ama aktarılmaz (Adile Hanım Konağı vakası)", tu.status === STATUS.typeUnknown && tu.rating === 4.6 && !importable(tu).ok && !!hideReason(tu));
  const ts = applyResult(row0, v0, seenOk({ name: `Ağva ${v0.name} Butik Otel Cafe & Restaurant`, category: "" }), at, src);
  ok("Google'daki ad otel gösteriyorsa tür şüphesi (Nostalji vakası)", ts.status === STATUS.typeSuspect && !importable(ts).ok && /konaklama/.test(ts.error), ts.error);
  ok("mekânın kendi adında otel geçiyorsa şüphe yok", typeCheck({ name: "Pera Palace Hotel", category: "Restaurant" }, "Pera Palace Hotel Agatha") === null);
  ok("düğün salonu / kasap türü elle onaya kalır", typeCheck({ name: "X", category: "Wedding venue" }, "X")?.status === STATUS.typeSuspect && typeCheck({ name: "X", category: "Butcher shop" }, "X")?.status === STATUS.typeSuspect);
  const lim = applyResult(row0, v0, seenOk({ limited: true, reviews: 6 }), at, src);
  ok("sınırlı görünümde değerlendirme sayısı okunmaz (6.764 → 6 hatası)", lim.reviews === null && lim.view === "Sınırlı" && lim.rating === 4.6 && importable(lim).ok);
  const full = applyResult(row0, v0, seenOk({ reviews: 6764 }), at, src);
  ok("tam görünümde sayı alınır", full.reviews === 6764 && full.view === "Tam");
  ok("ayrıştırıcı sınırlı görünümde sayıyı atar", parseRaw({ name: "A", ratingLabel: "4.5 stars", ratingText: null, reviewsLabel: "6 reviews", reviewsText: null, address: null, closed: false, limited: true }, "https://x/").reviews === null);
  const cl = applyResult({ ...row0, rating: 4.1, checkedAt: at }, v0, seenOk({ closed: true }), at, src);
  ok("kalıcı kapalı: ayrı durum, eski puan silinmez, sitede gizlenir", cl.status === STATUS.closed && cl.rating === 4.1 && !importable(cl).ok && hideReason(cl) === "Google'da kalıcı kapalı" && finalState(cl).state === FINAL.closed);
  const clNext = applyResult(cl, v0, { kind: "error", reason: "Sayfa 30 sn içinde açılmadı" }, at, src);
  const tsNext = applyResult(ts, v0, { kind: "blocked", reason: "CAPTCHA" }, at, src);
  ok("geçici hata kanıtlı hükmü silmez (kapalı ve otel kaydı ertesi gün de gizli kalır)", clNext.status === STATUS.closed && tsNext.status === STATUS.typeSuspect && !importable(clNext).ok && !importable(tsNext).ok && /son deneme başarısız/.test(tsNext.error));
  const tsOk = applyResult(ts, v0, seenOk({}), at, src);
  ok("başarılı okuma hükmü günceller (Google kaydı düzelirse puan açılır)", [STATUS.fresh, STATUS.same].includes(tsOk.status as never) && importable(tsOk).ok, { st: tsOk.status, why: importable(tsOk).why });
  const pend = { ...full, confidence: CONFIDENCE.pending };
  const dec = (d: "onay" | "ret", placeId = pend.placeId) => ({ slug: pend.slug, placeId, decision: d, note: "elle bakıldı, adres ve ad aynı", actor: "test", at });
  ok("bekleyen eşleşme yönetici onayı olmadan aktarılmaz", !importable(pend).ok && finalState(pend).state === FINAL.awaitingMatch);
  ok("aynı place ID için onay → aktarılır; farklı place ID'ye verilen onay geçmez", importable(pend, dec("onay")).ok && !importable(pend, dec("onay", "ChIJbaskabirkimlik000")).ok);
  ok("tür şüphesi yalnız onayla açılır", importable(ts, { ...dec("onay"), slug: ts.slug, placeId: ts.placeId }).ok);
  ok("yönetici reddi aktarımı keser ve gizler", !importable(full, { ...dec("ret"), placeId: full.placeId }).ok && hideReason(full, { ...dec("ret"), placeId: full.placeId }) === "yönetici reddetti");
  ok("her satıra nihai durum ve gerekçe yazılır", withDerived([full, pend, cl, tu, baseRow(v0, { placeId: "", confidence: CONFIDENCE.none })], new Map()).every((r) => r.finalState && r.finalReason));
  const due2 = dueRows([{ ...row0, slug: "b", attemptAt: "2026-11-05T03:00:00Z", checkedAt: "" }, { ...row0, slug: "a", attemptAt: "2026-11-01T03:00:00Z", checkedAt: "2026-11-01T03:00:00Z" }, { ...row0, slug: "c", attemptAt: "" }], "2026-11-06", 10);
  ok("yeniden deneme sırası: hiç denenmemiş, sonra en eski deneme", due2.map((r) => r.slug).join() === "c,a,b", due2.map((r) => r.slug));

  /* veritabanı: önce gösterilen puan, olumsuz kanıt gelince gizlenir; karar denetim kaydına yazılır */
  const h2 = "kalite-test"; await acquireLock(db, h2);
  const cur = (await readWorkbook((await getFile(db, "son"))!.buf)).rows;
  const shownSlug = Object.keys(await loadGoogleRatings(db))[0];
  const tampered = cur.map((r) => (r.slug === shownSlug ? { ...r, seenName: `${r.name} Butik Otel`, checkedAt: new Date(Date.now() - 6e4).toISOString() } : r));
  const tf = await saveFile(db, await writeWorkbook(tampered, { generatedAt: new Date().toISOString() }), "elle", h2);
  const repH = await importFile(db, (tf as { id: string }).id, venues, "test");
  const mapH = await loadGoogleRatings(db);
  ok("olumsuz kanıt sitedeki eski puanı gizler (satır silinmez)", repH.status === "applied" && repH.hidden === 1 && !mapH[shownSlug] && (await db.select().from(schema.googleRatings).where(eq(schema.googleRatings.slug, shownSlug))).length === 1, { hidden: repH.hidden });
  const forged = await saveFile(db, await writeWorkbook(cur.map((r) => (r.slug === shownSlug ? { ...r, seenName: `${r.name} Hotel`, status: STATUS.fresh } : r)), { generatedAt: new Date().toISOString() }), "elle", h2);
  ok("Excel'de durum elle 'Güncel' yapılsa da sunucu kuralı yeniden uygular", (await importFile(db, (forged as { id: string }).id, venues, "test")).status === "applied" && !(await loadGoogleRatings(db))[shownSlug]);
  const row = tampered.find((r) => r.slug === shownSlug)!;
  const bad1 = await recordDecision(db, { slug: shownSlug, placeId: row.placeId, decision: "onay", note: "kısa", actor: "test" });
  ok("gerekçesiz karar kabul edilmez", !bad1.ok);
  const good = await recordDecision(db, { slug: shownSlug, placeId: row.placeId, decision: "onay", note: "Google'da açtım: aynı adres, restoran bölümü", actor: "test" });
  const repU = await importFile(db, (tf as { id: string }).id, venues, "test");
  ok("onaydan sonra aynı dosya yeniden aktarılınca puan geri gelir", good.ok && repU.unhidden === 1 && !!(await loadGoogleRatings(db))[shownSlug], { unhidden: repU.unhidden });
  const audit = await pg.query<{ n: number }>("select count(*)::int n from audit_log where action in ('google_rating_onay','google_rating_ret')");
  ok("karar denetim kaydında", Number(audit.rows[0].n) === 1 && (await latestDecisions(db)).get(shownSlug)?.decision === "onay");
  await recordDecision(db, { slug: shownSlug, placeId: row.placeId, decision: "ret", note: "ikinci bakış: puan otelin tamamına ait", actor: "test" });
  ok("ret anında gizler (sonraki aktarım beklenmez)", !(await loadGoogleRatings(db))[shownSlug]);
  const dr = await dailyReport(db);
  ok("günlük yönetici raporu sayıları üretir", dr.lastImport?.status === "applied" && typeof dr.site.shown === "number" && Object.keys(dr.final).length === Object.keys(FINAL).length);
  { const c0 = (await db.select().from(schema.googleRatings).where(eq(schema.googleRatings.slug, Object.keys(await loadGoogleRatings(db))[0])))[0];
    const lim = (await readWorkbook((await getFile(db, "son"))!.buf)).rows.map((r) => (r.slug === c0.slug ? { ...r, view: "", status: STATUS.fresh, reviews: 6, checkedAt: c0.checkedAt.toISOString() } : r));
    await db.update(schema.googleRatings).set({ reviewCount: 6 }).where(eq(schema.googleRatings.slug, c0.slug));
    const lf = await saveFile(db, await writeWorkbook(lim, { generatedAt: new Date().toISOString() }), "elle", h2);
    const lr = await importFile(db, (lf as { id: string }).id, venues, "test");
    const after0 = (await db.select().from(schema.googleRatings).where(eq(schema.googleRatings.slug, c0.slug)))[0];
    ok("aynı gözlemin yeniden değerlendirmesi veritabanına yazılır (sınırlı görünüm sayısı boşalır)", lr.status === "applied" && after0.reviewCount === null, { st: lr.status, n: after0.reviewCount }); }
  await releaseLock(db, h2);

  console.log("\n13) Tamamlama: yeni eşleşme, yinelenen Place ID, mutabakat");
  ok("Maps işletme kimliğinden Place ID (Hacıbaşar örneği birebir)", placeIdFromFtid("0x14cac63a39a60665:0xccfdc60afd25b2e2") === "ChIJZQamOTrGyhQR4rIl_QrG_cw" && ftidFromUrl("https://www.google.com/maps/place/X/data=!4m6!3m5!1s0x14cac63a39a60665:0xccfdc60afd25b2e2!8m2") === "0x14cac63a39a60665:0xccfdc60afd25b2e2");
  const h3 = "tamamla-test"; await acquireLock(db, h3);
  const noId = venues.find((v) => !ids.get(v.slug)?.length)!;
  const newPid = "ChIJyeniaday000000000001";
  const usedPid = [...ids.values()].flat().find((g) => g.status === "auto")!.externalId;
  const bad2 = await addMatch(db, { slug: noId.slug, placeId: usedPid, note: "başka mekânın kaydını bağlamayı dene", actor: "test" });
  ok("başka mekâna bağlı Google kaydı yeni eşleşme olarak eklenemez", !bad2.ok && (bad2 as { error: string }).error === "place_id_on_other_venue");
  const add = await addMatch(db, { slug: noId.slug, placeId: newPid, note: "arama: konum 6 m, ad 1,00, aynı adres", actor: "test" });
  const st = await pg.query<{ status: string }>(`select pi.status from place_identifiers pi join places p on p.id = pi.place_id where p.slug = '${noId.slug}' and pi.provider='google'`);
  ok("yeni eşleşme 'pending' kimlik + onay kararı olarak eklenir (ücretli Google özellikleri açılmaz)", add.ok && st.rows.length === 1 && st.rows[0].status === "pending" && (await latestDecisions(db)).get(noId.slug)?.placeId === newPid);
  const again = await addMatch(db, { slug: noId.slug, placeId: "ChIJbaskaaday00000000002", note: "ikinci aday, değiştirme yok", actor: "test" });
  ok("mekânın bekleyen başka kimliği varken değiştirme izni olmadan ikinci aday eklenmez", !again.ok);
  await releaseLock(db, h3);
  const rNew = await runDaily("calisma-yeni", venues, mkApi("calisma-yeni"), fakeSource(), { max: 5000, only: [noId.slug], force: true });
  ok("sonraki günlük çalışma yeni eşleşmeyi okur ve onaylı puanı sitede gösterir", rNew.report.attempted === 1 && !!(await loadGoogleRatings(db))[noId.slug], rNew.report.attempted);
  const dupRows = [{ ...row0, slug: "a", placeId: "ChIJortak00000000000001" }, { ...row0, slug: "b", placeId: "ChIJortak00000000000001" }, { ...row0, slug: "c" }];
  ok("aynı Place ID iki mekânda: denetimde yakalanır ve alt nedene yazılır", duplicatePlaceIds(dupRows).size === 1 && withDerived(dupRows, new Map())[0].subReasons.includes("aynı Place ID"));
  const allRows = (await readWorkbook(rNew.workbook)).rows;
  const der = withDerived(allRows, await latestDecisions(db), CLOSURES);
  const byMain: Record<string, number> = {}; for (const r of der.filter((x) => x.record === "Aktif")) byMain[r.mainState] = (byMain[r.mainState] ?? 0) + 1;
  ok(`mutabakat: her mekân tek ana durumda, toplam ${N}`, Object.values(byMain).reduce((a, b) => a + b, 0) === N && der.every((r) => (Object.values(MAIN) as string[]).includes(r.mainState)), byMain);
  ok("kesin kapalı kayıt onayla bile aktarılmaz", !importable({ ...full, status: STATUS.closed }, { ...dec("onay"), placeId: full.placeId }).ok && mainStatus(full, null, { state: "closed_confirmed" }).main === MAIN.closed);

  console.log("\n12) Kapanma kaydı: kesin kapalı mekân önerilerde ve Sor'da yok, profil korunur");
  { const vals = Object.values(CLOSURES); const conf = vals.filter((c) => c.state === "closed_confirmed").length;
    ok(`kapanış kaydı tutarlı (${vals.length} kayıt, ${conf} kesin)`, vals.length >= 52 && conf === CLOSED_CONFIRMED.size && conf >= 33 && vals.every((c) => ["closed_confirmed", "closed_suspected", "reopened"].includes(c.state)), { n: vals.length, c: CLOSED_CONFIRMED.size }); }
  ok("kesin kapalılar aktif öneri havuzunda yok, profil kaydı duruyor", activeEntities.length === realEntities.length - CLOSED_CONFIRMED.size && [...CLOSED_CONFIRMED].every((s) => realEntities.some((e) => e.slug === s)));
  ok("kesin kapalılar Sor Gidenler adaylarında yok", !SOR_VENUES.some((v) => CLOSED_CONFIRMED.has(v.slug)));
  ok("şüpheli kapanmalar sitede değişiklik yapmaz", Object.entries(CLOSURES).filter(([, c]) => c.state === "closed_suspected").every(([s]) => activeEntities.some((e) => e.slug === s)));

  console.log("\n10) Sıralama (Google verisi, 100+ değerlendirme)");
  const fake: Record<string, { rating: number; count: number; checkedAt: string; mapsUrl: string | null }> = {};
  const balik = realVenueRecords.filter((r) => r.kind === "Balık restoranı").slice(0, 6).map((r) => r.slug);
  balik.forEach((s, i) => (fake[s] = { rating: 4 + i * 0.1, count: i === 5 ? 40 : 500, checkedAt: new Date().toISOString(), mapsUrl: null }));
  const th = googleRankedThemes(fake, new Set()).find((t) => t.key === "balik");
  ok("tür içinde yüksek puan önde, 100'den az değerlendirme sıralamaya girmez", !!th && th.items[0].slug === balik[4] && !th.items.some((i) => i.slug === balik[5]) && th.few.some((i) => i.slug === balik[5]), th);

  /* telefon / web kimlik kanıtı */
  {
    const { phoneKey, webKey, idEvidence } = await import("../lib/gpuan/core");
    ok("telefon: +90 ve 0 önekleri aynı anahtar", phoneKey("+90 212 555 44 33") === phoneKey("0212 555 4433") && phoneKey("+90 212 555 44 33") === "2125554433");
    ok("telefon: kısa numara anahtar üretmez", phoneKey("444 1 234") === "");
    ok("web: www ve yol yok sayılır", webKey("https://www.ornek.com.tr/menu") === "ornek.com.tr" && webKey("ornek.com.tr") === "ornek.com.tr");
    ok("web: sosyal ağ / toplayıcı kanıt sayılmaz", webKey("https://instagram.com/ornek") === "" && webKey("https://linktr.ee/ornek") === "" && webKey("https://www.tripadvisor.com.tr/x") === "");
    const e1 = idEvidence({ phone: "0216 336 30 13" }, { phone: "+90 216 336 30 13" });
    const e2 = idEvidence({ phone: "0216 336 30 13" }, { phone: "+90 216 111 22 33" });
    ok("aynı telefon kanıt, farklı telefon çelişki", e1.phone && !e1.phoneConflict && !e2.phone && e2.phoneConflict);
    ok("parseRaw telefon/web taşır", (() => { const o = parseRaw({ name: "X", ratingLabel: null, ratingText: "4,5", reviewsLabel: null, reviewsText: null, address: null, closed: false, phone: "+90 212 1", website: "https://x.com" }, "https://www.google.com/maps/place/x/@41,29,17z"); return o.phone === "+90 212 1" && o.website === "https://x.com"; })());
  }

  console.log(`\n${pass} geçti, ${fail} başarısız`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
