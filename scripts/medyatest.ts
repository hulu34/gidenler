/* FOTOĞRAF ARŞİVİ TESTLERİ — gömülü Postgres, bellekte depolama; ağ yok, ücret yok. Çalıştır: npm run test:medya */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { uuidv7 } from "uuidv7";
import { readFileSync } from "node:fs";
import * as schema from "../lib/db/schema";
import { setDbForTests, type Db } from "../lib/db/client";
import { applyMigrations, type Executor } from "../lib/db/migrate";
import { getStorage, memoryStorage, s3Storage } from "../lib/media/storage";
import { MAX_BYTES, processPhoto, sniffImage } from "../lib/media/photoProcess";
import * as A from "../lib/media/photoArchive";
import { recomputePlace } from "../lib/score/compute";
import { coverOf, profilePhotos, type LiveCover, type LivePhoto } from "../lib/media/cover";
import { realEntities } from "../data/real";
import type { Entity, VenuePhoto } from "../lib/types";

let pass = 0, failed = 0;
const t = (name: string, ok: unknown, extra?: unknown) => { if (ok) pass++; else { failed++; console.log(`  ✗ ${name}`, extra ?? ""); } };
const img = (w = 1200, h = 900, c = { r: 120, g: 80, b: 60 }) => sharp({ create: { width: w, height: h, channels: 3, background: c } }).jpeg({ quality: 90 }).withExif({ IFD0: { Copyright: "gizli" }, IFD3: { GPSLatitude: "41/1 0/1 0/1" } }).toBuffer();
let nth = 0;
const uniq = (w = 1200, h = 900) => { nth++; return img(w, h, { r: (nth * 37) % 255, g: (nth * 91) % 255, b: (nth * 13) % 255 }); };

