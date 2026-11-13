import { createHash } from "node:crypto";
import { and, asc, eq, inArray, like, ne, desc, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import type { Db } from "@/lib/db/client";
import { auditLog, fieldProvenance, mediaItems, mediaPlaces, menuItems, places, verticalRestaurant } from "@/lib/db/schema";
import { videoLinkQueries, videoTrace, type VideoPlan } from "@/lib/media/store";

/* ──────────────────────────────────────────────────────────────────────────
   RESTORAN PROFİLİ (gerçek mekân) — tanıtım, iletişim, kurallar, olanaklar ve resmî menü.
   Yeni tablo yok; mevcut şema:
   · field_provenance  — "profile.<alan>" satırları: değer + kaynak bağlantısı (value içinde JSON) + son kontrol (fetched_at).
                         Ekleme yalnız ileri yönlü: her uygulama yeni satır yazar, sayfa alan başına EN YENİ satırı okur.
   · places            — adres / telefon / web / Instagram / saat (yalnız kaynakta yayımlanmışsa güncellenir).
   · vertical_restaurant.amenities — olanaklar { anahtar: { value, source } }.
   · menu_items        — resmî menü kalemleri; valid_at = son kontrol tarihi. Sayfa en yeni kontrol tarihindeki kalemleri gösterir.
   · audit_log         — her uygulama önceki değerlerle birlikte kaydedilir (geri dönüş için).
   İçerik restoran başına tek dosyadır (content/profiles/<slug>.json); sayfa kodu değişmeden yönetim yolundan uygulanır.
   Bilinmeyen bilgi tahminle doldurulmaz: dosyada olmayan alan sayfada görünmez.
   ────────────────────────────────────────────────────────────────────────── */

const Source = z.object({
  /** official_site | business | official_social */
  provider: z.enum(["official_site", "business", "official_social"]),
  url: z.string().url().max(500),
  /** kaynağın kontrol edildiği gün (YYYY-AA-GG) */
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const Field = z.object({ value: z.string().trim().min(1).max(2000) }).merge(Source);

export const ProfileInput = z.object({
  slug: z.string().min(1).max(120),
  description: Field.optional(),
  address: Field.optional(),
  phone: Field.optional(),
  website: Field.optional(),
  instagram: Field.optional(),
  hours: Field.optional(),
  reservation: Field.optional(),
  notes: z.array(Field).max(12).optional(),
  amenities: z.object({ items: z.record(z.string().regex(/^[a-z_]{2,32}$/), z.boolean()) }).merge(Source).optional(),
  menu: Source.extend({
    /** menüdeki "… tarihinden itibaren geçerlidir" ibaresi (varsa) */
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    /** menü bugün yayında olmayan resmî kaynağın ARŞİV kopyasından alındıysa arşivin tarihi (YYYY-AA-GG);
        sayfa menüyü güncel değil arşiv olarak gösterir ve fiyat göstermez. Yoksa alan hiç yazılmaz (mevcut kayıtlar değişmez). */
    archivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    pricesPublished: z.boolean(),
    sections: z.array(z.object({
      title: z.string().trim().min(1).max(80),
      items: z.array(z.object({ name: z.string().trim().min(1).max(160), description: z.string().trim().max(300).optional(), priceTry: z.number().positive().max(100000).optional() })).min(1).max(80),
    })).min(1).max(30),
  }).optional(),
}).strict();
export type ProfileInput = z.infer<typeof ProfileInput>;

export interface ProfileField { value: string; provider: string; url: string; checkedAt: string }
export interface PlaceProfile {
  description?: ProfileField; address?: ProfileField; phone?: ProfileField; website?: ProfileField; instagram?: ProfileField;
  hours?: ProfileField; reservation?: ProfileField;
  notes: ProfileField[];
  amenities: { items: Record<string, boolean>; provider: string; url: string; checkedAt: string } | null;
  menu: { url: string; provider: string; checkedAt: string; validFrom?: string; archivedAt?: string; pricesPublished: boolean; sections: { title: string; items: { name: string; description?: string; priceTry?: number }[] }[] } | null;
}

const SINGLE = ["description", "address", "phone", "website", "instagram", "hours", "reservation"] as const;
const day = (d: Date | string) => (typeof d === "string" ? d : d.toISOString()).slice(0, 10);

/* ── Bölünmez yazım ──────────────────────────────────────────────────────────
   Canlıda Neon HTTP sürücüsü: db.batch([...]) tek bir veritabanı işleminde (non-interactive transaction) çalışır;
   biri hata verirse hiçbiri kalmaz. Testte (PGlite) ve yerel pg sürücüsünde aynı sorgular db.transaction içinde. */
type Q = PromiseLike<unknown>;
export async function atomic(db: Db, build: (q: Db) => Q[]) {
  const batch = (db as unknown as { batch?: (qs: Q[]) => Promise<unknown> }).batch;
  if (typeof batch === "function") { await batch.call(db, build(db)); return; }
  await db.transaction(async (tx) => { for (const q of build(tx as unknown as Db)) await q; });
}

/** Menü sürümü: içerikten türetilen belirleyici kimlik. Aynı içerik → aynı kimlik (tekrar yazılmaz, eşzamanlı ikinci
    uygulama birincil anahtarda çakışır ve atlanır); aynı gün değişen menü → yeni sürüm. */
export function menuVersion(placeId: string, m: NonNullable<ProfileInput["menu"]>) {
  const body = JSON.stringify({ placeId, url: m.url, checkedAt: m.checkedAt, validFrom: m.validFrom ?? null, prices: m.pricesPublished, ...(m.archivedAt ? { archivedAt: m.archivedAt } : {}), sections: m.sections });
  return `mv_${createHash("sha256").update(body).digest("hex").slice(0, 24)}`;
}

export interface ApplyOptions {
  actor?: string;
  /** yalnız test/Preview: yazımın ortasında hata zorlar (geri alınmayı doğrulamak için) */
  failMidway?: boolean;
  /** önceden doğrulanmış video planı (planPlaceVideos): profil ile AYNI işlemde yazılır; geçersiz plan burada kabul edilmez */
  videos?: Extract<VideoPlan, { ok: true }>;
}
type MediaTrace = ReturnType<typeof videoTrace>;

/** Uygular: profil alanları, kimlik alanları, olanaklar, menü sürümü, kaynak kayıtları, video ilişkileri ve denetim kaydı TEK işlemde
    (Neon HTTP'de batch, PostgreSQL'de transaction; okuma yazmadan önce biter). Mevcut veri silinmez; önceki değerler, eklenen kayıtların
    kimlikleri ve bu uygulamanın eklediği video ilişkileri denetim kaydına yazılır (geri dönüş için).
    effective=false: uygulama hiçbir şeyi değiştirmedi (aynı içeriğin tekrarı); geri alma geçmişini kilitlemez. */
export async function applyProfile(db: Db, input: ProfileInput, opts: ApplyOptions = {}) {
  const p = ProfileInput.parse(input);
  const [place] = await db.select().from(places).where(eq(places.slug, p.slug)).limit(1);
  if (!place) return { ok: false as const, error: "no_place" };
  const before = await readProfile(db, p.slug);
  const [vr] = await db.select().from(verticalRestaurant).where(eq(verticalRestaurant.placeId, place.id)).limit(1);
  const prov: (typeof fieldProvenance.$inferInsert)[] = [];
  const row = (field: string, f: { value: string; provider: string; url: string; checkedAt: string }) =>
    prov.push({ id: uuidv7(), placeId: place.id, field, value: JSON.stringify({ v: f.value, url: f.url }), provider: f.provider, fetchedAt: new Date(`${f.checkedAt}T12:00:00Z`), confidence: 1 });
  for (const k of SINGLE) { const f = p[k]; if (f) row(`profile.${k}`, f); }
  /* notlar küme olarak yazılır: aynı kontrol gününde birden çok not */
  if (p.notes?.length) p.notes.forEach((n, i) => row(`profile.note.${String(i).padStart(2, "0")}`, n));
  if (p.notes) row("profile.notes", { value: String(p.notes.length), provider: "official_site", url: p.notes[0]?.url ?? "https://gidenler.com", checkedAt: p.notes[0]?.checkedAt ?? day(new Date()) });
  const mv = p.menu ? menuVersion(place.id, p.menu) : null;
  if (p.menu) row("profile.menu", { value: JSON.stringify({ validFrom: p.menu.validFrom ?? null, pricesPublished: p.menu.pricesPublished, version: mv, ...(p.menu.archivedAt ? { archivedAt: p.menu.archivedAt } : {}) }), provider: p.menu.provider, url: p.menu.url, checkedAt: p.menu.checkedAt });
  if (p.amenities) row("profile.amenities", { value: JSON.stringify(p.amenities.items), provider: p.amenities.provider, url: p.amenities.url, checkedAt: p.amenities.checkedAt });

  /* aynı içerik tekrar gönderildiyse kaynak kayıtları çoğalmaz: alan başına en yeni kayıtla aynı olanlar yazılmaz */
  const existing = await db.select().from(fieldProvenance).where(and(eq(fieldProvenance.placeId, place.id), like(fieldProvenance.field, "profile.%"))).orderBy(desc(fieldProvenance.fetchedAt), desc(fieldProvenance.id));
  const latest = new Map<string, (typeof existing)[number]>();
  for (const r of existing) if (!latest.has(r.field)) latest.set(r.field, r);
  const fresh = prov.filter((r) => { const l = latest.get(r.field); return !(l && l.value === r.value && l.provider === r.provider && day(l.fetchedAt) === day(r.fetchedAt as Date)); });

  const upd: Partial<typeof places.$inferInsert> = {};
  if (p.address) upd.address = p.address.value;
  if (p.phone) upd.phone = p.phone.value;
  if (p.website) upd.website = p.website.value;
  if (p.instagram) upd.instagram = p.instagram.value.replace(/^@/, "");
  if (p.hours) upd.openingHours = p.hours.value;
  const am = p.amenities ? Object.fromEntries(Object.entries(p.amenities.items).map(([k, v]) => [k, { value: v, source: `${p.amenities!.provider} ${p.amenities!.url} ${p.amenities!.checkedAt}` }])) : null;
  const items = p.menu ? p.menu.sections.flatMap((s, si) => s.items.map((it, ii) => ({
    id: `${mv}.${String(si).padStart(2, "0")}.${String(ii).padStart(3, "0")}`, placeId: place.id, rawName: it.name, description: it.description ?? null,
    priceMinor: it.priceTry ? Math.round(it.priceTry * 100) : null, currency: "TRY", section: s.title,
    source: p.menu!.provider === "business" ? "business" : "official_site", sourceUrl: p.menu!.url, validAt: p.menu!.checkedAt,
  }))) : [];
  if (opts.videos && opts.videos.placeId !== place.id) return { ok: false as const, error: "video_plan_place_mismatch" };
  const placeChanged = (Object.keys(upd) as (keyof typeof upd)[]).some((k) => (place as Record<string, unknown>)[k] !== upd[k]);
  /* jsonb anahtar sırasını korumaz: karşılaştırma sıralı anahtarla */
  const canon = (v: unknown): unknown => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])])) : v);
  const amenitiesChanged = !!am && JSON.stringify(canon(am)) !== JSON.stringify(canon(vr?.amenities ?? null));
  const menuNew = items.length > 0 && (await db.select({ id: menuItems.id }).from(menuItems).where(and(eq(menuItems.placeId, place.id), like(menuItems.id, `${mv}.%`))).limit(1)).length === 0;
  const media: MediaTrace = opts.videos ? videoTrace(opts.videos) : [];
  const mediaChanged = media.some((m) => m.created || m.relationAdded);
  const effective = fresh.length > 0 || placeChanged || amenitiesChanged || menuNew || mediaChanged;
  const auditId = uuidv7();
  await atomic(db, (q) => [
    ...(placeChanged ? [q.update(places).set({ ...upd, updatedAt: new Date() }).where(eq(places.id, place.id))] : []),
    ...(amenitiesChanged ? [q.insert(verticalRestaurant).values({ placeId: place.id, amenities: am }).onConflictDoUpdate({ target: verticalRestaurant.placeId, set: { amenities: am, updatedAt: new Date() } })] : []),
    ...(items.length ? [q.insert(menuItems).values(items).onConflictDoNothing({ target: menuItems.id })] : []),
    ...(opts.videos ? videoLinkQueries(q, opts.videos) : []),
    /* test: yazımın ortasında yabancı anahtar ihlali → işlemin tamamı (videolar dahil) geri alınmalı */
    ...(opts.failMidway ? [q.insert(fieldProvenance).values({ id: uuidv7(), placeId: "__zorlanan_hata__", field: "x", provider: "x", fetchedAt: new Date() })] : []),
    ...(fresh.length ? [q.insert(fieldProvenance).values(fresh)] : []),
    q.insert(auditLog).values({ id: auditId, actor: opts.actor ?? "admin", action: "profile_apply", refTable: "places", refId: place.id,
      detail: { slug: p.slug, menuVersion: mv, fieldIds: fresh.map((r) => r.id), fields: fresh.map((r) => r.field), unchanged: !effective, effective, menuNew, placeChanged, amenitiesChanged, media,
        before: { place: { address: place.address, phone: place.phone, website: place.website, instagram: place.instagram, openingHours: place.openingHours }, amenities: vr?.amenities ?? null, hadVertical: !!vr, profile: before } } }),
  ]);
  return { ok: true as const, auditId, fields: fresh.length, unchanged: !effective, effective, menuItems: items.length, menuVersion: mv, media };
}

