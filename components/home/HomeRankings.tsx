"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { useUserData } from "@/lib/store";
import { RANK_CONFIG } from "@/lib/rankings";
import type { HomeCategoryKey, HomeRankings as Rankings, OtherKey, RankItem, RankSection, RegulatedHome } from "@/lib/rankings";

/* ──────────────────────────────────────────────────────────────────────────
   ANA SAYFA = TERCİH YAPTIR — KOMPAKT BOARD.
   Kategori seçici → 2 satır × 3 kolon: Popülerler · En yüksek · Konuşulanlar / Yükselişteler · Uzmanlar · Sana göre.
   Her kolon BAŞLIK + Top 5 kompakt satır (ad · puan / semt · il · tek sinyal). Tek bakışta tercih; uzun anlatı yok.
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
    <div className="flex flex-col gap-8">
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
        <div className="home-board">
          {block.sections.map((s) => <Column key={s.key} section={s} />)}
          <Column
            section={{ key: "sana", title: "Sana göre", hint: "Uyum, Gidenler puanı değildir; zevk profilinle deneyimler arasındaki ilişkidir.", items: personalized ? mine : [], signalKind: "match", seeAll: personalized && mine.length > 0 ? "/zevkim/" : undefined }}
            seeAllLabel="Zevkim"
            empty={
              <div className="flex flex-col gap-3 pt-4">
                <p className="text-[14.5px] leading-snug text-ink-2">Zevkini tanıdıkça burası sana özel olacak.</p>
                <p><Link href="/zevkim/" className="inline-flex h-9 items-center rounded-[3px] bg-accent px-3.5 text-[13.5px] font-semibold text-on-accent">Zevkini tanıyalım →</Link></p>
                <p className="text-[11.5px] text-ink-3">Üç dakika; profilin yalnızca bu tarayıcıda saklanır. Uydurma kişiselleştirme yapılmaz.</p>
              </div>
            }
          />
        </div>
      )}
      {label && cat !== "all" && <p className="sr-only">Seçili kategori: {label}</p>}
      {block && !block.regulated && (
        <p className="max-w-[92ch] text-[11.5px] leading-relaxed text-ink-3">
          Popülerlik ve konuşulma puan değildir; puan yalnızca deneyimlerden çıkar. En yüksek puanlılar için en az {RANK_CONFIG.topRated.minExperiences} deneyim ve orta güven şartı vardır; yükseliş son 90 günün hareketidir. Uzmanların seçtikleri takipçiye değil, kanıtlanmış uzmanlığa dayanır. Uyum senin zevk profilinle deneyimler arasındaki ilişkidir, Gidenler puanı değildir.
        </p>
      )}
    </div>
  );
}

/* ───── board kolonu: BAŞLIK → 01…05 kompakt satır ───── */
function Column({ section: s, empty, seeAllLabel = "Tam liste" }: { section: RankSection; empty?: React.ReactNode; seeAllLabel?: string }) {
  return (
    <section aria-labelledby={`h-${s.key}`} className="min-w-0">
      <div className="flex min-h-[2.25rem] items-end justify-between gap-x-3 border-b-2 border-line-strong pb-2">
        <h2 id={`h-${s.key}`} className="min-w-0 text-[12px] font-bold uppercase leading-tight tracking-[0.14em]" title={s.hint}>{s.title}</h2>
        <span className="flex shrink-0 items-baseline gap-x-2 whitespace-nowrap text-[11px] leading-tight text-ink-3">
          {s.window && <span className="font-medium">{s.window.toLocaleLowerCase("tr")}</span>}
          {s.seeAll && <Link href={s.seeAll} className="font-semibold hover:text-ink">{seeAllLabel} →</Link>}
        </span>
      </div>
      {s.items.length > 0 ? (
        <ol className="divide-y divide-line">
          {s.items.map((it, i) => <Row key={it.slug} it={it} rank={i + 1} signalKind={s.signalKind ?? "text"} />)}
        </ol>
      ) : (empty ?? <p className="pt-4 text-[13px] text-ink-3">Bu kategoride henüz yeterli veri yok.</p>)}
    </section>
  );
}

/* ───── kompakt satır: 01 · AD ………… PUAN / semt · il ………… tek sinyal ───── */
function Row({ it, rank, signalKind }: { it: RankItem; rank: number; signalKind: "trend" | "match" | "text" }) {
  const dir = it.delta > 0.15 ? "up" : it.delta < -0.15 ? "down" : "flat";
  const signalTone = signalKind === "trend" ? (dir === "up" ? "text-pos-ink" : dir === "down" ? "text-neg-ink" : "text-ink-3") : signalKind === "match" ? "text-accent-ink" : "text-ink-3";
  return (
    <li>
      <Link href={`/mekan/${it.slug}/`} className="group grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-start gap-x-2 py-2.5 transition-colors hover:bg-sheet sm:-mx-2 sm:px-2">
        <span className="tnum pt-[3px] text-[11px] font-bold text-ink-3">{String(rank).padStart(2, "0")}</span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="line-clamp-2 text-[15px] font-semibold leading-[1.25] tracking-[-0.015em] group-hover:text-accent-ink">{it.name}</span>
          <span className="truncate text-[11px] font-medium leading-tight text-ink-3">{it.place || it.kind}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          {it.score !== null ? <ScoreNumber score={it.score} size="sm" /> : <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-3">puan yok</span>}
          {it.signal && <span className={`tnum whitespace-nowrap text-[11px] font-semibold ${signalTone}`}>{it.signal}</span>}
        </span>
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
