import { and, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "@/lib/db/client";
import { auditLog, mediaCleanup, mediaItems, mediaPlaces, moderationQueue, photoAssets, places, reviews, staffRoles, user } from "@/lib/db/schema";
import { publicName } from "@/lib/community/reviews";
import type { PhotoError } from "./photoProcess";
import type { MediaStorage } from "./storage";

/* FOTOĞRAF ARŞİVİ — yükleme, moderasyon, kapak. Kurallar:
   · Fotoğraf deneyimden ayrıdır: reviews satırına, puana, güven etiketine ve eşik bildirimine dokunmaz; ziyaret doğrulaması değildir.
   · Mekân istemciden alınmaz: deneyimden türetilir. Yalnız deneyimin sahibi ekler.
   · Onaya kadar dosya özel önektedir (pending/); yalnız yükleyen ve personel görür.
   · Yeni fotoğraf kapağı kendiliğinden değiştirmez; kapak editör seçimidir.
   · Neon HTTP sürücüsünde işlem (transaction) yok: adımlar kısmi hatada tutarlı kalacak sırayla yazılır. */
export const MAX_PER_REVIEW = 5;
export type UploadError = PhotoError | "not_found" | "not_owner" | "review_closed" | "limit" | "duplicate" | "storage_failed" | "rights_required";
export type PhotoStatus = "uploading" | "pending" | "approved" | "rejected" | "removed";
export const RIGHTS_STATEMENT_OWN = "Bu fotoğrafı ben çektim; Gidenler'de yayımlanmasına izin veriyorum.";
export const RIGHTS_STATEMENT_AUTHORIZED = "Bu fotoğrafı kullanma yetkim var; Gidenler'de yayımlanmasına izin veriyorum.";
export type RightsType = "own" | "authorized";
export const REPORT_REASONS = ["yanlis_restoran", "telif", "uygunsuz", "kisisel_veri", "diger"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

const audit = (db: Db, actor: string, action: string, refId: string, detail: unknown) =>
  db.insert(auditLog).values({ id: uuidv7(), actor, action, refTable: "media_items", refId, detail });
const pendingKey = (id: string, w: number) => `pending/${id}/${w}.webp`;
const publicKey = (id: string, w: number) => `public/${id}/${w}.webp`;
const STALE_UPLOAD_MS = 10 * 60 * 1000;

export async function staffRole(db: Db, userId: string): Promise<"moderator" | "admin" | null> {
  const [r] = await db.select({ role: staffRoles.role }).from(staffRoles).where(eq(staffRoles.userId, userId)).limit(1);
  return r?.role === "admin" || r?.role === "moderator" ? r.role : null;
}

async function dropRow(db: Db, id: string) { await db.delete(mediaItems).where(eq(mediaItems.id, id)); }

/** Deneyime fotoğraf ekler. Başarıda durum "pending": herkese açık değildir. */
export async function addReviewPhoto(db: Db, storage: MediaStorage, uploaderId: string, reviewId: string, input: Buffer, rights: { confirmed: boolean; type?: RightsType }):
  Promise<{ ok: true; id: string; status: "pending"; width: number; height: number } | { ok: false; error: UploadError }> {
  const [rv] = await db.select({ userId: reviews.userId, placeId: reviews.placeId, status: reviews.status, slug: places.slug }).from(reviews).innerJoin(places, eq(places.id, reviews.placeId)).where(eq(reviews.id, reviewId)).limit(1);
  if (!rv) return { ok: false, error: "not_found" };
  if (rv.userId !== uploaderId) return { ok: false, error: "not_owner" };
  if (rv.status !== "published" && rv.status !== "pending") return { ok: false, error: "review_closed" };
  if (!rights.confirmed) return { ok: false, error: "rights_required" };
  /* sharp yalnız yüklemede yüklenir: sayfa işlevleri ağırlaşmaz */
  const { processPhoto } = await import("./photoProcess");
  const processed = await processPhoto(input);
  if (!processed.ok) return { ok: false, error: processed.error };
  const { photo } = processed;
  const id = uuidv7();
  const reserve = async () => {
    await db.insert(mediaItems).values({ id, type: "photo", platform: "upload", url: `upload:${id}`, storageClass: "store", source: "community", submittedBy: uploaderId, status: "uploading" });
    const row = await db.insert(photoAssets).values({
      mediaId: id, placeId: rv.placeId, reviewId, uploaderId, sha256: photo.sha256, width: photo.width, height: photo.height, bytes: photo.variants.reduce((n, v) => n + v.bytes.length, 0),
      storageProvider: storage.provider, variants: photo.variants.map((v) => ({ w: v.w, h: v.h, key: pendingKey(id, v.w), bytes: v.bytes.length })),
      rightsType: rights.type ?? "own", rightsStatement: rights.type === "authorized" ? RIGHTS_STATEMENT_AUTHORIZED : RIGHTS_STATEMENT_OWN,
    }).onConflictDoNothing().returning({ id: photoAssets.mediaId });
    if (row.length) return true;
    await dropRow(db, id);
    return false;
  };
  if (!(await reserve())) {
    /* yarım kalmış eski yükleme aynı dosyayı sonsuza dek kilitlemesin */
    const [old] = await db.select({ id: mediaItems.id, status: mediaItems.status, at: mediaItems.createdAt }).from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).where(and(eq(photoAssets.placeId, rv.placeId), eq(photoAssets.sha256, photo.sha256))).limit(1);
    if (!old || old.status !== "uploading" || Date.now() - old.at.getTime() < STALE_UPLOAD_MS) return { ok: false, error: "duplicate" };
    await dropRow(db, old.id);
    if (!(await reserve())) return { ok: false, error: "duplicate" };
  }
  /* sayaç eklemeden SONRA okunur: paralel isteklerle sınır aşılamaz */
  const active = await db.select({ id: mediaItems.id }).from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).where(and(eq(photoAssets.reviewId, reviewId), inArray(mediaItems.status, ["uploading", "pending", "approved"]))).orderBy(mediaItems.id);
  if (active.findIndex((a) => a.id === id) >= MAX_PER_REVIEW) { await dropRow(db, id); return { ok: false, error: "limit" }; }
  try {
    for (const v of photo.variants) await storage.put(pendingKey(id, v.w), v.bytes, "image/webp");
  } catch {
    for (const v of photo.variants) await storage.delete(pendingKey(id, v.w)).catch(() => {});
    await dropRow(db, id);
    return { ok: false, error: "storage_failed" };
  }
  await db.insert(mediaPlaces).values({ mediaId: id, placeId: rv.placeId });
  await db.update(mediaItems).set({ status: "pending" }).where(eq(mediaItems.id, id));
  await db.insert(moderationQueue).values({ id: uuidv7(), kind: "media", refTable: "media_items", refId: id, reason: `place:${rv.slug}` });
  await audit(db, `user:${uploaderId}`, "photo_upload", id, { place: rv.slug, review: reviewId, sha256: photo.sha256 });
  return { ok: true, id, status: "pending", width: photo.width, height: photo.height };
}

