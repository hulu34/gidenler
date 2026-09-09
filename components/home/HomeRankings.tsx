"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { CategoryGlyph } from "@/components/experience/CategoryGlyph";
import { useUserData } from "@/lib/store";
import { nf } from "@/lib/format";
import type { HomeCategoryKey, HomeRankings as Rankings, OtherKey, RankItem, RegulatedHome } from "@/lib/rankings";

/* ──────────────────────────────────────────────────────────────────────────
   ANA SAYFA = TERCİH YAPTIR.
   Kategori seçici → beş omurga bölüm (Top 5) → Sana göre.
   Dashboard değil, feature envanteri değil: "Ne arıyorsun? Bunlara bak."
   ────────────────────────────────────────────────────────────────────────── */

export interface HomeData {
  primary: Array<{ key: HomeCategoryKey; label: string }>;
  other: Array<{ key: OtherKey; label: string; regulated?: boolean }>;
  rankings: Record<string, Rankings | RegulatedHome>;
  forYou: Record<string, RankItem[]>;
}

const STORE_KEY = "gidenler.homeCat";

export function HomeRankings({ data }: { data: HomeData }) {
  const user = useUserData();
  const [cat, setCat] = useState<HomeCategoryKey>("all");
  const [other, setOther] = useState<OtherKey | null>(null);

  /* seçim hatırlanır: "restaurant" ya da "other:physician". Alt alan olmadan "Diğer" hatırlanmaz — ana sayfa asla boş açılmaz. */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORE_KEY) ?? "";
      const [c, o] = saved.split(":");
      if (c === "other") { if (o && data.other.some((x) => x.key === o)) { setCat("other"); setOther(o as OtherKey); } }
      else if (c && data.primary.some((x) => x.key === c)) setCat(c as HomeCategoryKey);
    } catch { /* özel pencere */ }
  }, [data.primary, data.other]);
  const persist = (v: string) => { try { window.localStorage.setItem(STORE_KEY, v); } catch { /* yok say */ } };
  const choose = (k: HomeCategoryKey) => {
    setCat(k);
    if (k === "other") { const first = other ?? data.other[0]?.key ?? null; setOther(first); persist(first ? `other:${first}` : "all"); }
    else { setOther(null); persist(k); }
  };
  const chooseOther = (k: OtherKey) => { setOther(k); persist(`other:${k}`); };

  const activeKey = cat === "other" ? other : cat;
  const block = activeKey ? data.rankings[activeKey] : undefined;
  const personalized = user.demoMode === "investor" || Object.keys(user.taste.dimensions).length > 0 || Object.keys(user.taste.cuisines).length > 0 || user.taste.dislikes.length > 0;
  const mine = useMemo(() => (activeKey ? data.forYou[activeKey] ?? [] : []), [activeKey, data.forYou]);
  const label = cat === "other" ? data.other.find((o) => o.key === other)?.label : data.primary.find((c) => c.key === cat)?.label;

  return (
    <div className="flex flex-col gap-10">
      {/* ── kategori seçici ── */}
      <div className="sticky top-[61px] z-20 sm:top-[69px] -mx-5 border-b border-line bg-paper/95 px-5 backdrop-blur-sm sm:-mx-7 sm:px-7">
        <div role="tablist" aria-label="Kategori" className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
          {data.primary.map((c) => (
            <button key={c.key} role="tab" type="button" aria-selected={cat === c.key} onClick={() => choose(c.key)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-semibold transition-colors ${cat === c.key ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>
              {c.label}
            </button>
          ))}
        </div>
        {cat === "other" && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto py-2.5">
            {data.other.map((o) => (
              <button key={o.key} type="button" aria-pressed={other === o.key} onClick={() => chooseOther(o.key)}
                className={`h-8 shrink-0 whitespace-nowrap border px-3 text-[12.5px] font-semibold ${other === o.key ? "border-ink bg-ink text-paper" : "border-line-2 text-ink-2 hover:border-ink"}`}>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {cat === "other" && !other && (
        <p className="text-[14px] text-ink-2">Bir alan seç. Doktor, diş hekimi ve avukat kayıtları puanlanmaz; yalnızca deneyim sayısıyla listelenir.</p>
      )}

      {block && block.regulated && <RegulatedBlock r={block} />}

      {block && !block.regulated && (
        <>
          {block.sections.map((s) => (
            <section key={s.key} aria-labelledby={`h-${s.key}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
                <h2 id={`h-${s.key}`} className="text-[13px] font-bold uppercase tracking-[0.2em]">
                  {s.title}
                  {s.window && <span className="ml-2 font-semibold normal-case tracking-normal text-ink-3">· {s.window.toLocaleLowerCase("tr")}</span>}
                </h2>
                <p className="max-w-[52ch] text-[12px] text-ink-3">{s.hint}</p>
              </div>
              <ol>
                {s.items.map((it, i) => <RankCard key={it.slug} it={it} rank={i + 1} />)}
              </ol>
              {s.seeAll && (
                <p className="mt-3 text-[13px]">
                  <Link href={s.seeAll} className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Tümünü gör →</Link>
                </p>
              )}
            </section>
          ))}

          {/* ── Sana göre ── */}
          <section aria-labelledby="h-sana">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
              <h2 id="h-sana" className="text-[13px] font-bold uppercase tracking-[0.2em]">Sana göre</h2>
              <p className="max-w-[52ch] text-[12px] text-ink-3">Uyum, Gidenler puanı değildir; zevk profilinle deneyimler arasındaki ilişkidir.</p>
            </div>
            {personalized && mine.length > 0 ? (
              <>
                <ol>{mine.map((it, i) => <RankCard key={it.slug} it={it} rank={i + 1} />)}</ol>
                <p className="mt-3 flex flex-wrap gap-x-5 text-[13px]">
                  <Link href="/sor/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Sor Gidenler</Link>
                  <Link href="/zevkim/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Zevkim</Link>
                </p>
              </>
            ) : (
              <p className="flex flex-wrap items-center gap-x-5 gap-y-2 py-5 text-[15px] text-ink-2">
                <span>Sana göre olanları görmek için zevkini tanıyalım.</span>
                <Link href="/zevkim/" className="inline-flex h-9 items-center rounded-[3px] bg-accent px-3.5 text-[13.5px] font-semibold text-on-accent">Zevkimi tanıt</Link>
                <span className="text-[12.5px] text-ink-3">Üç dakika; profilin yalnızca bu tarayıcıda saklanır.</span>
              </p>
            )}
          </section>
          {label && cat !== "all" && <p className="sr-only">Seçili kategori: {label}</p>}
        </>
      )}
    </div>
  );
}

/* ───── sıralama kartı: 01 · ad / tür · konum / puan · etiket · trend / tek neden ───── */
function RankCard({ it, rank }: { it: RankItem; rank: number }) {
  const dir = it.delta > 0.15 ? "up" : it.delta < -0.15 ? "down" : "flat";
  const first = rank === 1;
  return (
    <li className="border-b border-line">
      <Link href={`/mekan/${it.slug}/`} className={`group grid grid-cols-[1fr_auto] items-start gap-x-6 ${first ? "gap-y-2 py-5 sm:py-6" : "gap-y-1.5 py-4"} transition-colors hover:bg-sheet`}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="flex items-baseline gap-2.5">
            <span className="tnum text-[12px] font-bold text-ink-3">{String(rank).padStart(2, "0")}</span>
            <span className={`font-bold leading-tight tracking-[-0.025em] group-hover:text-accent-ink ${first ? "text-[24px] sm:text-[30px]" : "text-[18px] sm:text-[20px]"}`}>{it.name}</span>
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            <CategoryGlyph entity={{ categoryId: it.categoryId, subcategory: it.kind }} />
            <span className="text-ink-2">{it.kind}</span>
            {it.where && <><span aria-hidden>·</span><span>{it.where}</span></>}
          </span>
          {it.reason && <span className={`prose-exp leading-snug text-ink-2 ${first ? "text-[16px] sm:text-[17px]" : "line-clamp-2 text-[14.5px] sm:line-clamp-1"}`}>{it.reason}</span>}
          <span className="tnum text-[12px] text-ink-3">{it.evidence ?? [`${nf(it.count)} deneyim`, it.confidence].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {it.score !== null && <ScoreNumber score={it.score} size={first ? "xl" : "lg"} label stack trend={{ direction: dir, delta: dir === "flat" ? undefined : it.delta }} />}
          {typeof it.match === "number" && <span className="tnum text-[12px] font-bold text-accent-ink">%{it.match} uyum</span>}
        </div>
      </Link>
    </li>
  );
}

/* ───── regüle: doktor / diş hekimi / avukat — puan yok, kazanan yok ───── */
function RegulatedBlock({ r }: { r: RegulatedHome }) {
  const H = ({ id, children, hint }: { id: string; children: string; hint?: string }) => (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
      <h2 id={id} className="text-[13px] font-bold uppercase tracking-[0.2em]">{children}</h2>
      {hint && <p className="max-w-[52ch] text-[12px] text-ink-3">{hint}</p>}
    </div>
  );
  return (
    <div className="flex flex-col gap-10">
      <p className="max-w-[70ch] border-l-2 border-line-2 pl-4 text-[13.5px] leading-relaxed text-ink-2">{r.note}</p>

      <section aria-labelledby="h-r1">
        <H id="h-r1" hint="Sıralama değil; deneyim sayısına göre. Doğrulanmış ziyaret sayısı ayrı gösterilir.">En çok deneyim paylaşılanlar</H>
        <ol>
          {r.mostShared.map((it, i) => (
            <li key={it.slug} className="border-b border-line">
              <Link href={`/mekan/${it.slug}/`} className="group grid grid-cols-[1fr_auto] items-start gap-x-6 gap-y-1 py-4 hover:bg-sheet">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-baseline gap-2.5"><span className="tnum text-[12px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span><span className="text-[18px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink sm:text-[20px]">{it.name}</span></span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3"><span className="text-ink-2">{it.kind}</span>{it.where && <> · {it.where}</>}</span>
                </span>
                <span className="tnum text-right text-[12.5px] text-ink-2">{it.evidence}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {r.latest.length > 0 && (
        <section aria-labelledby="h-r2">
          <H id="h-r2" hint="Puan değil, anlatı. Yazarın sorumluluğunda; hekim/avukat tarafından yanıtlanabilir.">Son deneyimler</H>
          <ul className="grid gap-x-10 gap-y-6 pt-5 md:grid-cols-3">
            {r.latest.map((x) => (
              <li key={x.slug + x.date} className="flex flex-col gap-1.5">
                <Link href={`/mekan/${x.slug}/`} className="text-[16px] font-bold leading-tight hover:text-accent-ink">{x.name}</Link>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{x.kind}{x.where && ` · ${x.where}`} · {x.date.slice(0, 7)}{x.verified && <span className="text-accent-ink"> · doğrulanmış</span>}</span>
                <p className="prose-exp line-clamp-3 text-[14.5px] text-ink-2">{x.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        <section aria-labelledby="h-r3">
          <H id="h-r3">Branşa göre keşfet</H>
          <ul className="flex flex-wrap gap-2 pt-4">
            {r.branches.map((b) => <li key={b.label}><Link href={b.href} className="inline-flex h-8 items-center gap-2 border border-line-2 px-3 text-[13px] font-semibold hover:border-ink">{b.label}<span className="tnum text-ink-3">{b.count}</span></Link></li>)}
          </ul>
        </section>
        <section aria-labelledby="h-r4">
          <H id="h-r4">Bölgeye göre keşfet</H>
          <ul className="flex flex-wrap gap-2 pt-4">
            {r.districts.map((d) => <li key={d.label}><Link href={d.href} className="inline-flex h-8 items-center gap-2 border border-line-2 px-3 text-[13px] font-semibold hover:border-ink">{d.label}<span className="tnum text-ink-3">{d.count}</span></Link></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
