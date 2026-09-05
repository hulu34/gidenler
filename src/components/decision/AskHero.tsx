"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ORNEK = ["Kadıköy'de sakin bir akşam yemeği", "Bu akşam iyi sushi nerede?", "Çocukla pazar öğlen"];

/** Ana sayfa arama alanı — mekân araması hâlâ çalışır; doğal dil sorgusu Sor Gidenler'e gider. */
export function AskHero() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/sor/?q=${encodeURIComponent(q.trim())}`); }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Nereye gitmek istiyorsun?"
          aria-label="Sor Gidenler"
          className="h-12 w-full border-b-2 border-line-strong bg-transparent pb-1 text-[clamp(1.125rem,3vw,1.5rem)] outline-none placeholder:text-ink-3 focus:border-accent"
        />
        <button type="submit" className="h-10 shrink-0 rounded-[3px] bg-accent px-5 text-[14px] font-semibold text-on-accent">Sor Gidenler</button>
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
        <span>Örnek:</span>
        {ORNEK.map((o) => (
          <Link key={o} href={`/sor/?q=${encodeURIComponent(o)}`} className="underline decoration-line-2 underline-offset-4 hover:text-ink hover:decoration-ink">“{o}”</Link>
        ))}
      </p>
    </form>
  );
}