type AssetRow = typeof photoAssets.$inferSelect & { status: string; slug: string };
async function loadAsset(db: Db, id: string): Promise<AssetRow | null> {
  const [r] = await db.select({ a: photoAssets, status: mediaItems.status, slug: places.slug }).from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).innerJoin(places, eq(places.id, photoAssets.placeId)).where(eq(photoAssets.mediaId, id)).limit(1);
  return r ? { ...r.a, status: r.status, slug: r.slug } : null;
}
const closeQueue = (db: Db, id: string, status: "approved" | "rejected", actor: string, kinds = ["media"]) =>
  db.update(moderationQueue).set({ status, decidedBy: actor, decidedAt: new Date() }).where(and(eq(moderationQueue.refId, id), eq(moderationQueue.status, "open"), inArray(moderationQueue.kind, kinds)));
/* Dosya silme kuyruktan geçer: önce kayıt, sonra deneme. Başarısız olan kuyrukta kalır, görev tekrar dener. */
const dropKeys = async (db: Db, storage: MediaStorage, mediaId: string, keys: string[], reason: string) => {
  if (!keys.length) return true;
  await db.insert(mediaCleanup).values(keys.map((key) => ({ key, mediaId, reason }))).onConflictDoUpdate({ target: mediaCleanup.key, set: { doneAt: null, reason, nextAttemptAt: new Date() } });
  return (await runCleanup(db, storage, { keys })).failed === 0;
};
const dropFiles = (db: Db, storage: MediaStorage, a: Pick<AssetRow, "variants" | "mediaId">, reason: string) => dropKeys(db, storage, a.mediaId, a.variants.map((v) => v.key), reason);

