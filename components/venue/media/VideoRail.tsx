"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { embedUrl, PLATFORM_LABEL, thumbUrl, type VideoPlatform } from "@/lib/media/embed";

/* ──────────────────────────────────────────────────────────────────────────
   VİDEOLAR — YouTube Shorts · Instagram Reels · TikTok, Gidenler'den çıkmadan.
   · Yalnız resmî gömülü oynatıcılar; video bizim sunucumuzda barındırılmaz.
   · Sayfa açılışında hiçbir platforma istek yok: kartlar yalnız kapak (YouTube) ya da marka kartı.
     Oynatıcı yalnız tıklanınca ve yalnız AKTİF video için yüklenir.
   · Mobil: tam ekran dikey oynatıcı; yukarı/aşağı kaydır ya da düğmelerle sonraki/önceki.
     Kapatınca (×, Esc, geri tuşu) restoran sayfasında, aynı yerde kalırsın.
   · Video yoksa bölüm hiç çizilmez.
   ────────────────────────────────────────────────────────────────────────── */

export interface RailVideo { id: string; platform: VideoPlatform; externalId: string; url: string; credit: string | null }
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const vertical = (v: RailVideo) => v.platform !== "youtube" || v.url.includes("/shorts/");
const MARK: Record<VideoPlatform, string> = { youtube: "▶", instagram: "◎", tiktok: "♪" };

function Card({ v, onOpen }: { v: RailVideo; onOpen: () => void }) {
  const t = thumbUrl(v.platform, v.externalId);
  return (
    <button type="button" onClick={onOpen} aria-label={`${PLATFORM_LABEL[v.platform]} videosunu burada oynat${v.credit ? ` — ${v.credit}` : ""}`}
      className="group relative aspect-[9/16] w-[150px] shrink-0 snap-start overflow-hidden bg-ink text-left text-paper sm:w-[170px]">
      {t ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-100" />
      ) : (
        <span aria-hidden className={`absolute inset-0 ${v.platform === "instagram" ? "bg-[linear-gradient(160deg,#4f5bd5,#962fbf_45%,#d62976_75%,#fa7e1e)]" : "bg-[linear-gradient(160deg,#111,#25f4ee_160%)]"}`} />
      )}
      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] font-semibold" translate="no">{PLATFORM_LABEL[v.platform]}</span>
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper/90 text-[18px] text-ink shadow-lg transition-transform group-hover:scale-110">{MARK[v.platform]}</span>
      </span>
      {v.credit && <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-[11px] font-semibold">{v.credit}</span>}
    </button>
  );
}

function Viewer({ list, index, onIndex, onClose, name }: { list: RailVideo[]; index: number; onIndex: (i: number) => void; onClose: () => void; name: string }) {
  const v = list[index];
  const n = list.length;
  const go = useCallback((d: number) => onIndex(Math.min(n - 1, Math.max(0, index + d))), [index, n, onIndex]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const start = useRef<number | null>(null);

  useEffect(() => {
    history.pushState({ gidenlerVideo: true }, "");
    const onPop = () => onCloseRef.current();
    window.addEventListener("popstate", onPop);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => { window.removeEventListener("popstate", onPop); document.body.style.overflow = prev; opener?.focus?.(); };
  }, []);
  const close = useCallback(() => { if (history.state?.gidenlerVideo) history.back(); else onCloseRef.current(); }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [go, close]);

  /* iframe dokunuşları yutar: kaydırma, oynatıcının üst/alt şeritlerinde ve yanlarında çalışır */
  const swipe = {
    onPointerDown: (e: React.PointerEvent) => { start.current = e.clientY; },
    onPointerUp: (e: React.PointerEvent) => { if (start.current !== null) { const d = e.clientY - start.current; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1); } start.current = null; },
  };
  const tall = vertical(v);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${name} videoları`} className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-2.5 text-[13px]" {...swipe}>
        <span className="tnum font-semibold">{index + 1} / {n}</span>
        <span className="min-w-0 truncate text-white/75"><span translate="no">{PLATFORM_LABEL[v.platform]}</span>{v.credit ? ` · ${v.credit}` : ""}</span>
        <button ref={closeRef} type="button" onClick={close} aria-label="Kapat ve restorana dön"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[20px] hover:bg-white/20">×</button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2" {...swipe}>
        <div className={`relative overflow-hidden bg-black ${tall ? "aspect-[9/16] h-full max-h-full max-w-full" : "aspect-video w-full max-w-[960px]"}`}>
          {/* yalnız aktif video yüklenir; key ile geçişte eski oynatıcı tamamen kaldırılır */}
          <iframe key={v.id} src={embedUrl(v.platform, v.externalId)} title={`${PLATFORM_LABEL[v.platform]} videosu${v.credit ? ` — ${v.credit}` : ""}`}
            className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write" allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin" loading="eager" />
        </div>
        {n > 1 && (
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-2">
            <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Önceki video" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-[18px] hover:bg-white/30 disabled:opacity-30">↑</button>
            <button type="button" onClick={() => go(1)} disabled={index === n - 1} aria-label="Sonraki video" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-[18px] hover:bg-white/30 disabled:opacity-30">↓</button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[12px] text-white/75" {...swipe}>
        <span>Resmî <span translate="no">{PLATFORM_LABEL[v.platform]}</span> oynatıcısı · içerik sahibine aittir</span>
        <a href={v.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline underline-offset-2"><span translate="no">{PLATFORM_LABEL[v.platform]}</span>&apos;da aç ↗</a>
      </div>
    </div>,
    document.body,
  );
}

export function VideoRail({ slug, name, initial = [] }: { slug: string; name: string; initial?: RailVideo[] }) {
  const [list, setList] = useState<RailVideo[]>(initial);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${BASE}/api/media/${encodeURIComponent(slug)}/`).then((r) => r.json())
      .then((j) => { if (alive && Array.isArray(j?.videos)) setList((x) => [...j.videos, ...x.filter((v) => !j.videos.some((w: RailVideo) => w.url === v.url))]); })
      .catch(() => {});
    return () => { alive = false; };
  }, [slug]);
  if (!list.length) return null;
  return (
    <section id="videolar" aria-labelledby="h-videolar" className="scroll-mt-28 mt-10 sm:scroll-mt-32">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
        <h2 id="h-videolar" className="text-[13px] font-bold uppercase tracking-[0.2em]">Videolar <span className="tnum font-semibold text-ink-3">{list.length}</span></h2>
        <p className="max-w-[56ch] text-[12px] text-ink-3">Shorts, Reels ve TikTok videoları burada, resmî oynatıcılarla oynar. Videolar içerik sahiplerine aittir.</p>
      </div>
      <div className="-mx-5 mt-4 flex snap-x gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
        {list.map((v, i) => <Card key={v.id} v={v} onOpen={() => setOpen(i)} />)}
      </div>
      {open !== null && <Viewer list={list} index={open} onIndex={setOpen} onClose={() => setOpen(null)} name={name} />}
    </section>
  );
}
