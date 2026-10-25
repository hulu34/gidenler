import type { Entity } from "@/lib/types";
import raw from "./venues.json";

/* ==========================================================================
   GERÇEK MEKÂNLAR (V8) — kimlik verisi OpenStreetMap'ten (© OpenStreetMap katkıcıları, ODbL).
   Kurallar:
   · Yalnızca kaynakta yayımlanmış kimlik bilgisi: ad, tür, konum, adres, iletişim, açılış saatleri.
   · Puan, trend, yorum, uzman onayı, şikâyet ÜRETİLMEZ. Gidenler puanı gerçek deneyimlerle doğar.
   · Fotoğraf: yalnızca açık lisanslı (Wikimedia Commons) ya da işletme/kullanıcı izniyle.
   · Dosya scripts/import-osm.mjs ile üretilir; elle düzenlenmez.
   ========================================================================== */

export interface RealVenueRecord {
  ref: string;            // "node/123"
  slug: string;
  name: string;
  categoryId: "cat.restaurant" | "cat.cafe" | "cat.bar";
  kind: string;           // "Meyhane", "Kahve", "Balık"…
  district: string;
  neighborhood?: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  openingHours?: string;
  cuisine?: string[];
  image?: { src: string; credit: string; license: string; sourceUrl: string };
  importedAt: string;
}

export const realVenueRecords = raw as RealVenueRecord[];

export const realEntities: Entity[] = realVenueRecords.map((r) => ({
  id: `ent.r.${r.slug}`,
  slug: r.slug,
  name: r.name,
  categoryId: r.categoryId,
  isDemo: false,
  isReal: true,
  tier: "B",
  subcategory: r.kind,
  experienceTotal: 0,
  location: { city: "İstanbul", district: r.district, neighborhood: r.neighborhood, geo: { lat: r.lat, lng: r.lng } },
  address: r.address,
  hours: r.openingHours,
  tags: r.cuisine,
  source: { provider: "osm", ref: r.ref, importedAt: r.importedAt },
  contact: { phone: r.phone, website: r.website, instagram: r.instagram, openingHours: r.openingHours },
  reservation: { mode: "contact" },
  business: { claimed: false },
  photos: r.image ? [{ src: r.image.src, category: "dis", alt: `${r.name} — dış cephe`, credit: r.image.credit, license: r.image.license, sourceUrl: r.image.sourceUrl, addedBy: "commons" }] : undefined,
  image: r.image ? { src: r.image.src, alt: r.name, credit: `${r.image.credit} · ${r.image.license}` } : undefined,
}));
