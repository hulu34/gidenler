"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { resetDemo, seedInvestorDemo, useUserData } from "@/lib/store";

/**
 * YATIRIMCI DEMO MODU — `?demo=investor` ile tek tıkta yaşanmış bir hesap.
 * Prototipin boş görünmemesi için durumu tohumlar; gerçek sinyal üretmez.
 * `?demo=reset` her şeyi temizler. URL parametresi okunduktan sonra silinir,
 * böylece sayfa yenilemesi durumu tekrar tohumlamaz.
 */
export function DemoBoot() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const mode = url.searchParams.get("demo");
    if (!mode) return;
    if (mode === "investor") seedInvestorDemo();
    else if (mode === "reset") resetDemo();
    url.searchParams.delete("demo");
    window.history.replaceState(null, "", url.pathname + (url.search || "") + url.hash);
  }, []);
  return null;
}

/** Üst çubukta sessiz gösterge: demo modu açıkken tek tıkla sıfırla. */
export function DemoIndicator() {
  const data = useUserData();
  const [done, setDone] = useState(false);
  if (data.demoMode !== "investor") return null;
  return (
    <span className="hidden items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 md:flex">
      <span className="border border-dashed border-line-2 px-1.5 py-px">demo</span>
      <button type="button" onClick={() => { resetDemo(); setDone(true); }} className="underline decoration-line-2 underline-offset-4 hover:text-ink">
        {done ? "sıfırlandı" : "sıfırla"}
      </button>
      <Link href="/demo/" className="hover:text-ink">?</Link>
    </span>
  );
}
