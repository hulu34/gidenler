import { getTopicIntelligence, inIstanbul, listCards } from "@/lib/api";
import { ScoreLiesClient, type ScoreLiesData } from "./ScoreLiesClient";

/* ──────────────────────────────────────────────────────────────────────────
   "TEK PUAN YANILTIR" — çiz, sonra gerçeği gör (NYT "You Draw It" deseninden uyarlama).
   Puanı hâlâ yüksek görünen ama son aylarda gidenlerin deneyimi düşen bir mekân seçilir:
   Gidenler'in tezi 10 saniyede kanıtlanır. Seçim veriden yapılır, elle değil.
   ────────────────────────────────────────────────────────────────────────── */

function pick(): ScoreLiesData | null {
  const food = new Set(["cat.restaurant", "cat.cafe", "cat.bar"]);
  let best: (ScoreLiesData & { drop: number }) | null = null;
  for (const c of listCards()) {
    if (!inIstanbul(c) || !food.has(c.entity.categoryId) || c.score === null || c.score < 7.8 || c.experienceCount < 60) continue;
    const tl = getTopicIntelligence(c.entity.id)?.timeline.slice(-12) ?? [];
    if (tl.length < 10) continue;
    const last3 = tl.slice(-3).reduce((a, p) => a + p.score, 0) / 3;
    const prev = tl.slice(-7, -3).reduce((a, p) => a + p.score, 0) / 4;
    const drop = last3 - prev;
    if (!best || drop < best.drop) best = { drop, name: c.entity.name, slug: c.entity.slug, kind: c.entity.subcategory ?? c.category.label, district: c.entity.location?.district ?? "", score: c.score, n: c.experienceCount, series: tl.map((p) => ({ period: p.period, score: p.score })) };
  }
  if (!best || best.drop > -0.3) return null;
  const { drop: _drop, ...data } = best;
  void _drop;
  return data;
}

export function ScoreLies() {
  const data = pick();
  if (!data) return null;
  return <ScoreLiesClient data={data} />;
}
