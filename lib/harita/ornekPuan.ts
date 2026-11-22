import type { GRatingMap } from "@/lib/gpuan/read";
import { activeEntities } from "@/data/real/presentation";

/* YEREL ÖNİZLEME İÇİN ÖRNEK GOOGLE PUANI — yalnız `next dev` + HARITA_ORNEK_PUAN=1.
   Veritabanına bağlanmadan harita panelinin puanlı görünümünü denemek içindir; sayılar uydurmadır ve sayfada
   "örnek veri" uyarısıyla gösterilir. Production ve Preview derlemesinde (NODE_ENV=production) hiçbir koşulda çalışmaz. */
export const ornekPuanAcik = () => process.env.NODE_ENV === "development" && process.env.HARITA_ORNEK_PUAN === "1";

export function ornekPuanlar(): GRatingMap {
  const out: GRatingMap = {};
  for (const e of activeEntities) {
    let h = 2166136261; for (const c of e.slug) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    if (h % 5 === 0) continue; // her mekânın puanı yok
    out[e.slug] = { rating: Math.round((3.8 + (h % 120) / 100) * 10) / 10, count: 20 + (h % 4800), checkedAt: "2026-11-01T00:00:00.000Z", mapsUrl: null };
  }
  return out;
}
