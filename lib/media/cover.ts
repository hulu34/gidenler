import type { Entity } from "@/lib/types";

/* KAPAK KARARI — tek yer. Ana sayfa, arama, kart ve profil buradan okur; sayfalar kendi seçimini yapmaz.
   Sıra: izinli Gidenler/işletme fotoğrafı, sonra açık lisanslı (ikisi de entity.photos içinde, hak kaydıyla).
   Google görseli burada SEÇİLMEZ ve sunucuda hiç çekilmez: yalnız izinli mekânda, kullanıcı isteyince, kapıdan geçerek gelir.
   Kapak yoksa null: yer tutucu ya da başka yerin görseli gösterilmez. */
export interface Cover { src: string; srcSet?: string; alt: string; credit: string; license?: string; source: "isletme" | "gidenler" | "commons" }

export function coverOf(e: Entity): Cover | null {
  if (!e.isReal || e.isDemo) return null;
  const list = e.photos ?? [];
  const p = list.find((x) => x.addedBy === "kullanıcı") ?? list.find((x) => x.addedBy === "işletme") ?? list.find((x) => x.addedBy === "commons");
  if (!p) return null;
  return { src: p.src, srcSet: p.srcSet, alt: p.alt, credit: p.credit, license: p.license, source: p.addedBy === "işletme" ? "isletme" : p.addedBy === "commons" ? "commons" : "gidenler" };
}
