import type { EntityCard } from "@/lib/api";

/* YAYIMLANMIŞ PUAN → KART (saf; istemcide de çalışır). Kaynak tek: rating_history'nin son satırı (lib/score/published).
   Yeni hesap yok. Yalnız gerçek mekânların kartı değişir; demo kartlar ve Google puanı bu yola hiç girmez. */

export interface PublishedEntry { score: number | null; reviewCount: number; confidence: string }
export type PublishedMap = Record<string, PublishedEntry>;

export const SCORE_WAITING = "Gidenler puanı için yeterli deneyim bekleniyor.";
export const CONFIDENCE_TEXT: Record<string, string> = { sinirli: "Sınırlı veri", orta: "Orta güven", yuksek: "Yüksek güven" };
export const fmtPublished = (n: number) => n.toFixed(1).replace(".", ",");

export function applyPublished(card: EntityCard, map: PublishedMap): EntityCard {
  if (!card.entity.isReal) return card;
  const p = map[card.entity.slug];
  if (!p) return card;
  return { ...card, score: p.score, experienceCount: p.reviewCount, publishedConfidence: CONFIDENCE_TEXT[p.confidence] };
}
export const applyPublishedAll = (cards: EntityCard[], map: PublishedMap) => (Object.keys(map).length ? cards.map((c) => applyPublished(c, map)) : cards);