/* Geri alma sözleşmesi (issue #41)
   · Hedef: bir profile_apply kaydı. Geri alınınca o uygulamanın kaynak kayıtları silinir, kimlik alanları ve olanaklar
     uygulama öncesine döner, YALNIZ o uygulamanın eklediği video ilişkileri kaldırılır ve yalnız o uygulamanın oluşturduğu
     (başka mekâna bağlı olmayan) video kayıtları silinir. Önceden var olan ya da ortak videonun atfı/sponsorluğu/durumu değişmez.
   · Değişiklik yapmamış (effective=false) uygulamalar geçmişi kilitlemez: asıl uygulama geri alınabilir; onları geri almak işlemsizdir.
   · Daha yeni, etkili ve geri alınmamış bir uygulama varsa eski uygulama geri alınmaz (newer_change): yeni değişiklik ezilmez.
   · Aynı geri almayı tekrar istemek veriyi değiştirmez (already). Menü sürümleri ve denetim kayıtları geçmiş olarak kalır.
   · Tek işlem (Neon HTTP batch / PostgreSQL transaction); kararlar okumalarla işlem öncesinde verilir. */
type ApplyDetail = { slug: string; fieldIds: string[]; effective?: boolean; unchanged?: boolean; media?: MediaTrace;
  before: { place: Partial<typeof places.$inferInsert>; amenities: unknown; hadVertical: boolean } };
