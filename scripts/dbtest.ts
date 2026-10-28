import { readFileSync } from "node:fs";
/* ==========================================================================
   FAZ 0 TESTLERİ — gömülü Postgres (PGlite) + sahte Redis + sahte Google.
   Gerçek ağ çağrısı ve gerçek maliyet YOK. Çalıştır: npm run test:db
   ========================================================================== */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { setDbForTests, type Db } from "../lib/db/client";
import { seedRealVenues, verifyRealVenues, PILOT_SLUGS } from "../lib/db/seed";
import { applyMigrations, migrationStatus, type Executor } from "../lib/db/migrate";
import { MIGRATIONS } from "../lib/db/migrations.generated";
import { qualityReport, missingByRestaurant } from "../lib/db/quality";
import { rollbackSeed, rollbackSeedPreview, rollbackMigration, rollbackMigrationPreview, rollbackWave, rollbackWavePreview } from "../lib/db/rollback";
import { realVenueRecords } from "../data/real";
import { setRedisForTests, type RedisLike } from "../lib/usage/redis";
import { readFloors as readFloorsT, reserve, BUDGETS, usageSnapshot, budgetFor, periodKeys, spendReport, usdCap, pacedDaily, googlePause } from "../lib/usage/counter";
import { redisNs } from "../lib/usage/redis";
import { strictHit } from "../lib/usage/rate";
import { fetchGooglePhotoMedia, fetchGooglePlace, fetchGoogleView, googleEnabled, holdGoogleMatches, matchGoogleBatch, resolveGooglePlaceId, retryGoogleNoMatch, reviewGoogleMatch, rollbackGoogleMatches, searchName } from "../lib/providers/google";
import { matchScore, brandKey, branchDiff, preDecide, postDecide } from "../lib/match/score";
import { parseVideoUrl, embedUrl } from "../lib/media/embed";
import { addPlaceVideo, listPlaceVideos, removePlaceVideo } from "../lib/media/store";
import { visitMonths } from "../lib/drafts";
import { importPlaceStates, listPlaceStates, setPlaceState } from "../lib/community/placeStatus";
import { planImport, serverToLocal, isAccountEntity, replayPending, pushChange, signOutFlow, type PendingChange } from "../lib/community/sync";
import { createReview, updateReview, deleteReview, reportReview, moderateReview, listPlaceReviews, listUserReviews, validateReview, publicName, type ReviewInput } from "../lib/community/reviews";
import { INDEPENDENCE } from "../lib/score/weights";
import { sameOrigin } from "../lib/community/http";
import { authErrorMessage } from "../lib/community/authErrors";
import { deviceOf, listSessions, revokeOtherSessions, revokeSession } from "../lib/community/sessions";
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
    if (script.startsWith("-- undo")) { keys.forEach((k) => this.m.set(k, (this.m.get(k) ?? 0) - 1)); return 1; }
    if (script.includes("local spend")) {
      /* counter.ts LUA: kalem sınırları + toplam harcama tavanı (aynı sıra ve anlamla) */
      const [mk, dk, ...all] = keys; const mm = (this.m.get(mk) ?? 0) + 1, dd = (this.m.get(dk) ?? 0) + 1;
      if (mm > Number(args[0]) || dd > Number(args[1])) return 0;
      this.m.set(mk, mm); this.m.set(dk, dd);
      let spend = 0;
      all.forEach((k, i) => { const n = this.m.get(k) ?? 0, free = Number(args[5 + i * 2]), micro = Number(args[6 + i * 2]); if (n > free) spend += (n - free) * micro; });
      if (spend > Number(args[4])) { this.m.set(mk, mm - 1); this.m.set(dk, dd - 1); return -1; }
      return mm;
    }
    if (script.includes("local floor")) {
      /* counter.ts SEED_LUA: sayaç yoksa ya da tabanın altındaysa tabana çek (asla aşağı değil) */
      keys.forEach((k, i) => { const f = Number(args[i + 1]); if ((this.m.get(k) ?? -1) < f) this.m.set(k, f); });
      return 1;
    }
    const n = (this.m.get(keys[0]) ?? 0) + 1; this.m.set(keys[0], n); return n;
  }
  async get(k: string) { this.chk(); return this.m.has(k) ? String(this.m.get(k)) : null; }
  async set(k: string, v: unknown) { this.chk(); this.m.set(k, Number(v) || 1); return "OK"; }
  async incr(k: string) { this.chk(); const n = (this.m.get(k) ?? 0) + 1; this.m.set(k, n); return n; }
  async expire() { return 1; }
  async ttl() { return 900; }
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

  console.log("\n3b) Hesap: Kaydet / Gitmek istiyorum / Gittim (user_place_status)");
  await db.insert(schema.user).values([{ id: "ua", name: "A", email: "a@example.test" }, { id: "ub", name: "B", email: "b@example.test" }]);
  const sw = await setPlaceState(db, "ua", "ciya-sofrasi-kadikoy", "want_to_go");
  const sv = await setPlaceState(db, "ua", "ciya-sofrasi-kadikoy", "visited");
  const la = await listPlaceStates(db, "ua");
  ok("durum hesaba yazılır; son karar geçerli (Gitmek istiyorum → Gittim)", sw.ok && sv.ok && la.length === 1 && la[0].slug === "ciya-sofrasi-kadikoy" && la[0].state === "visited", la);
  const [rowA] = await db.select().from(schema.userPlaceStatus).where(eq(schema.userPlaceStatus.userId, "ua"));
  ok("Gittim: tek satır, bayraklar tutarlı, ziyaret sayısı ≥ 1, doğrulama YOK", rowA.visited && !rowA.wantToGo && !rowA.favorite && rowA.visitCount === 1 && rowA.verificationId === null, rowA);
  ok("bilinmeyen / demo mekân reddedilir", !(await setPlaceState(db, "ua", "moda-lokantasi", "saved")).ok && !(await setPlaceState(db, "ua", "yok-boyle-bir-yer", "saved")).ok);
  ok("başka kullanıcının kaydı görünmez", (await listPlaceStates(db, "ub")).length === 0);
  await setPlaceState(db, "ua", "ciya-sofrasi-kadikoy", "none");
  const ln = await listPlaceStates(db, "ua");
  ok("kaldırma satırı silmez, 'none' olarak kalır (yeniden aktarılmaz)", ln.length === 1 && ln[0].state === "none", ln);
  const other = (await db.select({ slug: schema.places.slug }).from(schema.places).where(sql`${schema.places.slug} <> 'ciya-sofrasi-kadikoy'`).limit(2)).map((r) => r.slug);
  const added = await importPlaceStates(db, "ua", [{ slug: "ciya-sofrasi-kadikoy", state: "saved" }, { slug: other[0], state: "want_to_go" }, { slug: other[1], state: "visited" }, { slug: "moda-lokantasi", state: "saved" }, { slug: other[0], state: "saved" }]);
  const li2 = Object.fromEntries((await listPlaceStates(db, "ua")).map((r) => [r.slug, r.state]));
  ok("ilk giriş aktarımı: yalnız hesapta olmayanlar eklenir; hesap kazanır; demo/bilinmeyen atlanır", added === 2 && li2["ciya-sofrasi-kadikoy"] === "none" && li2[other[0]] === "want_to_go" && li2[other[1]] === "visited" && !("moda-lokantasi" in li2), { added, li2 });
  const rel = (id: string, state: string) => ({ entityId: id, state, listIds: [], updatedAt: "2026-10-28" }) as never;
  const plan = planImport({ "ent.r.a": rel("ent.r.a", "saved"), "ent.r.b": rel("ent.r.b", "experienced"), "ent.moda-lokantasi": rel("ent.moda-lokantasi", "visited"), "ent.r.c": rel("ent.r.c", "want_to_go") },
    [{ slug: "c", state: "none", updatedAt: "" }]);
  ok("istemci planı: demo kayıt gitmez, 'deneyim yazdım' → Gittim, hesapta olan aktarılmaz", JSON.stringify(plan) === JSON.stringify([{ slug: "a", state: "saved" }, { slug: "b", state: "visited" }]), plan);
  ok("hesap → yerel eşleme gerçek mekân kimliğiyle", serverToLocal([{ slug: "a", state: "none", updatedAt: "" }])["ent.r.a"] === "none" && isAccountEntity("ent.r.a") && !isAccountEntity("ent.moda-lokantasi") && !isAccountEntity("ent.r.../x"));
  const rq = (h: Record<string, string>) => new Request("https://www.gidenler.com/api/me/places/", { method: "POST", headers: h });
  ok("yazma yalnız aynı kökenden (Origin = site)", sameOrigin(rq({ origin: "https://www.gidenler.com", host: "www.gidenler.com" })) && !sameOrigin(rq({ origin: "https://kotu.example", host: "www.gidenler.com" })) && !sameOrigin(rq({ host: "www.gidenler.com" })));
  const routeSrc = readFileSync(new URL("../app/api/me/places/route.ts", import.meta.url), "utf8");
  ok("API: kullanıcı kimliği yalnız oturumdan, kimliksiz 401, hız sınırı var", /currentUser\(req\.headers\)/.test(routeSrc) && /status: 401/.test(routeSrc) && /rate_limited/.test(routeSrc) && !/userId["']?\s*:\s*z\./.test(routeSrc));
  const vb = readFileSync(new URL("../components/venue/VenueBadges.tsx", import.meta.url), "utf8"), psb = readFileSync(new URL("../components/venue/PlaceStatusButtons.tsx", import.meta.url), "utf8");
  ok("gerçek mekân sayfasında Kaydet / Gitmek istiyorum / Gittim var; 'Gittim' doğrulama iddiası taşımaz", vb.includes("<PlaceStatusButtons") && /"Gittim"/.test(psb) && !/doğrulandı|doğrulanmış/.test(psb));
  /* EŞİTLEME — veri kaybı senaryoları (bağlantı hatası, iki cihaz çakışması, başarısız çıkış) */
  const cxT0 = new Date(Date.now() - 60_000), cxT1 = new Date(Date.now() - 30_000);
  await setPlaceState(db, "ub", other[0], "want_to_go", cxT1);                       // B cihazı: daha yeni
  const cxStale = await setPlaceState(db, "ub", other[0], "saved", cxT0);              // A cihazının eski (çevrimdışı) değişikliği
  ok("çakışma: başka cihazdaki DAHA YENİ değişiklik, eski bekleyen değişiklikle ezilmez", cxStale.ok && cxStale.stale && cxStale.state === "want_to_go" && (await listPlaceStates(db, "ub"))[0].state === "want_to_go", cxStale);
  const cxNewer = await setPlaceState(db, "ub", other[0], "visited", new Date());
  ok("çakışma: daha yeni değişiklik yazılır", cxNewer.ok && !cxNewer.stale && (await listPlaceStates(db, "ub"))[0].state === "visited");
  const cxFuture = await setPlaceState(db, "ub", other[0], "saved", new Date(Date.now() + 86400_000 * 365));
  ok("gelecek tarihli değişiklik şimdiye çekilir (sonsuza kilitlenemez)", cxFuture.ok && !cxFuture.stale && (await db.select().from(schema.userPlaceStatus).where(eq(schema.userPlaceStatus.userId, "ub")))[0].updatedAt.getTime() <= Date.now() + 1000);
  let cxNet = false; const cxCalls2: unknown[] = [];
  const cxPostF = async (b: unknown) => { cxCalls2.push(b); if (!cxNet) throw new Error("offline"); return { ok: true, status: 200 }; };
  const cxMem: { p: Record<string, PendingChange> } = { p: {} };
  const cxSt0 = { read: () => cxMem.p, write: (x: Record<string, PendingChange>) => { cxMem.p = x; } };
  const cxPushed = await pushChange(cxPostF, "a-yer", "visited", "2026-10-28T10:00:00.000Z", cxSt0);
  ok("bağlantı yokken değişiklik kaybolmaz: bekleyenlere yazılır (zamanıyla)", !cxPushed && cxMem.p["a-yer"]?.state === "visited" && cxMem.p["a-yer"].at === "2026-10-28T10:00:00.000Z");
  const cxStill = await replayPending(cxPostF, cxMem.p);
  ok("bağlantı hâlâ yoksa bekleyen silinmez", cxStill["a-yer"]?.state === "visited");
  cxNet = true;
  const cxLeft0 = await replayPending(cxPostF, cxMem.p);
  ok("bağlantı gelince bekleyen gönderilir (değişiklik anıyla) ve kuyruktan düşer", Object.keys(cxLeft0).length === 0 && JSON.stringify(cxCalls2[cxCalls2.length - 1]) === JSON.stringify({ slug: "a-yer", state: "visited", at: "2026-10-28T10:00:00.000Z" }));
  const cxR401 = await replayPending(async () => ({ ok: false, status: 401 }), { b: { state: "saved", at: "2026-10-28T10:00:00.000Z" } });
  const cxR404 = await replayPending(async () => ({ ok: false, status: 404 }), { b: { state: "saved", at: "2026-10-28T10:00:00.000Z" } });
  ok("oturum düşmüşse bekleyen kalır; bilinmeyen mekân (404) düşer", !!cxR401.b && !cxR404.b);
  let cxCleared = false;
  const cxSo1 = await signOutFlow({ flush: async () => ({}), confirmLoss: () => true, signOut: async () => false, clearLocal: () => { cxCleared = true; } });
  ok("çıkış isteği başarısızsa hiçbir yerel veri silinmez", cxSo1 === "failed" && !cxCleared);
  const cxSo2 = await signOutFlow({ flush: async () => ({ x: { state: "saved", at: "" } }), confirmLoss: () => false, signOut: async () => true, clearLocal: () => { cxCleared = true; } });
  ok("gönderilemeyen değişiklik varken kullanıcı vazgeçerse çıkış yapılmaz, veri silinmez", cxSo2 === "cancelled" && !cxCleared);
  const cxSo3 = await signOutFlow({ flush: async () => ({}), confirmLoss: () => false, signOut: async () => true, clearLocal: () => { cxCleared = true; } });
  ok("başarılı çıkışta hesap verisi bu cihazdan temizlenir", cxSo3 === "signed_out" && cxCleared);
  const cxStoreSrc = readFileSync(new URL("../lib/store.ts", import.meta.url), "utf8");
  ok("gerçek kullanıcı işlemlerinde sabit tarih yok (yalnız demo anlık görüntüsü)", !/\bTODAY\b/.test(cxStoreSrc) && (cxStoreSrc.match(/DEMO_DATE/g) ?? []).length <= 8 && /const today = \(\) =>/.test(cxStoreSrc));
  ok("eski 'Deneyim yazdım' işareti hesaba 'Gittim' olarak gider, yayımlanmış/doğrulanmış sayılmaz", /normalizeLegacyExperienced/.test(cxStoreSrc) && planImport({ "ent.r.q": rel("ent.r.q", "experienced") }, [])[0]?.state === "visited");

  console.log("\n3d) Üyelik ve oturum güvenliği");
  const authSrc = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8"), nextSrc = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  ok("yalnız Google; şifre girişi kapalı; kullanıcı 'kind'/'handle' alanını kendisi yazamaz", /emailAndPassword: \{ enabled: false \}/.test(authSrc) && /kind: \{[^}]*input: false/.test(authSrc) && /handle: \{[^}]*input: false/.test(authSrc));
  ok("Google anahtarları veritabanında şifreli; giriş hatası açıklamalı sayfaya döner", /encryptOAuthTokens: true/.test(authSrc) && /errorURL: "\/benim\/\?giris=hata"/.test(authSrc));
  ok("güvenlik başlıkları: çerçeveleme yasak, nosniff, referrer, izin politikası", ["X-Frame-Options", "frame-ancestors 'none'", "nosniff", "strict-origin-when-cross-origin", "geolocation=()"].every((h) => nextSrc.includes(h)));
  const signSrc = readFileSync(new URL("../lib/community/signin.ts", import.meta.url), "utf8"), wfSrc = readFileSync(new URL("../app/yaz/[slug]/WriteForm.tsx", import.meta.url), "utf8");
  ok("giriş süresi dolarsa aynı sayfaya dönülür, taslak korunur (güvenlik kontrolü gevşetilmeden)", /errorCallbackURL: `\$\{location\.origin\}\$\{BASE\}\$\{returnTo\}/.test(signSrc) && /taslak olarak korundu/.test(wfSrc) && /keepDraft\(\);\s*\n?\s*if \(!ok\)/.test(wfSrc.replace(/const ok = keepDraft\(\);/, "keepDraft();\nif (!ok)")) && !/skipStateCookieCheck/.test(readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8")));
  ok("giriş hata kodları anlaşılır mesaja çevrilir (state_mismatch dahil)", /uzun süre beklendi/.test(authErrorMessage("state_mismatch")) && /iptal/.test(authErrorMessage("access_denied")) && /Yeniden dene/.test(authErrorMessage("bilinmeyen")));

  console.log("\n3e) Aktif cihazlar (oturum listesi ve kapatma)");
  await db.insert(schema.user).values([{ id: "sa", name: "S A", email: "sa@example.test" }, { id: "sb", name: "S B", email: "sb@example.test" }]);
  const exp = new Date(Date.now() + 86400_000), old = new Date(Date.now() - 1000);
  await db.insert(schema.session).values([
    { id: "sesAbuCihaz01", token: "tA1", userId: "sa", expiresAt: exp, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", ipAddress: "85.105.1.2" },
    { id: "sesAdizustu02", token: "tA2", userId: "sa", expiresAt: exp, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" },
    { id: "sesAtablet003", token: "tA3", userId: "sa", expiresAt: exp, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0" },
    { id: "sesAsuresiBit", token: "tA4", userId: "sa", expiresAt: old },
    { id: "sesBbaskasi01", token: "tB1", userId: "sb", expiresAt: exp },
  ]);
  const sl = await listSessions(db, "sa", "sesAbuCihaz01");
  ok("liste: yalnız kendi, süresi geçmemiş oturumlar; 'bu cihaz' başta; anahtar ve IP gönderilmez", sl.length === 3 && sl[0].current && sl[0].id === "sesAbuCihaz01" && !JSON.stringify(sl).includes("tA1") && !JSON.stringify(sl).includes("85.105"), sl);
  ok("cihaz özeti: iPhone · Safari, Mac · Chrome, Windows · Edge; bilinmeyen güvenli", deviceOf(sl[0].device === "iPhone · Safari" ? "Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1" : "") === "iPhone · Safari" && sl.some((x) => x.device === "Mac · Chrome") && sl.some((x) => x.device === "Windows · Edge") && deviceOf(null) === "Bilinmeyen cihaz");
  ok("bu cihaz bu yolla kapatılamaz (çıkış yap kullanılır)", (await revokeSession(db, "sa", "sesAbuCihaz01", "sesAbuCihaz01")).ok === false);
  ok("başkasının oturumu kapatılamaz", !(await revokeSession(db, "sa", "sesBbaskasi01", "sesAbuCihaz01")).ok && (await db.select().from(schema.session).where(eq(schema.session.id, "sesBbaskasi01"))).length === 1);
  const sesOne = await revokeSession(db, "sa", "sesAdizustu02", "sesAbuCihaz01");
  ok("tek cihaz kapatılır; o oturum veritabanından kalkar (bir sonraki istekte çıkış)", sesOne.ok && (await db.select().from(schema.session).where(eq(schema.session.id, "sesAdizustu02"))).length === 0);
  const sesClosed = await revokeOtherSessions(db, "sa", "sesAbuCihaz01");
  const leftA = await db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.userId, "sa"));
  ok("diğer tüm cihazlar: bu cihaz kalır, başka kullanıcıya dokunulmaz", sesClosed === 2 && leftA.length === 1 && leftA[0].id === "sesAbuCihaz01" && (await db.select().from(schema.session).where(eq(schema.session.userId, "sb"))).length === 1, { sesClosed, leftA });
  const sAudit = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.action, "session_revoke"), eq(schema.auditLog.actor, "user:sa")));
  ok("her kapatma güvenlik izine (audit_log) yazılır", sAudit.length === 2);
  const sesSrc = readFileSync(new URL("../app/api/me/sessions/route.ts", import.meta.url), "utf8");
  ok("API: oturum + aynı köken + hız sınırı; kullanıcı ve 'bu cihaz' yalnız oturumdan", /currentSession\(req\.headers\)/.test(sesSrc) && /sameOrigin\(req\)/.test(sesSrc) && /rate_limited/.test(sesSrc) && !/userId["']?\s*:\s*z\./.test(sesSrc));
  await db.delete(schema.auditLog).where(eq(schema.auditLog.action, "session_revoke"));
  await db.delete(schema.user).where(inArray(schema.user.id, ["sa", "sb"]));

  console.log("\n3c) Gidenler deneyimleri (yayınla / düzenle / sil / bildir)");
  const [{ slug: cxSlug }] = await db.select({ slug: schema.places.slug }).from(schema.places).where(sql`${schema.places.slug} not in (${"ciya-sofrasi-kadikoy"}, ${other[0]}, ${other[1]})`).limit(1);
  const cxRULES = { dimensions: ["taste", "service", "value", "atmosphere", "cleanliness"], regulated: false };
  const cxNOW = new Date(2026, 9, 28, 12);
  const cxBase: ReviewInput = { body: "Akşam yemeğine gittik; meze tabağı çok iyiydi, servis biraz yavaştı ama ilgiliydi. Fiyatlar makul.", visitMonth: "2026-10", overall: 8, ratings: { taste: 9, service: 6 }, returnIntent: "evet", disclosure: "none" };
  ok("ölçek: genel puan zorunlu, 1–10 tam sayı; boyutlar şemadan", validateReview({ ...cxBase, overall: null }, cxRULES, cxNOW) === "overall_required" && validateReview({ ...cxBase, overall: 11 }, cxRULES, cxNOW) === "overall_invalid" && validateReview({ ...cxBase, overall: 7.5 }, cxRULES, cxNOW) === "overall_invalid" && validateReview({ ...cxBase, ratings: { hiz: 5 } }, cxRULES, cxNOW) === "rating_invalid" && validateReview(cxBase, cxRULES, cxNOW) === null);
  ok("spam: bağlantı / e-posta / telefon reddedilir; fiyat aralığı telefon sayılmaz", validateReview({ ...cxBase, body: cxBase.body + " bkz. www.ornek.com" }, cxRULES, cxNOW) === "contact_info" && validateReview({ ...cxBase, body: cxBase.body + " ara 0532 123 45 67" }, cxRULES, cxNOW) === "contact_info" && validateReview({ ...cxBase, body: cxBase.body + " yaz: a@b.co" }, cxRULES, cxNOW) === "contact_info" && validateReview({ ...cxBase, body: cxBase.body + " Kişi başı 1.500 - 2.000 TL." }, cxRULES, cxNOW) === null);
  ok("anlamsız/tekrar metin ve gelecek ya da 24 aydan eski ziyaret reddedilir", validateReview({ ...cxBase, body: "a".repeat(60) }, cxRULES, cxNOW) === "repetitive" && validateReview({ ...cxBase, visitMonth: "2026-11" }, cxRULES, cxNOW) === "month_invalid" && validateReview({ ...cxBase, visitMonth: "2024-10" }, cxRULES, cxNOW) === "month_invalid" && validateReview({ ...cxBase, body: "kısa" }, cxRULES, cxNOW) === "body_short");
  const cxC1 = await createReview(db, { id: "ua" }, cxSlug, cxBase, cxRULES, cxNOW);
  ok("yayınla: Neon'a kalıcı, 'published', doğrulama YOK", cxC1.ok && cxC1.status === "published" && (await db.select().from(schema.visitVerifications)).length === 0, cxC1);
  const cxC2 = await createReview(db, { id: "ua" }, cxSlug, { ...cxBase, overall: 10 }, cxRULES, cxNOW);
  ok("manipülasyon: aynı kullanıcı aynı mekâna ikinci deneyim açamaz (düzenlemeye yönlenir)", !cxC2.ok && cxC2.error === "exists" && cxC1.ok && cxC2.id === cxC1.id);
  ok("demo / bilinmeyen mekâna yazılamaz", !(await createReview(db, { id: "ua" }, "moda-lokantasi", cxBase, cxRULES, cxNOW)).ok);
  const cxId1 = cxC1.ok ? cxC1.id : "";
  const cxU1 = await updateReview(db, { id: "ua" }, cxId1, { ...cxBase, overall: 6, visitMonth: "2026-10", body: cxBase.body + " İkinci ziyarette servis daha iyiydi." }, cxRULES, new Date(cxNOW.getTime() + 3600_000));
  const [cxAfterEdit] = await db.select().from(schema.reviews).where(eq(schema.reviews.id, cxId1));
  const cxEditAudit = await db.select().from(schema.auditLog).where(and(eq(schema.auditLog.action, "review_edit"), eq(schema.auditLog.refId, cxId1)));
  ok("düzenle: yalnız sahibi; önceki sürüm audit_log'da, puana girmez; tek satır kalır", cxU1.ok && cxAfterEdit.overall === 6 && cxEditAudit.length === 1 && (cxEditAudit[0].detail as { before: { overall: number } }).before.overall === 8 && (await db.select().from(schema.reviews).where(eq(schema.reviews.userId, "ua"))).length === 1);
  ok("başkasının deneyimi düzenlenemez / silinemez", !(await updateReview(db, { id: "ub" }, cxId1, cxBase, cxRULES, cxNOW)).ok && !(await deleteReview(db, "ub", cxId1)).ok);
  const cxPub = await listPlaceReviews(db, cxSlug);
  ok("mekân sayfası: yayındaki deneyim, ad 'Ad S.' biçiminde, e-posta yok", cxPub.length === 1 && cxPub[0].author === "A" && !JSON.stringify(cxPub).includes("@example.test") && publicName("Harun Tekin Yılmaz") === "Harun Y.", cxPub[0]);
  ok("profil: kullanıcının kendi deneyimleri", (await listUserReviews(db, "ua")).length === 1 && (await listUserReviews(db, "ub")).length === 0);
  ok("bildir: kendi deneyimi bildirilemez; kişi başına bir kez; otomatik gizleme yok", !(await reportReview(db, "ua", cxId1, "spam")).ok && (await reportReview(db, "ub", cxId1, "spam")).ok && !(await reportReview(db, "ub", cxId1, "sahte")).ok && (await listPlaceReviews(db, cxSlug)).length === 1);
  const cxHid = await moderateReview(db, "admin", cxId1, "hide");
  ok("moderasyon: gizlenen deneyim sayfadan kalkar, sahibi düzenleyemez; şikâyet kapanır", cxHid === cxSlug && (await listPlaceReviews(db, cxSlug)).length === 0 && !(await updateReview(db, { id: "ua" }, cxId1, cxBase, cxRULES, cxNOW)).ok && (await db.select().from(schema.moderationQueue).where(and(eq(schema.moderationQueue.refId, cxId1), eq(schema.moderationQueue.status, "open")))).length === 0);
  await moderateReview(db, "admin", cxId1, "restore");
  const cxDel = await deleteReview(db, "ua", cxId1, new Date(cxNOW.getTime() + 7200_000));
  const [cxAfterDel] = await db.select().from(schema.reviews).where(eq(schema.reviews.id, cxId1));
  ok("sil: kamudan kalkar ('removed'), satır moderasyon izi için kalır", cxDel.ok && cxAfterDel.status === "removed" && (await listPlaceReviews(db, cxSlug)).length === 0 && (await listUserReviews(db, "ua")).length === 0);
  const cxAgain = await createReview(db, { id: "ua" }, cxSlug, cxBase, cxRULES, new Date(cxNOW.getTime() + 3 * 3600_000));
  ok("silip hemen yeniden yazarak öne çıkma engellenir (24 saat)", !cxAgain.ok && cxAgain.error === "recently_removed");
  const cxOwn = await createReview(db, { id: "ub" }, cxSlug, { ...cxBase, disclosure: "owner_related" }, cxRULES, cxNOW);
  const cxBiz = await createReview(db, { id: "ub", kind: "business" }, other[0], { ...cxBase, body: "Kendi işletmemizi anlatıyoruz, akşam servisi ve mutfak ekibi çok özenli çalışıyor." }, cxRULES, cxNOW);
  const cxRowsN = await db.select({ trust: schema.reviews.trust }).from(schema.reviews).where(eq(schema.reviews.userId, "ub"));
  ok("tarafsızlık: işletme sahibi/çalışanı ve işletme hesabı 'not_recommended' (puana girmez; INDEPENDENCE=0 ile tutarlı)", cxOwn.ok && cxBiz.ok && cxRowsN.every((r) => r.trust === "not_recommended") && INDEPENDENCE.owner_related === 0 && INDEPENDENCE.employee === 0);
  const cxDupe = await createReview(db, { id: "ub" }, other[1], { ...cxBase, body: "Kendi işletmemizi anlatıyoruz, akşam servisi ve mutfak ekibi çok özenli çalışıyor." }, cxRULES, cxNOW);
  ok("spam: aynı metin başka mekânda → incelemeye ('pending' + moderasyon kuyruğu), sayfada görünmez", cxDupe.ok && cxDupe.status === "pending" && (await db.select().from(schema.moderationQueue).where(eq(schema.moderationQueue.kind, "review_spam"))).length === 1 && (await listPlaceReviews(db, other[1])).length === 0);
  ok("düzenlenmiş kategori (hekim/avukat): puan alınmaz", validateReview({ ...cxBase, overall: null, ratings: {} }, { dimensions: [], regulated: true }, cxNOW) === null && validateReview(cxBase, { dimensions: [], regulated: true }, cxNOW) === "rating_invalid");
  const cxApiSrc = ["../app/api/reviews/route.ts", "../app/api/reviews/[id]/route.ts", "../app/api/reviews/[id]/report/route.ts", "../lib/community/reviewApi.ts"].map((f) => readFileSync(new URL(f, import.meta.url), "utf8")).join("\n");
  ok("API: oturum + aynı köken + hız sınırı + eşzamanlı çift gönderim kilidi; kullanıcı kimliği istemciden alınmaz", /currentUser\(req\.headers\)/.test(cxApiSrc) && /sameOrigin\(req\)/.test(cxApiSrc) && /rate_limited/.test(cxApiSrc) && /lockOnce/.test(cxApiSrc) && !/userId:\s*z\./.test(cxApiSrc));
  ok("Google içeriği deneyim modülünde kullanılmaz", !/google/i.test(readFileSync(new URL("../lib/community/reviews.ts", import.meta.url), "utf8").replace(/Google içeriğiyle HİÇBİR bağı yok/, "")));
  await db.delete(schema.moderationQueue).where(inArray(schema.moderationQueue.kind, ["review_report", "review_spam"]));
  await db.delete(schema.auditLog).where(sql`${schema.auditLog.action} like 'review_%'`);
  await db.delete(schema.reviews).where(inArray(schema.reviews.userId, ["ua", "ub"]));
  await db.delete(schema.userPlaceStatus).where(inArray(schema.userPlaceStatus.userId, ["ua", "ub"]));
  await db.delete(schema.user).where(inArray(schema.user.id, ["ua", "ub"]));

  console.log("\n4) Ücretli çağrı sayacı (çalışmazsa durdur)");
  /* sayaç artık Neon'daki kalıcı tabanı da kullanır: test veritabanı bu bölümden itibaren bağlı.
     "Yeni Redis" senaryolarında önceki senaryonun tabanı karışmasın diye fresh() tabanı temizler. */
  setDbForTests(db);
  const fresh = async () => { await db.delete(schema.auditLog).where(eq(schema.auditLog.action, "usage_floor")); return new FakeRedis(); };
  setRedisForTests(null);
  ok("Redis yoksa çağrı reddedilir", (await reserve("google:details_atmosphere")).ok === false);
  const fake = await fresh();
  setRedisForTests(fake as unknown as RedisLike);
  const day = BUDGETS["google:details_enterprise"].daily;
  let granted = 0;
  for (let i = 0; i < day + 5; i++) if ((await reserve("google:details_enterprise")).ok) granted++;
  ok(`günlük sınır tutuyor (${day})`, granted === day, granted);
  /* zamanlanmış pay: kalan aylık hak / kalan gün × 1,5 */
  const nov1 = new Date(Date.UTC(2026, 10, 1, 12)), nov30 = new Date(Date.UTC(2026, 10, 30, 12));
  ok("zamanlanmış pay: ay başı 3.200/30×1,5 = 160", pacedDaily(3200, 0, nov1) === 160, pacedDaily(3200, 0, nov1));
  ok("zamanlanmış pay: az harcanan ay sonu payı büyür, aylık sınırı aşamaz", pacedDaily(3200, 1000, nov30) === 3300 && pacedDaily(3200, 3300, nov30) === 1);
  const paceFake = await fresh(); setRedisForTests(paceFake as unknown as RedisLike);
  let paced = 0; for (let i = 0; i < 200; i++) if ((await reserve("google:details_atmosphere", 1, nov1)).ok) paced++;
  ok("zamanlanmış pay uygulanır (ay başı 160 sayfa görünümü)", paced === 160, paced);
  setRedisForTests(fake as unknown as RedisLike);
  fake.broken = true;
  ok("Redis hata verirse çağrı reddedilir", (await reserve("google:photo")).ok === false);
  ok("ücretli yol hız sınırı Redis yokken kapalı", (await strictHit("x", 5, 60)) === false);
  fake.broken = false;
  const snap = await usageSnapshot();
  ok("kullanım özeti okunur", !!snap && snap["google:details_enterprise"].day === day);
  /* toplam aylık harcama tavanı (100 USD): ücretsiz kota önce; tavan aşılacaksa HİÇBİR kalem çağrı yapamaz */
  const capFake = await fresh(); setRedisForTests(capFake as unknown as RedisLike);
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
  /* KALICI TABAN: Redis sayaçları silinirse (flush/tahliye) aylık tavan sıfırlanmaz; Neon yoksa ücretli çağrı durur */
  const ktOct31 = new Date(Date.UTC(2026, 9, 31, 12)), ktAtm = "google:details_atmosphere" as const;
  process.env.GOOGLE_MONTHLY_USD_CAP = "1";               // 1 USD tavan: E+A için 1.000 ücretsiz + 40 ücretli istek
  const ktW1 = await fresh(); setRedisForTests(ktW1 as unknown as RedisLike);
  let ktG1 = 0; for (let i = 0; i < 1100; i++) if ((await reserve(ktAtm, 1, ktOct31)).ok) ktG1++;
  const ktW2 = new FakeRedis(); setRedisForTests(ktW2 as unknown as RedisLike);   // Redis silindi; Neon tabanı duruyor
  let ktG2 = 0; for (let i = 0; i < 300; i++) if ((await reserve(ktAtm, 1, ktOct31)).ok) ktG2++;
  ok("Redis tavana ulaşmışken silinirse ek harcama yok (tabandan yeniden kurulur)", ktG1 === 1040 && ktG2 === 0 && (ktG1 + ktG2 - 1000) * 0.025 <= 1, { ktG1, ktG2, sayac: ktW2.m.get(periodKeys(ktAtm, ktOct31).month) });
  delete process.env.GOOGLE_MONTHLY_USD_CAP;
  const ktW3 = await fresh(); setRedisForTests(ktW3 as unknown as RedisLike);
  for (let i = 0; i < 25; i++) await reserve("google:photo", 1, ktOct31);
  const ktW4 = new FakeRedis(); setRedisForTests(ktW4 as unknown as RedisLike);
  const ktR4 = await reserve("google:photo", 1, ktOct31);
  const ktAfter4 = ktW4.m.get(periodKeys("google:photo", ktOct31).month) ?? 0;
  ok("ay ortasında silinen sayaç gerçek kullanımın altına inmez (25 → taban 30 → 31)", ktR4.ok && ktAfter4 === 31 && ktAfter4 > 25, ktAfter4);
  ok("bütün kalemlerin aylık sayacı birlikte tohumlanır (tavan hesabı eksik kalmaz)", Object.keys(BUDGETS).every((x) => ktW4.m.has(periodKeys(x as keyof typeof BUDGETS, ktOct31).month)));
  const ktDeaddb = new Proxy({}, { get: () => { throw new Error("neon down"); } }) as unknown as Db;
  setDbForTests(ktDeaddb);
  const ktW5 = new FakeRedis(); setRedisForTests(ktW5 as unknown as RedisLike);
  const ktR5 = await reserve("google:photo", 1, ktOct31);
  ok("Neon erişilemiyor + sayaç yok → ücretli çağrı durur", !ktR5.ok && ktR5.reason === "error" && !ktW5.m.has(periodKeys("google:photo", ktOct31).month), ktR5);
  setRedisForTests(ktW4 as unknown as RedisLike);              // sayaç var (31); 39 → 40 serbest, 41. istek eşik
  let ktG6 = 0; for (let i = 0; i < 9; i++) if ((await reserve("google:photo", 1, ktOct31)).ok) ktG6++;
  let ktG7 = 0; for (let i = 0; i < 20; i++) if ((await reserve("google:photo", 1, ktOct31)).ok) ktG7++;
  ok("Neon erişilemiyor → eşikte taban yazılamaz, o kalemde bütün ücretli çağrılar durur", ktG6 === 9 && ktG7 === 0 && ktW4.m.get(periodKeys("google:photo", ktOct31).month) === 40, { ktG6, ktG7, sayac: ktW4.m.get(periodKeys("google:photo", ktOct31).month) });
  setDbForTests(db);
  const ktR8 = await reserve("google:photo", 1, ktOct31);
  ok("Neon dönünce çağrılar sürer ve taban yazılır", ktR8.ok && (await readFloorsT(ktOct31))?.["google:photo"] === 50, await readFloorsT(ktOct31));
  /* İLK EŞİTLEME: yayından önceki kullanım (Redis'te var, Neon'da taban yok) ilk istekte tabana aktarılır */
  const ktDec = new Date(Date.UTC(2026, 11, 15, 12));
  const ktW9 = await fresh(); setRedisForTests(ktW9 as unknown as RedisLike);
  const ktPre: Record<string, number> = { "google:text_search_pro": 447, "google:details_enterprise": 195, "google:details_atmosphere": 52, "google:details_essentials": 7, "google:photo": 245 };
  for (const [x, v] of Object.entries(ktPre)) ktW9.m.set(periodKeys(x as keyof typeof BUDGETS, ktDec).month, v);
  const ktR9 = await reserve("google:details_atmosphere", 1, ktDec);
  const ktF9 = await readFloorsT(ktDec);
  ok("yayın öncesi sayaçlar ilk istekte Neon tabanına aktarılır (447→450, 245→250, 7→10)", ktR9.ok && !!ktF9 && Object.entries(ktPre).every(([x, v]) => ktF9[x as keyof typeof BUDGETS] >= v) && ktF9["google:text_search_pro"] === 450 && ktF9["google:photo"] === 250 && ktF9["google:details_essentials"] === 10, ktF9);
  const ktW10 = new FakeRedis(); setRedisForTests(ktW10 as unknown as RedisLike);   // hemen ardından Redis silinir
  await reserve("google:photo", 1, ktDec);
  ok("ardından Redis silinirse önceki kullanım kaybolmaz (her kalem ≥ yayın öncesi)", Object.entries(ktPre).every(([x, v]) => (ktW10.m.get(periodKeys(x as keyof typeof BUDGETS, ktDec).month) ?? 0) >= v));
  const ktJan = new Date(Date.UTC(2027, 0, 10, 12));
  setDbForTests(new Proxy({}, { get: () => { throw new Error("neon down"); } }) as unknown as Db);
  const ktW11 = await (async () => new FakeRedis())(); setRedisForTests(ktW11 as unknown as RedisLike);
  for (const x of Object.keys(BUDGETS)) ktW11.m.set(periodKeys(x as keyof typeof BUDGETS, ktJan).month, 100);
  const ktR11 = await reserve("google:photo", 1, ktJan);
  ok("ilk eşitleme için Neon okunamazsa ücretli çağrı yapılmaz", !ktR11.ok && ktR11.reason === "error", ktR11);
  setDbForTests(db);
  setRedisForTests(fake as unknown as RedisLike);
  ok("ortam ad alanları ayrı", redisNs("production") === "prod" && redisNs("preview") === "preview" && redisNs(undefined) === "dev");
  ok("sayaç anahtarı ortam önekli", periodKeys("google:photo").month.startsWith(`${redisNs()}:usage:`));
  ok("Preview payı Production'ın %10'u",
    (Object.keys(BUDGETS) as (keyof typeof BUDGETS)[]).every((k) => budgetFor(k, "preview").monthly * 10 <= budgetFor(k, "production").monthly));

  console.log("\n5) Google adaptörü (sahte API, gerçek çağrı yok)");
  setDbForTests(db);
  const fake2 = await fresh(); setRedisForTests(fake2 as unknown as RedisLike);
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
  /* otomatik sayfa görünümü: TEK Details isteği (yorum + puan + saatler + foto listesi) + ilk 5 foto */
  const vCalls: string[] = [];
  const viewFetch = (async (url: string, init?: RequestInit) => {
    const h = (init?.headers ?? {}) as Record<string, string>; vCalls.push(String(url).includes("/media") ? "media" : `details:${h["X-Goog-FieldMask"]}`);
    if (String(url).includes("/media")) return Response.json({ photoUri: "https://lh3.example/p.jpg?" + Math.random() });
    await new Promise((r) => setTimeout(r, 20));
    return Response.json({ rating: 4.4, userRatingCount: 1607, googleMapsUri: "https://maps.google.com/?cid=1", reviews: [{ rating: 5, text: { text: "x" }, authorAttribution: { displayName: "A" } }],
      photos: Array.from({ length: 8 }, (_, i) => ({ name: `places/GID1/photos/p${i}`, authorAttributions: [{ displayName: `Foto ${i}` }] })) });
  }) as unknown as typeof fetch;
  const [v1, v2] = await Promise.all([fetchGoogleView("ciya-sofrasi-kadikoy", viewFetch, 5), fetchGoogleView("ciya-sofrasi-kadikoy", viewFetch, 5)]);
  ok("sayfa görünümü: tek Details isteği, eşzamanlı istekler birleşir", vCalls.filter((c) => c.startsWith("details")).length === 1 && v1.state === "ok" && v2.state === "ok", vCalls);
  ok("sayfa görünümü: puan + yorum + 5 foto + kalan 3 referans, foto listesi aynı istekte", v1.state === "ok" && v1.data.rating === 4.4 && v1.data.photos.length === 5 && v1.data.refs.length === 3 && v1.data.photoTotal === 8
    && vCalls.includes("details:rating,userRatingCount,googleMapsUri,reviews,regularOpeningHours.weekdayDescriptions,photos") && vCalls.filter((c) => c === "media").length === 5, { vCalls });
  vCalls.length = 0;
  const more = v1.state === "ok" ? await fetchGooglePhotoMedia("ciya-sofrasi-kadikoy", v1.data.refs, viewFetch) : null;
  ok("galerinin kalan fotoğrafları yalnız Photo isteği (Details yok)", more?.state === "ok" && more.data.photos.length === 3 && vCalls.every((c) => c === "media"), vCalls);
  vCalls.length = 0;
  const foreign = await fetchGooglePhotoMedia("ciya-sofrasi-kadikoy", [{ name: "places/BASKA/photos/x", author: "y" }, { name: "places/GID1/photos/../../x", author: "y" }], viewFetch);
  ok("başka mekâna ait ya da bozuk fotoğraf referansı istenmez", foreign.state === "ok" && foreign.data.photos.length === 0 && vCalls.length === 0, { foreign, vCalls });
  /* bütçe dolu: sayfa görünümü Google'a hiç gitmez, "limit" döner (sayfa Gidenler verisine düşer) */
  const capFake2 = await fresh(); setRedisForTests(capFake2 as unknown as RedisLike);
  capFake2.m.set(periodKeys("google:details_atmosphere").month, BUDGETS["google:details_atmosphere"].monthly);
  vCalls.length = 0;
  const vLim = await fetchGoogleView("ciya-sofrasi-kadikoy", viewFetch, 5);
  ok("aylık sınır doluysa sayfa görünümü Google'a istek atmaz (limit)", vLim.state === "limit" && vCalls.length === 0, { vLim, vCalls });
  /* sigorta: Google 429/403 verirse bütün Google çağrıları durur, sayfa kendi içeriğine düşer */
  const tripFake = await fresh(); setRedisForTests(tripFake as unknown as RedisLike);
  let gHits = 0;
  const quotaFetch = (async () => { gHits++; return new Response("{}", { status: 429 }); }) as unknown as typeof fetch;
  const t1 = await fetchGoogleView("ciya-sofrasi-kadikoy", quotaFetch, 5);
  const t2 = await fetchGoogleView("ciya-sofrasi-kadikoy", quotaFetch, 5);
  const pz = await googlePause();
  ok("Google 429 → sigorta atar, sonraki görünüm Google'a gitmez (paused)", t1.state === "error" && t2.state === "limit" && t2.reason === "paused" && gHits === 1 && pz?.status === 429, { t1, t2, gHits, pz });
  const rsP = await reserve("google:text_search_pro");
  ok("sigorta açıkken eşleştirme araması da durur", !rsP.ok && rsP.reason === "paused", rsP);
  const mediaFake = await fresh(); setRedisForTests(mediaFake as unknown as RedisLike);
  const denyMedia = (async () => new Response("{}", { status: 403 })) as unknown as typeof fetch;
  const mx = await fetchGooglePhotoMedia("ciya-sofrasi-kadikoy", [{ name: "places/GID1/photos/p1", author: "y" }], denyMedia);
  ok("fotoğrafta 403 (faturalama/anahtar) → sigorta atar", mx.state === "limit" && (await googlePause())?.status === 403, mx);
  const okFake = await fresh(); setRedisForTests(okFake as unknown as RedisLike);
  await fetchGoogleView("ciya-sofrasi-kadikoy", (async () => new Response("{}", { status: 500 })) as unknown as typeof fetch, 5);
  ok("geçici 500 hatası sigortayı atmaz", (await googlePause()) === null);
  setRedisForTests(fake2 as unknown as RedisLike);
  ok("anahtar hiçbir URL'de yok", !keyInUrl);
  ok("kayıtlı eşleşmeden sonra eşleştirme araması yapılmaz", calls.filter((u) => u.endsWith(":searchText")).length === 1);
  const againG = await resolveGooglePlaceId("ciya-sofrasi-kadikoy", K, mkFetch({ name: "x", lat: 0, lng: 0 }));
  ok("onaylı/otomatik kayıt yeniden taranmaz", againG.status === "existing" && againG.calls.textSearch === 0, againG);
  const used = await usageSnapshot();
  ok("sayaç: 1 arama, 0 doğrulama, 2 sayfa görünümü (eski + yeni; birleşen istek sayılmaz), 1 foto listesi, 10 foto", used?.["google:text_search_pro"].month === 1 && used["google:details_enterprise"].month === 0
    && used["google:details_atmosphere"].month === 2 && used["google:details_essentials"].month === 1 && used["google:photo"].month === 10, used);

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
  const held = await holdGoogleMatches([c2.slug], "test");
  const g5 = await fetchGooglePlace(c2.slug, mkFetch({ name: "x", lat: 0, lng: 0 }));
  const [c2row] = await db.select().from(schema.placeIdentifiers).where(sql`${schema.placeIdentifiers.provider} = 'google' and ${schema.placeIdentifiers.placeId} = ${c2.id}`);
  ok("bekletilen otomatik eşleşme gösterilmez, Place ID korunur", held.ok && held.held.includes(c2.slug) && g5.state === "unmatched" && c2row?.status === "pending" && c2row.externalId === "GID_C2", { held, g5 });
  ok("karar katmanı: 120 m asla otomatik değil", preDecide({ score: 0.9, name: 1, distanceM: 120, decision: "auto", phone: "unknown", website: "unknown", address: null }, { chain: false, branch: [], rival: false, addrConflict: false }, true).decision !== "auto");
  ok("karar katmanı: kapı no çelişkisi → onay", postDecide({ score: 1, name: 1, distanceM: 10, decision: "auto", phone: "match", website: "match", address: 1 }, { chain: false, branch: [], rival: false, addrConflict: true }).decision === "review");

  /* eşleşmesi bulunamayan restoran sonraki partide yeniden aranmaz */
  const fake4 = await fresh(); setRedisForTests(fake4 as unknown as RedisLike);
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
  const fake3 = await fresh(); setRedisForTests(fake3 as unknown as RedisLike);
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
  const ttGone = await addPlaceVideo({ slug: vslug, url: "https://www.tiktok.com/@kisi/video/7000000000000000001" }, (async () => new Response("", { status: 404 })) as unknown as typeof fetch);
  const ttOk = await addPlaceVideo({ slug: vslug, url: "https://www.tiktok.com/@kisi/video/7000000000000000001", verifiedElsewhere: true }, (async () => new Response("", { status: 404 })) as unknown as typeof fetch);
  const ytForce = await addPlaceVideo({ slug: vslug, url: "https://www.youtube.com/watch?v=ZZZZZZZZZZZ", verifiedElsewhere: true }, oembedFetch);
  ok("TikTok bölgesel oEmbed hatası: yalnız yönetici doğrulamasıyla, yalnız TikTok", !ttGone.ok && ttOk.ok && !ytForce.ok, { ttGone, ttOk, ytForce });
  if (ttOk.ok) await removePlaceVideo(ttOk.id);
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

  console.log("\n7b) Deneyim yazma: dürüstlük (yayın/doğrulama açılana kadar)");
  const vm = visitMonths(new Date(2026, 9, 28));
  ok("ziyaret ayı listesi bugünden başlar, 24 ay, gelecek ay yok", vm.length === 24 && vm[0][0] === "2026-10" && vm[0][1] === "ekim 2026" && vm[23][0] === "2024-11", vm.slice(0, 2));
  ok("ay listesi yıl dönümünü doğru geçer", visitMonths(new Date(2027, 0, 5), 2).map((x) => x[0]).join() === "2027-01,2026-12");
  const wf = readFileSync(new URL("../app/yaz/[slug]/WriteForm.tsx", import.meta.url), "utf8");
  ok("yazma formu sahte başarı ya da 'doğrulandı' demiyor; yayın yalnız sunucu yanıtı 2xx ise", !/Deneyimin Gidenler&apos;e eklendi|doğrulaman alındı|deneyim havuzunda|doğrulandı&quot; rozeti/.test(wf) && /if \(r\.ok\) \{/.test(wf) && /setSent\(mine \? "updated"/.test(wf));
  ok("yazma formu kullanıcı seçimiyle doğrulama kabul etmiyor", !/setVerify|VERIFY\b/.test(wf) && /doğrulanmamış ziyaret/.test(wf));
  ok("yazma formunda sabit (eskiyen) tarih yok", !/new Date\(20\d\d/.test(wf) && !/"20\d\d-\d\d"/.test(wf));

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
