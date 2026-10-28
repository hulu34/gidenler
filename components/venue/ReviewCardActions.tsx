"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccountStatus, useAccountUserId } from "@/lib/community/accountState";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const REASONS: Array<[string, string]> = [["sahte", "Sahte / gerçek ziyaret değil"], ["spam", "Reklam ya da spam"], ["hakaret", "Hakaret ya da nefret söylemi"], ["kisisel_veri", "Kişisel veri içeriyor"], ["alakasiz", "Bu mekânla ilgisiz"], ["diger", "Diğer"]];

/* Kartın altı: kendi deneyiminse "Düzenle", başkasınınsa "Bildir" (giriş gerekir; moderasyon kuyruğuna gider). */
export function ReviewCardActions({ id, authorId, slug }: { id: string; authorId: string; slug: string }) {
  const status = useAccountStatus();
  const me = useAccountUserId();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | string>("idle");
  if (me && me === authorId) return <Link href={`/yaz/${slug}/`} className="font-semibold text-ink-2 underline decoration-line-2 underline-offset-4 hover:text-ink">Deneyimini düzenle</Link>;
  if (state === "done") return <span className="font-semibold text-pos-ink">Bildirdin, teşekkürler. Moderasyon inceleyecek.</span>;
  if (status !== "in") return status === "anon" ? <Link href="/benim/" className="underline decoration-line-2 underline-offset-4 hover:text-ink">Bildirmek için giriş yap</Link> : null;
  async function send(reason: string) {
    setState("busy");
    const r = await fetch(`${BASE}/api/reviews/${id}/report/`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) as { message?: string } | null : null;
    setState(r?.ok ? "done" : j?.message ?? "Gönderilemedi; yeniden dene.");
  }
  return (
    <span className="flex flex-col items-end gap-2">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="underline decoration-line-2 underline-offset-4 hover:text-ink">Bildir</button>
      {open && (
        <span role="group" aria-label="Bildirme nedeni" className="flex flex-wrap justify-end gap-1.5">
          {REASONS.map(([k, l]) => (
            <button key={k} type="button" disabled={state === "busy"} onClick={() => send(k)} className="h-9 rounded-[3px] border border-line-2 px-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink">{l}</button>
          ))}
        </span>
      )}
      {state !== "idle" && state !== "busy" && <span role="alert" className="text-neg-ink">{state}</span>}
    </span>
  );
}
