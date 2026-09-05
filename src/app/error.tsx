"use client";

import { useEffect } from "react";

/**
 * GÜVENLİK AĞI — istemci tarafı hata sınırı.
 * Statik dağıtımda en sık hata: yeni sürüm sonrası önbellekteki eski HTML'in
 * artık var olmayan script parçalarını istemesi (ChunkLoadError). Bunu bir kez
 * otomatik yenilemeyle çözeriz; gerçek bir hataysa Türkçe, sakin bir ekran gösteririz.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const chunk = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(`${error?.name} ${error?.message}`);
    if (!chunk) return;
    try {
      if (!sessionStorage.getItem("gidenler.reloaded")) {
        sessionStorage.setItem("gidenler.reloaded", "1");
        window.location.reload();
      }
    } catch { /* yoksay */ }
  }, [error]);

  function hardReload() {
    try { sessionStorage.removeItem("gidenler.reloaded"); } catch { /* yoksay */ }
    const u = new URL(window.location.href);
    u.searchParams.set("r", String(Date.now()));
    window.location.replace(u.toString());
  }
  function resetData() {
    try { window.localStorage.removeItem("gidenler.v4"); } catch { /* yoksay */ }
    hardReload();
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <div className="flex flex-col items-start gap-5 pt-16 sm:pt-24">
        <span className="label">Bir şey ters gitti</span>
        <h1 className="max-w-[18ch] text-[clamp(2rem,6vw,3rem)] font-extrabold leading-none tracking-[-0.045em]">Sayfa yüklenirken bir hata oluştu.</h1>
        <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
          Çoğu zaman sebep tarayıcının eski bir sürümü önbellekte tutmasıdır. Yeniden yüklemek genellikle çözer; olmazsa bu tarayıcıda saklanan demo verilerini sıfırlayabilirsin.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={hardReload} className="h-10 border-2 border-ink bg-ink px-4 text-[13px] font-bold uppercase tracking-[0.1em] text-paper hover:border-accent hover:bg-accent">Yeniden yükle</button>
          <button type="button" onClick={reset} className="h-10 border-2 border-line-2 px-4 text-[13px] font-bold uppercase tracking-[0.1em] hover:border-ink">Tekrar dene</button>
          <button type="button" onClick={resetData} className="h-10 px-2 text-[12.5px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Demo verilerini sıfırla</button>
        </div>
        <p className="mt-4 border-t border-line pt-3 text-[11.5px] text-ink-3">
          Teknik ayrıntı: {error?.name ?? "Error"}{error?.message ? ` — ${error.message.slice(0, 160)}` : ""}{error?.digest ? ` · ${error.digest}` : ""}
        </p>
      </div>
    </div>
  );
}
