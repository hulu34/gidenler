"use client";

import { useCallback, useEffect, useState } from "react";

const API = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/moderation/photos/`;
type Row = { id: string; status: string; slug: string; name: string; uploader: string; preview: string | null; width: number; height: number; rightsStatement: string; sourceUrl: string | null; source: string; isCover: boolean; coverCandidate: boolean; rejectReason: string | null; createdAt: string; reports: string[] };
type Tab = "pending" | "approved" | "rejected" | "removed";
const TABS: Array<[Tab, string]> = [["pending", "Bekleyen"], ["approved", "Onaylı"], ["rejected", "Reddedilen"], ["removed", "Kaldırılan"]];
const FOCI: Array<[string, string]> = [["50% 50%", "Orta"], ["50% 20%", "Üst"], ["50% 80%", "Alt"]];
const btn = "rounded-full border border-line-strong px-3 py-1.5 text-[13px] font-bold hover:bg-sheet disabled:opacity-40";

export function PhotoModeration() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [reported, setReported] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [focus, setFocus] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setRows(null);
    const r = await fetch(`${API}?status=${tab}`, { credentials: "same-origin" }).catch(() => null);
    if (!r?.ok) { setMsg("Liste alınamadı."); setRows([]); return; }
    const j = await r.json(); setRows(j.rows); setReported(j.reported);
  }, [tab]);
  useEffect(() => { void load(); }, [load]);
  async function act(id: string, action: string, extra: Record<string, unknown> = {}) {
    setMsg(null);
    const r = await fetch(API, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action, ...extra }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (!r?.ok) { setMsg(`İşlem yapılamadı: ${j?.error ?? "bağlantı"}`); return; }
    setMsg(j?.filesDeleted === false ? "Kaldırıldı, ancak dosya depodan silinemedi; kontrol et." : "Kaydedildi.");
    await load();
  }
  return (
    <div className="mt-5">
      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`${btn} ${tab === k ? "bg-ink text-paper hover:bg-ink" : ""}`}>{l}</button>)}
      </div>
      {msg && <p role="status" className="mt-3 text-[13px] font-semibold">{msg}</p>}
      {rows === null && <p className="mt-6 text-[13px] text-ink-3">Yükleniyor…</p>}
      {rows?.length === 0 && <p className="mt-6 text-[13px] text-ink-3">Bu listede fotoğraf yok.</p>}
      <ul className="mt-5 grid gap-8 md:grid-cols-2">
        {rows?.map((r) => (
          <li key={r.id} data-photo={r.id} className="flex flex-col gap-2 border-t border-line pt-3">
            {r.preview
              // eslint-disable-next-line @next/next/no-img-element
              ? <a href={r.preview} target="_blank" rel="noopener noreferrer"><img src={r.preview} alt={`${r.name} için yüklenen fotoğraf`} className="aspect-[4/3] w-full bg-sheet object-contain" /></a>
              : <p className="text-[13px] text-ink-3">Dosya silinmiş.</p>}
            <p className="text-[15px] font-extrabold"><a href={`/mekan/${r.slug}/`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{r.name}</a></p>
            <p className="text-[12.5px] text-ink-2">Yükleyen: {r.uploader} · Kaynak: {r.source} · {r.width}×{r.height} · {new Date(r.createdAt).toLocaleDateString("tr-TR")}</p>
            <p className="text-[12.5px] text-ink-2">Hak beyanı: {r.rightsStatement}{r.sourceUrl ? ` · ${r.sourceUrl}` : ""}</p>
            {r.rejectReason && <p className="text-[12.5px] text-neg-ink">Gerekçe: {r.rejectReason}</p>}
            {reported.includes(r.id) && <p className="text-[12.5px] font-bold text-neg-ink">Bildirim: {r.reports.join(" · ")}</p>}
            {(r.isCover || r.coverCandidate) && <p className="text-[12.5px] font-bold">{r.isCover ? "Şu an kapak" : "Kapak adayı"}</p>}
            {(r.status === "pending" || r.status === "approved") && (
              <input aria-label="Gerekçe" placeholder="Gerekçe (red ve kaldırmada)" value={reason[r.id] ?? ""} onChange={(e) => setReason({ ...reason, [r.id]: e.target.value })} className="border border-line-strong bg-paper px-2 py-1.5 text-[13px]" />
            )}
            <div className="flex flex-wrap gap-2">
              {r.status === "pending" && <>
                <button className={btn} onClick={() => act(r.id, "approve")}>Onayla</button>
                <button className={btn} disabled={!reason[r.id]?.trim()} onClick={() => act(r.id, "reject", { reason: reason[r.id] })}>Reddet</button>
              </>}
              {r.status === "approved" && <>
                {r.isCover ? <button className={btn} onClick={() => act(r.id, "cover_clear")}>Kapaktan çıkar</button> : (
                  <>
                    <select aria-label="Kırpma odağı" value={focus[r.id] ?? "50% 50%"} onChange={(e) => setFocus({ ...focus, [r.id]: e.target.value })} className="border border-line-strong bg-paper px-2 text-[13px]">
                      {FOCI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <button className={btn} onClick={() => act(r.id, "cover", { focus: focus[r.id] ?? "50% 50%" })}>Kapak yap</button>
                  </>
                )}
                <button className={btn} onClick={() => act(r.id, r.coverCandidate ? "candidate_off" : "candidate")}>{r.coverCandidate ? "Adaylıktan çıkar" : "Kapak adayı"}</button>
              </>}
              {(r.status === "approved" || r.status === "pending") && <button className={btn} disabled={!reason[r.id]?.trim()} onClick={() => act(r.id, "remove", { reason: reason[r.id] })}>Kaldır</button>}
              {reported.includes(r.id) && <button className={btn} onClick={() => act(r.id, "dismiss_reports")}>Bildirimi kapat</button>}
            </div>
            {r.status === "approved" && !r.isCover && r.preview && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3">Kapak önizleme</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.preview} alt="" style={{ objectPosition: focus[r.id] ?? "50% 50%" }} className="mt-1 aspect-[16/10] w-[240px] object-cover" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
