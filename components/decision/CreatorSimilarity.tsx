"use client";

import { useMemo } from "react";
import { effectiveProfile, tasteProfileOf, tasteSimilarity } from "@/lib/decision";
import { toggleFollow, useUserData } from "@/lib/store";

/**
 * CREATOR × ZEVK — "seninle %87 zevk uyumu".
 * Takipçi sayısından bağımsız değer: "benim gibi düşünüyor".
 * Takip yalnızca keşif/ilgi sinyalidir; sosyal ağ değil.
 */
export function CreatorSimilarity({ userId, handle }: { userId: string; handle: string }) {
  const data = useUserData();
  const mine = useMemo(() => effectiveProfile(data.taste), [data.taste]);
  const theirs = tasteProfileOf(userId);
  const sim = useMemo(() => (theirs && theirs.visibility === "public" ? tasteSimilarity(mine, theirs) : null), [mine, theirs]);
  const following = data.follows.includes(userId);
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t-2 border-line-strong pt-5">
      {sim ? (
        <div className="flex flex-col gap-1">
          <span className="label">Seninle zevk uyumu</span>
          <span className="flex items-baseline gap-3">
            <span className="text-[40px] font-extrabold leading-none tracking-[-0.05em] text-accent-ink">%{sim.score}</span>
            <span className="text-[12px] font-semibold text-ink-3">{sim.score >= 85 ? "yüksek uyum" : sim.score >= 70 ? "orta uyum" : "farklı zevkler"}</span>
          </span>
          {sim.shared.length > 0 && <span className="text-[13px] text-ink-2">Ortak güçlü alanlar: <span className="font-semibold">{sim.shared.join(", ")}</span></span>}
          <span className="text-[11.5px] text-ink-3">Takipçi sayısıyla ilgisi yok; iki zevk profilinin yakınlığı. Demo.</span>
        </div>
      ) : (
        <span className="text-[13px] text-ink-3">Zevk profili özel — uyum hesaplanmaz.</span>
      )}
      <button type="button" onClick={() => toggleFollow(userId)} aria-pressed={following}
        className={`inline-flex h-9 items-center rounded-[3px] px-3.5 text-[13.5px] font-semibold ${following ? "border border-pos text-pos-ink" : "bg-accent text-on-accent hover:opacity-90"}`}>
        {following ? `✓ @${handle} takipte` : "Takip et"}
      </button>
    </div>
  );
}
