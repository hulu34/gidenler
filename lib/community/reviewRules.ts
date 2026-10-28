import { getEntity } from "@/data/entities";
import { getCategory, getSchema } from "@/lib/api";
import type { PlaceRules } from "./reviews";

/** Mekânın kategorisine göre deneyim kuralları (boyut anahtarları, düzenlenmiş kategori). Yalnız gerçek mekânlar. */
export function rulesFor(slug: string): PlaceRules | null {
  const e = getEntity(slug);
  if (!e?.isReal) return null;
  const c = getCategory(e.categoryId);
  const s = c && getSchema(c.ratingSchemaId);
  if (!c || !s) return null;
  return { dimensions: s.dimensions.map((d) => d.key), regulated: c.compliance.mode === "regulated" };
}
