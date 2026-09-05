"use client";

import { useState } from "react";
import type { ScoreConfidence } from "@/lib/semantic";

/**
 * GÜVEN — sakin bir dil. Parlak renk yok: nötr tipografi.
 * "Neden yüksek güven?" isteyene açılır; ana ekranı doldurmaz.
 */
export function ConfidenceBadge({ c, freshness }: { c: ScoreConfidence; freshness?: { text: string; stale: boolean } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="inline-flex items-center gap-2 self-start border border-line-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-2 hover:border-ink">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${c.level === "high" ? "bg-ink" : c.level === "medium" ? "bg-ink-3" : "bg-line-2"}`} />
        {c.label}
        <span className="text-ink-3">{open ? "−" : "?"}</span>
      </button>
      {freshness && <span className={`text-[11.5px] ${freshness.stale ? "font-semibold text-warn" : "text-ink-3"}`}>{freshness.text}</span>}
      {open && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-l-2 border-line pl-3 text-[12.5px] text-ink-2">
          {c.reasons.map((r) => <li key={r}>{r}</li>)}
          <li className="w-full text-[11.5px] text-ink-3">Güven puanı değiştirmez; 12 deneyimle 9,4 yine 9,4'tür — yalnızca ne kadar emin olduğumuzu söyler.</li>
        </ul>
      )}
    </div>
  );
}
