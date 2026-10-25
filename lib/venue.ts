import type { Entity, PriceBands } from "@/lib/types";
import { listCards, getTopicIntelligence, type EntityCard } from "@/lib/api";

/* ==========================================================================
   TABELOG'DAN UYARLANANLAR (V8) — Gidenler'e uyan, kanıta dayalı olanlar:
   · Öğle / akşam kişi başı bütçe bandı
   · Semt × tür sıralaması ("Kadıköy · Meyhane #3 / 18")
   · "Gidenler 100": yılın seçkisi — yalnızca yeterli ve güvenilir deneyimi olanlar
   · Deneyimde "kaçıncı ziyaret" (lib/api.ts → getTopic)
   Gerçek mekânda hiçbiri uydurulmaz: veri yoksa gösterilmez.
   ========================================================================== */

const BANDS: Record<1 | 2 | 3 | 4, { lunch: [number, number]; dinner: [number, number] }> = {
  1: { lunch: [150, 300], dinner: [250, 450] },
  2: { lunch: [300, 550], dinner: [500, 900] },
  3: { lunch: [600, 1000], dinner: [1000, 1800] },
  4: { lunch: [1200, 2000], dinner: [2500, 4500] },
};
const FOOD = new Set(["cat.restaurant", "cat.cafe", "cat.bar"]);

/** Bütçe bandı: işletme/deneyim verisi; demo kayıtta fiyat seviyesinden türetilir (basis: "demo"). Gerçek mekânda veri yoksa yok. */
export function priceBandsOf(e: Entity): PriceBands | null {
  if (e.priceBands) return e.priceBands;
  if (!e.isDemo || !e.priceLevel || !FOOD.has(e.categoryId)) return null;
  const b = BANDS[e.priceLevel];
  const opensLate = /^(1[7-9]|2\d)[.:]/.test(e.hours ?? "");
  return { lunch: opensLate ? undefined : b.lunch, dinner: b.dinner, basis: "demo" };
}

export const fmtBand = (b?: [number, number]) => (b ? `${b[0].toLocaleString("tr-TR")}–${b[1].toLocaleString("tr-TR")} ₺` : null);

/* ───── semt × tür sıralaması ───── */
const MIN_N_RANK = 20;
let rankIndex: Map<string, { rank: number; of: number; district: string; kind: string }> | null = null;
function buildRankIndex() {
  const groups = new Map<string, EntityCard[]>();
  for (const c of listCards()) {
    const d = c.entity.location?.district, k = c.entity.subcategory;
    if (!d || !k || c.score === null || !c.category.compliance.showScores || c.experienceCount < MIN_N_RANK) continue;
    if ((c.entity.location?.city ?? "İstanbul") !== "İstanbul") continue;
    const key = `${d}|${k}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(c);
  }
  const idx = new Map<string, { rank: number; of: number; district: string; kind: string }>();
  for (const [key, arr] of groups) {
    if (arr.length < 3) continue; /* üç kayıttan az grupta sıralama anlamsız */
    const [district, kind] = key.split("|");
    arr.sort((a, b) => (b.score! - a.score!) || b.experienceCount - a.experienceCount);
    arr.forEach((c, i) => idx.set(c.entity.id, { rank: i + 1, of: arr.length, district, kind }));
  }
  return idx;
}
export function areaKindRank(entityId: string) {
  rankIndex ??= buildRankIndex();
  return rankIndex.get(entityId) ?? null;
}

/* ───── Gidenler 100 ───── */
export const G100 = { year: 2026, size: 100, minExperiences: 60 } as const;
let g100: EntityCard[] | null = null;
/** Yeme-içme, İstanbul, ≥60 deneyim, güven yüksek; puana göre ilk 100. Ücret/abonelik etkisi yok. */
export function gidenler100(): EntityCard[] {
  g100 ??= listCards()
    .filter((c) => FOOD.has(c.entity.categoryId) && c.score !== null && (c.entity.location?.city ?? "İstanbul") === "İstanbul")
    .filter((c) => c.experienceCount >= G100.minExperiences && getTopicIntelligence(c.entity.id)?.confidence === "high")
    .sort((a, b) => (b.score! - a.score!) || b.experienceCount - a.experienceCount)
    .slice(0, G100.size);
  return g100;
}
export function g100Rank(entityId: string): number | null {
  const i = gidenler100().findIndex((c) => c.entity.id === entityId);
  return i < 0 ? null : i + 1;
}

/* ───── harita / 360° bağlantıları (anahtar gerektirmez) ───── */
export function mapLinks(e: Entity) {
  const g = e.location?.geo;
  if (!g) return null;
  const q = encodeURIComponent(`${e.name} ${e.location?.district ?? ""} İstanbul`);
  return {
    osmEmbed: `https://www.openstreetmap.org/export/embed.html?bbox=${g.lng - 0.004},${g.lat - 0.0025},${g.lng + 0.004},${g.lat + 0.0025}&layer=mapnik&marker=${g.lat},${g.lng}`,
    osm: `https://www.openstreetmap.org/?mlat=${g.lat}&mlon=${g.lng}#map=18/${g.lat}/${g.lng}`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${q}`,
    streetView: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${g.lat},${g.lng}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`,
  };
}
