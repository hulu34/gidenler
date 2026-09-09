"use client";

import { useEffect, useState } from "react";

export interface TopicSection { id: string; label: string }

/**
 * YAPIŞKAN KONU GEZİNTİSİ — Deneyimler · Özet · Puanlar · Trend · Uzmanlar · Analiz.
 * Ayrı rota değil; aynı sayfada bölüm bağlantısı. Tıklayınca yumuşak kaydırma, kaydırdıkça
 * aktif bölüm güncellenir, URL hash'i yenilemede çalışır (#deneyimler …).
 * Mobilde yatay kayar; alttaki eylem çubuğuyla çakışmaz (üstte durur).
 */
export function TopicNav({ sections }: { sections: TopicSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const OFFSET = 150;
    const compute = () => {
      let cur = sections[0]?.id ?? "";
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= OFFSET) cur = s.id;
      }
      /* sayfa sonundaysak son bölüm aktif */
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = sections[sections.length - 1]?.id ?? cur;
      setActive(cur);
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    /* yenilemede hash'e in */
    const h = window.location.hash.replace("#", "");
    if (h && sections.some((s) => s.id === h)) window.setTimeout(() => { document.getElementById(h)?.scrollIntoView({ block: "start" }); compute(); }, 50);
    return () => window.removeEventListener("scroll", compute);
  }, [sections]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav aria-label="Sayfa bölümleri" className="sticky top-[60px] z-30 -mx-5 mt-6 border-b border-line bg-paper/95 px-5 backdrop-blur-sm sm:top-[68px] sm:-mx-7 sm:px-7">
      <ul className="no-scrollbar -mb-px flex gap-0.5 overflow-x-auto">
        {sections.map((s) => (
          <li key={s.id} className="shrink-0">
            <a href={`#${s.id}`} onClick={go(s.id)} aria-current={active === s.id ? "location" : undefined}
              className={`block whitespace-nowrap border-b-2 px-3 py-3 text-[12px] font-bold uppercase tracking-[0.14em] transition-colors ${active === s.id ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
