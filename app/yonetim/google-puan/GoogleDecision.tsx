"use client";
import { useState } from "react";

type Item = { slug: string; placeId: string; name: string; district: string; state: string; reason: string };
/* Onay/ret: gerekçe zorunlu (en az 12 karakter). Karar, sunucudaki son Excel'de bu mekâna bağlı place ID için verilir. */
export function GoogleDecision({ rows, canDecide }: { rows: Item[]; canDecide: boolean }) {
  const [done, setDone] = useState<Record<string, string>>({});
  if (!rows.length) return <p className="mt-2 text-[13px] text-ink-3">Yok.</p>;
  async function send(slug: string, decision: "onay" | "ret", note: string, placeId: string) {
    const r = await fetch("/api/moderation/google-puan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, placeId, decision, note }) });
    const j = await r.json().catch(() => ({}));
    setDone((d) => ({ ...d, [slug]: r.ok ? (decision === "onay" ? "Onaylandı (sonraki aktarımda sitede)" : "Reddedildi (puan gizlendi)") : `Hata: ${j.message ?? j.error ?? r.status}` }));
  }
  return (
    <ul className="mt-3 divide-y divide-line text-[13px]">
      {rows.map((x) => <Row key={x.slug} x={x} canDecide={canDecide} done={done[x.slug]} onSend={send} />)}
    </ul>
  );
}
function Row({ x, canDecide, done, onSend }: { x: Item; canDecide: boolean; done?: string; onSend: (s: string, d: "onay" | "ret", n: string, p: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <li className="py-2">
      <div><a className="font-semibold underline" href={`/mekan/${x.slug}/`}>{x.name}</a> · {x.district} — <span className="text-ink-2">{x.state}</span></div>
      <div className="text-ink-3">{x.reason} · <a className="underline" href={`https://www.google.com/maps/place/?q=place_id:${x.placeId}`} target="_blank" rel="noopener noreferrer">Google'da aç ↗</a></div>
      {canDecide && !done && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input aria-label="Gerekçe" placeholder="Gerekçe (ne kontrol edildi?)" value={note} onChange={(e) => setNote(e.target.value)} className="min-w-[280px] flex-1 rounded border border-line px-2 py-1" />
          <button disabled={note.trim().length < 12} onClick={() => onSend(x.slug, "onay", note, x.placeId)} className="rounded border border-ink px-3 py-1 font-semibold disabled:opacity-40">Onayla</button>
          <button disabled={note.trim().length < 12} onClick={() => onSend(x.slug, "ret", note, x.placeId)} className="rounded border border-neg px-3 py-1 font-semibold text-neg disabled:opacity-40">Reddet</button>
        </div>
      )}
      {done && <div className="mt-1 font-semibold">{done}</div>}
    </li>
  );
}
