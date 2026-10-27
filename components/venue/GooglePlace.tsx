"use client";

import { useEffect, useRef, useState } from "react";

/* GOOGLE BÖLÜMÜ — Google Places (New), sunucu vekili üzerinden canlı; hiçbir şey saklanmaz.
   Google Maps Platform kuralları: içerik canlı çekilir · yorum yazarı adı/fotoğrafı/profili ve fotoğraf sahibi
   gösterilir · kaynağa bağlantı · "Google Maps" atfı · yorumlar Google'ın sırasıyla. Google içeriği Google olmayan
   bir haritayla birlikte gösterilmez: içerik geldiğinde "gidenler:google" olayı yayılır, OSM haritası gizlenir.
   Kota: bölüm yalnız ekrana girince yüklenir; bütçe dolarsa Google Haritalar bağlantısına düşer. */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface GReview { author: string; authorUri?: string; authorPhoto?: string; rating: number; text: string; when: string; uri?: string }
interface GPlace { rating?: number; count?: number; mapsUri?: string; hours: string[]; reviews: GReview[]; photos: Array<{ src: string; author: string; authorUri?: string }> }
type State = { k: "idle" } | { k: "loading" } | { k: "ok"; p: GPlace } | { k: "off" } | { k: "limited" };

const Stars = ({ v }: { v: number }) => (
  <span aria-hidden className="tracking-[0.06em] text-[#e7a600]">{"★★★★★".slice(0, Math.round(v))}<span className="text-line-2">{"★★★★★".slice(Math.round(v))}</span></span>
);

export function GooglePlace({ slug, name, mapsUrl }: { slug: string; name: string; mapsUrl?: string }) {
  const [s, setS] = useState<State>({ k: "idle" });
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const load = () => {
      setS({ k: "loading" });
      fetch(`${BASE}/api/google/place/?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
        .then(async (r) => ({ status: r.status, j: await r.json().catch(() => null) }))
        .then(({ status, j }) => {
          if (!alive) return;
          if (status === 200 && j && !j.disabled && !j.error) { setS({ k: "ok", p: j }); window.dispatchEvent(new CustomEvent("gidenler:google")); }
          else if (j?.limited) setS({ k: "limited" });
          else setS({ k: "off" });
        })
        .catch(() => alive && setS({ k: "off" }));
    };
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => { alive = false; io.disconnect(); };
  }, [slug]);

  const link = (label: string) => mapsUrl ? (
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 border border-line-2 px-4 py-3 text-[13.5px] hover:border-ink">
      <span>{label}</span><span aria-hidden>↗</span>
    </a>
  ) : null;

  if (s.k !== "ok") {
    return (
      <div ref={ref} className="min-h-[1px]">
        {s.k === "loading" && <div className="h-28 animate-pulse border border-line bg-sheet" aria-label="Google bilgisi yükleniyor" />}
        {s.k === "limited" && link(`${name} — Google puanı, yorumlar ve fotoğraflar Google Haritalar'da`)}
        {s.k === "off" && link(`${name} için Google'daki yorumlar ve fotoğraflar`)}
      </div>
    );
  }
  const p = s.p;
  return (
    <section ref={ref} aria-labelledby="h-google" className="flex flex-col gap-4 border-2 border-line-strong p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <h2 id="h-google" className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-3">Google&apos;da</h2>
          {p.rating ? (
            <p className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="tnum text-[34px] font-extrabold leading-none tracking-[-0.04em]">{p.rating.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}</span>
              <Stars v={p.rating} />
              {p.count ? <span className="tnum text-[13px] text-ink-3">{p.count.toLocaleString("tr-TR")} değerlendirme</span> : null}
            </p>
          ) : <p className="text-[14px] text-ink-2">Google&apos;da henüz puan yok.</p>}
        </div>
        <span className="text-[12px] font-medium text-ink-3" translate="no">Google Maps</span>
      </div>

      {p.photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {p.photos.map((ph) => (
            <li key={ph.src} className="relative aspect-[4/3] overflow-hidden bg-sheet">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.src} alt={`${name} — Google Haritalar fotoğrafı`} loading="lazy" className="h-full w-full object-cover" />
              <a href={ph.authorUri ?? p.mapsUri} target="_blank" rel="noopener noreferrer" className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] text-white">Fotoğraf: {ph.author}</a>
            </li>
          ))}
        </ul>
      )}

      {p.hours.length > 0 && (
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Çalışma saatleri (Google)</p>
          <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 text-[13px] text-ink-2 sm:grid-cols-2">{p.hours.map((h) => <li key={h}>{h}</li>)}</ul>
        </div>
      )}

      {p.reviews.length > 0 && (
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Google kullanıcılarının yorumları · Gidenler deneyimi değildir</p>
          <ul className="mt-1 flex flex-col divide-y divide-line">
            {p.reviews.map((r, i) => (
              <li key={i} className="flex flex-col gap-1 py-3">
                <span className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.authorPhoto && <img src={r.authorPhoto} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />}
                  <a href={r.authorUri} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{r.author}</a>
                  <span className="tnum text-ink-3"><Stars v={r.rating} /> · {r.when}</span>
                </span>
                <p className="line-clamp-4 text-[13.5px] leading-relaxed text-ink-2">{r.text}</p>
                {r.uri && <a href={r.uri} target="_blank" rel="noopener noreferrer" className="text-[11.5px] text-ink-3 underline underline-offset-2">Google&apos;da gör</a>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] leading-snug text-ink-3">
        Puan, yorumlar ve fotoğraflar Google Maps&apos;ten canlı gelir, Gidenler&apos;de saklanmaz ve Gidenler puanına katılmaz; yorumlar Google&apos;ın alaka sırasıyla gösterilir.{" "}
        {(p.mapsUri ?? mapsUrl) && <a href={p.mapsUri ?? mapsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">Tümü Google Haritalar&apos;da</a>}
      </p>
    </section>
  );
}

/** OSM haritası: aynı sayfada Google içeriği gösterilirse gizlenir (Google içeriği Google olmayan haritayla birlikte kullanılamaz). */
export function OsmMapUnlessGoogle({ children }: { children: React.ReactNode }) {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const on = () => setHide(true);
    window.addEventListener("gidenler:google", on);
    return () => window.removeEventListener("gidenler:google", on);
  }, []);
  return hide ? null : <>{children}</>;
}
