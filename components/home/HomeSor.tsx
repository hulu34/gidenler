"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/* ANA SAYFA · SOR GİDENLER — ilk ekranın merkezi. İkinci bir öneri motoru DEĞİLDİR:
   yazılan soru /sor/?q=… ile gerçek Sor Gidenler'e (Groq Beta, /api/sor) gider ve orada hemen yanıtlanır.
   JavaScript yoksa da çalışır: form GET ile aynı adrese gider. Soru adreste taşındığı için kaybolmaz. */
const ORNEKLER = [
  "Kadıköy'de sakin bir akşam yemeği",
  "Uygun fiyatlı, iyi bir esnaf lokantası",
  "Balık yiyebileceğimiz sakin bir yer",
  "Beyoğlu'nda meyhane",
];
const sorHref = (q: string) => `/sor/?q=${encodeURIComponent(q)}`;

/** Ana sayfa V8: kompakt Sor (tek satır). Aynı form, aynı /sor/?q=… — ikinci bir AI motoru yok, soru adreste korunur. */
export function HomeSorCompact() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [going, setGoing] = useState(false);
  const go = (text: string) => { const t = text.trim(); if (!t || going) return; setGoing(true); router.push(sorHref(t)); };
  return (
    <div id="sor" className="w-full scroll-mt-24" data-ana-sor-kompakt>
      <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-2">
        <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 text-accent-ink"><path fill="currentColor" d="M8 0l1.6 4.8L14.4 6 9.6 7.6 8 12.4 6.4 7.6 1.6 6l4.8-1.2zM13 10l.7 2.1 2.1.7-2.1.7L13 15.6l-.7-2.1-2.1-.7 2.1-.7z" /></svg>
        Sor Gidenler
        <span className="rounded-full border border-line-strong px-1.5 py-px text-[9px] tracking-[0.08em]">BETA</span>
        <span className="hidden font-semibold normal-case tracking-normal text-ink-3 sm:inline">· kendi cümlenle sor, kayıtlı mekânlardan gerekçeli öneri</span>
      </p>
      <form action="/sor/" method="get" data-ana-sor onSubmit={(e) => { e.preventDefault(); go(q); }}
        className="flex h-12 items-center gap-1.5 rounded-[12px] border border-line-strong bg-paper pl-3.5 pr-1.5 shadow-[0_10px_28px_-22px_rgba(0,0,0,0.45)] focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
        <label htmlFor="ana-sor" className="sr-only">Sor Gidenler&apos;e ne aradığını yaz</label>
        <input id="ana-sor" name="q" value={q} onChange={(e) => setQ(e.target.value)} required maxLength={600} enterKeyHint="send" autoComplete="off"
          placeholder="Ne, nerede, kimle? Ör. Kadıköy'de sakin bir akşam yemeği"
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3 sm:text-[15.5px]" />
        <button type="submit" disabled={!q.trim() || going} className="h-9 shrink-0 rounded-[9px] bg-ink px-4 text-[14px] font-bold text-paper transition-opacity disabled:opacity-35">
          {going ? "…" : "Sor"}
        </button>
      </form>
      <ul className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible" aria-label="Örnek sorular">
        {ORNEKLER.slice(0, 3).map((o) => (
          <li key={o} className="shrink-0">
            <Link href={sorHref(o)} data-ana-sor-ornek onClick={(e) => { e.preventDefault(); setQ(o); go(o); }}
              className="inline-flex h-8 items-center whitespace-nowrap rounded-full border border-line-2 px-3 text-[12.5px] font-semibold text-ink-2 hover:border-ink hover:text-ink">{o}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeSor() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [going, setGoing] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const go = (text: string) => {
    const t = text.trim();
    if (!t || going) return;
    setGoing(true);
    router.push(sorHref(t));
  };
  return (
    <div id="sor" className="w-full max-w-[720px] scroll-mt-24">
      <form
        ref={form}
        action="/sor/"
        method="get"
        data-ana-sor
        onSubmit={(e) => { e.preventDefault(); go(q); }}
        className="group relative flex items-end gap-2 rounded-[18px] border border-line-strong bg-paper p-2 shadow-[0_1px_0_rgba(0,0,0,0.04),0_18px_40px_-24px_rgba(0,0,0,0.35)] transition-shadow focus-within:shadow-[0_0_0_3px_var(--color-accent,currentColor),0_18px_40px_-24px_rgba(0,0,0,0.35)] sm:p-2.5"
      >
        <label htmlFor="ana-sor" className="sr-only">Sor Gidenler&apos;e ne aradığını yaz</label>
        <textarea
          id="ana-sor"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(q); } }}
          required
          maxLength={600}
          rows={2}
          enterKeyHint="send"
          autoComplete="off"
          placeholder="Ne yemek istiyorsun, nerede, kimle? Kendi cümlenle yaz…"
          className="min-h-[3.5rem] w-full flex-1 resize-none bg-transparent px-3 py-2.5 text-[17px] leading-snug outline-none placeholder:text-ink-3 sm:text-[19px]"
        />
        <button
          type="submit"
          disabled={!q.trim() || going}
          className="h-12 shrink-0 rounded-[12px] bg-ink px-5 text-[15px] font-bold text-paper transition-opacity disabled:opacity-35 sm:h-14 sm:px-7 sm:text-[16px]"
        >
          {going ? "Soruluyor…" : "Sor"}
        </button>
      </form>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Örnek sorular">
        {ORNEKLER.map((o) => (
          <li key={o}>
            <Link
              href={sorHref(o)}
              data-ana-sor-ornek
              onClick={(e) => { e.preventDefault(); setQ(o); go(o); }}
              className="inline-flex min-h-10 items-center rounded-full border border-line-2 bg-paper/80 px-3.5 text-[13.5px] font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink"
            >
              {o}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] leading-snug text-ink-3">
        <span className="mr-1.5 rounded-full border border-line-strong px-1.5 py-px text-[10px] font-bold tracking-[0.08em] text-ink-2">BETA</span>
        Yalnız Gidenler&apos;de kayıtlı mekânlardan, kayıtlı bilgilerle önerir; bilmediğini söyler. Yanılabilir, gitmeden profili kontrol et.
      </p>
    </div>
  );
}
