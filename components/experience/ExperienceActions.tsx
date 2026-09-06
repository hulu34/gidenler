"use client";

import Link from "next/link";
import { useState } from "react";
import { nf } from "@/lib/format";
import { reportExperience, toggleHelpful, useUserData } from "@/lib/store";

/**
 * Deneyim kartı eylemleri — hepsi gerçek bir şey yapar.
 * "faydalı" yerel olarak sayılır; "bildir" moderasyon kuyruğunu temsil eder (prototip).
 * Ölü düğme yok: "yanıtla" bir özellik olmadığı için kaldırıldı; yerine "kendi deneyimini yaz".
 */
export function ExperienceActions({ experienceId, helpfulVotes, entitySlug }: { experienceId: string; helpfulVotes: number; entitySlug?: string }) {
  const data = useUserData();
  const [ask, setAsk] = useState(false);
  const liked = data.helpful.includes(experienceId);
  const reported = data.reports.includes(experienceId);
  return (
    <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">
      <button type="button" onClick={() => toggleHelpful(experienceId)} aria-pressed={liked} className={liked ? "text-accent-ink" : "hover:text-ink"}>
        <span className="tnum">{nf(helpfulVotes + (liked ? 1 : 0))}</span> faydalı{liked ? " ✓" : ""}
      </button>
      {entitySlug && <Link href={`/yaz/${entitySlug}/`} className="hover:text-ink">kendi deneyimini yaz</Link>}
      {reported ? (
        <span className="normal-case tracking-normal text-ink-3">Bildirildi · moderasyon kuyruğunda · <Link href="/kurallar/" className="underline decoration-line-2 underline-offset-4 hover:text-ink">kurallar</Link></span>
      ) : ask ? (
        <span className="flex items-center gap-2 normal-case tracking-normal">
          <span>Kuralları ihlal ediyor mu?</span>
          <button type="button" onClick={() => { reportExperience(experienceId); setAsk(false); }} className="font-bold text-neg-ink">Evet, bildir</button>
          <button type="button" onClick={() => setAsk(false)} className="hover:text-ink">Vazgeç</button>
        </span>
      ) : (
        <button type="button" onClick={() => setAsk(true)} className="hover:text-neg-ink">bildir</button>
      )}
    </footer>
  );
}
