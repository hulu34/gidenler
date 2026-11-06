import { createHash } from "node:crypto";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "@/lib/db/client";
import { atomic } from "@/lib/profile";
import { auditLog, googleRatingFiles, googleRatingHistory, googleRatingImports, googleRatingLock, googleRatings, placeIdentifiers, places } from "@/lib/db/schema";
import { checkFile, importable, type GoogleId, type Row, type Venue } from "./core";
import { readWorkbook } from "./excel";

/* Sunucu tarafı: kilit, Excel sürümleri ve Excel → veritabanı aktarımı. Yalnız yönetim ucundan çağrılır. */
const LOCK = "gunluk";
const KEEP_FILES = 40;
const CHUNK = 400;

export async function acquireLock(db: Db, holder: string, ttlSec = 1800): Promise<{ ok: boolean; holder: string; expiresAt: string }> {
  const until = new Date(Date.now() + Math.min(Math.max(ttlSec, 60), 4 * 3600) * 1000);
  await db.insert(googleRatingLock).values({ name: LOCK, holder, expiresAt: until })
    .onConflictDoUpdate({ target: googleRatingLock.name, set: { holder, expiresAt: until }, where: sql`${googleRatingLock.expiresAt} < now() OR ${googleRatingLock.holder} = ${holder}` });
  const [cur] = await db.select().from(googleRatingLock).where(eq(googleRatingLock.name, LOCK));
  return { ok: cur?.holder === holder, holder: cur?.holder ?? "", expiresAt: cur?.expiresAt.toISOString() ?? "" };
}
export async function releaseLock(db: Db, holder: string) {
  await db.delete(googleRatingLock).where(and(eq(googleRatingLock.name, LOCK), eq(googleRatingLock.holder, holder)));
}
export async function holdsLock(db: Db, holder: string) {
  const [cur] = await db.select().from(googleRatingLock).where(eq(googleRatingLock.name, LOCK));
  return !!cur && cur.holder === holder && cur.expiresAt.getTime() > Date.now();
}

export const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

export async function saveFile(db: Db, buf: Buffer, kind: "taslak" | "son" | "elle", run: string | null) {
  const parsed = await readWorkbook(buf);
  if (parsed.errors.length) return { ok: false as const, errors: parsed.errors };
  const id = uuidv7();
  await db.insert(googleRatingFiles).values({ id, kind, run, sha256: sha256(buf), size: buf.length, rows: parsed.rows.length, data: buf.toString("base64") });
  /* eski sürümler: son KEEP_FILES dosya kalır (aktarım kayıtları ve geçmiş tablosu ayrıca saklanır) */
  const old = await db.select({ id: googleRatingFiles.id }).from(googleRatingFiles).orderBy(desc(googleRatingFiles.createdAt)).offset(KEEP_FILES);
  if (old.length) await db.delete(googleRatingFiles).where(inArray(googleRatingFiles.id, old.map((o) => o.id)));
  return { ok: true as const, id, rows: parsed.rows.length };
}

export async function getFile(db: Db, which: string) {
  const q = db.select().from(googleRatingFiles);
  const [f] = which === "son" ? await q.where(eq(googleRatingFiles.kind, "son")).orderBy(desc(googleRatingFiles.createdAt)).limit(1)
    : which === "en-yeni" ? await q.orderBy(desc(googleRatingFiles.createdAt)).limit(1)
    : await q.where(eq(googleRatingFiles.id, which)).limit(1);
  return f ? { ...f, buf: Buffer.from(f.data, "base64") } : null;
}

export async function listFiles(db: Db, n = 15) {
  return db.select({ id: googleRatingFiles.id, kind: googleRatingFiles.kind, run: googleRatingFiles.run, rows: googleRatingFiles.rows, size: googleRatingFiles.size, sha256: googleRatingFiles.sha256, createdAt: googleRatingFiles.createdAt })
    .from(googleRatingFiles).orderBy(desc(googleRatingFiles.createdAt)).limit(n);
}

/** Mevcut doğrulama kayıtları: slug → Google kimlikleri (place ID + durum). Google'a istek yok. */
export async function googleIds(db: Db): Promise<Record<string, GoogleId[]>> {
  const rows = await db.select({ slug: places.slug, externalId: placeIdentifiers.externalId, status: placeIdentifiers.status })
    .from(placeIdentifiers).innerJoin(places, eq(places.id, placeIdentifiers.placeId)).where(eq(placeIdentifiers.provider, "google"));
  const out: Record<string, GoogleId[]> = {};
  for (const r of rows) (out[r.slug] ??= []).push({ externalId: r.externalId, status: r.status });
  return out;
}

export async function currentRatings(db: Db) {
  const rows = await db.select().from(googleRatings);
  return new Map(rows.map((r) => [r.slug, r]));
}

export interface ImportReport { importId: string; status: "applied" | "rejected"; fileId: string; rows: number; importable: number; written: number; changed: number; unchanged: number; kept: number; skipped: Record<string, number>; errors: string[]; warnings: string[]; changedSlugs: string[] }

/**
 * Excel → veritabanı. Önce dosyanın tamamı doğrulanır; tek hata bile varsa hiçbir satır yazılmaz (eski sağlam veri kalır).
 * Yazım tek işlemde: puanlar, geçmiş, aktarım kaydı ve denetim kaydı birlikte ya yazılır ya hiç yazılmaz.
 * Dosyada puanı olmayan / başarısız satırlar veritabanındaki önceki değere DOKUNMAZ.
 */
