"use client";

import { useState } from "react";
import { clearFeedback, submitFeedback, useUserData } from "@/lib/store";

const REASONS = ["Çok pahalı", "Çok uzak", "Bu tarz mekânları sevmem", "Gitmiştim, beğenmedim"];

/**
 * KÜÇÜK GERİ BİLDİRİM — "Bana uymadı".
 * Öneriyi tartışmaya açmaz; tek dokunuşla neden alır. Profili değiştirmez,
 * puanı etkilemez: yalnızca kişisel sinyal olarak saklanır ve ileride
 * sıralamayı sessizce düzeltmek için kullanılır. Görsel olarak küçüktür.
 */
export function RecommendationFeedback({ entityId, surface }: { entityId: string; surface: string }) {
  const data = useUserData();
  const [open, setOpen] = useState(false);
  const fb = data.feedback.find((f) => f.entityId === entityId);

  if (fb) {
    return (
      <p className="flex flex-wrap items-center gap-x-3 text-[12px] text-ink-3" role="status">
        <span>Not aldık: <span className="font-semibold text-ink-2">{fb.reason.toLocaleLowerCase("tr")}</span>. Bu sinyal puanı değil, sana gösterilenleri etkiler.</span>
        <button type="button" onClick={() => clearFeedback(entityId)} className="underline decoration-line-2 underline-offset-4 hover:text-ink">Geri al</button>
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-ink-3">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="underline decoration-line-2 underline-offset-4 hover:text-ink">Bana uymadı</button>
      ) : (
        <>
          <span>Neden?</span>
          {REASONS.map((r) => (
            <button key={r} type="button" onClick={() => { submitFeedback(entityId, r, surface); setOpen(false); }}
              className="h-7 border border-line-2 px-2.5 text-[12px] font-semibold text-ink-2 hover:border-ink">{r}</button>
          ))}
          <button type="button" onClick={() => setOpen(false)} className="hover:text-ink">Vazgeç</button>
        </>
      )}
    </div>
  );
}
