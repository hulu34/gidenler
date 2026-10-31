import { coverOf } from "@/lib/media/cover";
import type { Entity } from "@/lib/types";

/** Kart kapağı: yalnız kayıtlı gerçek fotoğraf, künyesiyle. Yoksa hiçbir şey çizilmez. */
export function VenueCover({ entity, sizes = "(max-width: 640px) 90vw, 300px", className = "" }: { entity: Entity; sizes?: string; className?: string }) {
  const c = coverOf(entity);
  if (!c) return null;
  return (
    <span className={`relative block aspect-[16/10] overflow-hidden bg-sheet ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.src} srcSet={c.srcSet} sizes={c.srcSet ? sizes : undefined} alt={c.alt} loading="lazy" decoding="async" style={c.focus ? { objectPosition: c.focus } : undefined} className="h-full w-full object-cover" />
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-[10px] text-white">{c.credit}{c.license ? ` · ${c.license}` : ""}</span>
    </span>
  );
}
