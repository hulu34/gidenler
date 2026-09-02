"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listCards, listCategories, search } from "@/lib/api";
import { EntityCardRow } from "@/components/experience/EntityCardRow";
import { EmptyState } from "@/components/ui/Skeleton";
import { ReputationChip } from "@/components/creator/ReputationChip";
import { score1 } from "@/lib/format";

const ORNEKLER = ["Kadıköy", "japon", "filtre kahve", "sokak lezzeti", "steakhouse"];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("hepsi");
  const cats = listCategories();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("q");
    if (p) setQ(p);
  }, []);

  const results = useMemo(() => {
    if (!q.trim()) {
      const all = listCards()
        .filter((c) => cat === "hepsi" || c.category.id === cat)
        .map((c) => ({
          entity: c.entity, category: c.category, score: c.score,
          experienceCount: c.experienceCount, externalTop: undefined as string | undefined,
        }));
      return { entities: all, creators: [], lists: [] };
    }
    const r = search(q);
    return {
      ...r,
      entities: cat === "hepsi" ? r.entities : r.entities.filter((e) => e.category.id === cat),
    };
  }, [q, cat]);

  const total = results.entities.length + results.creators.length + results.lists.length;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <section className="pt-10 sm:pt-14">
        <h1 className="text-[clamp(2rem,6vw,3rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
          Keşfet
        </h1>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Kadıköy japon, filtre kahve, sokak lezzeti…"
          aria-label="Ara"
          className="mt-6 h-12 w-full border-b-2 border-line-strong bg-transparent pb-1 text-[clamp(1.125rem,3vw,1.5rem)] outline-none placeholder:text-ink-3 focus:border-accent"
        />

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="label">Kategori</span>
          <button
            type="button" onClick={() => setCat("hepsi")}
            className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${
              cat === "hepsi" ? "border-b-2 border-accent pb-0.5 text-ink" : "text-ink-3 hover:text-ink"}`}
          >Hepsi</button>
          {cats.map((c) => (
            <button
              key={c.id} type="button" onClick={() => setCat(c.id)}
              className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${
                cat === c.id ? "border-b-2 border-accent pb-0.5 text-ink" : "text-ink-3 hover:text-ink"}`}
            >{c.label}</button>
          ))}
        </div>

        {!q && (
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ink-3">
            <span className="label">Dene</span>
            {ORNEKLER.map((o) => (
              <button key={o} type="button" onClick={() => setQ(o)}
                className="underline decoration-line-2 underline-offset-4 hover:text-ink">{o}</button>
            ))}
          </p>
        )}
      </section>

      {/* ───────── mekânlar ───────── */}
      {results.entities.length > 0 && (
        <section className="mt-9">
          <div className="flex items-baseline justify-between border-b-2 border-line-strong pb-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Mekânlar</h2>
            <span className="tnum label">{results.entities.length}</span>
          </div>
          <ul>
            {results.entities.map((e) => (
              <EntityCardRow
                key={e.entity.id}
                card={{
                  entity: e.entity, category: e.category, score: e.score,
                  delta90d: 0, experienceCount: e.experienceCount, external: [],
                }}
              />
            ))}
          </ul>
        </section>
      )}

      {/* ───────── uzmanlar ───────── */}
      {results.creators.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between border-b-2 border-line-strong pb-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Uzmanlar</h2>
            <span className="tnum label">{results.creators.length}</span>
          </div>
          <ul>
            {results.creators.map((u) => (
              <li key={u.id} className="border-b border-line">
                <Link href={`/@${u.handle}/`} className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 hover:bg-sheet">
                  <span className="flex flex-col gap-1">
                    <span className="text-[19px] font-bold tracking-[-0.02em] group-hover:text-accent-ink">
                      @{u.handle}
                    </span>
                    <ReputationChip reputation={u.reputation} kind={u.kind} />
                  </span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
                    {u.expertise.slice(0, 3).map((x) => (
                      <span key={x.key}>
                        {x.label} <span className="tnum font-semibold text-ink-2">{x.score}</span>
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ───────── listeler ───────── */}
      {results.lists.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between border-b-2 border-line-strong pb-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Listeler</h2>
            <span className="tnum label">{results.lists.length}</span>
          </div>
          <ul>
            {results.lists.map((l) => (
              <li key={l.id} className="border-b border-line">
                <Link href={`/liste/${l.slug}/`} className="group flex flex-col gap-1 py-4 hover:bg-sheet">
                  <span className="text-[19px] font-bold tracking-[-0.02em] group-hover:text-accent-ink">{l.title}</span>
                  <span className="text-[12px] text-ink-3">@{l.author.handle} · {l.entityIds.length} mekân</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {total === 0 && (
        <EmptyState
          title="Eşleşme yok."
          body="Aradığın yer henüz Gidenler'de olmayabilir. İlk deneyimi sen yazarsan başlık açılır."
        />
      )}
    </div>
  );
}
