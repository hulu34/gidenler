import { createHash } from "node:crypto";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "@/lib/db/client";
import { atomic } from "@/lib/profile";
import { auditLog, googleRatingDecisions, googleRatingFiles, googleRatingHistory, googleRatingImports, googleRatingLock, googleRatings, placeIdentifiers, places } from "@/lib/db/schema";
import { checkFile, decisionFor, hideReason, importable, reclassify, type Decision, type GoogleId, type Row, type Venue } from "./core";
import { readWorkbook } from "./excel";
import { latestDecisions } from "./decisions";
export { latestDecisions };

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

/* ── Yönetici kararları: her karar ayrı satır + denetim kaydı; son karar geçerlidir, hiçbiri silinmez ── */
export const DECISION_NOTE_MIN = 12;
export async function recordDecision(db: Db, d: { slug: string; placeId: string; decision: "onay" | "ret"; note: string; evidence?: unknown; actor: string }) {
  if (d.decision !== "onay" && d.decision !== "ret") return { ok: false as const, error: "bad_decision" };
  const note = (d.note ?? "").trim().slice(0, 500);
  if (note.length < DECISION_NOTE_MIN) return { ok: false as const, error: "note_required" };
  if (!/^[a-z0-9-]{2,120}$/.test(d.slug) || !/^[A-Za-z0-9_-]{16,300}$/.test(d.placeId)) return { ok: false as const, error: "bad_ref" };
  const id = uuidv7();
  await atomic(db, (q) => [
    q.insert(googleRatingDecisions).values({ id, slug: d.slug, placeId: d.placeId, decision: d.decision, note, evidence: (d.evidence ?? null) as object | null, actor: d.actor }),
    q.insert(auditLog).values({ id: uuidv7(), actor: d.actor, action: `google_rating_${d.decision}`, refTable: "google_rating_decisions", refId: id, detail: { slug: d.slug, placeId: d.placeId, note } }),
    /* ret anında gizler; onay bir sonraki aktarımda (ya da hemen yeniden aktarımla) puanı açar */
    ...(d.decision === "ret" ? [q.update(googleRatings).set({ hiddenReason: "yönetici reddetti", updatedAt: new Date() }).where(and(eq(googleRatings.slug, d.slug), eq(googleRatings.placeId, d.placeId)))] : []),
  ]);
  return { ok: true as const, id };
}

export interface ImportReport { importId: string; status: "applied" | "rejected"; fileId: string; rows: number; importable: number; written: number; changed: number; unchanged: number; kept: number; hidden: number; unhidden: number; skipped: Record<string, number>; errors: string[]; warnings: string[]; changedSlugs: string[]; hiddenSlugs: string[] }

/**
 * Excel → veritabanı. Önce dosyanın tamamı doğrulanır; tek hata bile varsa hiçbir satır yazılmaz (eski sağlam veri kalır).
 * Yazım tek işlemde: puanlar, geçmiş, aktarım kaydı ve denetim kaydı birlikte ya yazılır ya hiç yazılmaz.
 * Dosyada puanı olmayan / başarısız satırlar veritabanındaki önceki değere DOKUNMAZ.
 */
