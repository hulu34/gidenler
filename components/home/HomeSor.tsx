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
  "Beşiktaş'ta kahvaltı",
];
const sorHref = (q: string) => `/sor/?q=${encodeURIComponent(q)}`;

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