async function main() {
  /* ── işleme ── */
  const jpg = await img();
  t("imza jpeg", sniffImage(jpg) === "jpeg");
  t("imza: svg reddi", sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")) === null);
  t("imza: uzantısı jpg metin", (await processPhoto(Buffer.from("merhaba dünya bu bir görsel değil"))).ok === false);
  t("boş", JSON.stringify(await processPhoto(Buffer.alloc(0))).includes("empty"));
  t("fazla büyük", JSON.stringify(await processPhoto(Buffer.concat([jpg, Buffer.alloc(MAX_BYTES)]))).includes("too_large"));
  t("bozuk", JSON.stringify(await processPhoto(jpg.subarray(0, 200))).includes("corrupt"));
  t("çok küçük", JSON.stringify(await processPhoto(await img(200, 200))).includes("too_small"));
  const gif = await sharp({ create: { width: 500, height: 500, channels: 3, background: "red" } }).gif().toBuffer();
  t("gif reddi", JSON.stringify(await processPhoto(gif)).includes("bad_type"));
  const p = await processPhoto(jpg);
  t("işlendi", p.ok);
  if (p.ok) {
    t("varyantlar", p.photo.variants.map((v) => v.w).join() === "480,960,1200" || p.photo.variants.map((v) => v.w).join() === "480,960,1600", p.photo.variants.map((v) => v.w));
    for (const v of p.photo.variants) {
      const m = await sharp(v.bytes).metadata();
      t(`webp ${v.w}`, m.format === "webp");
      t(`exif yok ${v.w}`, !m.exif && !m.icc && !m.xmp, m);
      t(`büyütme yok ${v.w}`, (m.width ?? 0) <= 1200);
    }
  }
  const rotated = await sharp({ create: { width: 800, height: 500, channels: 3, background: "blue" } }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const pr = await processPhoto(rotated);
  t("yön uygulanır", pr.ok && pr.photo.height > pr.photo.width, pr);

  /* ── depolama seçimi ── */
  t("Production + S3 yok → kapalı", getStorage({ VERCEL_ENV: "production" } as unknown as NodeJS.ProcessEnv) === null);
  t("Preview + S3 yok → db", getStorage({ VERCEL_ENV: "preview" } as unknown as NodeJS.ProcessEnv)?.provider === "db");
  const s3env = { VERCEL_ENV: "production", MEDIA_S3_ENDPOINT: "https://x.test", MEDIA_S3_KEY: "k", MEDIA_S3_SECRET: "s", MEDIA_S3_PRIVATE_BUCKET: "ozel", MEDIA_S3_PUBLIC_BUCKET: "genel", MEDIA_PUBLIC_BASE: "https://cdn.test" } as unknown as NodeJS.ProcessEnv;
  t("Production + S3 → s3", getStorage(s3env)?.provider === "s3");
  const calls: Array<{ url: string; method: string; auth: boolean }> = [];
  const fake = (async (r: Request) => { calls.push({ url: r.url, method: r.method, auth: !!r.headers.get("authorization") }); return new Response(null, { status: 200 }); }) as unknown as typeof fetch;
  const s3 = s3Storage({ endpoint: "https://x.test", accessKeyId: "k", secretAccessKey: "s", privateBucket: "ozel", publicBucket: "genel", publicBase: "https://cdn.test" }, fake);
  await s3.put("pending/a/480.webp", Buffer.from("x"), "image/webp");
  await s3.put("public/a/480.webp", Buffer.from("x"), "image/webp");
  t("bekleyen özel kovada", calls[0].url === "https://x.test/ozel/pending/a/480.webp" && calls[0].auth, calls[0]);
  t("onaylı genel kovada", calls[1].url === "https://x.test/genel/public/a/480.webp");
  t("CDN adresi", s3.publicUrl("public/a/480.webp") === "https://cdn.test/a/480.webp");
  const s3fail = s3Storage({ endpoint: "https://x.test", accessKeyId: "k", secretAccessKey: "s", privateBucket: "o", publicBucket: "g", publicBase: "https://c.test" }, (async () => new Response(null, { status: 500 })) as unknown as typeof fetch);
  t("s3 hatası sessiz değil", await s3fail.put("pending/x", Buffer.from("x"), "a").then(() => false, () => true));

  /* ── akış ── */
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as Db;
  const exec: Executor = {
    query: async <T,>(q: string) => (await pg.query(q)).rows as T[],
    transaction: async (st: string[]) => { await pg.transaction(async (tx) => { for (const q of st) await tx.exec(q); }); },
  };
  await applyMigrations(exec);
  setDbForTests(db);
  const mkUser = async (name: string) => { const id = uuidv7(); await db.insert(schema.user).values({ id, name, email: `${id}@example.invalid`, emailVerified: true }); return id; };
  const [ayse, burak, cem] = [await mkUser("Ayşe Yılmaz"), await mkUser("Burak Kaya"), await mkUser("Cem Ak")];
  const placeA = uuidv7(), placeB = uuidv7();
  const base = await pg.query<{ column_name: string; is_nullable: string; column_default: string | null }>(`select column_name,is_nullable,column_default from information_schema.columns where table_name='places'`);
  const need = base.rows.filter((c) => c.is_nullable === "NO" && !c.column_default).map((c) => c.column_name);
  const placeVals = (id: string, slug: string) => { const v: Record<string, unknown> = {}; for (const c of need) v[c] = c === "id" ? id : c === "slug" ? slug : slug; return v; };
  const ins = async (v: Record<string, unknown>) => { const k = Object.keys(v); await pg.query(`insert into places (${k.map((x) => `"${x}"`).join()}) values (${k.map((_, i) => `$${i + 1}`).join()})`, Object.values(v)); };
  await ins(placeVals(placeA, "mekan-a")); await ins(placeVals(placeB, "mekan-b"));
  const mkReview = async (u: string, pl: string, status = "published") => { const id = uuidv7(); await pg.query(`insert into reviews (id,user_id,place_id,body,status,visited_on,overall,ratings,return_intent) values ($1,$2,$3,$4,$5,'2026-09-01',8,'{}','evet')`, [id, u, pl, "Uzun bir deneyim metni, test için yazıldı ve yeterince uzun.", status]).catch(async (e) => { throw e; }); return id; };
  const rv = await mkReview(ayse, placeA);
  const rvB = await mkReview(burak, placeA);
  const store = memoryStorage();

  t("başkasının deneyimi", JSON.stringify(await A.addReviewPhoto(db, store, burak, rv, await uniq(), { confirmed: true })).includes("not_owner"));
  t("olmayan deneyim", JSON.stringify(await A.addReviewPhoto(db, store, ayse, uuidv7(), await uniq(), { confirmed: true })).includes("not_found"));
  t("hak onayı zorunlu", JSON.stringify(await A.addReviewPhoto(db, store, ayse, rv, await uniq(), { confirmed: false })).includes("rights_required"));
  t("bozuk dosya satır bırakmaz", !(await A.addReviewPhoto(db, store, ayse, rv, jpg.subarray(0, 200), { confirmed: true })).ok && (await db.select().from(schema.photoAssets)).length === 0);

  /* puan ayrımı: önce */
  const scoreRow = async () => (await pg.query(`select id,status,trust,updated_at from reviews where id=$1`, [rv]).catch(() => pg.query(`select id,status,updated_at from reviews where id=$1`, [rv]))).rows[0];
  const before = JSON.stringify(await scoreRow());
  const score0 = JSON.stringify(await recomputePlace(db, placeA).catch((e) => String(e)));
  const countProv0 = (await pg.query(`select count(*)::int n from audit_log where action like 'score%' or action like 'threshold%'`)).rows[0];

  const up = await A.addReviewPhoto(db, store, ayse, rv, await uniq(), { confirmed: true });
  t("yükleme", up.ok, up);
  if (!up.ok) throw new Error("yükleme yok");
  const a1 = up.id;
  t("onaysız dosya yalnız pending/", [...store.m.keys()].every((k) => k.startsWith(`pending/${a1}/`)), [...store.m.keys()]);
  t("onaysız galeride yok", (await A.approvedPhotos(db, store, "mekan-a")).length === 0);
  t("kuyrukta", (await A.moderationList(db)).some((x) => x.id === a1));
  const list0 = await A.moderationList(db);
  t("moderasyon listesinde e-posta yok", !JSON.stringify(list0).includes("example.invalid"));
  t("görünen ad kısaltılmış", list0[0].uploader === "Ayşe Y.", list0[0].uploader);
  const dupBytes = await uniq();
  t("ilk", (await A.addReviewPhoto(db, store, ayse, rv, dupBytes, { confirmed: true })).ok);
  t("aynı dosya tekrar", JSON.stringify(await A.addReviewPhoto(db, store, ayse, rv, dupBytes, { confirmed: true })).includes("duplicate"));
  t("başka kullanıcı aynı mekâna aynı dosya", JSON.stringify(await A.addReviewPhoto(db, store, burak, rvB, dupBytes, { confirmed: true })).includes("duplicate"));
  const badStore = memoryStorage({ put: true });
  const n0 = (await db.select().from(schema.mediaItems)).length;
  t("depolama hatası dürüst", JSON.stringify(await A.addReviewPhoto(db, badStore, ayse, rv, await uniq(), { confirmed: true })).includes("storage_failed"));
  t("depolama hatası satır bırakmaz", (await db.select().from(schema.mediaItems)).length === n0);
  t("3", (await A.addReviewPhoto(db, store, ayse, rv, await uniq(), { confirmed: true })).ok);
  t("4", (await A.addReviewPhoto(db, store, ayse, rv, await uniq(), { confirmed: true })).ok);
  t("5", (await A.addReviewPhoto(db, store, ayse, rv, await uniq(), { confirmed: true })).ok);
  t("6. reddedilir", JSON.stringify(await A.addReviewPhoto(db, store, ayse, rv, await uniq(), { confirmed: true })).includes("limit"));
  const rvC = await mkReview(cem, placeB);
  const par = await Promise.all(Array.from({ length: 8 }, async () => A.addReviewPhoto(db, store, cem, rvC, await uniq(), { confirmed: true })));
  t("paralelde en çok 5", par.filter((x) => x.ok).length === 5, par.filter((x) => x.ok).length);

  /* onay */
  const ap = await A.approvePhoto(db, store, "user:mod", a1);
  t("onay", ap.ok, ap);
  t("onay sonrası genel önek", [...store.m.keys()].filter((k) => k.includes(a1)).every((k) => k.startsWith("public/")));
  const g = await A.approvedPhotos(db, store, "mekan-a");
  t("galeride", g.length === 1 && g[0].id === a1 && g[0].srcSet.includes("480w") && g[0].credit === "Ayşe Y.", g);
  t("ikinci onay reddi", JSON.stringify(await A.approvePhoto(db, store, "user:mod", a1)).includes("bad_state"));
  const failStore = memoryStorage();
  const up2 = (await A.moderationList(db)).filter((x) => x.slug === "mekan-a")[0];
  t("kopyalanamayan onay durumu değiştirmez", JSON.stringify(await A.approvePhoto(db, failStore, "user:mod", up2.id)).includes("storage_failed") && (await A.moderationList(db)).some((x) => x.id === up2.id));
  /* red */
  t("gerekçesiz red yok", JSON.stringify(await A.rejectPhoto(db, store, "user:mod", up2.id, "  ")).includes("reason_required"));
  t("red", (await A.rejectPhoto(db, store, "user:mod", up2.id, "Yanlış restoran")).ok);
  t("red dosyası silindi", ![...store.m.keys()].some((k) => k.includes(up2.id)));
  t("red galeride yok", !(await A.approvedPhotos(db, store, "mekan-a")).some((x) => x.id === up2.id));
  t("onaylanan reddedilemez", JSON.stringify(await A.rejectPhoto(db, store, "user:mod", a1, "x")).includes("bad_state"));
  /* kapak: yeni fotoğraf kendiliğinden kapak olmaz */
  t("onay kapak yapmaz", Object.keys(await A.coverCandidates(db, store)).length === 0);
  await A.setCoverCandidate(db, "user:mod", a1, true);
  let cc = await A.coverCandidates(db, store);
  t("aday görünür, seçili değil", cc["mekan-a"]?.selected === false);
  await A.setCover(db, "user:mod", a1);
  cc = await A.coverCandidates(db, store);
  t("seçili", cc["mekan-a"]?.selected === true);
  const pend = (await A.moderationList(db)).filter((x) => x.slug === "mekan-a");
  t("onaysız kapak olamaz", JSON.stringify(await A.setCover(db, "user:mod", pend[0].id)).includes("not_approved"));
  await A.approvePhoto(db, store, "user:mod", pend[0].id);
  await A.setCover(db, "user:mod", pend[0].id);
  t("mekân başına tek kapak", (await db.select().from(schema.photoAssets).where(eq(schema.photoAssets.isCover, true))).length === 1);
  await A.setCover(db, "user:mod", a1);
  /* bildirim */
  t("kendi fotoğrafını bildiremez", JSON.stringify(await A.reportPhoto(db, ayse, a1, "telif")).includes("own_photo"));
  t("bildirim", (await A.reportPhoto(db, burak, a1, "telif", "benim fotoğrafım")).ok);
  t("çift bildirim", JSON.stringify(await A.reportPhoto(db, burak, a1, "telif")).includes("already_reported"));
  t("bildirim kuyruğu", (await A.openPhotoReports(db)).includes(a1));
  t("bildirimde kimlik yok", !JSON.stringify((await A.moderationList(db, "approved")).find((x) => x.id === a1)?.reports).includes(burak));
  /* kaldırma */
  t("başkası kaldıramaz", JSON.stringify(await A.removeOwnPhoto(db, store, burak, a1)).includes("not_found"));
  const rm = await A.removePhoto(db, store, "user:mod", a1, "telif");
  t("kaldırma", rm.ok && rm.filesDeleted === true, rm);
  t("galeriden düştü", !(await A.approvedPhotos(db, store, "mekan-a")).some((x) => x.id === a1));
  t("kapaktan düştü", !(await A.coverCandidates(db, store))["mekan-a"]?.selected);
  t("dosya silindi", ![...store.m.keys()].some((k) => k.includes(a1)));
  t("bildirim kapandı", !(await A.openPhotoReports(db)).includes(a1));
  /* deneyim gizlenince fotoğraf da görünmez */
  const vis = await A.approvedPhotos(db, store, "mekan-a");
  await pg.query(`update reviews set status='hidden' where id=$1`, [rv]);
  t("gizli deneyimin fotoğrafı görünmez", vis.length > 0 && (await A.approvedPhotos(db, store, "mekan-a")).length === 0);
  await pg.query(`update reviews set status='published' where id=$1`, [rv]);
  /* deneyim silme */
  await A.removeReviewPhotos(db, store, ayse, rv);
  t("deneyim silinince fotoğraflar çıktı", (await A.approvedPhotos(db, store, "mekan-a")).length === 0);
  t("kapalı deneyime eklenemez", await (async () => { await pg.query(`update reviews set status='removed' where id=$1`, [rv]); return JSON.stringify(await A.addReviewPhoto(db, store, ayse, rv, await uniq(), { confirmed: true })).includes("review_closed"); })());
  await pg.query(`update reviews set status='published' where id=$1`, [rv]);

  /* hesap kapatma: kullanıcı silinince fotoğrafı açıkta kalmaz */
  { const dU = await mkUser("Silinen Kisi"), dR = await mkReview(dU, placeB); const u = await A.addReviewPhoto(db, store, dU, dR, await uniq(), { confirmed: true }); if (u.ok) await A.approvePhoto(db, store, "user:mod", u.id);
    t("hesap açıkken görünür", (await A.approvedPhotos(db, store, "mekan-b")).length === 1);
    await db.delete(schema.user).where(eq(schema.user.id, dU));
    t("hesap kapanınca görünmez", (await A.approvedPhotos(db, store, "mekan-b")).length === 0); }

  /* puan ayrımı: sonra */
  t("deneyim satırı değişmedi", JSON.stringify(await scoreRow()) === before, await scoreRow());
  t("puan aynı", JSON.stringify(await recomputePlace(db, placeA).catch((e) => String(e))) === score0);
  t("puan/eşik olayı yok", JSON.stringify((await pg.query(`select count(*)::int n from audit_log where action like 'score%' or action like 'threshold%'`)).rows[0]) === JSON.stringify(countProv0));
  for (const f of ["lib/score/compute.ts", "lib/score/published.ts", "lib/score/weights.ts", "lib/community/scoreWatch.ts"]) {
    let src = ""; try { src = readFileSync(f, "utf8"); } catch { continue; }
    t(`${f} fotoğrafa bakmaz`, !/photoAssets|media_items|mediaItems|photoArchive/.test(src));
  }
  /* denetim */
  const acts = (await db.select({ a: schema.auditLog.action }).from(schema.auditLog)).map((x) => x.a);
  for (const a of ["photo_upload", "photo_approve", "photo_reject", "photo_remove", "photo_cover_set", "photo_cover_candidate"]) t(`denetim ${a}`, acts.includes(a));
  /* roller */
  t("rol yok", (await A.staffRole(db, ayse)) === null);
  await db.insert(schema.staffRoles).values({ userId: cem, role: "moderator", grantedBy: "test" });
  t("rol moderator", (await A.staffRole(db, cem)) === "moderator");
  await db.execute(sql`select 1`);

  /* kapak önceliği */
  const venue = (extra: Partial<Entity> = {}) => ({ slug: "v", name: "Örnek", isReal: true, isDemo: false, ...extra }) as unknown as Entity;
  const reg = { src: "/kayit.webp", alt: "x", category: "ic", credit: "Kayıt", addedBy: "işletme" } as VenuePhoto;
  const liveC = (selected: boolean): LiveCover => ({ src: "/api/m.webp", srcSet: "/api/m.webp 480w", credit: "Ayşe Y.", focus: null, selected });
  t("kapak yok → null", coverOf(venue()) === null);
  t("kayıtlı kapak korunur: aday değiştirmez", coverOf(venue({ photos: [reg] }), liveC(false))?.src === "/kayit.webp");
  t("editör seçimi kayıtlıyı geçer", coverOf(venue({ photos: [reg] }), liveC(true))?.src === "/api/m.webp");
  t("kapağı yoksa aday", coverOf(venue(), liveC(false))?.src === "/api/m.webp");
  t("demo kayıt canlı kapak almaz", coverOf(venue({ isDemo: true }), liveC(true)) === null);
  const lp = (id: string, o: Partial<LivePhoto> = {}): LivePhoto => ({ id, src: `/${id}`, srcSet: "", credit: "A", isCover: false, coverCandidate: false, focus: null, ...o });
  t("onaylı ama aday değil: Google kapağı korunur", profilePhotos(venue(), [lp("a")]).hasCover === false && profilePhotos(venue(), [lp("a")]).photos.length === 1);
  t("aday: kendi kapak", profilePhotos(venue(), [lp("a", { coverCandidate: true })]).hasCover === true);
  const japon = realEntities.find((e) => e.slug.startsWith("japon-erdal"));
  t("Japon Erdal kapağı yeni fotoğrafla değişmez", !!japon && coverOf(japon, liveC(false))?.src === coverOf(japon)?.src && !!coverOf(japon));
  const order = profilePhotos(venue({ photos: [reg] }), [lp("r"), lp("c", { coverCandidate: true }), lp("s", { isCover: true })]).photos.map((x) => x.src);
  t("profil sırası", order.join() === "/s,/kayit.webp,/c,/r", order);
  const mosaic = readFileSync("components/venue/media/PhotoMosaic.tsx", "utf8");
  t("kendi kapağında Google kapağı istenmez", mosaic.includes("useGoogleCover(slug, google && !ownCover)"));
  t("kart Google çağırmaz", !/google/i.test(readFileSync("components/venue/VenueCover.tsx", "utf8")));

  console.log(`\nmedya: ${pass} geçti, ${failed} kaldı`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
