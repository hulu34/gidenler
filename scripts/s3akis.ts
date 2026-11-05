/* GERÇEK S3 PROTOKOLÜYLE FOTOĞRAF AKIŞI — uygulamanın kendi fotoğraf servisi ve dosya sunum ucu, gerçek bir S3 sunucusuna (Actions'ta MinIO) bağlı.
   Bellek içi sahte depo YOK. Veritabanı gömülü Postgres (PGlite), oturum Better Auth'un gerçek imzalı çerezi.
   Sınanan 8 adım: yükle → gerçekten saklandı mı → yetkili açar → yetkisiz açamaz → sil → silindikten sonra okunamaz → bağlantıyı kes → yeniden deneme tamamlar.
   R2 testi DEĞİLDİR: R2 aynı S3 API'sini konuşur ama kendi hesabıyla ayrıca denenmelidir (yönetim → medya sağlığı → depolama denemesi). */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { uuidv7 } from "uuidv7";
import { createHmac, randomBytes } from "node:crypto";
import { AwsClient } from "aws4fetch";

const endpoint = process.env.S3_TEST_ENDPOINT, accessKeyId = process.env.S3_TEST_KEY, secretAccessKey = process.env.S3_TEST_SECRET;
if (!endpoint || !accessKeyId || !secretAccessKey) { console.error("S3_TEST_* tanımlı değil: gerçek S3 sunucusu olmadan bu test çalışmaz (sahte depoya düşmez)."); process.exit(2); }
/* kimlik: gerçek Better Auth, sahte Google kimlik bilgisi (Google'a istek gitmez; yalnız çerez doğrulanır) */
Object.assign(process.env, { DATABASE_URL: "postgres://pglite.local/test", BETTER_AUTH_SECRET: randomBytes(32).toString("hex"), BETTER_AUTH_URL: "http://localhost:3000", GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test" });

let pass = 0, failed = 0;
const t = (n: string, c: unknown, x?: unknown) => { if (c) { pass++; console.log(`✓ ${n}`); } else { failed++; console.log(`✗ ${n}`, x === undefined ? "" : JSON.stringify(x).slice(0, 300)); } };

async function main() {
  const schema = await import("../lib/db/schema");
  const { setDbForTests } = await import("../lib/db/client");
  const { applyMigrations } = await import("../lib/db/migrate");
  const { s3Storage, setStorageForTests } = await import("../lib/media/storage");
  const A = await import("../lib/media/photoArchive");
  const { GET: fileGET } = await import("../app/api/media/file/[...key]/route");
  type Db = import("../lib/db/client").Db;

  /* kovalar */
  const s3admin = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "us-east-1" });
  const conf = { endpoint: endpoint!, accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey!, privateBucket: "gidenler-preview-ozel", publicBucket: "gidenler-preview-genel", region: "us-east-1" };
  for (const b of [conf.privateBucket, conf.publicBucket]) await s3admin.fetch(`${endpoint}/${b}`, { method: "PUT" });
  const raw = async (bucket: string, key: string, signed = true) => signed ? s3admin.fetch(`${endpoint}/${bucket}/${key}`) : fetch(`${endpoint}/${bucket}/${key}`);
  const s3 = s3Storage(conf);
  setStorageForTests(s3);

  /* veritabanı */
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as Db;
  await applyMigrations({ query: async <T,>(q: string) => (await pg.query(q)).rows as T[], transaction: async (st: string[]) => { await pg.transaction(async (tx) => { for (const q of st) await tx.exec(q); }); } });
  setDbForTests(db);
  const cols = (await pg.query<{ column_name: string; is_nullable: string; column_default: string | null }>(`select column_name,is_nullable,column_default from information_schema.columns where table_name='places'`)).rows;
  const placeId = uuidv7(), v: Record<string, unknown> = {};
  for (const c of cols.filter((c) => c.is_nullable === "NO" && !c.column_default)) v[c.column_name] = c.column_name === "id" ? placeId : "s3-test-mekan";
  await pg.query(`insert into places (${Object.keys(v).map((k) => `"${k}"`).join()}) values (${Object.keys(v).map((_, i) => `$${i + 1}`).join()})`, Object.values(v));
  const mkUser = async (name: string, role?: "moderator") => {
    const id = uuidv7(), token = randomBytes(24).toString("hex");
    await db.insert(schema.user).values({ id, name, email: `${id}@example.invalid`, emailVerified: true, kind: "test" });
    await db.insert(schema.session).values({ id: uuidv7(), token, userId: id, expiresAt: new Date(Date.now() + 3600_000) });
    if (role) await db.insert(schema.staffRoles).values({ userId: id, role, grantedBy: "s3akis" });
    const sign = createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64");
    return { id, cookie: `better-auth.session_token=${encodeURIComponent(`${token}.${sign}`)}` };
  };
  const [sahip, yabanci, mod] = [await mkUser("Ayşe Yükleyen"), await mkUser("Burak Yabancı"), await mkUser("Mod Editör", "moderator")];
  const rid = uuidv7();
  await pg.query(`insert into reviews (id,user_id,place_id,body,status,visited_on,overall,ratings,return_intent) values ($1,$2,$3,$4,'published','2026-10-01',8,'{}','evet')`, [rid, sahip.id, placeId, "S3 protokol testi için yazılmış yeterince uzun bir deneyim metni."]);
  const open = async (key: string, cookie?: string) => fileGET(new Request(`http://localhost:3000/api/media/file/${key}`, { headers: cookie ? { cookie } : {} }), { params: Promise.resolve({ key: key.split("/") }) });
  const jpg = (r: number) => sharp({ create: { width: 1600, height: 1200, channels: 3, background: { r, g: 90, b: 40 } } }).jpeg({ quality: 90 }).withExif({ IFD0: { Copyright: "gizli" }, IFD3: { GPSLatitude: "41/1 0/1 0/1" } }).toBuffer();

  /* 1) yükle */
  const up = await A.addReviewPhoto(db, s3, sahip.id, rid, await jpg(140), { confirmed: true });
  t("1 · yükleme gerçek S3'e yapıldı", up.ok, up);
  if (!up.ok) throw new Error("yükleme yok");
  const [asset] = await db.select().from(schema.photoAssets).where(eq(schema.photoAssets.mediaId, up.id));
  const keys = asset.variants.map((x) => x.key);
  /* 2) gerçekten saklandı mı */
  const stored = await Promise.all(keys.map(async (k) => { const r = await raw(conf.privateBucket, k); return { s: r.status, b: Buffer.from(await r.arrayBuffer()) }; }));
  t("2 · her boyut özel kovada duruyor", stored.every((x) => x.s === 200 && x.b.length > 500), stored.map((x) => x.s));
  const meta = await sharp(stored[0].b).metadata();
  t("2 · saklanan dosya WebP ve EXIF/GPS yok", meta.format === "webp" && !meta.exif && !meta.icc && !meta.xmp, meta.format);
  t("2 · onaylanmamış dosya genel kovaya hiç yazılmadı", (await Promise.all(keys.map(async (k) => (await raw(conf.publicBucket, k)).status))).every((s) => s === 404));
  t("2 · kayıtlı sağlayıcı s3", asset.storageProvider === "s3", asset.storageProvider);
  /* 3) yetkili açar */
  t("3 · yükleyen kendi bekleyen fotoğrafını açar", (await open(keys[0], sahip.cookie)).status === 200);
  t("3 · moderatör bekleyen fotoğrafı açar", (await open(keys[0], mod.cookie)).status === 200);
  const r3 = await open(keys[0], sahip.cookie);
  t("3 · özel dosya önbelleğe alınmaz ve indekslenmez", r3.headers.get("cache-control") === "private, no-store" && r3.headers.get("x-robots-tag") === "noindex");
  /* 4) yetkisiz açamaz */
  t("4 · oturumsuz açamaz", (await open(keys[0])).status === 404);
  t("4 · başka kullanıcı açamaz", (await open(keys[0], yabanci.cookie)).status === 404);
  t("4 · sahte çerez açamaz", (await open(keys[0], "better-auth.session_token=uydurma.imza")).status === 404);
  t("4 · kova imzasız okunamaz", (await raw(conf.privateBucket, keys[0], false)).status === 403);
  t("4 · tahmin edilen genel adres onaysızken açılmaz", (await open(keys[0].replace(/^pending\//, "public/"))).status === 404);
  /* onay → genel */
  const ap = await A.approvePhoto(db, s3, `user:${mod.id}`, up.id);
  t("onay: dosyalar genel kovaya taşındı, özel kovadan silindi", ap.ok && (await Promise.all(keys.map(async (k) => (await raw(conf.privateBucket, k)).status))).every((s) => s === 404), ap);
  const pubKeys = keys.map((k) => k.replace(/^pending\//, "public/"));
  t("onay: oturumsuz ziyaretçi onaylı fotoğrafı açar", (await open(pubKeys[0])).status === 200);
  t("onay: eski bekleyen adres artık açılmaz", (await open(keys[0], sahip.cookie)).status === 404);
  /* 5) sil  6) silindikten sonra okunamaz */
  const rm = await A.removeOwnPhoto(db, s3, sahip.id, up.id);
  t("5 · kullanıcı kendi fotoğrafını sildi, dosyalar silindi", rm.ok && rm.filesDeleted === true, rm);
  t("6 · silinen dosya uygulamadan açılmaz", (await open(pubKeys[0])).status === 404);
  t("6 · silinen dosya kovada yok", (await Promise.all(pubKeys.map(async (k) => (await raw(conf.publicBucket, k)).status))).every((s) => s === 404));
  /* 7) bağlantıyı kes */
  const down = s3Storage({ ...conf, endpoint: "http://127.0.0.1:9" });
  const n0 = (await db.select().from(schema.mediaItems)).length;
  const up2 = await A.addReviewPhoto(db, down, sahip.id, rid, await jpg(20), { confirmed: true });
  t("7 · depo kapalıyken yükleme dürüstçe başarısız", !up2.ok && up2.error === "storage_failed", up2);
  t("7 · başarısız yükleme kayıt bırakmaz", (await db.select().from(schema.mediaItems)).length === n0);
  const up3 = await A.addReviewPhoto(db, s3, sahip.id, rid, await jpg(60), { confirmed: true });
  if (!up3.ok) throw new Error("yükleme 3 yok");
  await A.approvePhoto(db, s3, `user:${mod.id}`, up3.id);
  const k3 = (await db.select().from(schema.photoAssets).where(eq(schema.photoAssets.mediaId, up3.id)))[0].variants.map((x) => x.key.replace(/^pending\//, "public/"));
  const rmDown = await A.removePhoto(db, down, `user:${mod.id}`, up3.id, "test: depo kapalı");
  t("7 · depo kapalıyken kaldırma: yayından düşer, dosya silinemedi diye dürüst", rmDown.ok && rmDown.filesDeleted === false && !(await A.approvedPhotos(db, s3, "s3-test-mekan")).some((p) => p.id === up3.id), rmDown);
  t("7 · dosyalar hâlâ kovada (silinemedi), kuyrukta bekliyor", (await Promise.all(k3.map(async (k) => (await raw(conf.publicBucket, k)).status))).every((s) => s === 200)
    && (await db.select().from(schema.mediaCleanup).where(sql`done_at is null and media_id = ${up3.id}`)).length === k3.length);
  t("7 · kaldırılan fotoğraf dosyası uygulamadan açılmaz", (await open(k3[0])).status === 404);
  /* 8) yeniden deneme */
  const later = new Date(Date.now() + 48 * 3600_000);
  const again = await A.runCleanup(db, down, { now: later });
  t("8 · depo hâlâ kapalıyken yeniden deneme başarısız sayılır", again.failed === k3.length && again.done === 0, again);
  const fixed = await A.runCleanup(db, s3, { now: new Date(later.getTime() + 48 * 3600_000) });
  t("8 · depo açılınca kuyruk tamamlanır", fixed.done === k3.length && fixed.failed === 0, fixed);
  t("8 · dosyalar gerçekten silindi", (await Promise.all(k3.map(async (k) => (await raw(conf.publicBucket, k)).status))).every((s) => s === 404));
  t("8 · tekrar çalıştırmak güvenli", (await A.runCleanup(db, s3, { now: new Date(later.getTime() + 96 * 3600_000) })).done === 0);
  /* yanlış anahtar */
  const bad = s3Storage({ ...conf, secretAccessKey: "yanlis" });
  const up4 = await A.addReviewPhoto(db, bad, sahip.id, rid, await jpg(200), { confirmed: true });
  t("yanlış anahtarla yükleme başarı göstermez", !up4.ok && up4.error === "storage_failed", up4);
  setStorageForTests(undefined);
  console.log(`SONUÇ ${pass}/${pass + failed}`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
