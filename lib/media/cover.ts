import type { Entity } from "@/lib/types";

/* KAPAK — kart ve vitrinler buradan okur. Yalnız mekânın kayıtlı, hak bilgili fotoğrafı; Google görseli burada seçilmez. Yoksa null. */
export interface Cover { src: string; srcSet?: string; alt: string; credit: string; license?: string }

export function coverOf(e: Entity): Cover | null {
  if (!e.isReal || e.isDemo) return null;
  const list = e.photos ?? [];
  const p = list.find((x) => x.addedBy === "kullanıcı") ?? list.find((x) => x.addedBy === "işletme") ?? list.find((x) => x.addedBy === "commons");
  return p ? { src: p.src, srcSet: p.srcSet, alt: p.alt, credit: p.credit, license: p.license } : null;
}
