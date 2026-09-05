/* ==========================================================================
   SEMANTİK PUAN DİLİ — tek kaynak.
   --------------------------------------------------------------------------
   SCORE TELLS QUALITY · TREND TELLS DIRECTION · MATCH TELLS RELEVANCE ·
   CONFIDENCE TELLS CERTAINTY · EXPERIENCE TELLS WHY.
   Eşikler burada; bileşenler yeniden hard-code etmez. Renk anlamdır.
   ========================================================================== */

import type { ConfidenceLevel, TopicIntelligence } from "@/lib/types";

export type QualityKey = "exceptional" | "verygood" | "good" | "average" | "weak" | "bad";

export interface ScoreSemantic {
  key: QualityKey;
  label: string;          // OLAĞANÜSTÜ · ÇOK İYİ · İYİ · ORTALAMA · ZAYIF · KÖTÜ
  text: string;           // tailwind text class
  border: string;
  soft: string;           // subtle bg tint
  dot: string;            // bg class for a small semantic dot
}

const SCALE: Array<[number, QualityKey, string]> = [
  [9.0, "exceptional", "Olağanüstü"],
  [8.0, "verygood", "Çok iyi"],
  [7.0, "good", "İyi"],
  [6.0, "average", "Ortalama"],
  [5.0, "weak", "Zayıf"],
  [0, "bad", "Kötü"],
];

export function getScoreSemantic(score: number): ScoreSemantic {
  const [, key, label] = SCALE.find(([min]) => score >= min) ?? SCALE[SCALE.length - 1];
  return {
    key, label,
    text: `text-q-${key}`, border: `border-q-${key}`, soft: `bg-q-${key}-soft`, dot: `bg-q-${key}`,
  };
}

/* ─────────────────────────── GÜVEN (kesinlik) ──────────────────────────── */

export interface ScoreConfidence {
  level: ConfidenceLevel;
  label: string;              // Yüksek güven · Orta güven · Sınırlı veri
  experienceCount: number;
  verifiedCount: number;
  expertCount: number;
  recent90: number;
  dispersion: "tutarlı" | "karışık" | "bölünmüş" | null;
  reasons: string[];
}

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = { high: "Yüksek güven", medium: "Orta güven", low: "Sınırlı veri" };

/** Puanı cezalandırmaz; yalnızca ne kadar güvenebileceğimizi söyler. */
export function getScoreConfidence(it: TopicIntelligence): ScoreConfidence {
  const verified = Math.round(it.experienceCount * it.verifiedRatio);
  const expert = it.perspectives.find((p) => p.segment === "expert")?.experienceCount ?? 0;
  const recent90 = it.timeline.slice(-3).reduce((a, p) => a + p.experienceCount, 0);
  const dispersion = it.consensus ? (it.consensus.level === "birlik" ? "tutarlı" : it.consensus.level === "karışık" ? "karışık" : "bölünmüş") : null;
  const reasons = [
    `${it.experienceCount} deneyim`,
    `${verified} doğrulanmış ziyaret`,
    expert ? `${expert} uzman deneyimi` : "uzman deneyimi yok",
    recent90 >= 20 ? `son 90 günde yeterli veri (${recent90})` : `son 90 günde az veri (${recent90})`,
    dispersion ? `dağılım ${dispersion}` : "dağılım bilinmiyor",
  ];
  return { level: it.confidence, label: CONFIDENCE_LABEL[it.confidence], experienceCount: it.experienceCount, verifiedCount: verified, expertCount: expert, recent90, dispersion, reasons };
}

/* ─────────────────────────── TAZELİK · GÖRÜŞ ───────────────────────────── */

const TODAY = new Date("2026-09-02T00:00:00Z");

export function freshnessOf(lastVisitedAt: string | undefined, recent90: number): { text: string; stale: boolean } {
  if (!lastVisitedAt) return { text: "Yakın tarihli deneyim yok", stale: true };
  const days = Math.max(0, Math.round((+TODAY - +new Date(lastVisitedAt + (lastVisitedAt.length === 10 ? "T00:00:00Z" : ""))) / 86400000));
  const stale = days > 540;
  const when = days <= 1 ? "bugün" : days < 7 ? `${days} gün önce` : days < 30 ? `${Math.round(days / 7)} hafta önce` : days < 365 ? `${Math.round(days / 30)} ay önce` : `${Math.floor(days / 365)} yıl önce`;
  return { text: stale ? `Güncel veri sınırlı — son deneyim ${when}` : `Son deneyim ${when} · son 90 günde ${recent90} deneyim`, stale };
}

export function consensusLabel(level: "birlik" | "karışık" | "bölünmüş" | undefined): string | null {
  if (!level) return null;
  return level === "birlik" ? "Yüksek görüş birliği" : level === "karışık" ? "Karışık deneyimler" : "Deneyimler ayrışıyor";
}