/** Temizleme görevi: idempotent (olmayan dosyayı silmek başarıdır). Hata artan aralıkla yeniden denenir. */
export async function runCleanup(db: Db, storage: MediaStorage, o: { limit?: number; keys?: string[]; now?: Date } = {}) {
  const now = o.now ?? new Date();
  const rows = await db.select().from(mediaCleanup).where(o.keys ? and(inArray(mediaCleanup.key, o.keys), isNull(mediaCleanup.doneAt)) : and(isNull(mediaCleanup.doneAt), lte(mediaCleanup.nextAttemptAt, now))).limit(o.limit ?? 200);
  let done = 0, failed = 0;
  for (const r of rows) {
    try {
      await storage.delete(r.key);
      /* genel dosya CDN'de de kalmamalı: temizleme başarısızsa kayıt kuyrukta kalır */
      if (r.key.startsWith("public/") && storage.purge) await storage.purge([r.key]);
      await db.update(mediaCleanup).set({ doneAt: now, lastError: null }).where(eq(mediaCleanup.key, r.key));
      done++;
    } catch (e) {
      const attempts = r.attempts + 1;
      await db.update(mediaCleanup).set({ attempts, lastError: String((e as Error).message).slice(0, 200), nextAttemptAt: new Date(now.getTime() + Math.min(24, 2 ** attempts) * 3600 * 1000) }).where(eq(mediaCleanup.key, r.key));
      failed++;
    }
  }
  return { done, failed };
}

/** Tutarlılık taraması: hesabı kapanmış ya da deneyimi silinmiş fotoğrafı kaldırır, yarım kalan yüklemeyi temizler. Tekrar çalıştırmak güvenlidir. */
export async function sweepPhotos(db: Db, storage: MediaStorage, now = new Date()) {
  const lost = await db.select({ id: photoAssets.mediaId }).from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).leftJoin(reviews, eq(reviews.id, photoAssets.reviewId))
    .where(sql`${mediaItems.status} in ('pending','approved') and ${mediaItems.source} = 'community' and (${photoAssets.uploaderId} is null or ${reviews.status} = 'removed')`);
  for (const r of lost) await removePhoto(db, storage, "system:sweep", r.id, "hesap kapandı ya da deneyim silindi");
  const stale = await db.select({ id: mediaItems.id, variants: photoAssets.variants }).from(mediaItems).innerJoin(photoAssets, eq(mediaItems.id, photoAssets.mediaId)).where(and(eq(mediaItems.status, "uploading"), lte(mediaItems.createdAt, new Date(now.getTime() - STALE_UPLOAD_MS))));
  for (const r of stale) { await dropKeys(db, storage, r.id, r.variants.map((v) => v.key), "yarım yükleme"); await dropRow(db, r.id); }
  return { removed: lost.length, staleUploads: stale.length };
}

/** Hesap kapatma için: kullanıcının bütün fotoğrafları yayından çıkar ve dosyaları silinir. Kullanıcı satırı silinmeden önce çağrılır. */
export async function removeUserPhotos(db: Db, storage: MediaStorage, userId: string) {
  const rows = await db.select({ id: photoAssets.mediaId }).from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).where(and(eq(photoAssets.uploaderId, userId), inArray(mediaItems.status, ["pending", "approved"])));
  for (const r of rows) await removePhoto(db, storage, `user:${userId}`, r.id, "hesap kapatıldı");
  return rows.length;
}

export type DecideError = "not_found" | "bad_state" | "reason_required" | "storage_failed" | "not_approved";
export type Decided = { ok: true; slug: string; filesDeleted?: boolean } | { ok: false; error: DecideError };

