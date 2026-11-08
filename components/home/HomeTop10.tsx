"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GBadge } from "@/components/home/GBadge";
import { GoogleMapsLogo } from "@/components/venue/media/GoogleAttribution";
import { HOME_LIST } from "@/lib/homeConfig";
import type { GCategory } from "@/lib/homeRank";

/* EN İYİLER · TOP 10 (ana sayfa V8) — demodaki kompakt sıralama satırı, gerçek Google puanıyla.
   Kategori seçimi gerçek kayıt türlerinden gelir (sunucuda hazır; sekme değişince istek gitmez).
   Sıra yalnız Google puanıdır; değerlendirme sayısı doğrulanamadığından başlangıç sıralaması olarak etiketlenir. */
const STORE = "gidenler.enIyiler";
const day = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });

export function HomeTop10({ cats, total, newest }: { cats: GCategory[]; total: number; newest: string | null }) {
  const [key, setKey] = useState(cats[0]?.key ?? "");
  const [open, setOpen] = useState(false);
  useEffect(() => { try { const k = window.localStorage.getItem(STORE); if (k && cats.some((c) => c.key === k)) setKey(k); } catch { /* yok say */ } }, [cats]);
  const choose = (k: string) => { setKey(k); setOpen(false); try { window.localStorage.setItem(STORE, k); } catch { /* yok say */ } };
  const c = cats.find((x) => x.key === key) ?? cats[0];
  if (!c) return null;
  return (
    <section aria-labelledby="h-eniyiler" data-siralama data-ana-siralama className="flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t-2 border-line-strong pt-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-ink-3">En iyiler · Top {HOME_LIST.size}</p>
          <h2 id="h-eniyiler" className="mt-1 text-[clamp(1.5rem,3.2vw,2.25rem)] font-extrabold leading-[1.02] tracking-[-0.04em]">
            {c.key === "hepsi" ? "İstanbul'un en yüksek puanlıları" : c.label}
            <span className="font-[family-name:var(--font-brand)] font-normal italic tracking-[-0.01em] text-accent-ink"> · Google puanına göre</span>
          </h2>
        </div>
        <p className="tnum text-[12px] text-ink-3">{total} mekânda doğrulanmış Google puanı{newest ? ` · son kontrol ${day(newest)}` : ""}</p>
      </div>

      <div role="tablist" aria-label="Kategori" className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {cats.map((x) => (
          <button key={x.key} role="tab" type="button" aria-selected={x.key === c.key} onClick={() => choose(x.key)} data-kategori={x.key}
            className={`h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${x.key === c.key ? "border-ink bg-ink text-paper" : "border-line-2 text-ink-2 hover:border-ink hover:text-ink"}`}>
            {x.label} <span className={`tnum ${x.key === c.key ? "text-paper/70" : "text-ink-3"}`}>{x.pool}</span>
          </button>
        ))}
      </div>

      <ol data-top10={c.key} className="mt-3 grid grid-cols-1 md:grid-flow-col md:grid-cols-2 md:grid-rows-5 md:gap-x-10">
        {c.items.map((r, i) => (
          <li key={r.slug} className={`border-b border-line ${i >= HOME_LIST.mobileCollapsed && !open ? "hidden md:block" : ""}`} data-top10-satir={r.slug}>
            <Link href={`/mekan/${r.slug}/`} className="group grid grid-cols-[2.4rem_minmax(0,1fr)_auto] items-center gap-x-3 py-3 transition-colors hover:bg-sheet sm:-mx-2 sm:px-2">
              <span className={`tnum font-[family-name:var(--font-brand)] leading-none ${i < 3 ? "text-[30px] text-ink" : "text-[26px] text-ink-3"}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[16.5px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink">{r.name}</span>
                <span className="truncate text-[12px] text-ink-3">{[r.kind && r.kind !== "Restoran" ? r.kind : "", r.district].filter(Boolean).join(" · ")}</span>
              </span>
              <GBadge rating={r.rating} count={r.count} size="md" />
            </Link>
          </li>
        ))}
      </ol>
      {c.items.length > HOME_LIST.mobileCollapsed && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-1 h-11 self-start text-[13px] font-bold underline decoration-line-2 underline-offset-4 md:hidden">
          {open ? "Daha az göster" : `Tümünü gör · ${c.items.length}`}
        </button>
      )}
      {c.items.length < HOME_LIST.size && (
        <p className="mt-2 text-[12.5px] text-ink-3" data-top10-az>Bu kategoride doğrulanmış Google puanı olan {c.pool} mekân var; listeyi doldurmak için başka türden mekân eklenmez.</p>
      )}
      <p className="mt-3 flex max-w-[110ch] flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] leading-relaxed text-ink-3">
        <GoogleMapsLogo />
        <span>
          <b className="font-semibold text-ink-2">Başlangıç sıralaması:</b> yalnız doğrulanmış Google puanına (5 üzerinden) göre. Değerlendirme sayısı henüz doğrulanamadığı için
          az değerlendirmeli işletmeler üst sıraya çıkabilir; eşit puanda daha yeni doğrulanan önce, sonra ada göre. Gidenler puanı değildir — o, yalnız gerçek Gidenler deneyimlerinden 10 üzerinden çıkar.
          Kapalı, yanlış şubeye ya da türe eşleşmiş ve doğrulanmamış kayıtlar listeye girmez.
        </span>
      </p>
    </section>
  );
}
