"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CAT_LABEL, SOURCE_LABEL, type ViewPhoto } from "./photos";
import { GoogleMapsLogo } from "./GoogleAttribution";
import { PhotoReport } from "./PhotoReport";

/* ──────────────────────────────────────────────────────────────────────────
   TAM EKRAN FOTOĞRAF GÖRÜNTÜLEYİCİ
   · Masaüstü: ← → ile gez, Esc kapat. Mobil: yana kaydır, aşağı çek ya da × ile kapat.
   · Tarayıcının geri tuşu görüntüleyiciyi kapatır, sayfadan çıkarmaz (geçmişe bir adım eklenir).
   · Her fotoğrafta kaynak ve sahibi her zaman görünür; Google fotoğrafında "Google Maps" atfı ve sahibin
     Google profili bağlantısı. Komşu fotoğraflar önceden yüklenir.
   ────────────────────────────────────────────────────────────────────────── */

export function Lightbox({ photos, index, onIndex, onClose, title }: {
  photos: ViewPhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void; title: string;
}) {
  const p = photos[index];
  const n = photos.length;
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);

  /* geri tuşu = kapat (geçmişe yalnız açılışta bir adım eklenir) */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    history.pushState({ gidenlerLightbox: true }, "");
    const onPop = () => onCloseRef.current();
    window.addEventListener("popstate", onPop);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => { window.removeEventListener("popstate", onPop); document.body.style.overflow = prev; opener?.focus?.(); };
  }, []);
  const close = useCallback(() => { if (history.state?.gidenlerLightbox) history.back(); else onCloseRef.current(); }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [go, close]);

  /* komşuları önceden yükle */
  useEffect(() => {
    for (const d of [1, -1]) { const q = photos[(index + d + n) % n]; if (q) { const im = new Image(); im.src = q.full ?? q.src; } }
  }, [index, n, photos]);

  if (!p) return null;
  const onDown = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; };
  const onMove = (e: React.PointerEvent) => { if (start.current) { setDx(e.clientX - start.current.x); setDy(Math.max(0, e.clientY - start.current.y)); } };
  const onUp = () => {
    if (Math.abs(dx) > 60 && Math.abs(dx) > dy) go(dx < 0 ? 1 : -1);
    else if (dy > 110) close();
    start.current = null; setDx(0); setDy(0);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${title} fotoğrafları`} className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
      style={{ opacity: 1 - Math.min(dy / 400, 0.5) }}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
        <span className="tnum font-semibold">{index + 1} / {n}</span>
        <span className="truncate text-white/70">{title}{p.source === "google" ? "" : ` · ${CAT_LABEL[p.category]}`}</span>
        <button ref={closeRef} type="button" onClick={close} aria-label="Kapat (Esc)"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[20px] hover:bg-white/20">×</button>
      </div>

      <div className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={p.src} src={p.full ?? p.src} alt={p.alt} draggable={false} referrerPolicy={p.source === "google" ? "no-referrer" : undefined}
          className="max-h-full max-w-full object-contain transition-transform duration-75" style={{ transform: `translate(${dx}px, ${dy}px)` }} />
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Önceki fotoğraf (←)"
              className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-[22px] hover:bg-white/25 sm:flex">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Sonraki fotoğraf (→)"
              className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-[22px] hover:bg-white/25 sm:flex">›</button>
          </>
        )}
      </div>

      {/* KAYNAK — her fotoğrafta, her zaman */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 px-4 py-3 text-[12.5px]">
        {p.authorPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.authorPhoto} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
        )}
        <span>
          Fotoğraf:{" "}
          {p.authorUri ? <a href={p.authorUri} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">{p.author}</a>
            : <span className="font-semibold">{p.author ?? "—"}</span>}
        </span>
        {p.source === "google"
          ? <span className="px-2.5 pb-[5px] pt-2.5"><GoogleMapsLogo tone="white" /></span>
          : <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">{SOURCE_LABEL[p.source]}</span>}
        {p.license && <span className="text-white/70">{p.license}</span>}
        {p.sourceUrl && <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-white/80 underline underline-offset-2">{p.source === "google" ? "Google Haritalar'da gör ↗" : "Kaynağında aç ↗"}</a>}
        {p.mediaId && <PhotoReport key={p.mediaId} id={p.mediaId} />}
        {p.flagUri && <a href={p.flagUri} target="_blank" rel="noopener noreferrer" className="text-white/60 underline underline-offset-2">Bildir</a>}
        {p.source === "google" && <span className="text-white/60">Google'dan canlı gelir, Gidenler'de saklanmaz.</span>}
      </div>

      {n > 1 && (
        <ul className="flex gap-1.5 overflow-x-auto px-4 pb-4" aria-label="Küçük resimler">
          {photos.map((q, i) => (
            <li key={q.src} className="shrink-0">
              <button type="button" onClick={() => onIndex(i)} aria-label={`Fotoğraf ${i + 1}`} aria-current={i === index}
                className={`block h-12 w-16 overflow-hidden border-2 ${i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.src} alt="" loading="lazy" referrerPolicy={q.source === "google" ? "no-referrer" : undefined} className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>,
    document.body,
  );
}
