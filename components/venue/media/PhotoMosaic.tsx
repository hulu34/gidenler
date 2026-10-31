"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { VenuePhoto } from "@/lib/types";
import { Lightbox } from "./Lightbox";
import { fromVenuePhotos, responsive, type ViewPhoto } from "./photos";
import { useGoogleCover } from "./googleView";
import { GoogleMapsText } from "./GoogleAttribution";

/* ──────────────────────────────────────────────────────────────────────────
   KAPAK MOZAİĞİ — başlığın hemen altında: bir büyük kapak + dört küçük kare (Tabelog'un üst şeridi gibi).
   · Fotoğraf yoksa büyük boş alan YOK: tek satırlık ince şerit ve Google Haritalar bağlantısı (ücretsiz).
   · Kendi kapağı olmayan, Google izni olan restoranda sayfa açılınca TEK kapak gelir; diğerleri yalnız galeride. Sahibi ve "Google Maps" atfı yazılır.
   · Google sınırı/hatası: yalnız Gidenler fotoğrafları ya da ince şerit — sayfa bozulmaz.
   · İlk kare yüksek öncelikle, diğerleri geç yüklenir; kareler sabit oranlı (sayfa kayması yok).
   ────────────────────────────────────────────────────────────────────────── */

function Tile({ p, i, onOpen, className, priority, sizes = "(max-width: 640px) 86vw, 25vw" }: { p: ViewPhoto; i: number; onOpen: (i: number) => void; className?: string; priority?: boolean; sizes?: string }) {
  return (
    <button type="button" onClick={() => onOpen(i)} aria-label={`Fotoğrafı büyüt: ${p.alt}`}
      className={`group relative block h-full w-full overflow-hidden bg-sheet ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} {...responsive(p, sizes)} alt={p.alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async"
        referrerPolicy={p.source === "google" ? "no-referrer" : undefined}
        style={p.focus ? { objectPosition: p.focus } : undefined} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-baseline gap-1.5 truncate bg-gradient-to-t from-black/75 to-transparent px-2 pb-1 pt-6 text-left text-[11px] text-white">
        {p.source === "google" ? <><GoogleMapsText tone="white" /><span className="truncate opacity-90">· {p.author}</span></> : <>{p.author}{p.license ? ` · ${p.license}` : ""}</>}
      </span>
    </button>
  );
}

export function PhotoMosaic({ slug, name, photos, google, mapsUrl }: { slug: string; name: string; photos?: VenuePhoto[]; google: boolean; mapsUrl?: string }) {
  const own = fromVenuePhotos(photos);
  /* Kendi kapağı olan mekânda Google fotoğrafı istenmez: düğme de çağrı da yok (galeride isteğe bağlı) */
  const { state: g, request } = useGoogleCover(slug, google && !own.length);
  const gPhotos = g.k === "ok" ? g.photos : [];
  useEffect(() => { if (g.k === "idle") request(); }, [g.k, request]);
  const all = [...own, ...gPhotos];
  const [open, setOpen] = useState<number | null>(null);
  const galleryHref = `/mekan/${slug}/fotograflar/`;
  const total = own.length + (g.k === "ok" ? g.total : 0);

  /* Google kapağı yükleniyor: tek karenin yeri ayrılır (sayfa kayması yok) */
  if ((g.k === "loading" || g.k === "idle") && !own.length) {
    return (
      <section aria-label={`${name} fotoğrafları yükleniyor`} aria-busy="true" className="mt-5">
        <div className="-mx-5 flex px-5 sm:mx-0 sm:h-[clamp(260px,38vw,440px)] sm:px-0"><div className="aspect-[4/3] w-full animate-pulse bg-sheet sm:aspect-auto" /></div>
      </section>
    );
  }

  const toMaps = mapsUrl ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] font-bold underline underline-offset-2 hover:text-accent-ink">Fotoğrafları Google Haritalar&apos;da gör ↗</a> : null;

  /* fotoğraf yok: ince şerit; boş mozaik ya da yer tutucu görsel yok */
  if (!all.length) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-line py-2.5">
        <p className="text-[13px] text-ink-2">
          <span aria-hidden className="mr-1.5">▦</span>{g.k === "limited" ? "Google fotoğrafları şu an gösterilemiyor." : "Henüz Gidenler fotoğrafı yok."}
        </p>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">{toMaps}</span>
      </div>
    );
  }

  const shown = all.slice(0, 5);
  const k = shown.length;
  /* masaüstü yerleşim: 1 → tam, 2 → yarı yarıya, 3–4 → büyük + yan, 5 → büyük + 2×2 */
  /* Tailwind sınıfları derlemede taranır: önekli sınıflar düz metin olarak yazılır */
  const span = (i: number) => {
    if (k === 1) return "sm:col-span-4 sm:row-span-2";
    if (k === 2) return "sm:col-span-2 sm:row-span-2";
    if (i === 0) return "sm:col-span-2 sm:row-span-2";
    if (k === 3) return "sm:col-span-2 sm:row-span-1";
    if (k === 4) return i === 1 ? "sm:col-span-2 sm:row-span-1" : "sm:col-span-1 sm:row-span-1";
    return "sm:col-span-1 sm:row-span-1";
  };
  const hasGoogle = gPhotos.length > 0;

  return (
    <section aria-label={`${name} fotoğrafları`} className="mt-5">
      {/* TEK yapı: mobilde kaydırmalı şerit, masaüstünde mozaik (aynı <img>; gizli ikinci kopya indirilmez) */}
      <div className={`-mx-5 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-4 sm:grid-rows-2 sm:overflow-visible sm:px-0 ${k === 1 && !google ? "sm:h-[clamp(220px,32vw,380px)]" : "sm:h-[clamp(260px,38vw,440px)]"}`}>
        {all.map((p, i) => (
          <div key={p.src} className={`relative aspect-[4/3] w-[86%] shrink-0 snap-center sm:aspect-auto sm:w-auto ${i < 5 ? span(i) : "sm:hidden"}`}>
            {/* mobilde kapak 500 px sürümünden (LCP); masaüstünde kareye göre */}
            <Tile p={p} i={i} onOpen={setOpen} priority={i === 0} sizes={`(max-width: 640px) 60vw, ${i === 0 || k <= 2 ? (k === 1 ? "1180px" : "590px") : "295px"}`} />
            {i === k - 1 && (
              <Link href={galleryHref} className="absolute right-3 top-3 hidden rounded-full bg-paper/95 px-3.5 py-1.5 text-[12.5px] font-bold text-ink shadow hover:bg-paper sm:inline-block">
                Tüm fotoğraflar{total > 1 ? ` (${Math.max(all.length, total)})` : ""}
              </Link>
            )}
          </div>
        ))}
        <Link href={galleryHref} className="flex aspect-[4/3] w-[40%] shrink-0 snap-center flex-col items-center justify-center gap-1 border border-line-2 text-[13px] font-semibold sm:hidden">
          <span className="text-[22px]" aria-hidden>▦</span>Tüm fotoğraflar
        </Link>
      </div>

      {/* atıf satırı: yüklenirken ve sonra aynı yükseklik (sayfa kayması yok) */}
      <div className={`mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-ink-3 ${hasGoogle ? "min-h-[34px] sm:min-h-[18px]" : ""}`}>
        <span>
          {own.length > 0 && <>Fotoğraf sahipleri her karede yazılı. </>}
          {hasGoogle && <>Google fotoğrafları sahiplerine aittir; büyütünce sahibi ve Google Haritalar bağlantısı görünür.</>}
        </span>
      </div>

      {open !== null && <Lightbox photos={all} index={open} onIndex={setOpen} onClose={() => setOpen(null)} title={name} />}
    </section>
  );
}
