"use client";

import { useState } from "react";
import { embedUrl, thumbUrl } from "@/lib/media/embed";

/* Seçki yazısındaki videolar: profildeki VideoRail ile aynı kurallar — yalnız resmî YouTube gömme oynatıcısı
   (youtube-nocookie), sayfa açılışında oynatıcı yüklenmez; kart tıklanınca o video, restoranın göründüğü
   saniyeden açılır. Video Gidenler sunucusunda barındırılmaz. */

export interface SeckiVideo {
  youtubeId: string; channel: string; handle: string; title: string; date: string; start: number;
  label: string; disclosure: string; note: string;
}

export function SeckiVideos({ videos, lang }: { videos: SeckiVideo[]; lang: "tr" | "en" }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {videos.map((v) => {
        const playing = open === v.youtubeId;
        const mm = `${Math.floor(v.start / 60)}:${String(v.start % 60).padStart(2, "0")}`;
        return (
          <li key={v.youtubeId} className="flex flex-col gap-2" data-video={v.youtubeId}>
            <div className="relative aspect-video overflow-hidden bg-ink">
              {playing ? (
                <iframe
                  src={`${embedUrl("youtube", v.youtubeId)}${v.start ? `&start=${v.start}` : ""}`}
                  title={v.title}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <button type="button" onClick={() => setOpen(v.youtubeId)}
                  aria-label={lang === "tr" ? `Videoyu burada oynat: ${v.channel}` : `Play the video here: ${v.channel}`}
                  className="group absolute inset-0 text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbUrl("youtube", v.youtubeId) ?? ""} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-100" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper/90 text-[18px] text-ink shadow-lg transition-transform group-hover:scale-110">▶</span>
                  </span>
                  <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10.5px] font-semibold text-paper" translate="no">YouTube</span>
                  {v.start > 0 && <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-0.5 text-[10.5px] font-semibold text-paper">{lang === "tr" ? `${mm}'dan itibaren` : `from ${mm}`}</span>}
                </button>
              )}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">{v.label} · {v.date}</p>
            <p className="text-[15px] font-extrabold leading-snug">{v.channel} <span className="font-semibold text-ink-3">{v.handle}</span></p>
            <p className="text-[13px] leading-snug text-ink-2" translate="no">{v.title}</p>
            <p className="text-[13px] leading-snug text-ink-2">{v.note}</p>
            <p className="text-[12px] leading-snug text-ink-3">{v.disclosure}</p>
            <a href={`https://www.youtube.com/watch?v=${v.youtubeId}${v.start ? `&t=${v.start}s` : ""}`} rel="noopener noreferrer" target="_blank" className="self-start text-[12px] font-bold underline underline-offset-2">
              {lang === "tr" ? "YouTube'da aç ↗" : "Open on YouTube ↗"}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
