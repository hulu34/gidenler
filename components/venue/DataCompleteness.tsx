"use client";

import { COMPLETENESS_KEYS, COMPLETENESS_LABEL, type Completeness } from "@/lib/completeness";
import { useGoogleView } from "./media/googleView";

/** Gerçek mekân profilinde hangi bilgilerin gerçekten var olduğu — eksik olan gizlenmez, "yok" yazılır.
    Sunucu: Google eşleşmesi (onaylı/otomatik Place ID), gerçek video sayısı, kendi fotoğraflarımız.
    Tarayıcı: Google fotoğrafları sayfanın tek Google isteğinden (ek istek yok) — gerçekten geldiyse "Fotoğraf" var sayılır. */
export function DataCompleteness({ c, slug, google = false }: { c: Completeness; slug?: string; google?: boolean }) {
  const g = useGoogleView(slug ?? "", google && !!slug);
  const have = { ...c.have, photo: c.have.photo || (g.k === "ok" && g.v.total > 0) };
  const filled = COMPLETENESS_KEYS.filter((k) => have[k]).length;
  return (
    <section aria-labelledby="h-tamlik" className="mt-10">
      <div className="kunye"><h2 id="h-tamlik">Profil tamlığı</h2><span className="tnum">{filled}/{c.total}</span></div>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-3">
        {COMPLETENESS_KEYS.map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span aria-hidden className={have[k] ? "text-pos-ink" : "text-ink-3"}>{have[k] ? "●" : "○"}</span>
            <span className={have[k] ? "text-ink" : "text-ink-3"}>{COMPLETENESS_LABEL[k]}</span>
            <span className="sr-only">{have[k] ? "var" : "henüz yok"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 max-w-[62ch] text-[12px] text-ink-3">Yalnız kaynağı olan bilgi &ldquo;var&rdquo; sayılır: Google bilgisi doğrulanmış eşleşmeden, video onaylı içerikten, fotoğraf Gidenler ya da Google kaynaklıdır. Kimlik bilgisi © OpenStreetMap katkıcıları (ODbL).</p>
    </section>
  );
}
