"use client";

import { useState } from "react";

/* Görüntüleyicide fotoğraf bildirimi. Giriş gerekir; sonuç olduğu gibi yazılır. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const REASONS: Array<[string, string]> = [["yanlis_restoran", "Yanlış restoran"], ["telif", "Telif hakkı"], ["uygunsuz", "Uygunsuz içerik"], ["kisisel_veri", "Kişisel veri / yüz"], ["diger", "Diğer"]];

export function PhotoReport({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function send(reason: string) {
    const r = await fetch(`${BASE}/api/photos/${id}/report/`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) as { message?: string } | null : null;
    setOpen(false);
    setMsg(!r ? "Gönderilemedi; bağlantını kontrol et." : r.ok ? "Bildirimin alındı; editör inceleyecek." : r.status === 401 ? "Bildirmek için giriş yapman gerekiyor." : j?.message ?? "Gönderilemedi.");
  }
  if (msg) return <span role="status" className="text-white/80">{msg}</span>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-white/60 underline underline-offset-2">Bildir</button>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      {REASONS.map(([k, label]) => <button key={k} type="button" onClick={() => send(k)} className="rounded-full border border-white/40 px-2 py-0.5 text-white/90 hover:bg-white/10">{label}</button>)}
    </span>
  );
}
