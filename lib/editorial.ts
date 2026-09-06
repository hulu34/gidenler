import type { TopicIntelligence } from "@/lib/types";
import type { EntityCard } from "@/lib/api";
import { nf } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────────────────
   EDİTORYAL CÜMLE — "neden konuşuluyor / ne değişti".
   Sayı ikincil kanıttır; önce ne olduğunu söyleriz. Yalnızca mevcut
   TopicIntelligence'tan türetilir — yeni bir skor sistemi değildir.
   ────────────────────────────────────────────────────────────────────────── */
const lower = (s: string) => s.toLocaleLowerCase("tr");

export function changeInsight(it: TopicIntelligence | null, dir: "up" | "down"): string {
  if (!it) return dir === "up" ? "Son deneyimler öncekilerden daha olumlu." : "Son deneyimler öncekilerden daha olumsuz.";
  const dims = it.ratingDimensions.filter((d) => d.trend.sufficient);

  if (dir === "up") {
    const best = [...dims].sort((a, b) => b.trend.delta - a.trend.delta)[0];
    if (best && best.trend.delta > 0.25) return `Son deneyimlerde ${lower(best.label)} puanı yükseliyor.`;
    const praised = it.positiveThemes.find((t) => t.direction === "up");
    if (praised) return `${praised.label} son haftalarda daha sık övülüyor.`;
    const easing = it.negativeThemes.find((t) => t.direction === "down");
    if (easing) return `${easing.label} şikâyetleri azalıyor.`;
    return "Son deneyimler öncekilerden daha olumlu.";
  }

  const growing = it.negativeThemes.find((t) => t.direction === "up");
  if (growing) return `${growing.label} şikâyetleri artıyor.`;
  const worst = [...dims].sort((a, b) => a.trend.delta - b.trend.delta)[0];
  if (worst && worst.trend.delta < -0.25) return `Son deneyimlerde ${lower(worst.label)} puanı geriliyor.`;
  const fading = it.positiveThemes.find((t) => t.direction === "down");
  if (fading) return `${fading.label} eskisi kadar övülmüyor.`;
  return "Son deneyimler öncekilerden daha olumsuz.";
}

/** Gündem kartı için tek cümle: hareket varsa hareket; yoksa en güçlü konu. */
export function talkInsight(card: EntityCard, it: TopicIntelligence | null): string {
  if (card.delta90d > 0.15) return changeInsight(it, "up");
  if (card.delta90d < -0.15) return changeInsight(it, "down");
  const praised = it?.positiveThemes[0];
  const complaint = it?.negativeThemes[0];
  if (praised && complaint) return `${praised.label} övülüyor; en sık şikâyet ${lower(complaint.label)}.`;
  if (praised) return `${praised.label} en sık övülen konu.`;
  if (complaint) return `En sık konuşulan şikâyet: ${lower(complaint.label)}.`;
  return `Son 90 günde ${nf(it?.volume.count ?? card.experienceCount)} deneyim; görüşler istikrarlı.`;
}

/** Durum etiketi: kart üstündeki küçük "ne oluyor" kelimesi. Trend rengi ayrı kanaldır. */
export function talkStatus(card: EntityCard): { label: string; tone: "pos" | "neg" | "neutral" } {
  if (card.delta90d > 0.15) return { label: "yükselişte", tone: "pos" };
  if (card.delta90d < -0.15) return { label: "geriliyor", tone: "neg" };
  return { label: "istikrarlı", tone: "neutral" };
}
