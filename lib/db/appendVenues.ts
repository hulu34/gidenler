import { uuidv7 } from "uuidv7";
import { invalidRecord, sourceOf, type RealVenueRecord } from "@/data/real";
import type { Executor } from "./migrate";

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;
const columns = "legacy_id,slug,name,vertical,category_id,subcategory,city,district,neighborhood,lat,lng,address,phone,website,instagram,opening_hours";
const fields = ["name", "address", "phone", "website", "instagram", "openingHours", "lat", "lng"] as const;

/** Ekleme yayını: tek transaction, mevcut satırlarda UPDATE/DELETE yok. Tekrarı tam no-op.
 * Kısmi hata bütün işlemi geri alır. Aynı slug/kimlik farklı içerikle varsa yayını durdurur.
 * baselineCount, bu paketin DIŞINDA korunması gereken mevcut mekân sayısıdır. */
export async function appendRealVenues(x: Executor, records: RealVenueRecord[], baselineCount: number) {
  if (!records.length || !Number.isInteger(baselineCount) || baselineCount < 0) throw new Error("invalid_append_plan");
  if (new Set(records.map(r => r.slug)).size !== records.length || new Set(records.map(r => r.ref)).size !== records.length) throw new Error("duplicate_append_input");
  for (const r of records) if (invalidRecord(r) || r.image) throw new Error(`invalid_append_record:${r.slug}`);
  const payload = records.map(r => ({
    id: uuidv7(), legacy_id: `ent.r.${r.slug}`, slug: r.slug, name: r.name,
    vertical: r.categoryId === "cat.cafe" ? "cafe" : r.categoryId === "cat.bar" ? "bar" : "restaurant",
    category_id: r.categoryId, subcategory: r.kind, city: "İstanbul", district: r.district, neighborhood: r.neighborhood ?? null,
    lat: r.lat ?? null, lng: r.lng ?? null, address: r.address ?? null, phone: r.phone ?? null, website: r.website ?? null,
    instagram: r.instagram ?? null, opening_hours: r.openingHours ?? null,
    provider: sourceOf(r), ref: r.ref, osm_ref: r.osmRef ?? null,
    provenance: fields.filter(f => r[f] !== undefined && r[f] !== null).map(f => {
      const provider = sourceOf(r) === "osm" ? "osm" : f === "lat" || f === "lng" ? r.location!.provider : r.sourceKind!;
      return { id: uuidv7(), field: f, value: String(r[f]), provider, license: provider === "osm" ? "ODbL-1.0" : null, fetched_at: `${r.importedAt}T00:00:00Z` };
    }),
  }));
  const same = columns.split(",").map(c => `p.${c} IS NOT DISTINCT FROM s.${c}`).join(" AND ");
  await x.transaction([
    "SELECT pg_advisory_xact_lock(7302614)",
    "LOCK TABLE places, place_identifiers IN SHARE ROW EXCLUSIVE MODE",
    `CREATE TEMP TABLE _append_input ON COMMIT DROP AS SELECT * FROM jsonb_to_recordset(${quote(JSON.stringify(payload))}::jsonb) AS s(id text,legacy_id text,slug text,name text,vertical text,category_id text,subcategory text,city text,district text,neighborhood text,lat double precision,lng double precision,address text,phone text,website text,instagram text,opening_hours text,provider text,ref text,osm_ref text,provenance jsonb)`,
    `DO $$ BEGIN
      IF (SELECT count(*) FROM places p WHERE NOT EXISTS (SELECT 1 FROM _append_input s WHERE s.legacy_id=p.legacy_id)) <> ${baselineCount} THEN RAISE EXCEPTION 'append_baseline_changed'; END IF;
      IF EXISTS (SELECT 1 FROM places p JOIN _append_input s ON p.slug=s.slug OR p.legacy_id=s.legacy_id WHERE NOT (${same})) THEN RAISE EXCEPTION 'append_existing_conflict'; END IF;
      IF EXISTS (SELECT 1 FROM place_identifiers i JOIN _append_input s ON (i.provider=s.provider AND i.external_id=s.ref) OR (i.provider='osm' AND i.external_id=s.osm_ref) JOIN places p ON p.id=i.place_id WHERE p.legacy_id IS DISTINCT FROM s.legacy_id) THEN RAISE EXCEPTION 'append_source_conflict'; END IF;
    END $$`,
    `CREATE TEMP TABLE _append_inserted ON COMMIT DROP AS WITH added AS (INSERT INTO places(id,${columns}) SELECT id,${columns} FROM _append_input ON CONFLICT DO NOTHING RETURNING id,legacy_id) SELECT * FROM added`,
    `INSERT INTO place_identifiers(id,place_id,provider,external_id,match_score,match_method,status,verified_at)
      SELECT s.id||'-source',n.id,s.provider,s.ref,1,'source','confirmed',now() FROM _append_inserted n JOIN _append_input s USING(legacy_id)
      UNION ALL SELECT s.id||'-osm',n.id,'osm',s.osm_ref,1,'admin_osm_ref','confirmed',now() FROM _append_inserted n JOIN _append_input s USING(legacy_id) WHERE s.osm_ref IS NOT NULL`,
    `INSERT INTO field_provenance(id,place_id,field,value,provider,license,fetched_at,confidence)
      SELECT v->>'id',n.id,v->>'field',v->>'value',v->>'provider',v->>'license',(v->>'fetched_at')::timestamptz,0.8 FROM _append_inserted n JOIN _append_input s USING(legacy_id) CROSS JOIN LATERAL jsonb_array_elements(s.provenance) v`,
    `INSERT INTO vertical_restaurant(place_id,reservation_mode) SELECT n.id,'contact' FROM _append_inserted n JOIN _append_input s USING(legacy_id) WHERE s.vertical='restaurant'`,
    `DO $$ BEGIN
      IF (SELECT count(*) FROM places p JOIN _append_input s ON s.legacy_id=p.legacy_id) <> ${records.length} THEN RAISE EXCEPTION 'append_incomplete'; END IF;
      IF EXISTS (SELECT 1 FROM _append_input s JOIN places p ON p.legacy_id=s.legacy_id WHERE NOT EXISTS (SELECT 1 FROM place_identifiers i WHERE i.place_id=p.id AND i.provider=s.provider AND i.external_id=s.ref)) THEN RAISE EXCEPTION 'append_identifier_missing'; END IF;
    END $$`,
  ]);
  const [r] = await x.query<{ total: number }>("SELECT count(*)::int total FROM places");
  return { mode: "insert-only", expected: records.length, total: Number(r.total), baseline: baselineCount };
}
