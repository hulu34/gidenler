import venuesJson from "@/data/real/venues.json";
import { realVenueRecords } from "@/data/real";
import type { Venue } from "./core";

/* Excel'in mekân listesi: data/real/venues.json (kayıt düzeltmeleri uygulanmış hâliyle).
   İşletme beyanıyla eklenen kayıtlar (data/real/isletme.json) bu listeye kendiliğinden girmez; INCLUDE_BUSINESS ile açılır. */
const INCLUDE_BUSINESS = false;
const inJson = new Set((venuesJson as Array<{ slug: string }>).map((v) => v.slug));

export function sheetVenues(): Venue[] {
  return realVenueRecords
    .filter((r) => INCLUDE_BUSINESS || inJson.has(r.slug))
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      slug: r.slug, name: r.name, categoryId: r.categoryId, kind: r.kind, cuisine: (r as { cuisine?: string[] }).cuisine ?? [],
      district: r.district, address: r.address ?? "", lat: r.lat!, lng: r.lng!,
    }));
}
