import type { Entity } from "@/lib/types";
import presentation from "./presentation.json";
import { CLOSED_CONFIRMED } from "@/lib/closure";

/** UI sözleşmesi; ham katalog kanıtı, kalite notları ve ithalat alanları içermez.
 * scripts/client-catalog.ts aynı sunucu yükleyicisinden üretir; ikinci veri kaynağı değildir. */
export const realEntities = presentation as unknown as Entity[];
export const activeEntities = realEntities.filter(e => !CLOSED_CONFIRMED.has(e.slug));