/** Onay: dosyalar önce genel önek altına kopyalanır, sonra durum değişir; yarıda kalırsa yeniden denenebilir. */
export async function approvePhoto(db: Db, storage: MediaStorage, actor: string, id: string): Promise<Decided> {
  const a = await loadAsset(db, id);
  if (!a) return { ok: false, error: "not_found" };
  if (a.status !== "pending") return { ok: false, error: "bad_state" };
  const next = a.variants.map((v) => ({ ...v, key: publicKey(id, v.w) }));
  try {
    for (const v of a.variants) {
      const o = await storage.get(v.key);
      if (!o) throw new Error("missing");
      await storage.put(publicKey(id, v.w), o.bytes, "image/webp");
    }
  } catch { return { ok: false, error: "storage_failed" }; }
  const won = await db.update(mediaItems).set({ status: "approved" }).where(and(eq(mediaItems.id, id), eq(mediaItems.status, "pending"))).returning({ id: mediaItems.id });
  if (!won.length) { await dropKeys(db, storage, id, next.map((v) => v.key), "onay yarışı: genel kopya"); return { ok: false, error: "bad_state" }; }
  await db.update(photoAssets).set({ variants: next, approvedAt: new Date(), approvedBy: actor }).where(eq(photoAssets.mediaId, id));
  await dropFiles(db, storage, a, "onay: özel kopya");
  await closeQueue(db, id, "approved", actor);
  await audit(db, actor, "photo_approve", id, { place: a.slug });
  return { ok: true, slug: a.slug };
}

export async function rejectPhoto(db: Db, storage: MediaStorage, actor: string, id: string, reason: string): Promise<Decided> {
  const why = reason.trim().slice(0, 300);
  if (!why) return { ok: false, error: "reason_required" };
  const a = await loadAsset(db, id);
  if (!a) return { ok: false, error: "not_found" };
  const won = await db.update(mediaItems).set({ status: "rejected" }).where(and(eq(mediaItems.id, id), eq(mediaItems.status, "pending"))).returning({ id: mediaItems.id });
  if (!won.length) return { ok: false, error: "bad_state" };
  await db.update(photoAssets).set({ rejectReason: why }).where(eq(photoAssets.mediaId, id));
  const filesDeleted = await dropFiles(db, storage, a, "red");
  await closeQueue(db, id, "rejected", actor);
  await audit(db, actor, "photo_reject", id, { place: a.slug, reason: why, filesDeleted });
  return { ok: true, slug: a.slug, filesDeleted };
}

/** Kaldırma: önce durum (galeri ve kapak hemen düşer), sonra dosya. Dosya silinemezse sonuç bunu açıkça söyler. */
export async function removePhoto(db: Db, storage: MediaStorage, actor: string, id: string, reason: string): Promise<Decided> {
  const a = await loadAsset(db, id);
  if (!a) return { ok: false, error: "not_found" };
  const won = await db.update(mediaItems).set({ status: "removed" }).where(and(eq(mediaItems.id, id), inArray(mediaItems.status, ["pending", "approved"]))).returning({ id: mediaItems.id });
  if (!won.length) return { ok: false, error: "bad_state" };
  await db.update(photoAssets).set({ isCover: false, coverCandidate: false, rejectReason: reason.slice(0, 300) || null }).where(eq(photoAssets.mediaId, id));
  const filesDeleted = await dropFiles(db, storage, a, "kaldırma");
  await closeQueue(db, id, "rejected", actor);
  await closeQueue(db, id, "approved", actor, ["photo_report"]);
  await audit(db, actor, "photo_remove", id, { place: a.slug, reason: reason.slice(0, 300), filesDeleted, wasCover: a.isCover });
  return { ok: true, slug: a.slug, filesDeleted };
}

/** Yükleyen kendi fotoğrafını kaldırır; başkasınınkine dokunamaz. */
export async function removeOwnPhoto(db: Db, storage: MediaStorage, userId: string, id: string): Promise<Decided> {
  const a = await loadAsset(db, id);
  if (!a || a.uploaderId !== userId) return { ok: false, error: "not_found" };
  const r = await removePhoto(db, storage, `user:${userId}`, id, "yükleyen kaldırdı");
  /* kendi kaldırdığını sonra yeniden yükleyebilir; moderatörün kaldırdığı (telif, mahremiyet) aynı dosya ise engelli kalır */
  if (r.ok) await db.update(photoAssets).set({ sha256: `kaldirildi:${id}` }).where(eq(photoAssets.mediaId, id));
  return r;
}

