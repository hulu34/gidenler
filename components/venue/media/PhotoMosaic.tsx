"use client";

import Link from "next/link";
import { useState } from "react";
import type { VenuePhoto } from "@/lib/types";
import { Lightbox } from "./Lightbox";
import { fromVenuePhotos, useGooglePhotos, type ViewPhoto } from "./photos";

/* ──────────────────────────────────────────────────────────────────────────
   KAPAK MOZAİĞİ — başlığın hemen altında: bir büyük kapak + dört küçük kare (Tabelog'un üst şeridi gibi).
   · Fotoğraf yoksa büyük boş alan YOK: tek satırlık ince şerit.
   · Google fotoğrafları sayfa açılışında yüklenmez (ücretli istek); "Google'daki fotoğrafları göster" ile gelir,
     her karede sahibi ve "Google Maps" atfı yazılır.
   · İlk kare yüksek öncelikle, diğerleri geç yüklenir; kareler sabit oranlı (sayfa kayması yok).
   ────────────────────────────────────────────────────────────────────────── */

function Tile({ p, i, onOpen, className, priority }: { p: ViewPhoto; i: number; onOpen: (i: number) => void; className?: string; priority?: boolean }) {
  return (
    <button type="button" onClick={() => onOpen(i)} aria-label={`Fotoğrafı büyüt: ${p.alt}`}
      className={`group relative block h-full w-full overflow-hidden bg-sheet ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} alt={p.alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async"
        referrerPolicy={p.source === "google" ? "no-referrer" : undefined}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-5 text-left text-[10.5px] text-white">
        {p.source === "google" ? <><span translate="no">Google Maps</span> · {p.author}</> : <>{p.author}{p.license ? ` · ${p.license}` : ""}</>}
      </span>
    </button>
  );
}

export function PhotoMosaic({ slug, name, photos, isReal }: { slug: string; name: string; photos?: VenuePhoto[]; isReal: boolean }) {
  const own = fromVenuePhotos(photos);
  const g = useGooglePhotos(slug, isReal);
  const all = [...own, ...g.photos];
  const [open, setOpen] = useState<number | null>(null);
  const galleryHref = `/mekan/${slug}/fotograflar/`;

  const googleButton = (label: string) => (
    <button type="button" onClick={() => g.load(5)} disabled={g.state === "loading"}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-ink px-4 text-[13px] font-semibold hover:bg-ink hover:text-paper disabled:opacity-60">
      {g.state === "loading" ? "Google'dan yükleniyor…" : label}
    </button>
  );

  /* fotoğraf yok: ince şerit */
  if (!all.length) {
    if (g.state === "check") return <div className="mt-5 h-[52px]" aria-hidden />;
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-line py-2.5">
        <p className="text-[13px] text-ink-2">
          <span aria-hidden className="mr-1.5">▦</span>Henüz Gidenler fotoğrafı yok.
          <span className="text-ink-3"> Fotoğraf yükleme yakında.</span>
        </p>
        {(g.state === "ready" || g.state === "loading") && (
          <span className="flex items-center gap-3">
            <span className="hidden text-[11.5px] text-ink-3 sm:inline">Google Maps&apos;ten canlı gelir, sahipleri yazılır</span>
            {googleButton("Google'daki fotoğrafları göster")}
          </span>
        )}
        {g.state === "limited" && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold underline underline-offset-4">Fotoğraflar Google Haritalar&apos;da ↗</a>}
      </div>
    );
  }

  const shown = all.slice(0, 5);
  const k = shown.length;
  /* masaüstü yerleşim: 1 → tam, 2 → yarı yarıya, 3–4 → büyük + yan, 5 → büyük + 2×2 */
  const span = (i: number) => {
    if (k === 1) return "col-span-4 row-span-2";
    if (k === 2) return "col-span-2 row-span-2";
    if (i === 0) return "col-span-2 row-span-2";
    if (k === 3) return "col-span-2 row-span-1";
    if (k === 4) return i === 1 ? "col-span-2 row-span-1" : "col-span-1 row-span-1";
    return "col-span-1 row-span-1";
  };
  const hasGoogle = g.photos.length > 0;

  return (
    <section aria-label={`${name} fotoğrafları`} className="mt-5">
      {/* mobil: kaydırmalı şerit */}
      <div className="-mx-5 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-5 sm:hidden">
        {all.map((p, i) => (
          <div key={p.src} className="relative aspect-[4/3] w-[86%] shrink-0 snap-center">
            <Tile p={p} i={i} onOpen={setOpen} priority={i === 0} />
          </div>
        ))}
        <Link href={galleryHref} className="flex aspect-[4/3] w-[40%] shrink-0 snap-center flex-col items-center justify-center gap-1 border border-line-2 text-[13px] font-semibold">
          <span className="text-[22px]" aria-hidden>▦</span>Tüm fotoğraflar
        </Link>
      </div>

      {/* masaüstü: mozaik */}
      <div className={`hidden grid-cols-4 grid-rows-2 gap-1.5 sm:grid ${k === 1 ? "h-[clamp(220px,32vw,380px)]" : "h-[clamp(260px,38vw,440px)]"}`}>
        {shown.map((p, i) => (
          <div key={p.src} className={`relative ${span(i)}`}>
            <Tile p={p} i={i} onOpen={setOpen} priority={i === 0} />
            {i === k - 1 && (
              <Link href={galleryHref} className="absolute bottom-3 right-3 rounded-full bg-paper/95 px-3.5 py-1.5 text-[12.5px] font-bold text-ink shadow hover:bg-paper">
                Tüm fotoğraflar{all.length > 1 || g.total ? ` (${Math.max(all.length, own.length + (g.total ?? 0))})` : ""}
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-ink-3">
        <span>
          {own.length > 0 && <>Fotoğraf sahipleri her karede yazılı. </>}
          {hasGoogle && <><span translate="no">Google Maps</span> fotoğrafları canlı gelir, Gidenler&apos;de saklanmaz.</>}
        </span>
        {!hasGoogle && (g.state === "ready" || g.state === "loading") && googleButton("Google'daki fotoğrafları da göster")}
      </div>

      {open !== null && <Lightbox photos={all} index={open} onIndex={setOpen} onClose={() => setOpen(null)} title={name} />}
    </section>
  );
}
