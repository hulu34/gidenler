import { and, desc, eq, inArray } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { auditLog, fieldProvenance, mediaItems, mediaPlaces, places } from "@/lib/db/schema";

/* FOTOĞRAF ADAY HAVUZU — mevcut media_items + media_places; yeni tablo yok.
   · Aday: type "photo", storage_class "id_only" (yalnız bağlantı, görsel kopyalanmaz), status "pending". Ölçümler field_provenance "photo.candidate".
   · Onay yalnız hak kaydıyla: izin türü + kanıt metni + editör. Resmî sitede bulunmak izin değildir.
   · Bu havuz kapağı DEĞİŞTİRMEZ: kapak yalnız data/real/izinli-fotograflar.json'dan okunur. Onaylı görsel, scripts/foto-uygula.mjs ile kopyalanıp kayda girer. */

const Cand = z.object({ url: z.string().url().max(800), sayfa: z.string().url().max(800), tur: z.string().max(20), w: z.number(), h: z.number(), puan: z.number(), alt: z.string().max(200).optional(), kopya: z.boolean().optional(), sharp: z.number().optional(), entropy: z.number().optional(), hash: z.string().optional(), kontrol: z.string() }).passthrough();
const LoadInput = z.array(z.object({ slug: z.string(), subeKaniti: z.boolean().optional(), adaylar: z.array(Cand).max(30) })).max(100);
const KIND: Record<string, string> = { yemek: "yemek", ic: "ic", dis: "dis" };

/** Adayları yükler. Aynı bağlantı ikinci kez yazılmaz; önceden verilen karar korunur. */
export async function loadPhotoCandidates(raw: unknown) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "no_db" };
  const p = LoadInput.safeParse(raw);
  if (!p.success) return { ok: false as const, error: "invalid", issues: p.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`) };
  let added = 0, kept = 0, missing = 0; const now = new Date();
  for (const v of p.data) {
    const [pl] = await db.select({ id: places.id }).from(places).where(eq(places.slug, v.slug)).limit(1);
    if (!pl) { missing++; continue; }
    for (const a of v.adaylar) {
      const [old] = await db.select({ id: mediaItems.id }).from(mediaItems).where(eq(mediaItems.url, a.url)).limit(1);
      if (old) { kept++; await db.insert(mediaPlaces).values({ mediaId: old.id, placeId: pl.id }).onConflictDoNothing(); continue; }
      const id = uuidv7();
      await db.insert(mediaItems).values({ id, type: "photo", platform: "resmi_site", url: a.url, storageClass: "id_only", category: KIND[a.tur] ?? null, credit: new URL(a.sayfa).host, source: "auto", status: "pending", lastCheckedAt: now });
      await db.insert(mediaPlaces).values({ mediaId: id, placeId: pl.id });
      await db.insert(fieldProvenance).values({ id: uuidv7(), placeId: pl.id, field: "photo.candidate", value: JSON.stringify({ mediaId: id, ...a, subeKaniti: v.subeKaniti ?? null }), provider: "kesif", fetchedAt: now });
      added++;
    }
  }
  await db.insert(auditLog).values({ id: uuidv7(), actor: "admin:kesif", action: "photo_candidates_load", refTable: "media_items", refId: null, detail: { added, kept, missing, venues: p.data.length } });
  return { ok: true as const, added, kept, missing };
}

export async function listPhotoCandidates() {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select({ id: mediaItems.id, url: mediaItems.url, status: mediaItems.status, license: mediaItems.license, credit: mediaItems.credit, category: mediaItems.category, slug: places.slug, name: places.name, placeId: places.id })
    .from(mediaItems).innerJoin(mediaPlaces, eq(mediaPlaces.mediaId, mediaItems.id)).innerJoin(places, eq(places.id, mediaPlaces.placeId))
    .where(and(eq(mediaItems.type, "photo"), eq(mediaItems.platform, "resmi_site"))).orderBy(desc(mediaItems.createdAt));
  const ids = [...new Set(rows.map((r) => r.placeId))];
  const meta = ids.length ? await db.select({ value: fieldProvenance.value }).from(fieldProvenance).where(and(eq(fieldProvenance.field, "photo.candidate"), inArray(fieldProvenance.placeId, ids))) : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const m of meta) { try { const j = JSON.parse(m.value ?? "{}"); byId.set(j.mediaId, j); } catch { /* yok */ } }
  return rows.map(({ placeId: _p, ...r }) => ({ ...r, meta: byId.get(r.id) ?? {} }));
}

const Decide = z.discriminatedUnion("decision", [
  z.object({ id: z.string(), decision: z.literal("reject"), admin: z.string().min(2), why: z.string().trim().min(3) }).strict(),
  z.object({ id: z.string(), decision: z.literal("remove"), admin: z.string().min(2), why: z.string().trim().min(3) }).strict(),
  z.object({ id: z.string(), decision: z.literal("approve"), admin: z.string().min(2), rightsType: z.enum(["isletme-izni", "kendi", "acik-lisans"]), rightsRef: z.string().trim().min(8).max(400), credit: z.string().trim().min(2).max(120) }).strict(),
]);

/** Editör kararı; denetim kayıtlı. Onay hak kanıtı olmadan olmaz. */
export async function decidePhotoCandidate(raw: unknown) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "no_db" };
  const p = Decide.safeParse(raw);
  if (!p.success) return { ok: false as const, error: "invalid", issues: p.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const i = p.data;
  const [m] = await db.select().from(mediaItems).where(and(eq(mediaItems.id, i.id), eq(mediaItems.type, "photo"), eq(mediaItems.platform, "resmi_site"))).limit(1);
  if (!m) return { ok: false as const, error: "not_found" };
  const status = i.decision === "approve" ? "approved" : i.decision === "reject" ? "rejected" : "removed";
  await db.update(mediaItems).set(i.decision === "approve" ? { status, license: `${i.rightsType}: ${i.rightsRef}`, credit: i.credit, lastCheckedAt: new Date() } : { status, lastCheckedAt: new Date() }).where(eq(mediaItems.id, i.id));
  await db.insert(auditLog).values({ id: uuidv7(), actor: `admin:${i.admin}`, action: `photo_${i.decision}`, refTable: "media_items", refId: i.id, detail: { url: m.url, before: m.status, ...(i.decision === "approve" ? { rightsType: i.rightsType, rightsRef: i.rightsRef } : { why: i.why }) } });
  return { ok: true as const, status };
}
