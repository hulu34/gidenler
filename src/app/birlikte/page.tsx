"use client";

import Link from "next/link";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { useEffect, useMemo, useState } from "react";
import { getEntityById } from "@/data/entities";
import { getTopicIntelligence } from "@/lib/api";
import { getDemoGroup, getGroupDecision } from "@/lib/decision";
import { chooseForGroup, groupVoteKey, useUserData, voteGroup } from "@/lib/store";
import { score1 } from "@/lib/format";
import type { GroupVoteChoice } from "@/lib/types";
import { WhyThisResult } from "@/components/decision/WhyThisResult";
import { EntityActions } from "@/components/decision/EntityActions";
import { DemoNotice } from "@/components/ui/DemoNotice";

const VOTES: Array<[GroupVoteChoice, string]> = [["olur", "👍 Olur"], ["farketmez", "🤷 Fark etmez"], ["istemiyorum", "👎 İstemiyorum"]];

/**
 * BİRLİKTE NEREYE? — herkesin zevkini birleştir, ortak yeri bul.
 * Zevk + kısıtlar + oy birlikte çalışır; oy zevk grafiğinin yerine geçmez.
 * Prototip: demo grup, paylaşım linki ?g=abc123, gerçek kimlik/ağ yok.
 */
export default function GroupPage() {
  const data = useUserData();
  const group = getDemoGroup();
  const [q, setQ] = useState(group.question);
  const [started, setStarted] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { const p = new URLSearchParams(window.location.search); if (p.get("g") === group.id || p.get("q")) setStarted(true); if (p.get("q")) setQ(p.get("q")!); }, [group.id]);

  const decision = useMemo(() => getGroupDecision(group, data.groupVotes, data.taste), [group, data.groupVotes, data.taste]);
  const chosen = data.groupChosen[group.id] ?? decision.candidates[0]?.entityId;
  const myVote = (entityId: string) => data.groupVotes.find((v) => v.memberId === groupVoteKey(group.id, "m.you") && v.entityId === entityId)?.choice;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?g=${group.id}` : `gidenler.com/birlikte/?g=${group.id}`;

  async function copy() { try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* izin yok */ } }
  async function share() { if (navigator.share) { try { await navigator.share({ title: "Birlikte Nereye?", text: group.question, url: shareUrl }); } catch { /* iptal */ } } else copy(); }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <section className="pt-10 sm:pt-14">
        <p className="label">Birlikte Nereye?</p>
        <h1 className="mt-2 max-w-[16ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Herkesin zevkini birleştir, ortak yeri bul.</h1>
        <form onSubmit={(e) => { e.preventDefault(); setStarted(true); }} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Grup sorusu" placeholder="Cumartesi 4 kişi nereye gidelim?"
            className="h-12 w-full border-b-2 border-line-strong bg-transparent pb-1 text-[clamp(1.125rem,3vw,1.5rem)] outline-none placeholder:text-ink-3 focus:border-accent" />
          <button type="submit" className="h-10 shrink-0 rounded-[3px] bg-accent px-5 text-[14px] font-semibold text-on-accent">Grup oluştur</button>
        </form>
        {!started && <p className="mt-3 text-[13px] text-ink-3">Bir soru yaz, link paylaş; herkes kendi zevkiyle katılsın. Prototipte hazır bir demo grup açılır.</p>}
      </section>

      {started && (
        <>
          <section className="mt-9 border-t-2 border-line-strong pt-6" aria-labelledby="grup">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2 id="grup" className="text-[13px] font-bold uppercase tracking-[0.2em]">{group.title} · {group.members.length} kişi</h2>
              <div className="flex flex-wrap items-center gap-3 text-[12.5px] font-semibold">
                <span className="tnum text-ink-3">{shareUrl.replace(/^https?:\/\//, "")}</span>
                <button type="button" onClick={copy} className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">{copied ? "Kopyalandı" : "Linki kopyala"}</button>
                <a href={`https://wa.me/?text=${encodeURIComponent(`${group.question} ${shareUrl}`)}`} target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">WhatsApp</a>
                <button type="button" onClick={share} className="underline decoration-line-2 underline-offset-4 hover:decoration-ink">Paylaş</button>
              </div>
            </div>
            <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              {group.members.map((m) => (
                <li key={m.id} className="flex flex-col gap-0.5 border-t border-line pt-3">
                  <span className="text-[15px] font-bold">{m.isYou ? "Sen" : m.name}</span>
                  <span className="text-[12px] text-ink-3">{[m.budget ? "₺".repeat(m.budget) : null, m.district, m.needsVegetarian ? "vejetaryen seçenek" : null].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-[13.5px]">
              {decision.preferences.map((p) => <li key={p.label}><span className="tnum font-bold">{p.count}</span><span className="text-ink-3"> / {p.total} kişi </span><span className="text-ink-2">{p.label}</span></li>)}
            </ul>
          </section>

          <section className="mt-10" aria-labelledby="sonuc">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
              <h2 id="sonuc" className="text-[13px] font-bold uppercase tracking-[0.2em]">Grubunuza göre</h2>
              <span className="text-[12px] text-ink-3">Zevk + kısıtlar + oylar. En mutsuz üye de sayılır.</span>
            </div>
            <ol>
              {decision.candidates.map((c, i) => {
                const e = getEntityById(c.entityId)!; const it = getTopicIntelligence(c.entityId)!; const v = myVote(c.entityId);
                const isChosen = chosen === c.entityId;
                return (
                  <li key={c.entityId} className={`grid gap-x-8 gap-y-3 border-t border-line py-6 sm:grid-cols-[auto_1fr_auto] ${isChosen ? "bg-sheet/60" : ""}`}>
                    <span className="tnum text-[13px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <Link href={`/mekan/${e.slug}/`} className="text-[22px] font-bold leading-tight tracking-[-0.025em] hover:text-accent-ink">{e.name}</Link>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{e.location?.district} · {"₺".repeat(e.priceLevel ?? 2)}</span>
                        <ScoreNumber score={it.overallScore} size="sm" label />
                        {isChosen && <span className="border border-pos px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.12em] text-pos-ink">grubun seçimi</span>}
                      </div>
                      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
                        {c.memberMatches.map((mm) => <li key={mm.memberId}><span className="text-ink-3">{group.members.find((m) => m.id === mm.memberId)?.name}</span> <span className="tnum font-bold">%{mm.score}</span></li>)}
                      </ul>
                      <WhyThisResult reasons={c.reasons} warnings={c.warnings} compact />
                      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                        <span className="text-[12px] text-ink-3">Senin oyun:</span>
                        {VOTES.map(([k, l]) => <button key={k} type="button" aria-pressed={v === k} onClick={() => voteGroup(group.id, "m.you", c.entityId, k)} className={`h-8 border px-2.5 text-[12.5px] font-semibold ${v === k ? "border-accent bg-accent text-on-accent" : "border-line-2 hover:border-ink"}`}>{l}</button>)}
                        <button type="button" onClick={() => chooseForGroup(group.id, c.entityId)} className="ml-auto text-[12.5px] font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">{isChosen ? "Seçildi" : "Bunu seç"}</button>
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end">
                      <span className="text-[34px] font-extrabold leading-none tracking-[-0.05em] text-accent-ink">%{c.groupScore}</span>
                      <span className="label">gruba göre</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {chosen && (
            <section className="mt-10 border-t-2 border-line-strong pt-6">
              <span className="label">Grubun seçimi</span>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
                <Link href={`/mekan/${getEntityById(chosen)!.slug}/`} className="text-[clamp(1.8rem,5vw,2.8rem)] font-extrabold leading-none tracking-[-0.04em] hover:text-accent-ink">{getEntityById(chosen)!.name}</Link>
                <EntityActions entityId={chosen} entitySlug={getEntityById(chosen)!.slug} entityName={getEntityById(chosen)!.name} variant="compact" via="group" />
              </div>
              <p className="mt-3 max-w-[64ch] text-[12.5px] text-ink-3">Oylar demo grupta yalnızca senin adına kaydedilir; diğer üyelerin oyları prototipte yoktur. Zevk profilinden yalnızca gerekli tercih özeti paylaşılır.</p>
            </section>
          )}
        </>
      )}

      <div className="mt-12"><DemoNotice>Demo grup: üyeler kurgudur, zevk farkları bilerek işe yarar seçilmiştir. Gerçek kimlik, ağ veya bildirim yoktur.</DemoNotice></div>
    </div>
  );
}
