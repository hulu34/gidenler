"use client";

import { markNoticeRead, useThresholds } from "@/lib/thresholdStore";
import { NoticeBody } from "./ThresholdCard";

/* Site içi örnek bildirim (yalnız yatırımcı demosu). Okunmamış en yeni bildirim sayfanın altında görünür;
   kapatınca ya da bağlantıya gidince okunmuş olur. Takibi kapatılan restoranın bildirimi gösterilmez.
   Gerçek e-posta, SMS ya da tarayıcı push bildirimi YOK. */
export function ThresholdToast() {
  const d = useThresholds();
  const n = d.notices.find((x) => !x.read && d.prefs[x.entityId]?.notify && d.prefs[x.entityId]?.threshold === x.threshold);
  if (!n) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-3 bottom-24 z-[70] mx-auto max-w-[380px] border-2 border-ink bg-paper p-3.5 shadow-lg sm:inset-x-auto sm:bottom-5 sm:right-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]">{n.name}</span>
        <button type="button" onClick={() => markNoticeRead(n.id)} aria-label="Bildirimi kapat" className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center text-[18px] text-ink-3 hover:text-ink">×</button>
      </div>
      <div className="mt-1"><NoticeBody n={n} onGo={() => markNoticeRead(n.id)} /></div>
    </div>
  );
}