/** Deneyim silinince o deneyimin fotoğrafları da yayından çıkar. */
export async function removeReviewPhotos(db: Db, storage: MediaStorage, userId: string, reviewId: string) {
  const rows = await db.select({ id: photoAssets.mediaId }).from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).where(and(eq(photoAssets.reviewId, reviewId), eq(photoAssets.uploaderId, userId), inArray(mediaItems.status, ["pending", "approved"])));
  const slugs = new Set<string>();
  for (const r of rows) { const d = await removePhoto(db, storage, `user:${userId}`, r.id, "deneyim silindi"); if (d.ok) slugs.add(d.slug); }
  return [...slugs];
}

export async function setCoverCandidate(db: Db, actor: string, id: string, on: boolean): Promise<Decided> {
  const a = await loadAsset(db, id);
  if (!a) return { ok: false, error: "not_found" };
  if (a.status !== "approved") return { ok: false, error: "not_approved" };
  await db.update(photoAssets).set({ coverCandidate: on }).where(eq(photoAssets.mediaId, id));
  await audit(db, actor, on ? "photo_cover_candidate" : "photo_cover_candidate_off", id, { place: a.slug });
  return { ok: true, slug: a.slug };
}

/** Editör kapağı: mekân başına tek (benzersiz dizin garanti eder). Eskisi denetim kaydına yazılır. */
export async function setCover(db: Db, actor: string, id: string, focus?: string | null): Promise<Decided> {
  const a = await loadAsset(db, id);
  if (!a) return { ok: false, error: "not_found" };
  if (a.status !== "approved") return { ok: false, error: "not_approved" };
  const prev = await db.update(photoAssets).set({ isCover: false }).where(and(eq(photoAssets.placeId, a.placeId), eq(photoAssets.isCover, true))).returning({ id: photoAssets.mediaId });
  await db.update(photoAssets).set({ isCover: true, ...(focus === undefined ? {} : { focus }) }).where(eq(photoAssets.mediaId, id));
  await audit(db, actor, "photo_cover_set", id, { place: a.slug, previous: prev.map((p) => p.id) });
  return { ok: true, slug: a.slug };
}

export async function clearCover(db: Db, actor: string, id: string): Promise<Decided> {
  const a = await loadAsset(db, id);
  if (!a) return { ok: false, error: "not_found" };
  await db.update(photoAssets).set({ isCover: false }).where(eq(photoAssets.mediaId, id));
  await audit(db, actor, "photo_cover_clear", id, { place: a.slug });
  return { ok: true, slug: a.slug };
}

export async function reportPhoto(db: Db, reporterId: string, id: string, reason: ReportReason, note?: string): Promise<{ ok: true } | { ok: false; error: "not_found" | "own_photo" | "already_reported" }> {
  const a = await loadAsset(db, id);
  if (!a || a.status !== "approved") return { ok: false, error: "not_found" };
  if (a.uploaderId === reporterId) return { ok: false, error: "own_photo" };
  const tag = `reporter:${reporterId}`;
  const dup = await db.select({ id: moderationQueue.id }).from(moderationQueue).where(and(eq(moderationQueue.kind, "photo_report"), eq(moderationQueue.refId, id), sql`${moderationQueue.reason} like ${tag + " %"}`)).limit(1);
  if (dup.length) return { ok: false, error: "already_reported" };
  await db.insert(moderationQueue).values({ id: uuidv7(), kind: "photo_report", refTable: "media_items", refId: id, reason: `${tag} ${reason}${note ? `: ${note.slice(0, 300)}` : ""}` });
  return { ok: true };
}

