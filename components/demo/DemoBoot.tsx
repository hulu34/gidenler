"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { enterInvestorDemo, exitInvestorDemo, resetDemo, useUserData } from "@/lib/store";

/**
 * SUNUM MODU — `?demo=investor` ile girilir, sayfalar arasında korunur
 * (mod bayrağı ayrı bir localStorage anahtarında). `?demo=reset` başlangıç
 * anlık görüntüsüne döner, `?demo=off` normal kullanıcıya geri çıkar.
 * Normal kullanıcının verisi hiçbir durumda silinmez: sunum ayrı ad alanındadır.
 * URL parametresi okunduktan sonra temizlenir; yenileme durumu bozmaz.
 */
export function DemoBoot() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const mode = url.searchParams.get("demo");
    if (!mode) return;
    if (mode === "investor") enterInvestorDemo();
    else if (mode === "reset") resetDemo();
    else if (mode === "off") exitInvestorDemo();
    url.searchParams.delete("demo");
    window.history.replaceState(null, "", url.pathname + (url.search || "") + url.hash);
  }, []);
  return null;
}

/** Tek, küçük, küresel gösterge — ürünün her yerine "demo" yazılmaz. */
export function DemoIndicator() {
  const data = useUserData();
  const [flash, setFlash] = useState<string | null>(null);
  if (data.demoMode !== "investor") return null;
  return (
    <span className="hidden items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 md:flex" aria-label="Sunum modu">
      <Link href="/demo/" className="border border-dashed border-line-2 px-1.5 py-px hover:border-ink hover:text-ink">Sunum modu</Link>
      <button type="button" onClick={() => { resetDemo(); setFlash("sıfırlandı"); setTimeout(() => setFlash(null), 1500); }} className="underline decoration-line-2 underline-offset-4 hover:text-ink">
        {flash ?? "sıfırla"}
      </button>
    </span>
  );
}
