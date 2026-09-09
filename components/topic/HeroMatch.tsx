"use client";

import Link from "next/link";
import { useMemo } from "react";
import { effectiveProfile, getDecision, getPersonalMatch } from "@/lib/decision";
import { useUserData } from "@/lib/store";
import type { Decision } from "@/lib/types";

const TONE: Record<Decision["verdict"], string> = {
  "Kesinlikle gidilir": "text-pos-ink", "Gidilir": "text-pos-ink", "Sana bağlı": "text-ink",
  "Biraz bekle": "text-warn", "Şimdilik pas geç": "text-neg-ink",
};

/**
 * HERO'DAKİ "SANA GÖRE" — tek satır: %91 sana göre · Gidilir. Ayrıntı (bağlam, zaman, nedenler)
 * PUANLAR bölümündeki tam karar kartında. Uyum, Gidenler puanı değildir; renkleri ayrıdır.
 */
export function HeroMatch({ entityId }: { entityId: string }) {
  const data = useUserData();
  const profile = useMemo(() => effectiveProfile(data.taste), [data.taste]);
  const match = useMemo(() => getPersonalMatch(entityId, "default", undefined, undefined, profile), [entityId, profile]);
  const decision = useMemo(() => getDecision(entityId, "default", undefined, profile), [entityId, profile]);
  if (!match || !decision) return null;
  return (
    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="tnum text-[22px] font-extrabold leading-none tracking-[-0.03em] text-accent-ink">%{match.score}</span>
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">sana göre</span>
      <span className={`text-[15px] font-bold ${TONE[decision.verdict]}`}>{decision.verdictText ?? decision.verdict}</span>
      <Link href="#puanlar" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">neden?</Link>
    </span>
  );
}
