import { createHash } from "node:crypto";
import { and, desc, eq, inArray, like } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import type { Db } from "@/lib/db/client";
import { auditLog, fieldProvenance, menuItems, places, verticalRestaurant } from "@/lib/db/schema";

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
  menu: { url: string; provider: string; checkedAt: string; validFrom?: string; pricesPublished: boolean; sections: { title: string; items: { name: string; description?: string; priceTry?: number }[] }[] } | null;
}

const SINGLE = ["description", "address", "phone", "website", "instagram", "hours", "reservation"] as const;
const day = (d: Date | string) => (typeof d === "string" ? d : d.toISOString()).slice(0, 10);

/* ── Bölünmez yazım ──────────────────────────────────────────────────────────
   Canlıda Neon HTTP sürücüsü: db.batch([...]) tek bir veritabanı işleminde (non-interactive transaction) çalışır;
   biri hata verirse hiçbiri kalmaz. Testte (PGlite) ve yerel pg sürücüsünde aynı sorgular db.transaction içinde. */
type Q = PromiseLike<unknown>;
async function atomic(db: Db, build: (q: Db) => Q[]) {
  const batch = (db as unknown as { batch?: (qs: Q[]) => Promise<unknown> }).batch;
  if (typeof batch === "function") { await batch.call(db, build(db)); return; }
  await db.transaction(async (tx) => { for (const q of build(tx as unknown as Db)) await q; });
}

/** Menü sürümü: içerikten türetilen belirleyici kimlik. Aynı içerik → aynı kimlik (tekrar yazılmaz, eşzamanlı ikinci
    uygulama birincil anahtarda çakışır ve atlanır); aynı gün değişen menü → yeni sürüm. */
export function menuVersion(placeId: string, m: NonNullable<ProfileInput["menu"]>) {
  const body = JSON.stringify({ placeId, url: m.url, checkedAt: m.checkedAt, validFrom: m.validFrom ?? null, prices: m.pricesPublished, sections: m.sections });
  return `mv_${createHash("sha256").update(body).digest("hex").slice(0, 24)}`;
}

export interface ApplyOptions { actor?: string; /** yalnız test/Preview: yazımın ortasında hata zorlar (geri alınmayı doğrulamak için) */ failMidway?: boolean }

/** Uygular: profil alanları, kimlik alanları, olanaklar, menü sürümü, kaynak kayıtları ve denetim kaydı TEK işlemde.
    Mevcut veri silinmez; önceki değerler ve eklenen kayıtların kimlikleri denetim kaydına yazılır (geri dönüş için). */
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
  if (p.menu) row("profile.menu", { value: JSON.stringify({ validFrom: p.menu.validFrom ?? null, pricesPublished: p.menu.pricesPublished, version: mv }), provider: p.menu.provider, url: p.menu.url, checkedAt: p.menu.checkedAt });
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
  const auditId = uuidv7();
  await atomic(db, (q) => [
    ...(Object.keys(upd).length ? [q.update(places).set({ ...upd, updatedAt: new Date() }).where(eq(places.id, place.id))] : []),
    ...(am ? [q.insert(verticalRestaurant).values({ placeId: place.id, amenities: am }).onConflictDoUpdate({ target: verticalRestaurant.placeId, set: { amenities: am, updatedAt: new Date() } })] : []),
    ...(items.length ? [q.insert(menuItems).values(items).onConflictDoNothing({ target: menuItems.id })] : []),
    /* test: yazımın ortasında yabancı anahtar ihlali → işlemin tamamı geri alınmalı */
    ...(opts.failMidway ? [q.insert(fieldProvenance).values({ id: uuidv7(), placeId: "__zorlanan_hata__", field: "x", provider: "x", fetchedAt: new Date() })] : []),
    ...(fresh.length ? [q.insert(fieldProvenance).values(fresh)] : []),
    q.insert(auditLog).values({ id: auditId, actor: opts.actor ?? "admin", action: "profile_apply", refTable: "places", refId: place.id,
      detail: { slug: p.slug, menuVersion: mv, fieldIds: fresh.map((r) => r.id), fields: fresh.map((r) => r.field), unchanged: fresh.length === 0,
        before: { place: { address: place.address, phone: place.phone, website: place.website, instagram: place.instagram, openingHours: place.openingHours }, amenities: vr?.amenities ?? null, hadVertical: !!vr, profile: before } } }),
  ]);
  return { ok: true as const, auditId, fields: fresh.length, unchanged: fresh.length === 0, menuItems: items.length, menuVersion: mv };
}

/** Veri geri dönüşü: bir profile_apply kaydını geri alır (kimlik alanları ve olanaklar önceki değerine; o uygulamanın kaynak
    kayıtları kaldırılır → sayfa bir önceki profili ya da profilsiz hali gösterir). Menü sürümü geçmiş olarak kalır. Tek işlem. */
export async function rollbackProfile(db: Db, auditId: string, actor = "admin") {
  const [a] = await db.select().from(auditLog).where(and(eq(auditLog.id, auditId), eq(auditLog.action, "profile_apply"))).limit(1);
  if (!a) return { ok: false as const, error: "no_audit" };
  /* yalnız en son uygulama geri alınır: daha yenisi varsa onun dayandığı kayıtlar silinmesin */
  const [newer] = await db.select({ id: auditLog.id }).from(auditLog).where(and(eq(auditLog.refId, a.refId!), eq(auditLog.action, "profile_apply"))).orderBy(desc(auditLog.at), desc(auditLog.id)).limit(1);
  if (newer && newer.id !== auditId) return { ok: false as const, error: "not_latest" };
  const d = a.detail as { slug: string; fieldIds: string[]; before: { place: Partial<typeof places.$inferInsert>; amenities: unknown; hadVertical: boolean } };
  await atomic(db, (q) => [
    q.update(places).set({ ...d.before.place, updatedAt: new Date() }).where(eq(places.id, a.refId!)),
    q.update(verticalRestaurant).set({ amenities: (d.before.amenities ?? null) as never, updatedAt: new Date() }).where(eq(verticalRestaurant.placeId, a.refId!)),
    ...(d.fieldIds.length ? [q.delete(fieldProvenance).where(inArray(fieldProvenance.id, d.fieldIds))] : []),
    q.insert(auditLog).values({ id: uuidv7(), actor, action: "profile_rollback", refTable: "places", refId: a.refId, detail: { slug: d.slug, of: auditId, removedFieldIds: d.fieldIds } }),
  ]);
  return { ok: true as const, slug: d.slug, removed: d.fieldIds.length };
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
    const meta = JSON.parse(mm.value) as { validFrom: string | null; pricesPublished: boolean; version?: string };
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
    if (sections.length) out.menu = { url: mm.url, provider: mm.provider, checkedAt: mm.checkedAt, ...(meta.validFrom ? { validFrom: meta.validFrom } : {}), pricesPublished: meta.pricesPublished, sections };
  }
  return out;
}
