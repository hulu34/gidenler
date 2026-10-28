"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VenuePhoto } from "@/lib/types";
import { Lightbox } from "./Lightbox";
import { CAT_LABEL, fromVenuePhotos, responsive, SOURCE_LABEL, type PhotoCat, type ViewPhoto } from "./photos";
import { loadMoreGooglePhotos, useGoogleView, type GRef } from "./googleView";
import { GoogleMapsText } from "./GoogleAttribution";

/* ──────────────────────────────────────────────────────────────────────────
   FOTOĞRAFLAR SAYFASI — Tabelog'un kategorili fotoğraf sekmeleri, Gidenler'e göre:
   · Sekmeler: Tümü · Yemekler · İç mekân · Dış cephe · Menü · Diğer · Google. Boş sekmeler de görünür (0).
   · Google ile doğrulanmış restoranda Google fotoğrafları kendiliğinden gelir (düğme yok); sayfa sonuna
     yaklaşıldıkça kalanlar 5'er yüklenir (yalnız Photo isteği). Kaynak her karede yazılı.
   · Her karede kaynak + sahip; tıklayınca tam ekran görüntüleyici.
   ────────────────────────────────────────────────────────────────────────── */

type Tab = "all" | PhotoCat | "google";
const CATS: PhotoCat[] = ["yemek", "icecek", "ic", "dis", "menu", "diger"];

export function PhotoGalleryFull({ slug, name, photos, google }: { slug: string; name: string; photos?: VenuePhoto[]; google: boolean }) {
  const own = useMemo(() => fromVenuePhotos(photos), [photos]);
  const g = useGoogleView(slug, google);
  const [extra, setExtra] = useState<ViewPhoto[]>([]);
  const [refs, setRefs] = useState<GRef[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [stopped, setStopped] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<number | null>(null);
  const gPhotos = g.k === "ok" ? [...g.v.photos, ...extra] : [];
  const left = refs ?? (g.k === "ok" ? g.v.refs : []);

  /* kalan Google fotoğrafları: sayfa sonuna yaklaşınca, 5'er (düğmesiz) */
  useEffect(() => {
    const el = sentinel.current;
    if (!el || g.k !== "ok" || !left.length || busy || stopped) return;
    const io = new IntersectionObserver(async (es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect(); setBusy(true);
      const got = await loadMoreGooglePhotos(slug, left.slice(0, 5));
      if (got && got.length) { setExtra((x) => [...x, ...got]); setRefs(left.slice(5)); } else setStopped(true);
      setBusy(false);
    }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [g.k, left, busy, stopped, slug]);

  const shown: ViewPhoto[] = tab === "all" ? [...own, ...gPhotos] : tab === "google" ? gPhotos : own.filter((p) => p.category === tab);
  const count = (t: Tab) => (t === "all" ? own.length + (g.k === "ok" ? g.v.total : 0) : t === "google" ? (g.k === "ok" ? g.v.total : 0) : own.filter((p) => p.category === t).length);
  const tabs: Tab[] = ["all", ...CATS, ...(g.k === "ok" && g.v.total ? (["google"] as Tab[]) : [])];

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Fotoğraf türü" className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${tab === t ? "border-ink bg-ink text-paper" : "border-line-2 text-ink-2 hover:border-ink"}`}>
            {t === "all" ? "Tümü" : t === "google" ? <span translate="no">Google</span> : CAT_LABEL[t]} <span className="tnum opacity-60">{count(t)}</span>
          </button>
        ))}
      </div>

      {shown.length > 0 ? (
        <ul className="columns-2 gap-2 sm:columns-3 lg:columns-4 [&>li]:mb-2">
          {shown.map((p, i) => (
            <li key={p.src} className="break-inside-avoid">
              <button type="button" onClick={() => setOpen(i)} className="group relative block w-full overflow-hidden bg-sheet" aria-label={`Fotoğrafı büyüt: ${p.alt}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} {...responsive(p, "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 295px")} alt={p.alt} loading={i < 4 ? "eager" : "lazy"} decoding="async" referrerPolicy={p.source === "google" ? "no-referrer" : undefined}
                  style={{ aspectRatio: p.w && p.h ? `${p.w} / ${p.h}` : "4 / 3" }} className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6 text-left text-[10.5px] leading-tight text-white">
                  <span className="truncate font-semibold">{p.author ?? "—"}</span>
                  {p.source === "google" ? <GoogleMapsText tone="white" /> : <span className="truncate opacity-80">{SOURCE_LABEL[p.source]}{p.license ? ` · ${p.license}` : ""}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : tab !== "google" ? (
        <div className="border border-dashed border-line-2 p-6 text-[14px] text-ink-2">
          {tab === "all" ? "Bu mekânın henüz Gidenler fotoğrafı yok." : `“${CAT_LABEL[tab as PhotoCat]}” için henüz fotoğraf yok.`}
          <span className="text-ink-3"> Kullanıcıların fotoğraf yüklemesi yakında açılacak; başka sitelerden kopyalanmış görsel kullanmıyoruz.</span>
        </div>
      ) : null}

      {google && g.k === "loading" && (
        <div className="columns-2 gap-2 sm:columns-3 lg:columns-4 [&>div]:mb-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[4/3] animate-pulse bg-sheet" />)}</div>
      )}
      <div ref={sentinel} aria-hidden className="h-px" />
      {busy && <p className="text-[12.5px] text-ink-3">Google fotoğrafları yükleniyor…</p>}
      {gPhotos.length > 0 && (
        <p className="max-w-[70ch] border-t border-line pt-4 text-[12.5px] text-ink-3">
          Google fotoğrafları Google kullanıcılarına aittir; Google&apos;dan canlı gelir, Gidenler&apos;de saklanmaz.
          Her fotoğrafta sahibi ve Google profili bağlantısı yazılıdır. Google bir mekân için en çok 10 fotoğraf sunar.
        </p>
      )}

      {open !== null && <Lightbox photos={shown} index={open} onIndex={setOpen} onClose={() => setOpen(null)} title={name} />}
    </div>
  );
}