export async function importFile(db: Db, fileId: string, venues: Venue[], actor: string): Promise<ImportReport> {
  const importId = uuidv7();
  const f = await getFile(db, fileId);
  const base = { importId, fileId, rows: 0, importable: 0, written: 0, changed: 0, unchanged: 0, kept: 0, skipped: {}, warnings: [], changedSlugs: [] };
  const reject = async (errors: string[], extra: Partial<ImportReport> = {}): Promise<ImportReport> => {
    const rep: ImportReport = { ...base, ...extra, status: "rejected", errors };
    await atomic(db, (q) => [
      q.insert(googleRatingImports).values({ id: importId, fileId, actor, status: "rejected", detail: rep }),
      q.insert(auditLog).values({ id: uuidv7(), actor, action: "google_rating_import_rejected", refTable: "google_rating_imports", refId: importId, detail: { fileId, errors: errors.slice(0, 10) } }),
    ]);
    return rep;
  };
  if (!f) return reject(["Dosya bulunamadı"]);
  const parsed = await readWorkbook(f.buf);
  if (parsed.errors.length) return reject(parsed.errors);
  const cur = await currentRatings(db);
  const check = checkFile(parsed.rows, venues, new Map([...cur].map(([s, r]) => [s, { rating: r.rating, reviews: r.reviewCount }])));
  if (!check.ok) return reject(check.errors, { rows: parsed.rows.length, warnings: check.warnings });

  const known = new Set(venues.map((v) => v.slug));
  const skipped: Record<string, number> = {};
  const take: Row[] = [];
  for (const r of parsed.rows) {
    if (!known.has(r.slug)) { skipped["listede yok"] = (skipped["listede yok"] ?? 0) + 1; continue; }
    const i = importable(r);
    if (!i.ok) { skipped[i.why!] = (skipped[i.why!] ?? 0) + 1; continue; }
    take.push(r);
  }
  /* yalnız değişen ya da daha yeni kontrol tarihi taşıyan satırlar yazılır; eski tarihli dosya yeni veriyi ezemez */
  const write = take.filter((r) => { const c = cur.get(r.slug); return !c || Date.parse(r.checkedAt) > c.checkedAt.getTime() || c.placeId !== r.placeId; });
  const changedRows = write.filter((r) => { const c = cur.get(r.slug); return !c || c.rating !== r.rating || c.reviewCount !== (r.reviews ?? null) || c.placeId !== r.placeId; });
  const rep: ImportReport = {
    ...base, status: "applied", rows: parsed.rows.length, importable: take.length, written: write.length, changed: changedRows.length,
    unchanged: write.length - changedRows.length, kept: [...cur.keys()].filter((s) => !write.some((w) => w.slug === s)).length,
    skipped, errors: [], warnings: check.warnings, changedSlugs: changedRows.map((r) => r.slug).slice(0, 200),
  };
  const values = write.map((r) => ({ slug: r.slug, placeId: r.placeId, rating: r.rating!, reviewCount: r.reviews ?? null, mapsUrl: r.mapsUrl || null, checkedAt: new Date(r.checkedAt), source: r.source || "bilinmiyor", confidence: r.confidence, importId }));
  const hist = changedRows.map((r) => ({ id: uuidv7(), slug: r.slug, rating: r.rating!, reviewCount: r.reviews ?? null, checkedAt: new Date(r.checkedAt), source: r.source || "bilinmiyor", importId }));
  const chunks = <T,>(xs: T[]) => Array.from({ length: Math.ceil(xs.length / CHUNK) }, (_, i) => xs.slice(i * CHUNK, (i + 1) * CHUNK));
  await atomic(db, (q) => [
    ...chunks(values).map((c) => q.insert(googleRatings).values(c).onConflictDoUpdate({ target: googleRatings.slug, set: {
      placeId: sql`excluded.place_id`, rating: sql`excluded.rating`, reviewCount: sql`excluded.review_count`, mapsUrl: sql`excluded.maps_url`,
      checkedAt: sql`excluded.checked_at`, source: sql`excluded.source`, confidence: sql`excluded.confidence`, importId: sql`excluded.import_id`, updatedAt: sql`now()` } })),
    ...chunks(hist).map((c) => q.insert(googleRatingHistory).values(c)),
    q.insert(googleRatingImports).values({ id: importId, fileId, actor, status: "applied", detail: rep }),
    q.insert(auditLog).values({ id: uuidv7(), actor, action: "google_rating_import", refTable: "google_rating_imports", refId: importId, detail: { fileId, written: rep.written, changed: rep.changed, kept: rep.kept } }),
  ]);
  return rep;
}

/** Eşleşmesi sonradan reddedilen / kaldırılan mekânın puanı: veritabanından gizlenmez, siteden okunurken place ID kontrolüyle elenir. */
export async function importsLog(db: Db, n = 10) {
  return db.select().from(googleRatingImports).orderBy(desc(googleRatingImports.createdAt)).limit(n);
}
export async function ratingStats(db: Db) {
  const [r] = await db.select({ n: sql<number>`count(*)::int`, newest: sql<string>`max(checked_at)`, oldest: sql<string>`min(checked_at)` }).from(googleRatings);
  const [stale] = await db.select({ n: sql<number>`count(*)::int` }).from(googleRatings).where(lt(googleRatings.checkedAt, new Date(Date.now() - 45 * 864e5)));
  return { ratings: Number(r?.n ?? 0), newest: r?.newest ?? null, oldest: r?.oldest ?? null, stale: Number(stale?.n ?? 0) };
}
