"use client";

import Link from "next/link";
import { useMemo } from "react";
import { listCards } from "@/lib/api";
import { effectiveProfile, getDecision, getPersonalMatch } from "@/lib/decision";
import { useUserData } from "@/lib/store";
import { ScoreNumber } from "@/components/score/ScoreNumber";

/** Keşfet → "Sana göre": zevk profiline göre ilk üç. Profil yoksa öğrenmeye davet. */
export function ForYouBlock() {
  const data = useUserData();
  const profile = useMemo(() => effectiveProfile(data.taste), [data.taste]);
  const items = useMemo(() => listCards()
    .filter((c) => c.score !== null && c.category.compliance.showScores)
    .map((c) => ({ c, m: getPersonalMatch(c.entity.id, "default", undefined, undefined, profile), d: getDecision(c.entity.id, "default", undefined, profile) }))
    .filter((x) => x.m && x.d).sort((a, b) => b.m!.score - a.m!.score).slice(0, 3), [profile]);
  const edited = Object.keys(data.taste.dimensions).length + Object.keys(data.taste.cuisines).length + data.taste.dislikes.length > 0;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="sana-gore">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="sana-gore" className="label">Sana göre</h2>
        <Link href="/zevkim/" className="text-[12px] font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">{edited ? "Zevkini düzenle" : "Zevkini tanıyalım"}</Link>
      </div>
      <ul className="flex flex-col divide-y divide-line border-t border-line">
        {items.map(({ c, m, d }) => (
          <li key={c.entity.id}>
            <Link href={`/mekan/${c.entity.slug}/`} className="group flex items-baseline justify-between gap-4 py-3">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[16px] font-bold group-hover:text-accent-ink">{c.entity.name}</span>
                <span className="text-[12px] text-ink-3">{d!.verdictText ?? d!.verdict} · {c.entity.location?.district}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-3">
                <ScoreNumber score={c.score} size="sm" trend={{ direction: c.delta90d > 0.15 ? "up" : c.delta90d < -0.15 ? "down" : "flat", delta: c.delta90d }} />
                <span className="tnum text-[18px] font-extrabold text-accent-ink">%{m!.score}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[11.5px] text-ink-3">Uyum, Gidenler puanı değildir: puan topluluğun, uyum senin. Profil {edited ? "senin düzenlemelerinle" : "demo deneyimlerden"} çıkarıldı.</p>
    </section>
  );
}
