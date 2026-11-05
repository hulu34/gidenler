"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* BENİM FOTOĞRAFLARIM — durum, red gerekçesi ve kaldırma. Yalnız oturum açmış kullanıcıya ve depolama açıkken görünür. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const DURUM: Record<string, string> = { pending: "Onay bekliyor", approved: "Yayında", rejected: "Reddedildi" };
type Row = { id: string; status: string; rejectReason: string | null; reviewId: string | null; slug: string; name: string; thumb: string | null };

export function MyPhotos() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    fetch(`${BASE}/api/photos/mine/`, { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : { photos: [] })).then((j) => setRows(j.photos ?? [])).catch(() => {});
  }, []);
  if (!rows.length && !msg) return null;
  async function kaldir(r: Row) {
    if (!window.confirm("Fotoğraf kaldırılsın mı? Dosyası da silinir.")) return;
    const x = await fetch(`${BASE}/api/reviews/${r.reviewId}/photos/${r.id}/`, { method: "DELETE", credentials: "same-origin" }).catch(() => null);
    if (x?.ok) { setRows((v) => v.filter((y) => y.id !== r.id)); setMsg("Fotoğraf kaldırıldı."); } else setMsg("Kaldırılamadı; yeniden dene.");
  }
  return (
    <section aria-labelledby="fotograflarim" data-my-photos>
      <div className="kunye"><h2 id="fotograflarim">Fotoğraflarım</h2></div>
      {msg && <p role="status" className="mt-2 text-[13px] font-semibold">{msg}</p>}
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 text-[13px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.thumb ? <img src={`${BASE}${r.thumb}`} alt="" className="h-14 w-14 shrink-0 object-cover" /> : <span className="h-14 w-14 shrink-0 bg-sheet" />}
            <span className="min-w-0 flex-1"><Link href={`/mekan/${r.slug}/`} className="font-bold underline underline-offset-2">{r.name}</Link><br />{DURUM[r.status] ?? r.status}{r.rejectReason ? ` · ${r.rejectReason}` : ""}</span>
            {r.status !== "rejected" && r.reviewId && <button type="button" onClick={() => kaldir(r)} className="min-h-11 font-bold underline underline-offset-2">Kaldır</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
