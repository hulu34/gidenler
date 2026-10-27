import { readFileSync } from "node:fs";
/* ==========================================================================
   FAZ 0 TESTLERİ — gömülü Postgres (PGlite) + sahte Redis + sahte Google.
   Gerçek ağ çağrısı ve gerçek maliyet YOK. Çalıştır: npm run test:db
   ========================================================================== */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { setDbForTests, type Db } from "../lib/db/client";
import { seedRealVenues, verifyRealVenues, PILOT_SLUGS } from "../lib/db/seed";
import { applyMigrations, migrationStatus, type Executor } from "../lib/db/migrate";
import { MIGRATIONS } from "../lib/db/migrations.generated";
import { qualityReport, missingByRestaurant } from "../lib/db/quality";
import { rollbackSeed, rollbackSeedPreview, rollbackMigration, rollbackMigrationPreview, rollbackWave, rollbackWavePreview } from "../lib/db/rollback";
import { realVenueRecords } from "../data/real";
import { setRedisForTests, type RedisLike } from "../lib/usage/redis";
import { reserve, BUDGETS, usageSnapshot, budgetFor, periodKeys } from "../lib/usage/counter";
import { redisNs } from "../lib/usage/redis";
import { strictHit } from "../lib/usage/rate";
import { fetchGooglePlace, googleEnabled, matchGoogleBatch } from "../lib/providers/google";
import { matchScore } from "../lib/match/score";
import { assess } from "../lib/visits/verify";
import { experienceWeight } from "../lib/score/weights";
import { getTopic } from "../lib/api";
import { entities, DEMO_VISIBLE } from "../data/entities";
import { gidenler100 } from "../lib/venue";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, info?: unknown) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name}`, info ?? ""); }
};

/* ── sahte Redis: yalnız bizim iki Lua betiğimizi ve temel komutları taklit eder ── */
class FakeRedis {
  m = new Map<string, number>(); broken = false;
  private chk() { if (this.broken) throw new Error("down"); }
  async eval(script: string, keys: string[], args: string[]) {
    this.chk();
    if (script.includes("DECR")) {
      const [mk, dk] = keys; const mm = (this.m.get(mk) ?? 0) + 1, dd = (this.m.get(dk) ?? 0) + 1;
      if (mm > Number(args[0]) || dd > Number(args[1])) return 0;
      this.m.set(mk, mm); this.m.set(dk, dd); return 1;
    }
    const n = (this.m.get(keys[0]) ?? 0) + 1; this.m.set(keys[0], n); return n;
  }
  async get(k: string) { this.chk(); return this.m.has(k) ? String(this.m.get(k)) : null; }
  async set() { this.chk(); return "OK"; }
  async incr(k: string) { this.chk(); const n = (this.m.get(k) ?? 0) + 1; this.m.set(k, n); return n; }
  async expire() { return 1; }
  async mget(...ks: string[]) { this.chk(); return ks.map((k) => (this.m.has(k) ? String(this.m.get(k)) : null)); }
}

async function main() {
  console.log("\n1) Şema ve geçiş (PGlite)");
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as Db;
  const x: Executor = {
    async query<T>(t: string) { return (await pg.query(t)).rows as T[]; },
    async transaction(stmts: string[]) { await pg.transaction(async (tx) => { for (const st of stmts) { if (st.startsWith("SELECT pg_advisory")) continue; await tx.query(st); } }); },
  };
  const s0 = await migrationStatus(x);
  ok("başlangıçta tüm geçişler beklemede", s0.pending.length === MIGRATIONS.length && !s0.applied.length);
  const a1 = await applyMigrations(x);
  ok("geçişler uygulandı", a1.applied.length === MIGRATIONS.length && !a1.status.pending.length);
  const a2 = await applyMigrations(x);
  ok("ikinci çalıştırma hiçbir şey yapmaz (tekrar çalıştırılabilir)", a2.applied.length === 0);
  await pg.query(`UPDATE "_gidenler_migrations" SET hash = 'bozuk' WHERE tag = '${MIGRATIONS[0].tag}'`);
  let drift = false; try { await applyMigrations(x); } catch { drift = true; }
  ok("uygulanmış geçiş değişirse durur", drift);
  await pg.query(`UPDATE "_gidenler_migrations" SET hash = '${MIGRATIONS[0].hash}' WHERE tag = '${MIGRATIONS[0].tag}'`);
  const tables = await pg.query<{ n: number }>("select count(*)::int as n from information_schema.tables where table_schema='public'");
  ok("tüm tablolar oluştu (≥ 30)", tables.rows[0].n >= 30, tables.rows[0].n);

  console.log(`\n2) ${realVenueRecords.length} gerçek mekân tohumu`);
  const r1 = await seedRealVenues(db, realVenueRecords);
  ok(`ilk tohum ${realVenueRecords.length} mekân ekler`, r1.inserted === realVenueRecords.length && r1.total === realVenueRecords.length, r1);
  const r2 = await seedRealVenues(db, realVenueRecords);
  ok("ikinci tohum yeni kayıt eklemez (idempotent)", r2.inserted === 0 && r2.total === realVenueRecords.length, r2);
  const [pil] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.places).where(eq(schema.places.isPilot, true));
  ok("pilot mekân işaretli (Çiya Sofrası)", Number(pil.n) === PILOT_SLUGS.length);
  const [osm] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.placeIdentifiers).where(eq(schema.placeIdentifiers.provider, "osm"));
  ok("her mekânın OSM kimliği var", Number(osm.n) === realVenueRecords.length);
  const [prov] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.fieldProvenance);
  ok("alan kaynakları yazıldı", Number(prov.n) > realVenueRecords.length * 3, prov.n);
  const v = await verifyRealVenues(db, realVenueRecords);
  ok("bütünlük: eksiksiz, tekrarsız, OSM kimlikli", v.ok && v.present === realVenueRecords.length && v.duplicateSlugs === 0 && v.duplicateOsmRefs === 0 && v.missingOsmIdentifier === 0, v);
  ok("restoran hedefi: OSM 'restaurant' kayıtların hepsi restoran olarak var", v.restaurantTarget.present === v.restaurantTarget.expected, v.restaurantTarget);
  let rejected = false;
  try { await seedRealVenues(db, [{ ...realVenueRecords[0], slug: "bozuk-kayit", ref: "osm-yok", lat: 0 }]); } catch { rejected = true; }
  const [bozuk] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.places).where(eq(schema.places.slug, "bozuk-kayit"));
  ok("zorunlu alanı bozuk kayıt reddedilir, hiçbir şey yazılmaz", rejected && Number(bozuk.n) === 0);
  const q = await qualityReport(x);
  ok("kalite raporu: restoran sayısı ve alan doluluğu", q.restaurants > 0 && q.missingRequired === 0 && q.restaurantFields.address.count <= q.restaurants && q.restaurantFields.google.count === 0, { restaurants: q.restaurants, address: q.restaurantFields.address });
  ok("Commons görselleri sahibi, lisansı ve kaynak sayfasıyla", q.photoAttributionMissing === 0 && q.restaurantFields.photo.count === realVenueRecords.filter((r) => r.image && r.categoryId === "cat.restaurant").length, { missing: q.photoAttributionMissing, photo: q.restaurantFields.photo });
  const miss = await missingByRestaurant(x);
  ok("restoran başına eksik alan listesi", miss.length === q.restaurants && miss.every((m) => m.missing.includes("google") && m.missing.includes("menu")), miss[0]);
  const [ciya] = await db.select().from(schema.places).where(eq(schema.places.slug, "ciya-sofrasi-kadikoy"));

  console.log("\n3) Kullanıcı verisi ve ilişkiler (FK)");
  await db.insert(schema.user).values({ id: "u1", name: "Test", email: "t@example.test", handle: "test" });
  await db.insert(schema.userPlaceStatus).values({ userId: "u1", placeId: ciya.id, wantToGo: true });
  await db.insert(schema.userPlaceStatus).values({ userId: "u1", placeId: ciya.id, visited: true, wantToGo: false, favorite: true, visitCount: 1 })
    .onConflictDoUpdate({ target: [schema.userPlaceStatus.userId, schema.userPlaceStatus.placeId], set: { visited: true, wantToGo: false, favorite: true, visitCount: 1 } });
  const [st] = await db.select().from(schema.userPlaceStatus);
  ok("Gittim / Gitmek İstiyorum / Favori tek satırda güncellenir", st.visited && !st.wantToGo && st.favorite);
  await db.insert(schema.lists).values({ id: "l1", ownerId: "u1", title: "Kadıköy akşamları" });
  await db.insert(schema.dishes).values({ id: "d1", slug: "kuzu-pirzola", name: "Kuzu pirzola" });
  await db.insert(schema.listItems).values([{ id: "li1", listId: "l1", placeId: ciya.id }, { id: "li2", listId: "l1", dishId: "d1" }]);
  const li = await db.select().from(schema.listItems);
  ok("koleksiyon hem mekân hem yemek tutar", li.length === 2);
  await db.insert(schema.reviews).values({ id: "r1", placeId: ciya.id, userId: "u1", visitedOn: "2026-10-20", overall: 4.5, ratings: { lezzet: 5 }, body: "Test deneyimi." });
  await db.insert(schema.reviewDishes).values({ reviewId: "r1", dishId: "d1", rating: 5 });
  ok("deneyim ve yemek puanı kaydedilir", (await db.select().from(schema.reviewDishes)).length === 1);
  await db.insert(schema.rankings).values({ id: "rk1", slug: "gidenler-100-2026", title: "Gidenler 100 · 2026", scope: { city: "İstanbul", year: 2026 }, algorithmVersion: "v0", minEligible: { places: 100, reviewsPerPlace: 20 } });
  const [rk] = await db.select().from(schema.rankings);
  ok("Top 100 varsayılan olarak yayımlanmamış", rk.published === false);
  let fkErr = false;
  try { await db.insert(schema.reviews).values({ id: "r2", placeId: "yok", userId: "u1", visitedOn: "2026-10-20", overall: 4, ratings: {}, body: "x" }); } catch { fkErr = true; }
  ok("var olmayan mekâna deneyim yazılamaz (FK)", fkErr);

  console.log("\n4) Ücretli çağrı sayacı (çalışmazsa durdur)");
  setRedisForTests(null);
  ok("Redis yoksa çağrı reddedilir", (await reserve("google:details_atmosphere")).ok === false);
  const fake = new FakeRedis();
  setRedisForTests(fake as unknown as RedisLike);
  const day = BUDGETS["google:details_atmosphere"].daily;
  let granted = 0;
  for (let i = 0; i < day + 5; i++) if ((await reserve("google:details_atmosphere")).ok) granted++;
  ok(`günlük sınır tutuyor (${day})`, granted === day, granted);
  fake.broken = true;
  ok("Redis hata verirse çağrı reddedilir", (await reserve("google:photo")).ok === false);
  ok("ücretli yol hız sınırı Redis yokken kapalı", (await strictHit("x", 5, 60)) === false);
  fake.broken = false;
  const snap = await usageSnapshot();
  ok("kullanım özeti okunur", !!snap && snap["google:details_atmosphere"].day === day);
  ok("ortam ad alanları ayrı", redisNs("production") === "prod" && redisNs("preview") === "preview" && redisNs(undefined) === "dev");
  ok("sayaç anahtarı ortam önekli", periodKeys("google:photo").month.startsWith(`${redisNs()}:usage:`));
  ok("Preview payı %10, toplam ücretsiz kotanın altında",
    (Object.keys(BUDGETS) as (keyof typeof BUDGETS)[]).every((k) => budgetFor(k, "preview").monthly + budgetFor(k, "production").monthly < (k === "google:text_search_pro" ? 5000 : 1000)));

  console.log("\n5) Google adaptörü (sahte API, gerçek çağrı yok)");
  setDbForTests(db);
  const fake2 = new FakeRedis(); setRedisForTests(fake2 as unknown as RedisLike);
  process.env.GOOGLE_PLACES_API_KEY = "TEST_KEY_NOT_REAL";
  ok("Preview'da ücretli Google çağrıları varsayılan kapalı", googleEnabled("preview") === false && googleEnabled("production") === true);
  const calls: string[] = []; const masks: string[] = []; let keyInUrl = false;
  const mkFetch = (cand: { name: string; lat: number; lng: number; phone?: string; web?: string }) => (async (url: string, init?: RequestInit) => {
    calls.push(String(url)); if (String(url).includes("TEST_KEY")) keyInUrl = true;
    const h = (init?.headers ?? {}) as Record<string, string>;
    masks.push(`${String(url).endsWith(":searchText") ? "search" : "details"}:${h["X-Goog-FieldMask"] ?? ""}`);
    if (h["X-Goog-FieldMask"] === "nationalPhoneNumber,websiteUri") return Response.json({ nationalPhoneNumber: cand.phone, websiteUri: cand.web });
    if (h["X-Goog-Api-Key"] !== "TEST_KEY_NOT_REAL") return new Response("{}", { status: 403 });
    if (String(url).endsWith(":searchText")) return Response.json({ places: [{ id: "GID1", displayName: { text: cand.name }, location: { latitude: cand.lat, longitude: cand.lng } }] });
    if (String(url).includes("/media")) return Response.json({ photoUri: "https://lh3.example/p.jpg" });
    return Response.json({ rating: 4.6, userRatingCount: 1000, googleMapsUri: "https://maps.google.com/?cid=1",
      photos: [{ name: "places/GID1/photos/a" }, { name: "places/GID1/photos/b" }, { name: "places/GID1/photos/c" }],
      reviews: Array.from({ length: 7 }, (_, i) => ({ rating: 5, text: { text: `yorum ${i}` }, authorAttribution: { displayName: `Kişi ${i}` } })) });
  }) as unknown as typeof fetch;

  const g1 = await fetchGooglePlace("ciya-sofrasi-kadikoy", mkFetch({ name: "Çiya Sofrası", lat: ciya.lat!, lng: ciya.lng! + 0.0002 }));
  ok("doğru aday otomatik eşleşir, içerik gelir", g1.state === "ok", g1);
  if (g1.state === "ok") {
    ok("en çok 5 yorum", g1.data.reviews.length === 5);
    ok("en çok 2 fotoğraf", g1.data.photos.length === 2);
  }
  ok("anahtar hiçbir URL'de yok", !keyInUrl);
  const [gid] = await db.select().from(schema.placeIdentifiers).where(eq(schema.placeIdentifiers.provider, "google"));
  ok("yalnız place_id saklandı (auto)", gid?.externalId === "GID1" && gid.status === "auto");
  calls.length = 0;
  await fetchGooglePlace("ciya-sofrasi-kadikoy", mkFetch({ name: "x", lat: 0, lng: 0 }));
  ok("ikinci açılışta eşleştirme araması yapılmaz", !calls.some((u) => u.endsWith(":searchText")));
  const used = await usageSnapshot();
  ok("sayaç: 1 arama, 2 detay, 4 foto", used?.["google:text_search_pro"].month === 1 && used["google:details_atmosphere"].month === 2 && used["google:photo"].month === 4, used);

  const moda = (await db.select().from(schema.places).where(sql`${schema.places.slug} <> 'ciya-sofrasi-kadikoy' and ${schema.places.district} = 'Kadıköy'`).limit(1))[0];
  const g2 = await fetchGooglePlace(moda.slug, mkFetch({ name: moda.name + " Şubesi", lat: moda.lat! + 0.00135, lng: moda.lng! }));
  ok("şüpheli aday manuel onaya gider, içerik gösterilmez", g2.state === "unmatched" && g2.reason === "pending_review", g2);
  const mq = await db.select().from(schema.moderationQueue);
  ok("moderasyon kuyruğuna düştü", mq.length === 1);
  const g2b = await fetchGooglePlace(moda.slug, mkFetch({ name: "Bambaşka Bir İşletme", lat: moda.lat! + 0.0009, lng: moda.lng! }));
  ok("onay beklerken tekrar arama yapılmaz, içerik yine gösterilmez", g2b.state === "unmatched" && g2b.reason === "pending_review", g2b);

  const ENTERPRISE = ["nationalPhoneNumber", "websiteUri", "rating", "userRatingCount", "regularOpeningHours", "reviews", "priceLevel"];
  ok("eşleştirme araması yalnız Pro alanları ister (Enterprise yok)", masks.filter((m) => m.startsWith("search:")).every((m) => !ENTERPRISE.some((f) => m.includes(f))), masks);
  const [modaRow] = await db.select().from(schema.placeIdentifiers).where(sql`${schema.placeIdentifiers.provider} = 'google' and ${schema.placeIdentifiers.status} = 'pending'`);
  const mqAll = await db.select().from(schema.moderationQueue);
  ok("Google içeriği (aday adı) hiçbir tabloya yazılmaz", !mqAll.some((m) => (m.reason ?? "").includes("Şubesi")) && !(modaRow?.matchMethod ?? "").includes("Şubesi"), { reason: mqAll[0]?.reason, method: modaRow?.matchMethod });
  /* telefon/web çelişkisi: ad ve konum birebir olsa da otomatik onay verilmez */
  const withPhone = (await db.select().from(schema.places).where(sql`${schema.places.phone} is not null and ${schema.places.vertical} = 'restaurant' and ${schema.places.slug} <> ${moda.slug}`).limit(1))[0];
  masks.length = 0;
  const g4 = await fetchGooglePlace(withPhone.slug, mkFetch({ name: withPhone.name, lat: withPhone.lat!, lng: withPhone.lng!, phone: "0212 000 00 00", web: "https://baska-isletme.example" }));
  ok("telefon ve web çelişirse onaya gider", g4.state === "unmatched" && g4.reason === "pending_review", g4);
  ok("doğrulama için yalnız telefon+web istenir (Enterprise detay)", masks.includes("details:nationalPhoneNumber,websiteUri"), masks);
  /* toplu eşleştirme: kota biterse durur, fazla çağrı yapmaz */
  const fake3 = new FakeRedis(); setRedisForTests(fake3 as unknown as RedisLike);
  for (let i = 0; i < BUDGETS["google:text_search_pro"].daily - 2; i++) await reserve("google:text_search_pro");
  calls.length = 0;
  const b = await matchGoogleBatch(25, mkFetch({ name: "Hiç Benzemeyen Ad", lat: 0, lng: 0 }));
  ok("toplu eşleştirme günlük kotada durur", b.results.length <= 3 && b.results.at(-1)?.status === "limit" && calls.filter((u) => u.endsWith(":searchText")).length === 2, { n: b.results.length, last: b.results.at(-1)?.status, searches: calls.filter((u) => u.endsWith(":searchText")).length });

  setRedisForTests(null); calls.length = 0;
  const g3 = await fetchGooglePlace("ciya-sofrasi-kadikoy", mkFetch({ name: "Çiya Sofrası", lat: ciya.lat!, lng: ciya.lng! }));
  ok("Redis yokken Google'a hiç istek gitmez", g3.state === "limit" && calls.length === 0, { g3, calls });
  delete process.env.GOOGLE_PLACES_API_KEY;
  ok("anahtar yokken kapalı", (await fetchGooglePlace("ciya-sofrasi-kadikoy")).state === "disabled");

  console.log("\n6) Eşleştirme puanı");
  const base = { name: "Çiya Sofrası", lat: 40.989347, lng: 29.024429 };
  ok("aynı ad, 20 m → otomatik", matchScore(base, { ...base, lng: base.lng + 0.0002 }).decision === "auto");
  ok("farklı ad, 100 m → ret ya da onay", matchScore(base, { name: "Kadıköy Balıkçısı", lat: base.lat + 0.0009, lng: base.lng }).decision !== "auto");
  ok("300 m → ret", matchScore(base, { ...base, lat: base.lat + 0.003 }).decision === "reject");

  console.log("\n7) Ziyaret doğrulama (kod tek başına kanıt değil)");
  const t = "2026-10-20T19:00:00Z", rv = "2026-10-21T10:00:00Z";
  ok("yalnız rezervasyon kodu → doğrulanmış sayılmaz", !assess([{ kind: "reservation_created", at: t }], { reservationAt: t, reviewAt: rv }).countsAsVerified);
  ok("yalnız konum → doğrulanmış sayılmaz", !assess([{ kind: "geo_checkin", at: t }], { reviewAt: rv }).countsAsVerified);
  ok("kod + işletmenin 'oturdu' onayı → doğrulanmış", assess([{ kind: "reservation_created", at: t }, { kind: "business_seated", at: t }], { reservationAt: t, reviewAt: rv }).countsAsVerified);
  ok("işletmenin toplu onay patlaması → doğrulanmaz", !assess([{ kind: "reservation_created", at: t }, { kind: "business_seated", at: t }], { reservationAt: t, reviewAt: rv, businessSeatedBurst: true }).countsAsVerified);
  ok("işletmeyle ilişkili yazar → none", assess([{ kind: "business_seated", at: t }, { kind: "receipt", at: t }], { reviewAt: rv, authorRelatedToBusiness: true }).level === "none");
  ok("aynı kodla ikinci deneyim → zayıf", assess([{ kind: "business_seated", at: t }, { kind: "receipt", at: t }], { reviewAt: rv, codeAlreadyUsed: true }).level === "weak");

  console.log("\n8) Puan ticari ilişkiden bağımsız · demo görünürlüğü");
  const { demoPaths } = await import("./gen-demo-paths");
  ok("demo adres listesi (middleware) güncel", JSON.stringify(demoPaths()) === JSON.stringify(JSON.parse(readFileSync(new URL("../data/demoPaths.json", import.meta.url), "utf8"))));
  if (!DEMO_VISIBLE) {
    ok("demo kapalı: uygulama listesinde demo kayıt yok", entities.every((e) => !e.isDemo) && entities.length === realVenueRecords.length);
    ok("demo kapalı: Gidenler 100 yalnız gerçek", gidenler100().every((c) => !c.entity.isDemo));
    console.log("  · puan bağımsızlığı testi demo kayıt ister: NEXT_PUBLIC_SHOW_DEMO=true ile çalışır (npm run test:db iki modu da koşar)");
  } else {
    const demo = entities.find((e) => e.isDemo && (e.experienceTotal ?? 0) > 20 && e.categoryId === "cat.restaurant")!;
    const before = getTopic(demo.slug)?.intelligence?.overallScore;
    const saved = { b: demo.business, r: demo.reservation };
    demo.business = { claimed: true, subscription: "panel" };
    demo.reservation = { mode: "gidenler" };
    const after = getTopic(demo.slug)?.intelligence?.overallScore;
    demo.business = saved.b; demo.reservation = saved.r;
    ok(`abonelik + rezervasyon ortaklığı puanı değiştirmez (${demo.slug}: ${before} = ${after})`, before !== undefined && before === after);
    const w = (d: Parameters<typeof experienceWeight>[0]["authorDisclosure"]) => experienceWeight({ visitedAt: "2026-10-01", verified: true, authorReputation: 50, authorDisclosure: d }, new Date("2026-10-25"));
    ok("işletme sahibi / çalışanı puana girmez (ağırlık 0)", w("owner_related") === 0 && w("employee") === 0);
    ok("davetli yazar daha az etkili", w("invited") < w("none"));
  }

  console.log("\n9) Geri dönüş (kullanıcı verisi varsa durur)");
  const sp = await rollbackSeedPreview(x);
  ok("tohum geri alma: kullanıcı verisi bağlı → güvenli değil", !sp.safe && sp.linkedUserRows > 0, sp);
  let stopped = false; try { await rollbackSeed(x); } catch { stopped = true; }
  ok("tohum geri alma kullanıcı verisi varken durur", stopped);
  const mp = await rollbackMigrationPreview(x);
  ok("geçiş geri alma: kullanıcı var → güvenli değil", !mp.safe && mp.users >= 1, mp);
  let stopped2 = false; try { await rollbackMigration(x); } catch { stopped2 = true; }
  ok("geçiş geri alma kullanıcı varken durur", stopped2);
  const w1 = realVenueRecords.filter((r) => r.wave === 1).map((r) => r.slug);
  const wp = await rollbackWavePreview(x, w1);
  ok("dalga geri alma: kullanıcı verisi ilk 148'de, dalga 1 güvenli", wp.safe && wp.places === w1.length, wp);
  const wr = await rollbackWave(x, w1);
  const [placesLeft] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.places);
  ok(`dalga 1 geri alındı (${wr.removedPlaces}), önceki kayıtlar ve kullanıcı verisi duruyor`, Number(placesLeft.n) === realVenueRecords.length - w1.length && (await rollbackSeedPreview(x)).linkedUserRows > 0);
  const back = await seedRealVenues(db, realVenueRecords);
  ok("dalga 1 yeniden eklendi, eski kimlikler korundu", back.inserted === w1.length && back.total === realVenueRecords.length, back);
  await pg.query(`DELETE FROM "user"`);
  const rs = await rollbackSeed(x);
  ok(`tohum geri alındı (${rs.removedPlaces} mekân)`, rs.removedPlaces === realVenueRecords.length);
  const rm = await rollbackMigration(x);
  const left = await pg.query<{ n: number }>("select count(*)::int as n from information_schema.tables where table_schema='public' and table_name <> '_gidenler_migrations'");
  ok(`geçiş geri alındı (${rm.droppedTables} tablo), şema boş`, left.rows[0].n === 0, left.rows[0]);
  const again = await applyMigrations(x);
  ok("geri alındıktan sonra yeniden uygulanabilir", again.applied.length === MIGRATIONS.length);
  const reseed = await seedRealVenues(db, realVenueRecords);
  ok(`yeniden tohum ${realVenueRecords.length}/${realVenueRecords.length}`, reseed.inserted === realVenueRecords.length && (await verifyRealVenues(db, realVenueRecords)).ok);

  console.log(`\nSonuç: ${pass} geçti, ${fail} kaldı`);
  await pg.close();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
