"use client";

import { useState } from "react";

const API = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/moderation/storage/`;
type Res = { ok: boolean; real?: boolean; provider?: string; error?: string; steps?: Array<{ step: string; ok: boolean; note?: string }> };

/** Yalnız yönetici. Sonuç sunucudaki gerçek adımlardır; test depolaması "gerçek depolama" olarak gösterilmez. */
export function StorageCheck() {
  const [r, setR] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const x = await fetch(API, { method: "POST", credentials: "same-origin" }).catch(() => null);
    setR(x ? await x.json().catch(() => ({ ok: false, error: "yanıt okunamadı" })) : { ok: false, error: "bağlantı" });
    setBusy(false);
  }
  return (
    <div data-storage-check className="mt-3">
      <button type="button" disabled={busy} onClick={run} className="min-h-11 rounded-full border border-line-strong px-4 text-[13px] font-bold hover:bg-sheet disabled:opacity-40">{busy ? "Deneniyor…" : "Depolamayı dene"}</button>
      {r && (
        <div role="status" className="mt-3 text-[13.5px]">
          <p className="font-bold">{r.ok ? "Tüm adımlar geçti." : `Başarısız${r.error ? `: ${r.error}` : "."}`} {r.provider && r.real === false ? "Bu test depolamasıdır; gerçek R2 testi sayılmaz." : ""}</p>
          <ul className="mt-1">{r.steps?.map((s) => <li key={s.step}>{s.ok ? "✓" : "✗"} {s.step}{s.note ? ` · ${s.note}` : ""}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