/* ── okuma ───────────────────────────────────────────────────────────────── */
export interface PublicPhoto { id: string; src: string; srcSet: string; width: number; height: number; credit: string; isCover: boolean; coverCandidate: boolean; focus: string | null }
const toPublic = (storage: MediaStorage, r: { id: string; variants: AssetRow["variants"]; width: number; height: number; name: string | null; isCover: boolean; coverCandidate: boolean; focus: string | null }): PublicPhoto => {
  const sorted = [...r.variants].sort((x, y) => x.w - y.w);
  return { id: r.id, src: storage.publicUrl(sorted[Math.min(1, sorted.length - 1)].key), srcSet: sorted.map((v) => `${storage.publicUrl(v.key)} ${v.w}w`).join(", "), width: r.width, height: r.height, credit: publicName(r.name), isCover: r.isCover, coverCandidate: r.coverCandidate, focus: r.focus };
};
const publicSelect = { id: photoAssets.mediaId, variants: photoAssets.variants, width: photoAssets.width, height: photoAssets.height, name: user.name, isCover: photoAssets.isCover, coverCandidate: photoAssets.coverCandidate, focus: photoAssets.focus, slug: places.slug };
/* deneyimi gizlenen ya da silinen, hesabını kapatan kullanıcının fotoğrafı da görünmez */
const publicWhere = sql`${mediaItems.status} = 'approved' and (${photoAssets.reviewId} is null or ${reviews.status} = 'published') and (${mediaItems.source} <> 'community' or ${photoAssets.uploaderId} is not null)`;

export async function approvedPhotos(db: Db, storage: MediaStorage, slug: string): Promise<PublicPhoto[]> {
  const rows = await db.select(publicSelect).from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).innerJoin(places, eq(places.id, photoAssets.placeId)).leftJoin(reviews, eq(reviews.id, photoAssets.reviewId)).leftJoin(user, eq(user.id, photoAssets.uploaderId))
    .where(and(eq(places.slug, slug), publicWhere)).orderBy(desc(photoAssets.isCover), desc(photoAssets.coverCandidate), desc(photoAssets.approvedAt));
  return rows.map((r) => toPublic(storage, r));
}

/** Kartlar için mekân başına kapak: yalnız editörün seçtiği ya da kapak adayı işaretlediği fotoğraf. */
export async function coverCandidates(db: Db, storage: MediaStorage): Promise<Record<string, { photo: PublicPhoto; selected: boolean }>> {
  const rows = await db.select(publicSelect).from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).innerJoin(places, eq(places.id, photoAssets.placeId)).leftJoin(reviews, eq(reviews.id, photoAssets.reviewId)).leftJoin(user, eq(user.id, photoAssets.uploaderId))
    .where(and(sql`(${photoAssets.isCover} or ${photoAssets.coverCandidate})`, publicWhere)).orderBy(desc(photoAssets.isCover), desc(photoAssets.approvedAt));
  const out: Record<string, { photo: PublicPhoto; selected: boolean }> = {};
  for (const r of rows) if (!out[r.slug]) out[r.slug] = { photo: toPublic(storage, r), selected: r.isCover };
  return out;
}

/** Kullanıcının bütün fotoğrafları: durum ve red gerekçesiyle. Yalnız kendi kayıtları; kaldırılanlar listelenmez. */
export async function myPhotos(db: Db, userId: string, limit = 100) {
  return db.select({ id: photoAssets.mediaId, status: mediaItems.status, rejectReason: photoAssets.rejectReason, variants: photoAssets.variants, reviewId: photoAssets.reviewId, slug: places.slug, name: places.name, createdAt: photoAssets.createdAt }).from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).innerJoin(places, eq(places.id, photoAssets.placeId))
    .where(and(eq(photoAssets.uploaderId, userId), inArray(mediaItems.status, ["pending", "approved", "rejected"]))).orderBy(desc(photoAssets.createdAt)).limit(limit);
}

export async function myReviewPhotos(db: Db, userId: string, reviewId: string) {
  return db.select({ id: photoAssets.mediaId, status: mediaItems.status, rejectReason: photoAssets.rejectReason, variants: photoAssets.variants }).from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).where(and(eq(photoAssets.reviewId, reviewId), eq(photoAssets.uploaderId, userId), inArray(mediaItems.status, ["pending", "approved", "rejected"]))).orderBy(mediaItems.id);
}

