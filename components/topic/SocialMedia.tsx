"use client";

import { useState } from "react";
import type { MediaLink } from "@/lib/types";
import { parseVideoUrl } from "@/lib/media/embed";

/* ──────────────────────────────────────────────────────────────────────────
   SOSYAL MEDYADA — mekânla ilgili Instagram / X / YouTube / TikTok içerikleri.
   · YouTube: sitede izlenir. Tıkla-oynat: tıklanana kadar YouTube'a istek gitmez (hız + gizlilik),
     tıklanınca youtube-nocookie gömülür.
   · Instagram / X / TikTok: bağlantı kartı; yeni sekmede açılır (üçüncü taraf betiği yüklenmez).
   · Kayıtlı içerik yoksa uydurma bağlantı yerine her platformda gerçek arama yönlendirmesi gösterilir.
   ────────────────────────────────────────────────────────────────────────── */

const P: Record<MediaLink["platform"], { label: string; mark: string; search: (q: string) => string }> = {
  instagram: { label: "Instagram", mark: "IG", search: (q) => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}` },
  youtube: { label: "YouTube", mark: "YT", search: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  x: { label: "X", mark: "X", search: (q) => `https://x.com/search?q=${encodeURIComponent(q)}&f=live` },
  tiktok: { label: "TikTok", mark: "TT", search: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}` },
};
const BY: Record<MediaLink["addedBy"], string> = { "işletme": "İşletme ekledi", "deneyim": "Deneyim yazarı ekledi", "editör": "Editör seçti" };

function YouTubeCard({ m }: { m: MediaLink }) {
  const [play, setPlay] = useState(false);
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden bg-ink">
        {play ? (
          <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${m.videoId}?autoplay=1&rel=0`} title={m.title ?? "YouTube videosu"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0 flex items-center justify-center" aria-label={`Videoyu burada oynat: ${m.title ?? "YouTube"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${m.videoId}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-100" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition-transform group-hover:scale-110">▶</span>
          </button>
        )}
      </div>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12.5px]">
        <span className="font-semibold">{m.title ?? "YouTube videosu"}</span>
        <span className="text-ink-3">{m.author ? `${m.author} · ` : ""}{BY[m.addedBy]} · <a href={m.url} target="_blank" rel="noopener noreferrer" className="underline decoration-line-2 underline-offset-4 hover:text-ink">YouTube&apos;da aç ↗</a></span>
      </figcaption>
    </figure>
  );
}

function LinkCard({ m }: { m: MediaLink }) {
  const p = P[m.platform];
  return (
    <a href={m.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 border border-line p-4 transition-colors hover:border-ink hover:bg-sheet">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-ink text-[11px] font-bold text-paper">{p.mark}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold group-hover:text-accent-ink">{m.title ?? `${p.label} gönderisi`}</span>
        <span className="truncate text-[12px] text-ink-3">{m.author ? `${m.author} · ` : ""}{BY[m.addedBy]} · {p.label}&apos;da aç ↗</span>
      </span>
    </a>
  );
}

export function SocialMedia({ name, district, media = [] }: { name: string; district?: string; media?: MediaLink[] }) {
  /* oynatılabilir videolar (YouTube / Reels / TikTok) yukarıdaki Videolar şeridinde; burada yalnız diğer gönderiler */
  const videos: MediaLink[] = [];
  const links = media.filter((m) => !parseVideoUrl(m.url) && !(m.platform === "youtube" && m.videoId));
  const q = [name, district].filter(Boolean).join(" ");
  return (
    <section id="sosyal" className="scroll-mt-28 mt-12 sm:scroll-mt-32" aria-labelledby="h-sosyal">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
        <h2 id="h-sosyal" className="text-[13px] font-bold uppercase tracking-[0.2em]">Sosyal medyada</h2>
        <p className="max-w-[52ch] text-[12px] text-ink-3">Videolar yukarıda, sitede oynar; diğer gönderiler kendi platformunda açılır. Bağlantıları işletme, deneyim yazarları ya da editör ekler.</p>
      </div>
      {videos.length > 0 && <div className="mt-5 grid gap-6 md:grid-cols-2">{videos.map((m) => <YouTubeCard key={m.url} m={m} />)}</div>}
      {links.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{links.map((m) => <LinkCard key={m.url} m={m} />)}</div>}
      <div className={`${media.length ? "mt-6 border-t border-line pt-4" : "mt-5"} flex flex-wrap items-center gap-2`}>
        <span className="mr-1 text-[12.5px] text-ink-2">{media.length ? "Daha fazlası:" : `“${name}” hakkında paylaşılanlar:`}</span>
        {(Object.keys(P) as Array<MediaLink["platform"]>).map((k) => (
          <a key={k} href={P[k].search(q)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line-2 px-3 py-1 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink">
            <span className="text-[10px] font-bold text-ink-3">{P[k].mark}</span>{P[k].label}&apos;da ara ↗
          </a>
        ))}
      </div>
      {!media.length && <p className="mt-3 text-[11.5px] text-ink-3">Bu mekân için henüz doğrulanmış içerik eklenmedi. Arama bağlantıları ilgili platformun kendi sonuçlarını açar; Gidenler bu sonuçları denetlemez.</p>}
    </section>
  );
}
