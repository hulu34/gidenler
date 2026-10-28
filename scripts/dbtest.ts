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
import { reserve, BUDGETS, usageSnapshot, budgetFor, periodKeys, spendReport, usdCap } from "../lib/usage/counter";
import { redisNs } from "../lib/usage/redis";
import { strictHit } from "../lib/usage/rate";
import { fetchGooglePlace, googleEnabled, matchGoogleBatch, resolveGooglePlaceId, retryGoogleNoMatch, reviewGoogleMatch, rollbackGoogleMatches, searchName } from "../lib/providers/google";
import { matchScore, brandKey, branchDiff, preDecide, postDecide } from "../lib/match/score";
import { parseVideoUrl, embedUrl } from "../lib/media/embed";
import { addPlaceVideo, listPlaceVideos, removePlaceVideo } from "../lib/media/store";
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
      /* counter.ts LUA: kalem sınırları + toplam harcama tavanı (aynı sıra ve anlamla) */
      const [mk, dk, ...all] = keys; const mm = (this.m.get(mk) ?? 0) + 1, dd = (this.m.get(dk) ?? 0) + 1;
      if (mm > Number(args[0]) || dd > Number(args[1])) return 0;
      this.m.set(mk, mm); this.m.set(dk, dd);
      let spend = 0;
      all.forEach((k, i) => { const n = this.m.get(k) ?? 0, free = Number(args[5 + i * 2]), micro = Number(args[6 + i * 2]); if (n > free) spend += (n - free) * micro; });
      if (spend > Number(args[4])) { this.m.set(mk, mm - 1); this.m.set(dk, dd - 1); return -1; }
      return 1;
    }
    const n = (this.m.get(keys[0]) ?? 0) + 1; this.m.set(keys[0], n); return n;
  }
  async get(k: string) { this.chk(); return this.m.has(k) ? String(this.m.get(k)) : null; }
  async set(k: string, v: unknown) { this.chk(); this.m.set(k, Number(v) || 1); return "OK"; }
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
  /* toplam aylık harcama tavanı (100 USD): ücretsiz kota önce; tavan aşılacaksa HİÇBİR kalem çağrı yapamaz */
  const capFake = new FakeRedis(); setRedisForTests(capFake as unknown as RedisLike);
  capFake.m.set(periodKeys("google:text_search_pro").month, 7000);       // 2.000 × $0,032 = $64
  ok("ücretsiz kota aşılmış ama tavan altında: çağrı yapılır", (await reserve("google:details_atmosphere")).ok);
  capFake.m.set(periodKeys("google:details_enterprise").month, 2900);    // + 1.900 × $0,02 = $38 → $102
  const capped = await reserve("google:photo");
  ok("toplam 100 USD tavanı aşılırsa her kalem durur (spend_cap)", !capped.ok && capped.reason === "spend_cap", capped);
  ok("reddedilen istek sayacı geri alınır", Number(capFake.m.get(periodKeys("google:photo").month) ?? 0) === 0);
  const rep = await spendReport();
  ok("maliyet raporu: kalem bazında USD ve toplam", !!rep && rep.usd === 102 && rep.perSku["google:text_search_pro"].usd === 64 && rep.capUsd === 100, rep);
  ok("tavan ortam değişkeniyle 100'ün üstüne çıkarılamaz", (process.env.GOOGLE_MONTHLY_USD_CAP = "500", usdCap()) === 100);
  delete process.env.GOOGLE_MONTHLY_USD_CAP;
  setRedisForTests(fake as unknown as RedisLike);
  ok("ortam ad alanları ayrı", redisNs("production") === "prod" && redisNs("preview") === "preview" && redisNs(undefined) === "dev");
  ok("sayaç anahtarı ortam önekli", periodKeys("google:photo").month.startsWith(`${redisNs()}:usage:`));
  ok("Preview payı Production'ın %10'u",
    (Object.keys(BUDGETS) as (keyof typeof BUDGETS)[]).every((k) => budgetFor(k, "preview").monthly * 10 <= budgetFor(k, "production").monthly));

  console.log("\n5) Google adaptörü (sahte API, gerçek çağrı yok)");
  setDbForTests(db);
  const fake2 = new FakeRedis(); setRedisForTests(fake2 as unknown as RedisLike);
  process.env.GOOGLE_PLACES_API_KEY = "TEST_KEY_NOT_REAL";
  ok("Preview'da ücretli Google çağrıları varsayılan kapalı", googleEnabled("preview") === false && googleEnabled("production") === true);
  const calls: string[] = []; const masks: string[] = []; let keyInUrl = false;
  const mkFetch = (cand: { name: string; lat: number; lng: number; phone?: string; web?: string; id?: string }) => (async (url: string, init?: RequestInit) => {
    calls.push(String(url)); if (String(url).includes("TEST_KEY")) keyInUrl = true;
    const h = (init?.headers ?? {}) as Record<string, string>;
    masks.push(`${String(url).endsWith(":searchText") ? "search" : "details"}:${h["X-Goog-FieldMask"] ?? ""}`);
    if (h["X-Goog-FieldMask"] === "nationalPhoneNumber,websiteUri") return Response.json({ nationalPhoneNumber: cand.phone, websiteUri: cand.web });
    if (h["X-Goog-Api-Key"] !== "TEST_KEY_NOT_REAL") return new Response("{}", { status: 403 });
    if (String(url).endsWith(":searchText")) return Response.json({ places: [{ id: cand.id ?? "GID1", displayName: { text: cand.name }, location: { latitude: cand.lat, longitude: cand.lng } }] });
    if (String(url).includes("/media")) return Response.json({ photoUri: "https://lh3.example/p.jpg" });
    return Response.json({ rating: 4.6, userRatingCount: 1000, googleMapsUri: "https://maps.google.com/?cid=1",
      photos: [{ name: "places/GID1/photos/a" }, { name: "places/GID1/photos/b" }, { name: "places/GID1/photos/c" }],
      reviews: Array.from({ length: 7 }, (_, i) => ({ rating: 5, text: { text: `yorum ${i}` }, authorAttribution: { displayName: `Kişi ${i}` } })) });
  }) as unknown as typeof fetch;

  const K = "TEST_KEY_NOT_REAL";
  const g0 = await fetchGooglePlace("ciya-sofrasi-kadikoy", mkFetch({ name: "Çiya Sofrası", lat: ciya.lat!, lng: ciya.lng! }));
  ok("sayfa görüntülemesi eşleştirme yapmaz (Google'a hiç istek yok)", g0.state === "unmatched" && calls.length === 0, { g0, calls });
  const m1 = await resolveGooglePlaceId("ciya-sofrasi-kadikoy", K, mkFetch({ name: "Çiya Sofrası", lat: ciya.lat!, lng: ciya.lng! + 0.0002 }));
  ok("güçlü eşleşme (aynı ad, ~17 m) otomatik ve Enterprise çağrısı YAPMAZ", m1.status === "auto" && m1.calls.detailsEnterprise === 0 && !masks.some((x) => x.includes("nationalPhoneNumber")), m1);
  const [gid] = await db.select().from(schema.placeIdentifiers).where(eq(schema.placeIdentifiers.provider, "google"));
  ok("yalnız place_id saklandı (auto)", gid?.externalId === "GID1" && gid.status === "auto");
  const g1 = await fetchGooglePlace("ciya-sofrasi-kadikoy", mkFetch({ name: "x", lat: 0, lng: 0 }));
  ok("yorumlar yalnız istenince: puan + en çok 5 yorum, fotoğraf yok", g1.state === "ok" && g1.data.reviews.length === 5 && g1.data.photos.length === 0, g1);
  const g1p = await fetchGooglePlace("ciya-sofrasi-kadikoy", mkFetch({ name: "x", lat: 0, lng: 0 }), "photos");
  ok("fotoğraflar ayrı istekle, en çok 2", g1p.state === "ok" && g1p.data.photos.length === 2, g1p);
  ok("fotoğraf isteği yalnız photos alanını ister (Essentials)", masks.includes("details:photos"), masks);
  ok("anahtar hiçbir URL'de yok", !keyInUrl);
  ok("kayıtlı eşleşmeden sonra eşleştirme araması yapılmaz", calls.filter((u) => u.endsWith(":searchText")).length === 1);
  const againG = await resolveGooglePlaceId("ciya-sofrasi-kadikoy", K, mkFetch({ name: "x", lat: 0, lng: 0 }));
  ok("onaylı/otomatik kayıt yeniden taranmaz", againG.status === "existing" && againG.calls.textSearch === 0, againG);
  const used = await usageSnapshot();
  ok("sayaç: 1 arama, 0 doğrulama, 1 yorum, 1 foto listesi, 2 foto", used?.["google:text_search_pro"].month === 1 && used["google:details_enterprise"].month === 0
    && used["google:details_atmosphere"].month === 1 && used["google:details_essentials"].month === 1 && used["google:photo"].month === 2, used);

  const moda = (await db.select().from(schema.places).where(sql`${schema.places.slug} <> 'ciya-sofrasi-kadikoy' and ${schema.places.district} = 'Kadıköy'`).limit(1))[0];
  const m2 = await resolveGooglePlaceId(moda.slug, K, mkFetch({ name: moda.name + " Şubesi", lat: moda.lat! + 0.00135, lng: moda.lng! }));
  ok("şube adı farkı + 150 m → manuel onay", m2.status === "pending", m2);
  const g2 = await fetchGooglePlace(moda.slug, mkFetch({ name: "x", lat: 0, lng: 0 }));
  ok("onay beklerken içerik gösterilmez", g2.state === "unmatched" && g2.reason === "pending_review", g2);
  const mq = await db.select().from(schema.moderationQueue);
  ok("moderasyon kuyruğuna düştü", mq.length === 1 && mq[0].status === "open");

  const ENTERPRISE = ["nationalPhoneNumber", "websiteUri", "rating", "userRatingCount", "regularOpeningHours", "reviews", "priceLevel"];
  ok("eşleştirme araması yalnız Pro alanları ister (Enterprise yok)", masks.filter((m) => m.startsWith("search:")).every((m) => !ENTERPRISE.some((f) => m.includes(f))), masks);
  const [modaRow] = await db.select().from(schema.placeIdentifiers).where(sql`${schema.placeIdentifiers.provider} = 'google' and ${schema.placeIdentifiers.status} = 'pending'`);
  ok("Google içeriği (aday adı) hiçbir tabloya yazılmaz", !mq.some((m) => (m.reason ?? "").includes("Şubesi")) && !(modaRow?.matchMethod ?? "").includes("Şubesi"), { reason: mq[0]?.reason, method: modaRow?.matchMethod });

  /* onay: kuyruk satırı silinmez, geçmiş olarak "approved" kalır */
  const rvG = await reviewGoogleMatch(modaRow.id, "confirmed");
  const mqAfter = await db.select().from(schema.moderationQueue);
  ok("onay kuyruk satırını silmez, kapatır (approved)", rvG.ok && mqAfter.length === 1 && mqAfter[0].status === "approved" && !!mqAfter[0].decidedAt, mqAfter);

  /* zincir: markamız iki mekânda → web eşleşmesi tek başına yetmez; telefon eşleşirse otomatik */
  const withContact = (await db.select().from(schema.places).where(sql`${schema.places.phone} is not null and ${schema.places.website} is not null and ${schema.places.vertical} = 'restaurant' and ${schema.places.slug} not in (${moda.slug}, 'ciya-sofrasi-kadikoy')`).limit(2));
  const [c1, c2] = withContact;
  const chainBrands = new Map([[brandKey(c1.name), 2]]);
  masks.length = 0;
  const m3 = await resolveGooglePlaceId(c1.slug, K, mkFetch({ name: c1.name, lat: c1.lat! + 0.0002, lng: c1.lng!, phone: "0212 000 00 00", web: c1.website!, id: "GID_C1" }), chainBrands);
  ok("zincir: aynı site ama farklı telefon → manuel onay (şube karışmaz)", m3.status === "pending" && m3.chain === true && m3.calls.detailsEnterprise === 1, m3);
  ok("doğrulama için yalnız telefon+web istenir (Enterprise detay)", masks.includes("details:nationalPhoneNumber,websiteUri"), masks);
  await db.delete(schema.moderationQueue).where(eq(schema.moderationQueue.refTable, "place_identifiers"));
  await db.delete(schema.placeIdentifiers).where(eq(schema.placeIdentifiers.placeId, c1.id));
  const m4 = await resolveGooglePlaceId(c1.slug, K, mkFetch({ name: c1.name, lat: c1.lat! + 0.0002, lng: c1.lng!, phone: c1.phone!, web: c1.website!, id: "GID_C1" }), chainBrands);
  ok("zincir: telefon birebir ve ≤ 40 m → otomatik", m4.status === "auto", m4);
  /* zincir değil, 60 m: alt alan adlı web sitesi (siparis.marka.com) eşleşme sayılır */
  const site = new URL(/^https?:/.test(c2.website!) ? c2.website! : `https://${c2.website}`).hostname.replace(/^www\./, "");
  const m5 = await resolveGooglePlaceId(c2.slug, K, mkFetch({ name: c2.name, lat: c2.lat! + 0.00054, lng: c2.lng!, phone: "0212 000 00 00", web: `https://siparis.${site}/`, id: "GID_C2" }));
  ok("alt alan adlı site aynı site sayılır; telefon farkı tek başına engel değil", m5.status === "auto" && m5.website === "match" && m5.phone === "conflict", m5);
  ok("şube eki listede olmasa da işaretlenir (Bambi Cafe ↔ Bambi Cafe Gayrettepe)", branchDiff("Bambi Cafe", "Bambi Cafe Gayrettepe").includes("gayrettepe") && branchDiff("Antiochia", "Antiochia").length === 0);
  const gelik = (await db.select().from(schema.places).where(sql`${schema.places.website} is not null and ${schema.places.vertical} = 'restaurant' and ${schema.places.slug} not in (${moda.slug}, 'ciya-sofrasi-kadikoy', ${c1.slug}, ${c2.slug})`).limit(1))[0];
  await db.update(schema.places).set({ name: `${gelik.name} Ataköy`, phone: null }).where(eq(schema.places.id, gelik.id));
  const m6 = await resolveGooglePlaceId(gelik.slug, K, mkFetch({ name: gelik.name, lat: gelik.lat! + 0.00015, lng: gelik.lng!, web: gelik.website!, id: "GID_C3" }));
  await db.update(schema.places).set({ name: gelik.name, phone: gelik.phone }).where(eq(schema.places.id, gelik.id));
  ok("şube adı bizim kaydımızda (… Ataköy) ve yalnız web eşleşiyorsa → manuel onay", m6.status === "pending" && (m6.branch ?? []).includes("atakoy"), m6);
  ok("karar katmanı: 120 m asla otomatik değil", preDecide({ score: 0.9, name: 1, distanceM: 120, decision: "auto", phone: "unknown", website: "unknown", address: null }, { chain: false, branch: [], rival: false, addrConflict: false }, true).decision !== "auto");
  ok("karar katmanı: kapı no çelişkisi → onay", postDecide({ score: 1, name: 1, distanceM: 10, decision: "auto", phone: "match", website: "match", address: 1 }, { chain: false, branch: [], rival: false, addrConflict: true }).decision === "review");

  /* eşleşmesi bulunamayan restoran sonraki partide yeniden aranmaz */
  const fake4 = new FakeRedis(); setRedisForTests(fake4 as unknown as RedisLike);
  calls.length = 0;
  const nb1 = await matchGoogleBatch(3, mkFetch({ name: "Hiç Benzemeyen Ad", lat: 0, lng: 0 }));
  const nb2 = await matchGoogleBatch(3, mkFetch({ name: "Hiç Benzemeyen Ad", lat: 0, lng: 0 }));
  const s1 = nb1.results.map((x) => x.slug), s2 = nb2.results.map((x) => x.slug);
  ok("eşleşmeyen restoran sonraki partide yeniden aranmaz", s1.length === 3 && s2.length === 3 && !s2.some((x) => s1.includes(x)) && nb2.noMatchRecent === 6, { s1, s2, n: nb2.noMatchRecent });

  /* alternatif arama: yalnız 30 gün içinde eşleşmesi bulunamamış olanlar, her biri bir kez; yakın kutu sonra telefon */
  ok("arama adı genel sözcükleri atar", searchName("Sırdaş Lokanta") === "Sırdaş" && searchName("Restaurant") === "Restaurant");
  const bodies: string[] = [];
  const far = (await db.select().from(schema.places).where(sql`${schema.places.phone} is not null and ${schema.places.vertical} = 'restaurant'`).orderBy(schema.places.slug).limit(1))[0];
  const retryFetch = (async (url: string, init?: RequestInit) => {
    const h = (init?.headers ?? {}) as Record<string, string>;
    if (String(url).endsWith(":searchText")) { bodies.push(String(init?.body)); const b = JSON.parse(String(init?.body));
      return Response.json({ places: b.locationRestriction ? [] : [{ id: "GID_FAR", displayName: { text: far.name }, location: { latitude: far.lat! + 0.02, longitude: far.lng! } }] }); }
    if (h["X-Goog-FieldMask"] === "nationalPhoneNumber,websiteUri") return Response.json({ nationalPhoneNumber: far.phone });
    return Response.json({});
  }) as unknown as typeof fetch;
  const rt1 = await retryGoogleNoMatch(1, retryFetch);
  const one = rt1.results[0];
  ok("önce yakın kutu (locationRestriction, sade ad), sonra telefonla arama", bodies.length === 2 && bodies[0].includes("locationRestriction") && bodies[1].includes(JSON.stringify(far.phone).slice(1, -1)), { bodies, one });
  ok("telefon birebir ama 2 km uzak → asla otomatik değil, manuel onay", one?.slug === far.slug && one.phone?.status === "pending" && one.phone?.reason === "telefon_eslesti_konum_farkli", one);
  const rt2 = await retryGoogleNoMatch(15, retryFetch);
  ok("aynı restoran ikinci kez yeniden denenmez", !rt2.results.some((x) => x.slug === far.slug), rt2.results.map((x) => x.slug));

  /* toplu eşleştirme: kota biterse durur, fazla çağrı yapmaz */
  const fake3 = new FakeRedis(); setRedisForTests(fake3 as unknown as RedisLike);
  for (let i = 0; i < BUDGETS["google:text_search_pro"].daily - 2; i++) await reserve("google:text_search_pro");
  calls.length = 0;
  const b = await matchGoogleBatch(25, mkFetch({ name: "Hiç Benzemeyen Ad", lat: 0, lng: 0 }));
  ok("toplu eşleştirme günlük kotada durur", b.results.length <= 3 && b.results.at(-1)?.status === "limit" && calls.filter((u) => u.endsWith(":searchText")).length === 2, { n: b.results.length, last: b.results.at(-1)?.status, searches: calls.filter((u) => u.endsWith(":searchText")).length });

  const [placesBefore] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.places);
  const [osmBefore] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.placeIdentifiers).where(eq(schema.placeIdentifiers.provider, "osm"));
  const rg = await rollbackGoogleMatches();
  const [gLeft] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.placeIdentifiers).where(eq(schema.placeIdentifiers.provider, "google"));
  const [placesAfter] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.places);
  const [osmAfter] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.placeIdentifiers).where(eq(schema.placeIdentifiers.provider, "osm"));
  const mqLeft = await db.select().from(schema.moderationQueue);
  ok("Google pilot geri alma yalnız Google kayıtlarını siler", rg.ok && rg.removedIdentifiers > 0 && Number(gLeft.n) === 0 && mqLeft.length === 0
    && Number(placesAfter.n) === Number(placesBefore.n) && Number(osmAfter.n) === Number(osmBefore.n), { rg, gLeft: gLeft.n, mq: mqLeft.length });

  setRedisForTests(null); calls.length = 0;
  const g3 = await resolveGooglePlaceId("ciya-sofrasi-kadikoy", "TEST_KEY_NOT_REAL", mkFetch({ name: "Çiya Sofrası", lat: ciya.lat!, lng: ciya.lng! }));
  ok("Redis yokken Google'a hiç istek gitmez", g3.status === "limit" && calls.length === 0, { g3, calls });
  delete process.env.GOOGLE_PLACES_API_KEY;
  ok("anahtar yokken kapalı", (await fetchGooglePlace("ciya-sofrasi-kadikoy")).state === "disabled");

  console.log("\n6) Eşleştirme puanı");
  const base = { name: "Çiya Sofrası", lat: 40.989347, lng: 29.024429 };
  ok("aynı ad, 20 m → otomatik", matchScore(base, { ...base, lng: base.lng + 0.0002 }).decision === "auto");
  ok("farklı ad, 100 m → ret ya da onay", matchScore(base, { name: "Kadıköy Balıkçısı", lat: base.lat + 0.0009, lng: base.lng }).decision !== "auto");
  ok("300 m → ret", matchScore(base, { ...base, lat: base.lat + 0.003 }).decision === "reject");

  console.log("\n6b) Mekân videoları (resmî gömme, yalnız kimlik)");
  const yt = parseVideoUrl("https://youtube.com/shorts/dQw4w9WgXcQ?si=x"), yt2 = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ");
  const ig = parseVideoUrl("https://www.instagram.com/someone/reel/C1a2B3c4D5e/?igsh=x"), tt = parseVideoUrl("https://www.tiktok.com/@kisi/video/7301234567890123456?lang=tr");
  ok("bağlantı çözümleme: Shorts, youtu.be, Reel, TikTok", yt?.platform === "youtube" && yt.vertical && yt2?.id === "dQw4w9WgXcQ" && !yt2.vertical
    && ig?.platform === "instagram" && ig.id === "C1a2B3c4D5e" && tt?.platform === "tiktok" && tt.id === "7301234567890123456", { yt, yt2, ig, tt });
  ok("tanınmayan bağlantılar reddedilir", !parseVideoUrl("https://example.com/video/1") && !parseVideoUrl("javascript:alert(1)") && !parseVideoUrl("https://www.youtube.com/watch?v=kisa"));
  ok("gömme adresleri resmî ve çerezsiz YouTube", embedUrl("youtube", "dQw4w9WgXcQ").startsWith("https://www.youtube-nocookie.com/embed/") && embedUrl("tiktok", "1").startsWith("https://www.tiktok.com/player/v1/") && embedUrl("instagram", "x").startsWith("https://www.instagram.com/reel/"));
  const vslug = realVenueRecords[0].slug;
  const oe: string[] = [];
  const oembedFetch = (async (u: string) => { oe.push(String(u)); return String(u).includes("GONE") || String(u).includes("ZZZZZZZZZZZ") ? new Response("", { status: 404 }) : Response.json({ author_name: "Kanal Adı" }); }) as unknown as typeof fetch;
  const va1 = await addPlaceVideo({ slug: vslug, url: "https://www.youtube.com/shorts/dQw4w9WgXcQ" }, oembedFetch);
  const va2 = await addPlaceVideo({ slug: vslug, url: "https://youtu.be/dQw4w9WgXcQ" }, oembedFetch);
  const va3 = await addPlaceVideo({ slug: vslug, url: "https://www.instagram.com/reel/C1a2B3c4D5e/", credit: "@hesap" }, oembedFetch);
  const va4 = await addPlaceVideo({ slug: vslug, url: "https://www.youtube.com/watch?v=ZZZZZZZZZZZ" }, oembedFetch);
  const va5 = await addPlaceVideo({ slug: "yok-boyle-mekan", url: "https://youtu.be/dQw4w9WgXcQ" }, oembedFetch);
  ok("video eklenir; atıf oEmbed'ten (yalnız kimlik + atıf)", va1.ok && va1.created && va1.platform === "youtube", va1);
  ok("aynı video farklı bağlantı biçimiyle ikinci kayıt olmaz", va2.ok && !va2.created && va1.ok && va2.id === va1.id, va2);
  ok("Instagram oEmbed'e gidilmez (anahtar ister), elle atıf", va3.ok && !oe.some((u) => u.includes("instagram")), oe);
  ok("platformda olmayan video reddedilir", !va4.ok && va4.error === "not_found_on_platform");
  ok("bilinmeyen mekân reddedilir", !va5.ok && va5.error === "no_place");
  await addPlaceVideo({ slug: vslug, url: "https://youtu.be/dQw4w9WgXcQ", credit: "Elle Atıf" }, oembedFetch);
  ok("yeniden eklemede elle atıf güncellenir", (await listPlaceVideos(vslug)).some((v) => v.credit === "Elle Atıf"));
  const vl = await listPlaceVideos(vslug);
  ok("mekânın videoları listelenir (atıflı)", vl.length === 2 && vl.some((v) => v.credit === "Elle Atıf") && vl.some((v) => v.credit === "@hesap"), vl);
  const [mi] = await db.select().from(schema.mediaItems).where(eq(schema.mediaItems.externalId, "C1a2B3c4D5e"));
  ok("saklama sınıfı id_only, kaynak editor, onaylı", mi?.storageClass === "id_only" && mi.source === "editor" && mi.status === "approved" && mi.type === "embed");
  await removePlaceVideo(va3.ok ? va3.id : "");
  const vl2 = await listPlaceVideos(vslug);
  const [still] = await db.select().from(schema.mediaItems).where(eq(schema.mediaItems.externalId, "C1a2B3c4D5e"));
  ok("kaldırma silmez, yayından alır", vl2.length === 1 && still?.status === "removed");

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