export async function importFile(db: Db, fileId: string, venues: Venue[], actor: string): Promise<ImportReport> {
  const importId = uuidv7();
  const f = await getFile(db, fileId);
  const base = { importId, fileId, rows: 0, importable: 0, written: 0, changed: 0, unchanged: 0, kept: 0, hidden: 0, unhidden: 0, skipped: {}, warnings: [], changedSlugs: [], hiddenSlugs: [] };
  const reject = async (errors: string[], extra: Partial<ImportReport> = {}): Promise<ImportReport> => {
    const rep: ImportReport = { ...base, ...extra, status: "rejected", errors };
    await atomic(db, (q) => [
      q.insert(googleRatingImports).values({ id: importId, fileId, actor, status: "rejected", detail: rep }),
      q.insert(auditLog).values({ id: uuidv7(), actor, action: "google_rating_import_rejected", refTable: "google_rating_imports", refId: importId, detail: { fileId, errors: errors.slice(0, 10) } }),
    ]);
    return rep;
  };
  if (!f) return reject(["Dosya bulunamadı"]);
  const read = await readWorkbook(f.buf);
  if (read.errors.length) return reject(read.errors);
  /* Sunucu, dosyadaki durum sütununa güvenmez: kayıtlı gözlem bugünkü kurallarla yeniden değerlendirilir
     (tür/konaklama kontrolü, sınırlı görünüm sayısı). Elle düzenlenmiş Excel bu kuralları aşamaz. */
  const vmap = new Map(venues.map((v) => [v.slug, v]));
  const parsed = { ...read, rows: read.rows.map((r) => reclassify(r, vmap.get(r.slug))) };
  const cur = await currentRatings(db);
  const decisions = await latestDecisions(db);
  const check = checkFile(parsed.rows, venues, new Map([...cur].map(([s, r]) => [s, { rating: r.rating, reviews: r.reviewCount }])));
  if (!check.ok) return reject(check.errors, { rows: parsed.rows.length, warnings: check.warnings });

  const known = new Set(venues.map((v) => v.slug));
  const skipped: Record<string, number> = {};
  const take: Row[] = [];
  for (const r of parsed.rows) {
    if (!known.has(r.slug)) { skipped["listede yok"] = (skipped["listede yok"] ?? 0) + 1; continue; }
    const i = importable(r, decisions.get(r.slug));
    if (!i.ok) { skipped[i.why!] = (skipped[i.why!] ?? 0) + 1; continue; }
    take.push(r);
  }
  /* yalnız değişen ya da daha yeni kontrol tarihi taşıyan satırlar yazılır; eski tarihli dosya yeni veriyi ezemez */
  /* aynı gözlemin bugünkü kurallarla yeniden değerlendirilmesi (ör. sınırlı görünüm sayısının boşaltılması) de yazılır;
     daha ESKİ tarihli dosya ise yeni veriyi ezemez */
  const write = take.filter((r) => { const c = cur.get(r.slug); if (!c) return true; const t = Date.parse(r.checkedAt), ct = c.checkedAt.getTime();
    return t > ct || c.placeId !== r.placeId || c.hiddenReason != null || (t === ct && (c.rating !== r.rating || c.reviewCount !== (r.reviews ?? null))); });
  /* Olumsuz kanıt (yanlış tür/şube, kapalı, ret) sitede önceden gösterilen puanı gizler; satır ve geçmiş silinmez. */
  const hide: Array<{ slug: string; why: string }> = [];
  for (const r of parsed.rows) {
    const c = cur.get(r.slug); if (!c || c.placeId !== r.placeId || !known.has(r.slug)) continue;
    const why = hideReason(r, decisionFor(r, decisions.get(r.slug)));
    if (why && c.hiddenReason !== why) hide.push({ slug: r.slug, why });
  }
  const unhide = write.filter((r) => cur.get(r.slug)?.hiddenReason != null).map((r) => r.slug);
  const changedRows = write.filter((r) => { const c = cur.get(r.slug); return !c || c.rating !== r.rating || c.reviewCount !== (r.reviews ?? null) || c.placeId !== r.placeId; });
  const rep: ImportReport = {
    ...base, status: "applied", rows: parsed.rows.length, importable: take.length, written: write.length, changed: changedRows.length,
    unchanged: write.length - changedRows.length, kept: [...cur.keys()].filter((s) => !write.some((w) => w.slug === s)).length,
    hidden: hide.length, unhidden: unhide.length,
    skipped, errors: [], warnings: check.warnings, changedSlugs: changedRows.map((r) => r.slug).slice(0, 200), hiddenSlugs: hide.map((h) => h.slug).slice(0, 200),
  };
  const values = write.map((r) => ({ slug: r.slug, placeId: r.placeId, rating: r.rating!, reviewCount: r.reviews ?? null, mapsUrl: r.mapsUrl || null, checkedAt: new Date(r.checkedAt), source: r.source || "bilinmiyor", confidence: r.confidence, importId }));
  const hist = changedRows.map((r) => ({ id: uuidv7(), slug: r.slug, rating: r.rating!, reviewCount: r.reviews ?? null, checkedAt: new Date(r.checkedAt), source: r.source || "bilinmiyor", importId }));
  const chunks = <T,>(xs: T[]) => Array.from({ length: Math.ceil(xs.length / CHUNK) }, (_, i) => xs.slice(i * CHUNK, (i + 1) * CHUNK));
  await atomic(db, (q) => [
    ...chunks(values).map((c) => q.insert(googleRatings).values(c).onConflictDoUpdate({ target: googleRatings.slug, set: {
      placeId: sql`excluded.place_id`, rating: sql`excluded.rating`, reviewCount: sql`excluded.review_count`, mapsUrl: sql`excluded.maps_url`,
      checkedAt: sql`excluded.checked_at`, source: sql`excluded.source`, confidence: sql`excluded.confidence`, importId: sql`excluded.import_id`, hiddenReason: sql`NULL`, updatedAt: sql`now()` } })),
    ...hide.map((h) => q.update(googleRatings).set({ hiddenReason: h.why, updatedAt: new Date() }).where(eq(googleRatings.slug, h.slug))),
    ...chunks(hist).map((c) => q.insert(googleRatingHistory).values(c)),
    q.insert(googleRatingImports).values({ id: importId, fileId, actor, status: "applied", detail: rep }),
    q.insert(auditLog).values({ id: uuidv7(), actor, action: "google_rating_import", refTable: "google_rating_imports", refId: importId, detail: { fileId, written: rep.written, changed: rep.changed, kept: rep.kept, hidden: rep.hidden, unhidden: rep.unhidden, hiddenSlugs: rep.hiddenSlugs.slice(0, 50) } }),
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
  const [hid] = await db.select({ n: sql<number>`count(*)::int` }).from(googleRatings).where(sql`${googleRatings.hiddenReason} IS NOT NULL`);
  return { ratings: Number(r?.n ?? 0), newest: r?.newest ?? null, oldest: r?.oldest ?? null, stale: Number(stale?.n ?? 0), hidden: Number(hid?.n ?? 0) };
}

/* ── Günlük yönetici raporu: son çalışmanın tek bakışta özeti (yalnız sayılar ve mekân listeleri; Google'a istek yok) ── */
export async function dailyReport(db: Db) {
  const { withDerived, FINAL, STATUS, trDay, reclassify } = await import("./core");
  const { sheetVenues } = await import("./venues");
  const { CLOSURES } = await import("@/lib/closure");
  const [imports, f, stats, decisions] = await Promise.all([importsLog(db, 7), getFile(db, "son"), ratingStats(db), latestDecisions(db)]);
  const last = imports[0] ?? null;
  const parsed = f ? await readWorkbook(f.buf) : null;
  const vmap = new Map(sheetVenues().map((v) => [v.slug, v]));
  const rows = parsed && !parsed.errors.length ? withDerived(parsed.rows.map((r) => reclassify(r, vmap.get(r.slug))), decisions).filter((r) => r.record === "Aktif") : [];
  const lastRun = rows.reduce((m, r) => (r.attemptAt > m ? r.attemptAt : m), "");
  /* Türkiye günü: günde bir zamanlanmış çalışma olduğundan "bugün denenen" = son günlük çalışma (+ aynı gün elle yapılanlar) */
  const runDay = lastRun ? trDay(new Date(lastRun)) : "";
  const today = rows.filter((r) => r.attemptAt && !Number.isNaN(Date.parse(r.attemptAt)) && trDay(new Date(r.attemptAt)) === runDay);
  const final: Record<string, number> = Object.fromEntries(Object.values(FINAL).map((x) => [x, rows.filter((r) => r.finalState === x).length]));
  const pick = (st: string[]) => rows.filter((r) => st.includes(r.finalState)).map((r) => ({ slug: r.slug, placeId: r.placeId, name: r.name, district: r.district, state: r.finalState, reason: r.finalReason.slice(0, 160) }));
  const detail = (last?.detail ?? {}) as { written?: number; changed?: number; hidden?: number; unhidden?: number; kept?: number; errors?: string[] };
  return {
    file: f ? { id: f.id, kind: f.kind, createdAt: f.createdAt.toISOString(), rows: f.rows } : null,
    lastImport: last ? { at: last.createdAt.toISOString(), status: last.status, written: detail.written ?? 0, changed: detail.changed ?? 0, hidden: detail.hidden ?? 0, unhidden: detail.unhidden ?? 0, kept: detail.kept ?? 0, errors: (detail.errors ?? []).slice(0, 5) } : null,
    recentImports: imports.map((i) => ({ at: i.createdAt.toISOString(), status: i.status, written: (i.detail as { written?: number }).written ?? 0, hidden: (i.detail as { hidden?: number }).hidden ?? 0 })),
    lastRun: { at: lastRun || null, day: runDay || null, attempted: today.length, updated: today.filter((r) => r.status === STATUS.fresh).length, unchanged: today.filter((r) => r.status === STATUS.same).length,
      errors: today.filter((r) => [STATUS.error, STATUS.blocked, STATUS.deferred].includes(r.status as never)).length, blocked: today.filter((r) => r.status === STATUS.blocked).length,
      limitedView: today.filter((r) => r.view === "Sınırlı").length },
    site: { shown: stats.ratings - stats.hidden, hidden: stats.hidden, stale: stats.stale, newest: stats.newest },
    final,
    review: pick([FINAL.awaitingMatch, FINAL.typeReview]),
    wrong: pick([FINAL.branch, FINAL.location, FINAL.wrongType]),
    readErrors: pick([FINAL.readError]),
    closures: { confirmed: Object.values(CLOSURES).filter((c) => c.state === "closed_confirmed").length, suspected: Object.entries(CLOSURES).filter(([, c]) => c.state === "closed_suspected").map(([slug, c]) => ({ slug, note: c.note })) },
    decisions: [...decisions.values()].slice(0, 100),
  };
}
