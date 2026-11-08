"use client";

import Link from "next/link";
import { useState } from "react";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { GBadge } from "@/components/home/GBadge";
import { HOME_LIST } from "@/lib/homeConfig";
import type { RankItem } from "@/lib/rankings";
import type { BoardSection } from "@/lib/homeBoard";

/* ETKİLEŞİM PANOSU (ana sayfa V8) — demodaki kompakt kolon/satır düzeni; her kolon Top 10, mobilde 5 + "Tümünü gör".
   Satırda iki ayrı puan: Gidenler (10 üzerinden, varsa) ve Google (5 üzerinden, varsa). Sinyal kolonun kendi kaynağıdır.
   Veri yoksa kolon liste UYDURMAZ: nedenini yazar ve açıkça etiketli bir keşif listesi önerir (sıralama değil). */
export function BoardColumn({ s }: { s: BoardSection }) {
  const [tab, setTab] = useState(s.tabs?.[0]?.key ?? "");
  const t = s.tabs?.find((x) => x.key === tab);
  const items = t ? t.items : s.items, note = t ? t.note : s.note, fallback = t ? t.fallback : s.fallback;
  return (
    <section aria-labelledby={`h-${s.key}`} className="min-w-0" data-pano-kolon={s.key}>
      <div className="flex min-h-[2.25rem] items-end justify-between gap-x-3 border-b-2 border-line-strong pb-2">
        <h2 id={`h-${s.key}`} className="min-w-0 text-[12.5px] font-bold uppercase leading-tight tracking-[0.14em]" title={s.hint}>{s.title}</h2>
        <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-ink-3">{t ? t.label.toLocaleLowerCase("tr") : s.window?.toLocaleLowerCase("tr")}</span>
      </div>
      {s.tabs && (
        <div role="tablist" aria-label={`${s.title} kaynağı`} className="mt-2 flex gap-1">
          {s.tabs.map((x) => (
            <button key={x.key} role="tab" type="button" aria-selected={x.key === tab} onClick={() => setTab(x.key)}
              className={`h-7 rounded-full border px-2.5 text-[11.5px] font-semibold ${x.key === tab ? "border-ink bg-ink text-paper" : "border-line-2 text-ink-2 hover:border-ink"}`}>{x.label}</button>
          ))}
        </div>
      )}
      {items.length > 0 ? <List items={items} trend={s.signalKind === "trend"} /> : (
        <div className="flex flex-col gap-3 pt-3" data-pano-bos={s.key}>
          <p className="text-[12.5px] leading-snug text-ink-2"><span aria-hidden className="mr-1 text-ink-3">◌</span>{note}</p>
          {s.key === "talked" && <p><Link href="/ara/?yaz=1" className="inline-flex h-9 items-center rounded-[3px] border border-ink px-3 text-[13px] font-semibold hover:bg-ink hover:text-paper">Deneyim yaz →</Link></p>}
          {fallback && fallback.items.length > 0 && (
            <div data-pano-yedek={s.key}>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Bu arada · {fallback.title} <span className="font-semibold normal-case tracking-normal">(sıralama değil)</span></p>
              <List items={fallback.items} plain />
            </div>
          )}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-snug text-ink-3">{s.hint}</p>
    </section>
  );
}

function List({ items, trend = false, plain = false }: { items: RankItem[]; trend?: boolean; plain?: boolean }) {
  const [open, setOpen] = useState(false);
  const list = items.slice(0, HOME_LIST.size);
  return (
    <>
      <ol className="divide-y divide-line">
        {list.map((it, i) => (
          <li key={it.slug} className={i >= HOME_LIST.mobileCollapsed && !open ? "hidden md:block" : ""}>
            <Link href={`/mekan/${it.slug}/`} className="group grid grid-cols-[1.7rem_minmax(0,1fr)_auto] items-center gap-x-2 py-2.5 transition-colors hover:bg-sheet sm:-mx-2 sm:px-2">
              <span className="tnum text-[11.5px] font-bold text-ink-3">{plain ? "·" : String(i + 1).padStart(2, "0")}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold leading-tight tracking-[-0.015em] group-hover:text-accent-ink">{it.name}</span>
                <span className="truncate text-[11px] leading-tight text-ink-3">{it.place}</span>
                {it.signal && !plain ? <span className={`tnum truncate text-[11px] font-semibold leading-tight ${trend ? (it.delta > 0 ? "text-pos-ink" : it.delta < 0 ? "text-neg-ink" : "text-ink-2") : "text-ink-2"}`}>{it.signal}</span> : null}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                {it.score != null && <span className="flex flex-col items-end leading-none"><ScoreNumber score={it.score} size="sm" /><span className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-3">Gidenler</span></span>}
                {it.google ? <GBadge rating={it.google.rating} size="sm" /> : it.score == null ? <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-3">puan yok</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {list.length > HOME_LIST.mobileCollapsed && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="h-10 text-[12.5px] font-bold underline decoration-line-2 underline-offset-4 md:hidden">
          {open ? "Daha az" : `Tümünü gör · ${list.length}`}
        </button>
      )}
    </>
  );
}
