import type { Entity } from "@/lib/types";
import presentation from "./presentation.json";
import { CLOSED_CONFIRMED } from "@/lib/closure";

/** UI sözleşmesi; ham katalog kanıtı, kalite notları ve ithalat alanları içermez.
 * scripts/client-catalog.ts aynı sunucu yükleyicisinden üretir; ikinci veri kaynağı değildir. */
export const realEntities: Entity[] = presentation.map(venue => ({
  ...venue, id: `ent.r.${venue.slug}`, isDemo: false, isReal: true,
  tier: "B", experienceTotal: 0, reservation: { mode: "contact" }, business: { claimed: false },
  location: { ...venue.location, city: "İstanbul" },
})) as Entity[];
export const activeEntities = realEntities.filter(e => !CLOSED_CONFIRMED.has(e.slug));
