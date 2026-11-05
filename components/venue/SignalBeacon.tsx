"use client";

import { useEffect } from "react";

/* Profil sinyali: sayfa en az 4 sn görünür kalırsa bir "ziyaret"; "Gitmek istiyorum/Kaydet" açılınca "save";
   yol tarifi, arama, web sitesi gibi dış yönlendirmede "outbound". Aynı gün tekrarı sunucuda tek sayılır.
   İçerik, kimlik ya da konum gönderilmez: yalnız mekân adı (slug) ve tür. */
const API = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/sinyal/`;
function send(slug: string, kind: "view" | "save" | "outbound") {
  const body = JSON.stringify({ slug, kind });
  try { if (navigator.sendBeacon?.(API, new Blob([body], { type: "text/plain" }))) return; } catch { /* yedek */ }
  void fetch(API, { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
}
const OUT = 'a[href^="tel:"], a[href*="google.com/maps"], a[href*="maps.apple"], a[data-sinyal="outbound"]';

export function SignalBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null, sent = false;
    const arm = () => { if (sent || document.visibilityState !== "visible") return; t = setTimeout(() => { sent = true; send(slug, "view"); }, 4000); };
    const vis = () => { if (document.visibilityState === "visible") arm(); else if (t) clearTimeout(t); };
    arm(); document.addEventListener("visibilitychange", vis);
    const click = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (!el?.closest) return;
      if (el.closest(OUT)) send(slug, "outbound");
      const b = el.closest('button[data-sinyal="save"]');
      if (b && b.getAttribute("aria-pressed") !== "true") send(slug, "save");
    };
    document.addEventListener("click", click, true);
    return () => { if (t) clearTimeout(t); document.removeEventListener("visibilitychange", vis); document.removeEventListener("click", click, true); };
  }, [slug]);
  return null;
}
