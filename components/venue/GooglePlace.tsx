"use client";

import { useEffect, useState } from "react";

/* GOOGLE YORUM + FOTOĞRAF — yalnızca GOOGLE_PLACES_API_KEY tanımlıysa (sunucu). Google Maps Platform kuralları:
   · içerik canlı çekilir, saklanmaz · yazar adı/fotoğrafı/profili gösterilir · Google'da kaynağına bağlantı
   · sıralama notu · "Google Maps" ibaresi. Anahtar yoksa yalnızca Google Haritalar'a bağlantı. */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface GReview { author: string; authorUri?: string; authorPhoto?: string; rating: number; text: string; when: string; uri?: string }
interface GPlace { rating?: number; count?: number; mapsUri?: string; reviews: GReview[]; photos: Array<{ src: string; author: string; authorUri?: string }> }

export function GooglePlace({ slug, name, mapsUrl }: { slug: string; name: string; mapsUrl?: string }) {
  const [p, setP] = useState<GPlace | null | "off">(null);
  useEffect(() => {
    let alive = true;
    fetch(`${BASE}/api/google/place/?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : "off"))
      .then((j) => { if (alive) setP(j === "off" || j?.disabled || j?.error ? "off" : j); })
      .catch(() => { if (alive) setP("off"); });
    return () => { alive = false; };
  }, [slug]);

  if (p === null) return null;
  if (p === "off") {
    return mapsUrl ? (
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 border border-line-2 px-4 py-3 text-[13.5px] hover:border-ink">
        <span><b>{name}</b> için Google&apos;daki yorumlar ve fotoğraflar</span><span aria-hidden>↗</span>
      </a>
    ) : null;
  }
  return (
    <div className="flex flex-col gap-3 border border-line-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[15px] font-bold">Google&apos;da {p.rating ? <span className="tnum">★ {p.rating.toLocaleString("tr-TR")}</span> : null} {p.count ? <span className="tnum text-[12px] font-normal text-ink-3">({p.count.toLocaleString("tr-TR")} değerlendirme)</span> : null}</span>
        <span className="text-[11px] font-semibold text-ink-3">Google Maps</span>
      </div>
      {p.photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-1.5">
          {p.photos.slice(0, 6).map((ph) => (
            <li key={ph.src} className="relative aspect-square overflow-hidden bg-sheet">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.src} alt={`${name} — Google Haritalar fotoğrafı`} loading="lazy" className="h-full w-full object-cover" />
              <a href={ph.authorUri ?? p.mapsUri} target="_blank" rel="noopener noreferrer" className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] text-white">{ph.author}</a>
            </li>
          ))}
        </ul>
      )}
      <ul className="flex flex-col divide-y divide-line">
        {p.reviews.map((r, i) => (
          <li key={i} className="flex flex-col gap-1 py-3">
            <span className="flex items-center gap-2 text-[12.5px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.authorPhoto && <img src={r.authorPhoto} alt="" className="h-6 w-6 rounded-full" />}
              <a href={r.authorUri} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{r.author}</a>
              <span className="tnum text-ink-3">★ {r.rating} · {r.when}</span>
            </span>
            <p className="text-[13.5px] leading-relaxed text-ink-2">{r.text}</p>
            {r.uri && <a href={r.uri} target="_blank" rel="noopener noreferrer" className="text-[11.5px] text-ink-3 underline underline-offset-2">Google&apos;da gör</a>}
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-snug text-ink-3">Yorumlar Google kullanıcılarına aittir; Google&apos;ın alaka sırasıyla gösterilir, Gidenler puanına katılmaz. {p.mapsUri && <a href={p.mapsUri} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Tümü Google Haritalar&apos;da</a>}</p>
    </div>
  );
}
