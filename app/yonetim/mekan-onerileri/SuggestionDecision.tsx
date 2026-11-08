"use client";
import { useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export function SuggestionDecision({ id, candidates }: { id: string; candidates: Array<{ slug: string; name: string }> }) {
  const [slug, setSlug] = useState(candidates[0]?.slug ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function decide(decision: "accepted" | "duplicate" | "rejected") {
    setBusy(true); setMsg(null);
    const r = await fetch(`${BASE}/api/admin/mekan-oner/`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, decision, ...(decision === "duplicate" ? { slug } : {}) }) }).catch(() => null);
    setBusy(false);
    setMsg(r?.ok ? "Kaydedildi" : `Kaydedilemedi (${r?.status ?? "bağlantı"})`);
  }
  if (msg === "Kaydedildi") return <p className="text-[13px] font-semibold text-pos-ink">Karar kaydedildi.</p>;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <button disabled={busy} onClick={() => decide("accepted")} className="h-9 rounded-[6px] bg-ink px-3 font-semibold text-paper">Doğrulamaya al</button>
      {candidates.length > 0 && (<>
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className="h-9 max-w-[220px] rounded-[6px] border border-line-2 bg-transparent px-2">{candidates.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        <button disabled={busy} onClick={() => decide("duplicate")} className="h-9 rounded-[6px] border border-ink px-3 font-semibold">Var olan mekân</button>
      </>)}
      <button disabled={busy} onClick={() => decide("rejected")} className="h-9 rounded-[6px] border border-neg px-3 font-semibold text-neg-ink">Reddet</button>
      {msg && <span className="text-neg-ink">{msg}</span>}
    </div>
  );
}
