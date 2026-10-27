import { COMPLETENESS_KEYS, COMPLETENESS_LABEL, type Completeness } from "@/lib/completeness";

/** Gerçek mekân profilinde hangi bilgilerin gerçekten var olduğu — eksik olan gizlenmez, "yok" yazılır. */
export function DataCompleteness({ c }: { c: Completeness }) {
  return (
    <section aria-labelledby="h-tamlik" className="mt-10">
      <div className="kunye"><h2 id="h-tamlik">Profil tamlığı</h2><span className="tnum">{c.filled}/{c.total}</span></div>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-3">
        {COMPLETENESS_KEYS.map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span aria-hidden className={c.have[k] ? "text-pos-ink" : "text-ink-3"}>{c.have[k] ? "●" : "○"}</span>
            <span className={c.have[k] ? "text-ink" : "text-ink-3"}>{COMPLETENESS_LABEL[k]}</span>
            <span className="sr-only">{c.have[k] ? "var" : "henüz yok"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 max-w-[62ch] text-[12px] text-ink-3">Yalnız kaynağı olan bilgi &ldquo;var&rdquo; sayılır. Kimlik bilgisi © OpenStreetMap katkıcıları (ODbL).</p>
    </section>
  );
}
