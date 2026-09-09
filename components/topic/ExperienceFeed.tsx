"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExperienceCard } from "@/components/experience/ExperienceCard";
import type { ExperienceWithAuthor, RatingSchema } from "@/lib/types";

type Filter = "hepsi" | "dogrulanmis" | "uzman" | "yeni";

/**
 * DENEYİMLER — sayfanın kahramanı. Hero'dan hemen sonra, ilk 5.
 * Filtreler yalnızca veri modelinin gerçekten desteklediği kesitler: Hepsi · Doğrulanmış · Uzmanlar · En yeni.
 * (“Sana benzeyenler” kesiti prototipte deneyim düzeyinde etiketlenmediği için sunulmaz.)
 */
export function ExperienceFeed({ experiences, expertIds, schema, showScores, entitySlug, total, initial = 5 }: {
  experiences: ExperienceWithAuthor[]; expertIds: string[]; schema: RatingSchema; showScores: boolean; entitySlug: string; total: number; initial?: number;
}) {
  const [f, setF] = useState<Filter>("hepsi");
  const [all, setAll] = useState(false);
  const expert = useMemo(() => new Set(expertIds), [expertIds]);
  const list = useMemo(() => {
    let xs = experiences;
    if (f === "dogrulanmis") xs = xs.filter((e) => e.verification.verified);
    if (f === "uzman") xs = xs.filter((e) => expert.has(e.id));
    if (f === "yeni") xs = [...xs].sort((a, b) => (a.visitedAt < b.visitedAt ? 1 : -1));
    return xs;
  }, [experiences, f, expert]);
  const counts = { hepsi: experiences.length, dogrulanmis: experiences.filter((e) => e.verification.verified).length, uzman: experiences.filter((e) => expert.has(e.id)).length, yeni: experiences.length };
  const shown = all ? list : list.slice(0, initial);
  const chips: Array<[Filter, string]> = [["hepsi", "Hepsi"], ["dogrulanmis", "Doğrulanmış"], ["uzman", "Uzmanlar"], ["yeni", "En yeni"]];

  return (
    <div className="flex flex-col gap-2">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        {chips.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={f === k} onClick={() => { setF(k); setAll(false); }} disabled={counts[k] === 0}
            className={`h-8 shrink-0 whitespace-nowrap border px-3 text-[12.5px] font-semibold disabled:opacity-40 ${f === k ? "border-ink bg-ink text-paper" : "border-line-2 text-ink-2 hover:border-ink"}`}>
            {l} <span className={`tnum ${f === k ? "text-paper/70" : "text-ink-3"}`}>{counts[k]}</span>
          </button>
        ))}
      </div>
      <div>
        {shown.map((e) => <ExperienceCard key={e.id} experience={e} schema={schema} showScores={showScores} entitySlug={entitySlug} />)}
        {shown.length === 0 && <p className="py-6 text-[13.5px] text-ink-2">Bu kesitte deneyim yok.</p>}
      </div>
      <p className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line pt-3 text-[13px]">
        {!all && list.length > initial && (
          <button type="button" onClick={() => setAll(true)} className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">
            Tüm deneyimleri gör ({list.length})
          </button>
        )}
        <span className="text-ink-3">Prototipte {experiences.length} deneyim metni gösteriliyor; puan {total.toLocaleString("tr-TR")} deneyimden hesaplandı.</span>
        <Link href={`/yaz/${entitySlug}/`} className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Deneyimini yaz</Link>
      </p>
    </div>
  );
}
