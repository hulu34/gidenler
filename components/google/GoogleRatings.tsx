"use client";

import { createContext, useContext } from "react";
import type { GRatingMap } from "@/lib/gpuan/read";

/* Sitenin Google puanları (veritabanındaki son doğrulanmış aktarım). Veri sunucudan bir kez gelir; sayfa açılışında
   Google'a ya da Excel'e istek gitmez. Google puanı 5 üzerinden ve Gidenler puanından (10 üzerinden) ayrı gösterilir. */
const Ctx = createContext<GRatingMap>({});
export const useGoogleRatings = () => useContext(Ctx);
export const GoogleRatingsProvider = ({ value, children }: { value: GRatingMap; children: React.ReactNode }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;

const f1 = (x: number) => x.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Kart içi küçük gösterim: "Google ★ 4,6/5 · 1.234". Bağlantı değildir (kart zaten bağlantı). */
export function GoogleChip({ slug, className = "" }: { slug: string; className?: string }) {
  const g = useGoogleRatings()[slug];
  if (!g) return null;
  return (
    <span className={`tnum inline-flex items-baseline gap-1 whitespace-nowrap text-[11.5px] text-ink-3 ${className}`} data-google-chip title={`Google puanı ${f1(g.rating)}/5${g.count != null ? `, ${g.count.toLocaleString("tr-TR")} Google değerlendirmesi` : ""}. Gidenler puanı değildir.`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Google</span>
      <span className="font-bold text-ink-2">★ {f1(g.rating)}<span className="font-semibold text-ink-3">/5</span></span>
      {g.count != null && <span>· {g.count.toLocaleString("tr-TR")}</span>}
    </span>
  );
}
