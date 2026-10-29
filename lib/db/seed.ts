import { and, eq, inArray, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "./client";
import { places, placeIdentifiers, fieldProvenance, verticalRestaurant, mediaItems, mediaPlaces } from "./schema";
import { invalidRecord, isRestaurantTarget, sourceOf, type RealVenueRecord } from "@/data/real";

/* ──────────────────────────────────────────────────────────────────────────
   GERÇEK MEKÂN TOHUMU — data/real/venues.json (OSM, ODbL) → veritabanı.
   · Tekrar çalıştırılabilir: legacy_id çakışmasında günceller, kimlik çakışmasında atlar.
   · Gidenler ID (UUIDv7) yalnız ilk eklemede üretilir; sonra değişmez.
   · Toplu: mekân sayısından bağımsız ~6 sorgu (sunucusuz ortamda süre sınırına takılmaz).
   ────────────────────────────────────────────────────────────────────────── */

export const PILOT_SLUGS = ["ciya-sofrasi-kadikoy"];

const verticalOf = (categoryId: string) =>
  categoryId === "cat.cafe" ? "cafe" : categoryId === "cat.bar" ? "bar" : "restaurant";

const FIELDS: Array<keyof RealVenueRecord> = ["name", "address", "phone", "website", "instagram", "openingHours", "lat", "lng"];
const legacyOf = (slug: string) => `ent.r.${slug}`;
const ex = (col: string) => sql.raw(`excluded."${col}"`);

export async function seedRealVenues(db: Db, records: RealVenueRecord[], now = new Date()) {
  if (!records.length) return { inserted: 0, updated: 0, total: 0 };
  /* Zorunlu alanı eksik tek kayıt bile varsa hiçbir şey yazılmaz. */
  const bad = records.map((r) => [r.slug, invalidRecord(r)] as const).filter(([, e]) => e);
  if (bad.length) throw new Error(`invalid_records: ${bad.slice(0, 5).map(([s, e]) => `${s}:${e}`).join(", ")}`);
  const legacy = records.map((r) => legacyOf(r.slug));
  const before = await db.select({ legacyId: places.legacyId }).from(places).where(inArray(places.legacyId, legacy));
  const existed = new Set(before.map((b) => b.legacyId));

  const rows = records.map((r) => ({
    id: uuidv7(), legacyId: legacyOf(r.slug), slug: r.slug, name: r.name, vertical: verticalOf(r.categoryId), categoryId: r.categoryId,
    subcategory: r.kind, city: "İstanbul", district: r.district, neighborhood: r.neighborhood ?? null,
    lat: r.lat, lng: r.lng, address: r.address ?? null, phone: r.phone ?? null, website: r.website ?? null,
    instagram: r.instagram ?? null, openingHours: r.openingHours ?? null, isPilot: PILOT_SLUGS.includes(r.slug),
  }));
  await db.insert(places).values(rows).onConflictDoUpdate({
    target: places.legacyId,
    set: {
      slug: ex("slug"), name: ex("name"), vertical: ex("vertical"), categoryId: ex("category_id"), subcategory: ex("subcategory"),
      city: ex("city"), district: ex("district"), neighborhood: ex("neighborhood"), lat: ex("lat"), lng: ex("lng"),
      address: ex("address"), phone: ex("phone"), website: ex("website"), instagram: ex("instagram"),
      openingHours: ex("opening_hours"), isPilot: ex("is_pilot"), updatedAt: now,
    },
  });

  const ids = await db.select({ id: places.id, legacyId: places.legacyId, vertical: places.vertical }).from(places).where(inArray(places.legacyId, legacy));
  const idOf = new Map(ids.map((i) => [i.legacyId!, i.id]));

  await db.insert(placeIdentifiers).values(records.map((r) => ({
    id: uuidv7(), placeId: idOf.get(legacyOf(r.slug))!, provider: sourceOf(r), externalId: r.ref, matchScore: 1, matchMethod: "source", status: "confirmed", verifiedAt: now,
  }))).onConflictDoNothing({ target: [placeIdentifiers.placeId, placeIdentifiers.provider, placeIdentifiers.externalId] });

  /* kaynak kaydı: OSM alanlarını tazele. İşletme beyanında yalnız kimlik alanları silinir; profil (profile.*) kayıtlarına dokunulmaz. */
  const placeIds = [...idOf.values()];
  await db.delete(fieldProvenance).where(and(inArray(fieldProvenance.placeId, placeIds), eq(fieldProvenance.provider, "osm")));
  await db.delete(fieldProvenance).where(and(inArray(fieldProvenance.placeId, placeIds), eq(fieldProvenance.provider, "business"), inArray(fieldProvenance.field, FIELDS.map(String))));
  const prov = records.flatMap((r) => FIELDS.filter((f) => r[f] !== undefined && r[f] !== null).map((f) => ({
    id: uuidv7(), placeId: idOf.get(legacyOf(r.slug))!, field: String(f), value: String(r[f]), provider: sourceOf(r), license: sourceOf(r) === "osm" ? "ODbL-1.0" : null,
    fetchedAt: new Date(r.importedAt + "T00:00:00Z"), confidence: 0.8,
  })));
  for (let i = 0; i < prov.length; i += 500) await db.insert(fieldProvenance).values(prov.slice(i, i + 500));

  /* açık lisanslı (Wikimedia Commons) fotoğraflar: yalnız bağlantı + atıf + lisans */
  const imgs = records.filter((r) => r.image);
  if (imgs.length) {
    await db.insert(mediaItems).values(imgs.map((r) => ({
      /* externalId = Commons dosya sayfası (kaynak); credit = fotoğraf sahibi; license = lisans adı */
      id: uuidv7(), type: "photo", platform: "commons", url: r.image!.src, externalId: r.image!.sourceUrl, storageClass: "embed", category: "dis",
      credit: r.image!.credit, license: r.image!.license, source: "auto", status: "approved", lastCheckedAt: now,
    }))).onConflictDoNothing({ target: mediaItems.url });
    const media = await db.select({ id: mediaItems.id, url: mediaItems.url }).from(mediaItems).where(inArray(mediaItems.url, imgs.map((r) => r.image!.src)));
    const mediaOf = new Map(media.map((m) => [m.url, m.id]));
    await db.insert(mediaPlaces).values(imgs.map((r) => ({ mediaId: mediaOf.get(r.image!.src)!, placeId: idOf.get(legacyOf(r.slug))! })))
      .onConflictDoNothing();
  }

  const rest = ids.filter((i) => i.vertical === "restaurant").map((i) => ({ placeId: i.id, reservationMode: "contact" }));
  if (rest.length) await db.insert(verticalRestaurant).values(rest).onConflictDoNothing();

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(places);
  const inserted = legacy.filter((l) => !existed.has(l)).length;
  return { inserted, updated: legacy.length - inserted, total: Number(n) };
}

/** Bütünlük kontrolü: eksiksiz ve tekrarsız aktarım. */
export async function verifyRealVenues(db: Db, records: RealVenueRecord[]) {
  const legacy = records.map((r) => legacyOf(r.slug));
  const count = sql<number>`count(*)::int`;
  const [present] = await db.select({ n: count }).from(places).where(inArray(places.legacyId, legacy));
  const dupSlug = await db.select({ slug: places.slug }).from(places).groupBy(places.slug).having(sql`count(*) > 1`);
  /* kaynak kimliği: OSM ya da işletme beyanı (isletme/<slug>) */
  const SOURCES = ["osm", "business"];
  const dupOsm = await db.select({ ext: placeIdentifiers.externalId }).from(placeIdentifiers)
    .where(inArray(placeIdentifiers.provider, SOURCES)).groupBy(placeIdentifiers.externalId).having(sql`count(*) > 1`);
  const withOsm = await db.selectDistinct({ placeId: placeIdentifiers.placeId }).from(placeIdentifiers)
    .where(inArray(placeIdentifiers.provider, SOURCES));
  const present_ids = await db.select({ id: places.id }).from(places).where(inArray(places.legacyId, legacy));
  const osmSet = new Set(withOsm.map((w) => w.placeId));
  const missingOsm = present_ids.filter((p) => !osmSet.has(p.id)).length;
  const [pilot] = await db.select({ n: count }).from(places).where(eq(places.isPilot, true));
  const expected = records.length;
  const restLegacy = records.filter(isRestaurantTarget).map((r) => legacyOf(r.slug));
  const [rest] = restLegacy.length
    ? await db.select({ n: count }).from(places).where(and(inArray(places.legacyId, restLegacy), eq(places.vertical, "restaurant")))
    : [{ n: 0 }];
  const invalid = records.filter((r) => invalidRecord(r)).length;
  const ok = Number(present.n) === expected && !dupSlug.length && !dupOsm.length && !missingOsm && Number(pilot.n) === PILOT_SLUGS.length
    && !invalid && Number(rest.n) === restLegacy.length;
  return {
    ok, expected, present: Number(present.n), duplicateSlugs: dupSlug.length, duplicateOsmRefs: dupOsm.length, missingOsmIdentifier: missingOsm,
    pilot: Number(pilot.n), invalidRecords: invalid, restaurantTarget: { expected: restLegacy.length, present: Number(rest.n) },
  };
}