const isEffective = (d: ApplyDetail) => d.effective ?? !d.unchanged;

export async function rollbackProfile(db: Db, auditId: string, actor = "admin") {
  const [a] = await db.select().from(auditLog).where(and(eq(auditLog.id, auditId), eq(auditLog.action, "profile_apply"))).limit(1);
  if (!a || !a.refId) return { ok: false as const, error: "no_audit" };
  const placeId = a.refId;
  const d = a.detail as ApplyDetail;
  const applies = await db.select({ id: auditLog.id, at: auditLog.at, detail: auditLog.detail }).from(auditLog)
    .where(and(eq(auditLog.refId, placeId), eq(auditLog.action, "profile_apply"))).orderBy(asc(auditLog.at), asc(auditLog.id));
  const rbs = await db.select({ detail: auditLog.detail }).from(auditLog).where(and(eq(auditLog.refId, placeId), eq(auditLog.action, "profile_rollback")));
  const rolled = new Set(rbs.flatMap((r) => { const x = r.detail as { of?: string; covers?: string[] }; return [x.of, ...(x.covers ?? [])].filter(Boolean) as string[]; }));
  if (rolled.has(auditId)) return { ok: true as const, slug: d.slug, already: true, removed: 0, unlinked: 0, deletedMedia: 0 };
  const idx = applies.findIndex((x) => x.id === auditId);
  const later = applies.slice(idx + 1).filter((x) => !rolled.has(x.id));
  if (!isEffective(d)) {
    await db.insert(auditLog).values({ id: uuidv7(), actor, action: "profile_rollback", refTable: "places", refId: placeId, detail: { slug: d.slug, of: auditId, noop: true, removedFieldIds: [] } });
    return { ok: true as const, slug: d.slug, noop: true, removed: 0, unlinked: 0, deletedMedia: 0 };
  }
  const newer = later.filter((x) => isEffective(x.detail as ApplyDetail));
  if (newer.length) return { ok: false as const, error: "newer_change", newer: newer.map((x) => x.id) };
  const covers = later.map((x) => x.id);
  /* video izleri: yeni kayıtlarda detail.media; eski (issue #41 öncesi) kayıtlarda ayrı profile_videos günlüğü — yalnız oluşturulanlar hedeflenir */
  let media: MediaTrace = d.media ?? [];
  if (!d.media) {
    const legacy = await db.select({ detail: auditLog.detail }).from(auditLog).where(and(eq(auditLog.action, "profile_videos"), sql`${auditLog.detail}->>'of' = ${auditId}`)).limit(1);
    const lm = (legacy[0]?.detail as { media?: { id?: string; created?: boolean }[] } | undefined)?.media ?? [];
    media = lm.filter((m) => m.id && m.created).map((m) => ({ mediaId: m.id!, platform: "youtube" as const, externalId: "", created: true, relationAdded: true }));
  }
  /* aynı ilişkiyi geri alınmamış başka bir etkili uygulama da eklediyse (eşzamanlı tekrar) ilişki kalır */
  const active = applies.filter((x) => x.id !== auditId && !rolled.has(x.id) && !covers.includes(x.id) && isEffective(x.detail as ApplyDetail));
  const claimed = new Set(active.flatMap((x) => ((x.detail as ApplyDetail).media ?? []).filter((m) => m.relationAdded || m.created).map((m) => m.mediaId)));
  const unlink = media.filter((m) => m.relationAdded && !claimed.has(m.mediaId)).map((m) => m.mediaId);
  const createdIds = media.filter((m) => m.created && !claimed.has(m.mediaId)).map((m) => m.mediaId);
  const elsewhere = createdIds.length ? await db.select({ mediaId: mediaPlaces.mediaId }).from(mediaPlaces).where(and(inArray(mediaPlaces.mediaId, createdIds), ne(mediaPlaces.placeId, placeId))) : [];
  const deleteMedia = createdIds.filter((id) => !elsewhere.some((e) => e.mediaId === id));
  await atomic(db, (q) => [
    q.update(places).set({ ...d.before.place, updatedAt: new Date() }).where(eq(places.id, placeId)),
    q.update(verticalRestaurant).set({ amenities: (d.before.amenities ?? null) as never, updatedAt: new Date() }).where(eq(verticalRestaurant.placeId, placeId)),
    ...(d.fieldIds.length ? [q.delete(fieldProvenance).where(inArray(fieldProvenance.id, d.fieldIds))] : []),
    ...(unlink.length ? [q.delete(mediaPlaces).where(and(eq(mediaPlaces.placeId, placeId), inArray(mediaPlaces.mediaId, unlink)))] : []),
    ...(deleteMedia.length ? [q.delete(mediaItems).where(inArray(mediaItems.id, deleteMedia))] : []),
    q.insert(auditLog).values({ id: uuidv7(), actor, action: "profile_rollback", refTable: "places", refId: placeId,
      detail: { slug: d.slug, of: auditId, covers, removedFieldIds: d.fieldIds, unlinkedMedia: unlink, deletedMedia: deleteMedia, keptMedia: media.filter((m) => !unlink.includes(m.mediaId)).map((m) => m.mediaId) } }),
  ]);
  return { ok: true as const, slug: d.slug, removed: d.fieldIds.length, unlinked: unlink.length, deletedMedia: deleteMedia.length, covers };
}

