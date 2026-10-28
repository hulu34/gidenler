"use client";

import { useEffect, useState } from "react";
import { clearAccountStates } from "@/lib/store";
import { isAccountEntity, writePending } from "@/lib/community/sync";

/* HESAP KUTUSU — Google ile giriş (Better Auth). Sunucuda kimlik yapılandırılmamışsa (503) ya da
   statik sitede (404) hiç görünmez; site bugünkü gibi hesapsız çalışır. Girişte Kaydet / Gitmek istiyorum /
   Gittim hesapta saklanır (bkz. AccountSync); çıkışta bu cihazdan silinir. Deneyim yayınlama sonraki aşama. */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
type S = { state: "loading" | "off" | "out" } | { state: "in"; name: string; email: string; image?: string | null };

export function AccountBox() {
  const [s, setS] = useState<S>({ state: "loading" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${BASE}/api/auth/get-session/`, { cache: "no-store", credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) return { state: "off" } as S;
        const j = await r.json().catch(() => null) as { user?: { name: string; email: string; image?: string | null } } | null;
        return j?.user ? ({ state: "in", name: j.user.name, email: j.user.email, image: j.user.image } as S) : ({ state: "out" } as S);
      })
      .catch(() => ({ state: "off" } as S))
      .then((v) => { if (alive) setS(v); });
    return () => { alive = false; };
  }, []);

  async function signIn() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`${BASE}/api/auth/sign-in/social/`, {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ provider: "google", callbackURL: `${location.origin}${BASE}/benim/` }),
      });
      const j = await r.json().catch(() => null) as { url?: string } | null;
      if (j?.url) location.href = j.url; else { setErr("Giriş başlatılamadı."); setBusy(false); }
    } catch { setErr("Giriş başlatılamadı."); setBusy(false); }
  }
  async function signOut() {
    setBusy(true);
    await fetch(`${BASE}/api/auth/sign-out/`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}" }).catch(() => null);
    clearAccountStates(isAccountEntity); writePending({});
    location.reload();
  }

  if (s.state === "loading" || s.state === "off") return null;
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-line-2 px-4 py-3">
      {s.state === "in" ? (
        <>
          <span className="flex items-center gap-3 text-[14px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {s.image && <img src={s.image} alt="" width={28} height={28} className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />}
            <span><b>{s.name}</b> <span className="text-ink-3">· {s.email}</span>
              <span className="block text-[12.5px] text-ink-3">Kaydet, Gitmek istiyorum ve Gittim seçimlerin hesabında saklanıyor.</span></span>
          </span>
          <button type="button" onClick={signOut} disabled={busy} className="h-10 rounded-[3px] border border-line-2 px-4 text-[13px] font-semibold hover:border-ink">Çıkış yap</button>
        </>
      ) : (
        <>
          <span className="text-[14px] text-ink-2">Kaydettiklerin, Gitmek istediklerin ve Gittim listen hesabında saklansın; her cihazda seninle olsun.</span>
          <button type="button" onClick={signIn} disabled={busy} className="h-11 rounded-[3px] bg-ink px-5 text-[14px] font-semibold text-paper hover:bg-accent">
            {busy ? "Yönlendiriliyor…" : "Google ile giriş yap"}
          </button>
        </>
      )}
      {err && <p role="alert" className="w-full text-[12.5px] text-neg-ink">{err}</p>}
    </div>
  );
}
