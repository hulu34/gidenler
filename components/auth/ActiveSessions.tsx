"use client";

import { useEffect, useState } from "react";
import { useAccountStatus } from "@/lib/community/accountState";
import type { DeviceSession } from "@/lib/community/sessions";

/* AKTİF CİHAZLAR — hesabının açık olduğu cihazlar; tek tek ya da hepsinden (bu cihaz hariç) çıkış.
   Girişsizken görünmez. Bu cihazdan çıkmak için hesap kutusundaki "Çıkış yap" kullanılır. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const API = `${BASE}/api/me/sessions/`;
const when = (iso: string) => {
  const d = new Date(iso), days = Math.floor((Date.now() - d.getTime()) / 86400_000);
  if (days < 1) return "bugün";
  if (days < 2) return "dün";
  if (days < 30) return `${days} gün önce`;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
};

export function ActiveSessions() {
  const account = useAccountStatus();
  const [rows, setRows] = useState<DeviceSession[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (account !== "in") return;
    fetch(API, { cache: "no-store", credentials: "same-origin" }).then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { sessions: DeviceSession[] }) => setRows(j.sessions)).catch(() => setMsg({ ok: false, text: "Cihazlar yüklenemedi; sayfayı yenile." }));
  }, [account]);

  async function send(body: object, key: string) {
    setBusy(key); setMsg(null);
    const r = await fetch(API, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) as { sessions?: DeviceSession[]; closed?: number } | null : null;
    setBusy(null); setAsk(false);
    if (r?.ok && j?.sessions) {
      setRows(j.sessions);
      setMsg({ ok: true, text: "closed" in (j ?? {}) ? (j.closed ? `${j.closed} cihazda oturum kapatıldı.` : "Başka açık cihaz yoktu.") : "O cihazda oturum kapatıldı." });
    } else setMsg({ ok: false, text: "İşlem yapılamadı (bağlantı sorunu); yeniden dene." });
  }

  if (account !== "in") return null;
  const others = rows?.filter((r) => !r.current) ?? [];
  return (
    <section className="mt-10 border-t-2 border-line-strong pt-6" aria-labelledby="h-cihazlar">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="h-cihazlar" className="text-[13px] font-bold uppercase tracking-[0.2em]">Aktif cihazlar</h2>
        <span className="text-[12px] text-ink-3">Hesabının açık olduğu yerler</span>
      </div>
      <ul className="mt-2 flex flex-col">
        {rows?.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line py-3">
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold">{r.device}{r.current && <span className="ml-2 rounded-full border border-pos px-2 py-px text-[10.5px] font-semibold uppercase tracking-[0.1em] text-pos-ink">Bu cihaz</span>}</span>
              <span className="text-[12.5px] text-ink-3">Son etkinlik {when(r.lastActive)} · giriş {when(r.createdAt)}</span>
            </span>
            {!r.current && (
              <button type="button" disabled={!!busy} onClick={() => send({ revoke: r.id }, r.id)}
                className="h-9 rounded-[3px] border border-line-2 px-3 text-[13px] font-semibold hover:border-ink disabled:opacity-60">
                {busy === r.id ? "Kapatılıyor…" : "Bu cihazdan çıkış yap"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
          {!ask ? (
            <button type="button" onClick={() => setAsk(true)} className="font-semibold text-neg-ink underline decoration-line-2 underline-offset-4">Diğer tüm cihazlardan çıkış yap</button>
          ) : (
            <>
              <span className="text-ink-2">{others.length} cihazda oturum kapatılsın mı? Bu cihazda girişli kalırsın.</span>
              <button type="button" disabled={!!busy} onClick={() => send({ others: true }, "others")} className="h-9 rounded-[3px] bg-neg px-3 font-semibold text-paper">{busy === "others" ? "Kapatılıyor…" : "Evet, çıkış yap"}</button>
              <button type="button" onClick={() => setAsk(false)} className="h-9 rounded-[3px] border border-line-2 px-3 font-semibold">Vazgeç</button>
            </>
          )}
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 text-[13px] ${msg.ok ? "text-pos-ink" : "text-neg-ink"}`}>{msg.text}</p>}
    </section>
  );
}