/** Sayfanın okuduğu profil: alan başına en yeni kaynaklı değer, en yeni kontrol günündeki menü. */
export async function readProfile(db: Db, slug: string): Promise<PlaceProfile | null> {
  const [place] = await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)).limit(1);
  if (!place) return null;
  const rows = await db.select().from(fieldProvenance).where(and(eq(fieldProvenance.placeId, place.id), like(fieldProvenance.field, "profile.%"))).orderBy(desc(fieldProvenance.fetchedAt), desc(fieldProvenance.id));
  if (!rows.length) return null;
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!latest.has(r.field)) latest.set(r.field, r);
  const f = (field: string): ProfileField | undefined => {
    const r = latest.get(field); if (!r) return undefined;
    try { const j = JSON.parse(r.value ?? "{}") as { v: string; url: string }; return { value: j.v, provider: r.provider, url: j.url, checkedAt: day(r.fetchedAt) }; } catch { return undefined; }
  };
  const out: PlaceProfile = { notes: [], amenities: null, menu: null };
  for (const k of SINGLE) { const v = f(`profile.${k}`); if (v) out[k] = v; }
  /* notlar: en yeni "profile.notes" kaydının günündeki not satırları */
  const nl = f("profile.notes");
  if (nl) for (let i = 0; i < Number(nl.value); i++) { const n = f(`profile.note.${String(i).padStart(2, "0")}`); if (n && n.checkedAt === nl.checkedAt) out.notes.push(n); }
  const am = f("profile.amenities");
  if (am) { try { out.amenities = { items: JSON.parse(am.value), provider: am.provider, url: am.url, checkedAt: am.checkedAt }; } catch { /* yoksay */ } }
  const mm = f("profile.menu");
  if (mm) {
    const meta = JSON.parse(mm.value) as { validFrom: string | null; pricesPublished: boolean; version?: string; archivedAt?: string };
    /* yalnız bu kaynak kaydının işaret ettiği menü sürümü (aynı gün başka sürümler karışmaz) */
    const items = meta.version
      ? await db.select().from(menuItems).where(and(eq(menuItems.placeId, place.id), like(menuItems.id, `${meta.version}.%`))).orderBy(menuItems.id)
      : await db.select().from(menuItems).where(and(eq(menuItems.placeId, place.id), eq(menuItems.validAt, mm.checkedAt), eq(menuItems.sourceUrl, mm.url))).orderBy(menuItems.createdAt, menuItems.id);
    const sections: NonNullable<PlaceProfile["menu"]>["sections"] = [];
    for (const it of items) {
      const title = it.section ?? "Menü";
      let s = sections.find((x) => x.title === title); if (!s) sections.push(s = { title, items: [] });
      s.items.push({ name: it.rawName, ...(it.description ? { description: it.description } : {}), ...(it.priceMinor ? { priceTry: it.priceMinor / 100 } : {}) });
    }
    if (sections.length) out.menu = { url: mm.url, provider: mm.provider, checkedAt: mm.checkedAt, ...(meta.validFrom ? { validFrom: meta.validFrom } : {}), ...(meta.archivedAt ? { archivedAt: meta.archivedAt } : {}), pricesPublished: meta.pricesPublished, sections };
  }
  return out;
}
