"use client";

import { useMemo } from "react";
import { effectiveProfile, tasteProfileOf, tasteSimilarity } from "@/lib/decision";
import { useUserData } from "@/lib/store";

/**
 * "Bu kişinin yorumunu neden önemsemeliyim?" — deneyim listesinin üstünde
 * tek satır bağlam: seninle zevk uyumu. Yeni bir özellik değil; mevcut
 * benzerlik hesabının deneyimlere bağlanması.
 */
export function TasteContextLine({ userId, handle }: { userId: string; handle: string }) {
  const data = useUserData();
  const mine = useMemo(() => effectiveProfile(data.taste), [data.taste]);
  const theirs = tasteProfileOf(userId);
  const sim = useMemo(() => (theirs && theirs.visibility === "public" ? tasteSimilarity(mine, theirs) : null), [mine, theirs]);
  if (!sim) return null;
  return (
    <p className="text-[12.5px] text-ink-3">
      Seninle <span className="tnum font-bold text-accent-ink">%{sim.score}</span> zevk uyumu — @{handle}&apos;in beğendiği yerleri senin de beğenme ihtimalin yüksek{sim.shared.length ? `; özellikle ${sim.shared.slice(0, 2).join(" ve ").toLocaleLowerCase("tr")}` : ""}.
    </p>
  );
}
