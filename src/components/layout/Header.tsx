"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { quickSearch } from "@/lib/api";
import { score1 } from "@/lib/format";
import { DemoIndicator } from "@/components/demo/DemoBoot";

export function Header() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = q.trim().length >= 2 ? quickSearch(q) : [];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => setActive(0), [q]);

  function go(slug: string) {
    setOpen(false);
    setQ("");
    router.push(`/mekan/${slug}/`);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active].entity.slug);
      else if (q.trim()) {
        setOpen(false);
        const natural = q.trim().split(/\s+/).length >= 3 || /\?/.test(q);
        router.push(natural ? `/sor/?q=${encodeURIComponent(q.trim())}` : `/ara/?q=${encodeURIComponent(q.trim())}`);
      }
    } else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[60px] max-w-[1180px] items-center gap-4 px-5 sm:h-[68px] sm:gap-7 sm:px-7">
        <Link
          href="/"
          className="shrink-0 font-[family-name:var(--font-brand)] text-[26px] leading-none tracking-tight sm:text-[30px]"
        >
          gidenler<span className="text-accent-ink">.</span>
        </Link>

        <div ref={boxRef} className="relative min-w-0 flex-1 sm:max-w-[420px]">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
            type="search"
            placeholder="Nereye?"
            aria-label="Mekân, kategori veya semt ara"
            autoComplete="off"
            className="h-9 w-full border-b-2 border-line-2 bg-transparent pb-1 text-[15px] outline-none placeholder:text-ink-3 focus:border-accent"
          />

          {open && q.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-11 z-50 border-2 border-line-strong bg-sheet shadow-[var(--shadow-1)]">
              {results.length > 0 ? (
                <ul role="listbox">
                  {results.map((r, i) => (
                    <li key={r.entity.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r.entity.slug)}
                        className={`flex w-full items-baseline justify-between gap-4 border-b border-line px-4 py-2.5 text-left last:border-b-0 ${
                          i === active ? "bg-sunk" : ""
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold">
                            {r.entity.name}
                          </span>
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                            {r.category.label}
                            {r.entity.location?.district ? ` · ${r.entity.location.district}` : ""}
                          </span>
                        </span>
                        {r.score !== null && (
                          <span className="tnum shrink-0 text-[17px] font-bold">{score1(r.score)}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-[13px] text-ink-3">
                  Mekân eşleşmesi yok. Enter&apos;a basarsan bunu bir soru olarak Sor Gidenler&apos;e iletirim.
                </p>
              )}
            </div>
          )}
        </div>

        <nav className="ml-auto flex shrink-0 items-center gap-5">
          <DemoIndicator />
          <Link
            href="/sor/"
            className="hidden text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3 hover:text-ink sm:block"
          >
            Sor
          </Link>
          <Link
            href="/ara/"
            className="hidden text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3 hover:text-ink sm:block"
          >
            Keşfet
          </Link>
          <Link
            href="/benim/"
            className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3 hover:text-ink"
          >
            Benim
          </Link>
          <button
            type="button"
            className="border-b-2 border-accent pb-0.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink"
          >
            Deneyim yaz
          </button>
        </nav>
      </div>
    </header>
  );
}