/** Moderasyon kuyruğu. Kişisel veri olarak yalnız görünen ad ("Ad S.") döner; e-posta dönmez. */
export async function moderationList(db: Db, status: "pending" | "approved" | "rejected" | "removed" = "pending", limit = 50) {
  const rows = await db.select({ id: photoAssets.mediaId, status: mediaItems.status, slug: places.slug, name: places.name, uploader: user.name, variants: photoAssets.variants, width: photoAssets.width, height: photoAssets.height, rightsType: photoAssets.rightsType, rightsStatement: photoAssets.rightsStatement, sourceUrl: photoAssets.sourceUrl, source: mediaItems.source, reviewId: photoAssets.reviewId, isCover: photoAssets.isCover, coverCandidate: photoAssets.coverCandidate, rejectReason: photoAssets.rejectReason, createdAt: photoAssets.createdAt })
    .from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).innerJoin(places, eq(places.id, photoAssets.placeId)).leftJoin(user, eq(user.id, photoAssets.uploaderId)).where(eq(mediaItems.status, status)).orderBy(desc(photoAssets.createdAt)).limit(limit);
  const reports = rows.length ? await db.select({ refId: moderationQueue.refId, reason: moderationQueue.reason }).from(moderationQueue).where(and(eq(moderationQueue.kind, "photo_report"), eq(moderationQueue.status, "open"), inArray(moderationQueue.refId, rows.map((r) => r.id)))) : [];
  return rows.map((r) => ({ ...r, uploader: publicName(r.uploader), reports: reports.filter((x) => x.refId === r.id).map((x) => (x.reason ?? "").replace(/^reporter:\S+ /, "")) }));
}

/** Yetkili için: tek fotoğrafın işlem geçmişi ve sorunlu kayıtlar. */
export async function photoHistory(db: Db, id: string) {
  return db.select({ action: auditLog.action, actor: auditLog.actor, at: auditLog.at, detail: auditLog.detail }).from(auditLog).where(and(eq(auditLog.refTable, "media_items"), eq(auditLog.refId, id))).orderBy(desc(auditLog.at)).limit(30);
}
export async function photoProblems(db: Db, storage: MediaStorage) {
  const cleanup = await db.select({ key: mediaCleanup.key, attempts: mediaCleanup.attempts, lastError: mediaCleanup.lastError, reason: mediaCleanup.reason, createdAt: mediaCleanup.createdAt }).from(mediaCleanup).where(isNull(mediaCleanup.doneAt)).limit(100);
  const stuck = await db.select({ id: mediaItems.id, createdAt: mediaItems.createdAt }).from(mediaItems).where(and(eq(mediaItems.status, "uploading"), lte(mediaItems.createdAt, new Date(Date.now() - STALE_UPLOAD_MS)))).limit(50);
  const approved = await db.select({ id: photoAssets.mediaId, slug: places.slug, variants: photoAssets.variants, rights: photoAssets.rightsStatement }).from(photoAssets).innerJoin(mediaItems, eq(mediaItems.id, photoAssets.mediaId)).innerJoin(places, eq(places.id, photoAssets.placeId)).where(eq(mediaItems.status, "approved")).orderBy(desc(photoAssets.approvedAt)).limit(50);
  const broken: Array<{ id: string; slug: string }> = [];
  for (const a of approved) if (!(await storage.get(a.variants[0].key).catch(() => null))) broken.push({ id: a.id, slug: a.slug });
  return { cleanup, stuck, broken, checked: approved.length, missingRights: approved.filter((a) => !a.rights).map((a) => ({ id: a.id, slug: a.slug })) };
}

export async function openPhotoReports(db: Db) {
  const q = await db.select({ refId: moderationQueue.refId }).from(moderationQueue).where(and(eq(moderationQueue.kind, "photo_report"), eq(moderationQueue.status, "open")));
  return [...new Set(q.map((x) => x.refId))];
}
export async function dismissPhotoReports(db: Db, actor: string, id: string) {
  await closeQueue(db, id, "rejected", actor, ["photo_report"]);
  await audit(db, actor, "photo_report_dismiss", id, {});
}
/** Dosya sunumu için erişim kararında kullanılır. */
export async function assetAccess(db: Db, key: string) {
  const id = key.split("/")[1];
  if (!id) return null;
  const a = await loadAsset(db, id);
  return a ? { uploaderId: a.uploaderId, status: a.status, known: a.variants.some((v) => v.key === key) } : null;
}
