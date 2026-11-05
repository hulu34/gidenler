"use client";

import { useEffect, useState } from "react";
import { useAccountStatus } from "@/lib/community/accountState";

/* HESABI KAPAT — geri alınamaz. Yalnız oturum açıkken ve özellik açıksa görünür. Ne silineceği önceden yazılır; onay için cümle yazılır. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export function CloseAccount() {
  const account = useAccountStatus();
  const [on, setOn] = useState(false), [confirm, setConfirm] = useState("HESABIMI KAPAT");
  const [open, setOpen] = useState(false), [text, setText] = useState(""), [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null), [done, setDone] = useState(false);
  useEffect(() => { fetch(`${BASE}/api/me/hesap/`).then((r) => r.json()).then((j) => { setOn(!!j.enabled); if (j.confirm) setConfirm(j.confirm); }).catch(() => {}); }, []);
  if (!on || account !== "in") return null;
  if (done) return <section aria-labelledby="hesap-kapat" data-account-closed><h2 id="hesap-kapat" className="label">Hesabın kapatıldı</h2><p role="status" className="mt-2 text-[13px]">Deneyimlerin, fotoğrafların ve listelerin silindi. Bu cihazdaki oturumun kapatıldı.</p></section>;
  async function kapat() {
    setBusy(true); setMsg(null);
    const r = await fetch(`${BASE}/api/me/hesap/`, { method: "DELETE", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: text }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) as { message?: string } : {};
    setBusy(false);
    if (r?.ok) { setDone(true); return; }
    setMsg(j.message ?? "Hesap kapatılamadı (bağlantı sorunu); hiçbir şey silinmedi, yeniden dene.");
  }
  return (
    <section aria-labelledby="hesap-kapat" className="border-t border-line pt-6" data-close-account>
      <h2 id="hesap-kapat" className="label">Hesabı kapat</h2>
      {!open ? (
        <button type="button" className="mt-2 min-h-11 text-[13px] font-semibold text-neg-ink underline underline-offset-4" onClick={() => setOpen(true)}>Hesabımı kapatmak istiyorum</button>
      ) : (
        <div className="mt-2 flex max-w-[60ch] flex-col gap-3 text-[13px] text-ink-2">
          <p>Bu işlem <b>geri alınamaz</b>. Deneyimlerin, fotoğrafların (dosyalarıyla), listelerin, bildirimlerin ve eşiklerin silinir; yazdığın deneyimler mekânların Gidenler puanından çıkar. Güvenlik ve moderasyon için yapılan işlemlerin kaydı (kimlik numarası ve sayılar) tutulur.</p>
          <label className="flex flex-col gap-1">Onaylamak için <b>{confirm}</b> yaz
            <input value={text} onChange={(e) => setText(e.target.value)} className="min-h-11 border border-line-strong px-3" autoComplete="off" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={text !== confirm || busy} onClick={kapat} className="min-h-11 bg-neg-ink px-4 font-bold text-white disabled:opacity-40">{busy ? "Kapatılıyor…" : "Hesabımı kalıcı olarak kapat"}</button>
            <button type="button" onClick={() => { setOpen(false); setText(""); }} className="min-h-11 px-2 font-semibold underline underline-offset-4">Vazgeç</button>
          </div>
          {msg && <p role="alert" className="font-semibold text-neg-ink">{msg}</p>}
        </div>
      )}
    </section>
  );
}
