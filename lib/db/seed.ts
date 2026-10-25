import { and, eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "./client";
import { places, placeIdentifiers, fieldProvenance, verticalRestaurant } from "./schema";
import type { RealVenueRecord } from "@/data/real";

/* ──────────────────────────────────────────────────────────────────────────
   GERÇEK MEKÂN TOHUMU — data/real/venues.json (OSM, ODbL) → veritabanı.
   · Tekrar çalıştırılabilir (idempotent): legacy_id ve (sağlayıcı, dış kimlik) çakışmasında günceller.
   · Gidenler ID (UUIDv7) yalnız ilk eklemede üretilir; sonra değişmez.
   · Her alanın kaynağı field_provenance'a yazılır.
   ────────────────────────────────────────────────────────────────────────── */

export const PILOT_SLUGS = ["ciya-sofrasi-kadikoy"];

const verticalOf = (categoryId: string) =>
  categoryId === "cat.cafe" ? "cafe" : categoryId === "cat.bar" ? "bar" : "restaurant";

const FIELDS: Array<keyof RealVenueRecord> = ["name", "address", "phone", "website", "instagram", "openingHours", "lat", "lng"];

export async function seedRealVenues(db: Db, records: RealVenueRecord[], now = new Date()) {
  let inserted = 0, updated = 0;
  for (const r of records) {
    const legacyId = `ent.r.${r.slug}`;
    const values = {
      legacyId, slug: r.slug, name: r.name, vertical: verticalOf(r.categoryId), categoryId: r.categoryId,
      subcategory: r.kind, city: "İstanbul", district: r.district, neighborhood: r.neighborhood ?? null,
      lat: r.lat, lng: r.lng, address: r.address ?? null, phone: r.phone ?? null, website: r.website ?? null,
      instagram: r.instagram ?? null, openingHours: r.openingHours ?? null, isPilot: PILOT_SLUGS.includes(r.slug),
    };
    const [row] = await db.insert(places).values({ id: uuidv7(), ...values })
      .onConflictDoUpdate({ target: places.legacyId, set: { ...values, updatedAt: now } })
      .returning({ id: places.id, createdAt: places.createdAt, updatedAt: places.updatedAt });
    if (row.createdAt.getTime() === row.updatedAt.getTime()) inserted++; else updated++;
    const placeId = row.id;

    await db.insert(placeIdentifiers).values({
      id: uuidv7(), placeId, provider: "osm", externalId: r.ref, matchScore: 1, matchMethod: "source", status: "confirmed", verifiedAt: now,
    }).onConflictDoNothing({ target: [placeIdentifiers.placeId, placeIdentifiers.provider, placeIdentifiers.externalId] });

    /* kaynak kaydı: OSM alanlarını her tohumda tazele (eski OSM satırlarını sil, yenilerini yaz) */
    await db.delete(fieldProvenance).where(and(eq(fieldProvenance.placeId, placeId), eq(fieldProvenance.provider, "osm")));
    const prov = FIELDS.filter((f) => r[f] !== undefined && r[f] !== null).map((f) => ({
      id: uuidv7(), placeId, field: String(f), value: String(r[f]), provider: "osm", license: "ODbL-1.0",
      fetchedAt: new Date(r.importedAt + "T00:00:00Z"), confidence: 0.8,
    }));
    if (prov.length) await db.insert(fieldProvenance).values(prov);

    if (values.vertical === "restaurant") {
      await db.insert(verticalRestaurant).values({ placeId, reservationMode: "contact" }).onConflictDoNothing();
    }
  }
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(places);
  return { inserted, updated, total: Number(n) };
}
