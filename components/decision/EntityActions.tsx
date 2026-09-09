"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createList, markExperienced, markVisited, setEntityState, submitQuickReaction, toggleInList, useUserData,
} from "@/lib/store";
import type { ReactionMood, ReturnIntent } from "@/lib/types";
import { verbsForId } from "@/lib/verbs";

/**
 * KARAR → GİT → YAŞA — tek bileşen, her yüzeyde aynı dil.
 * Kaydet ≠ Gitmek istiyorum ≠ Gittim ≠ Deneyim yazdım.
 * "Watchlist" değil "Gitmek istiyorum"; "portfolio" değil "Benim Gidenler'im".
 */
export function EntityActions({ entityId, entitySlug, entityName, variant = "full", via = "topic" }: {
  entityId: string; entitySlug: string; entityName?: string; variant?: "full" | "compact"; via?: string;
}) {
  const data = useUserData();
  const rel = data.relationships[entityId];
  const state = rel?.state ?? "none";
  const reaction = data.reactions.find((r) => r.entityId === entityId);
  const V = verbsForId(entityId);

  const btn = "inline-flex h-9 items-center justify-center gap-1.5 rounded-[3px] px-3.5 text-[13.5px] font-semibold whitespace-nowrap";
  const primary = `${btn} bg-accent text-on-accent hover:opacity-90`;
  const ghost = `${btn} border border-line-2 hover:border-ink hover:bg-sunk`;
  const done = `${btn} border border-pos text-pos-ink`;

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {state === "none" && (
          <>
            <button type="button" className={primary} onClick={() => setEntityState(entityId, "want_to_go", via)}>{V.want}</button>
            <button type="button" className={ghost} onClick={() => setEntityState(entityId, "saved", via)}>Kaydet</button>
          </>
        )}
        {state === "saved" && (
          <>
            <button type="button" className={primary} onClick={() => setEntityState(entityId, "want_to_go", via)}>{V.want}</button>
            <span className="text-[12px] font-semibold text-ink-3">Kaydedildi</span>
          </>
        )}
        {state === "want_to_go" && (
          <>
            <span className={done}>✓ {V.want}</span>
            <Link href={`/mekan/${entitySlug}/#gittim`} className="text-[12.5px] font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">{V.didQ}</Link>
          </>
        )}
        {state === "visited" && <span className="text-[12px] font-semibold text-pos-ink">✓ {V.didYou}</span>}
        {state === "experienced" && <span className="text-[12px] font-semibold text-pos-ink">✓ Deneyimini yazdın</span>}
      </div>
    );
  }

  return (
    <div id="gittim" className="flex flex-col gap-3">
      {state === "none" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={primary} onClick={() => setEntityState(entityId, "want_to_go", via)}>{V.want}</button>
          <button type="button" className={ghost} onClick={() => setEntityState(entityId, "saved", via)}>Kaydet</button>
          <button type="button" className={`${btn} text-ink-3 hover:text-ink`} onClick={() => markVisited(entityId)}>{V.already}</button>
        </div>
      )}

      {state === "saved" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={primary} onClick={() => setEntityState(entityId, "want_to_go", via)}>{V.want}</button>
          <button type="button" className={done} onClick={() => setEntityState(entityId, "none")}>✓ Kaydedildi</button>
          <span className="text-[12px] text-ink-3">Daha sonra bakmak için. Niyet değil.</span>
        </div>
      )}

      {state === "want_to_go" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-[14px] font-bold text-pos-ink">✓ {V.wantAdded}</span>
            <Link href="/benim/" className="text-[12.5px] font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">Benim Gidenler&apos;im</Link>
            <button type="button" className="text-[12.5px] text-ink-3 hover:text-ink" onClick={() => setEntityState(entityId, "none")}>vazgeç</button>
          </div>
          <ListPicker entityId={entityId} />
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <span className="text-[13.5px] text-ink-2">{V.didQ}</span>
            <button type="button" className={ghost} onClick={() => markVisited(entityId)}>{V.yesDid}</button>
            <span className="text-[12px] text-ink-3">Henüz değilse hatırlatırız — Benim Gidenler&apos;im&apos;de bekler.</span>
          </div>
        </div>
      )}

      {state === "visited" && !reaction && <QuickCapture entityId={entityId} entitySlug={entitySlug} entityName={entityName} />}

      {state === "visited" && reaction && (
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-bold text-pos-ink">✓ {V.didYou} · tepkin kaydedildi ({reaction.mood}{reaction.returnIntent === "evet" ? `, ${V.again.toLocaleLowerCase("tr")}` : reaction.returnIntent === "hayır" ? `, ${V.notAgain}` : ""}).</span>
          <p className="text-[13px] text-ink-2">Hızlı tepki bir deneyim değildir; ağırlığı düşüktür. Bir sonraki karara asıl katkı yazılı deneyimdir.</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/yaz/${entitySlug}/`} className={primary} onClick={() => markExperienced(entityId)}>Detaylı deneyim yaz</Link>
            <button type="button" className={`${btn} text-ink-3 hover:text-ink`} onClick={() => setEntityState(entityId, "want_to_go", via)}>{V.willAgain}</button>
          </div>
        </div>
      )}

      {state === "experienced" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[14px] font-bold text-pos-ink">✓ Döngü kapandı: yaşadın, yazdın.</span>
          <span className="text-[12.5px] text-ink-3">Deneyimin Gidenler&apos;in bir sonraki kararına katılıyor.</span>
          <button type="button" className="text-[12.5px] text-ink-3 hover:text-ink" onClick={() => setEntityState(entityId, "want_to_go", via)}>{V.willAgain}</button>
        </div>
      )}
    </div>
  );
}

function ListPicker({ entityId }: { entityId: string }) {
  const data = useUserData();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Listeye ekle</span>
      {data.lists.map((l) => {
        const on = l.entityIds.includes(entityId);
        return (
          <button key={l.id} type="button" aria-pressed={on} onClick={() => toggleInList(l.id, entityId)}
            className={`h-7 border px-2.5 text-[12.5px] font-semibold ${on ? "border-accent bg-accent text-on-accent" : "border-line-2 hover:border-ink"}`}>
            {l.title}
          </button>
        );
      })}
      {adding ? (
        <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) { createList(title, entityId); setTitle(""); setAdding(false); } }} className="flex items-center gap-1.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Yeni liste" aria-label="Yeni liste adı" className="h-7 w-32 border-b-2 border-line-2 bg-transparent text-[13px] outline-none focus:border-accent" />
          <button type="submit" className="text-[12.5px] font-semibold text-accent-ink">Ekle</button>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="h-7 px-1 text-[12.5px] font-semibold text-ink-3 hover:text-ink">+ Yeni liste</button>
      )}
    </div>
  );
}

const MOODS: Array<[ReactionMood, string]> = [["çok iyi", "😍 Çok iyi"], ["iyi", "🙂 İyi"], ["ortalama", "😐 Ortalama"], ["kötü", "🙁 Kötü"]];
const RET: Array<[ReturnIntent, string]> = [["evet", "Evet"], ["emin değil", "Belki"], ["hayır", "Hayır"]];

/** GİTTİM → hafif yakalama. 20 alanlı forma zorlamaz; isteyen detaya geçer. */
export function QuickCapture({ entityId, entitySlug, entityName }: { entityId: string; entitySlug: string; entityName?: string }) {
  const V = verbsForId(entityId);
  const [mood, setMood] = useState<ReactionMood | null>(null);
  const [ret, setRet] = useState<ReturnIntent | null>(null);
  const [note, setNote] = useState("");
  const pick = (on: boolean) => `h-9 border px-3 text-[13.5px] font-semibold ${on ? "border-accent bg-accent text-on-accent" : "border-line-2 hover:border-ink"}`;
  return (
    <div className="flex flex-col gap-3 border-l-2 border-accent pl-4">
      <span className="text-[14px] font-bold">✓ {V.didYou}. Nasıl geçti{entityName ? ` — ${entityName}` : ""}?</span>
      <div className="flex flex-wrap gap-1.5">
        {MOODS.map(([k, l]) => <button key={k} type="button" aria-pressed={mood === k} className={pick(mood === k)} onClick={() => setMood(k)}>{l}</button>)}
      </div>
      {mood && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink-2">{V.againQ}</span>
          {RET.map(([k, l]) => <button key={k} type="button" aria-pressed={ret === k} className={pick(ret === k)} onClick={() => setRet(k)}>{l}</button>)}
        </div>
      )}
      {mood && ret && (
        <form onSubmit={(e) => { e.preventDefault(); submitQuickReaction(entityId, mood, ret, note); }} className="flex flex-col gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bir cümleyle ne yaşadın? (isteğe bağlı)" aria-label="Bir cümle"
            className="h-9 w-full max-w-[52ch] border-b-2 border-line-2 bg-transparent text-[14px] outline-none placeholder:text-ink-3 focus:border-accent" />
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="inline-flex h-9 items-center rounded-[3px] bg-accent px-3.5 text-[13.5px] font-semibold text-on-accent">Kaydet</button>
            <Link href={`/yaz/${entitySlug}/`} className="inline-flex h-9 items-center rounded-[3px] border border-line-2 px-3.5 text-[13.5px] font-semibold hover:border-ink">Detaylı deneyim yaz</Link>
            <span className="text-[11.5px] text-ink-3">Hızlı tepki ≠ deneyim. İkisi ayrı tutulur.</span>
          </div>
        </form>
      )}
    </div>
  );
}
