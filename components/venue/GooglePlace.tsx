"use client";

import { useEffect, useRef, useState } from "react";
import { requestGoogleView, useGoogleView } from "./media/googleView";
import { GoogleMapsLogo } from "./media/GoogleAttribution";

/* GOOGLE BÖLÜMÜ — Google Places (New), sunucu vekili üzerinden canlı; hiçbir şey saklanmaz.
   Yalnız izinli restoranda ve kullanıcı düğmeye basınca:
   · Puan ve değerlendirme sayısı başlıkta (GoogleRatingBadge), yorumlar ve saatler bu bölümde görünür.
   · Veriler tek istekten gelir (googleView); yorum listesi bölüm ekrana yaklaşınca çizilir (ek API isteği yok).
   Google Maps Platform kuralları: içerik canlı · yorum yazarı adı/fotoğrafı/profili · kaynağa bağlantı ·
   "Google Maps" atfı · yorumlar Google'ın sırasıyla · Google içeriği OSM haritasıyla birlikte gösterilmez
   ("gidenler:google" olayı haritayı gizler). Sınır dolarsa ya da hata olursa yalnız Haritalar bağlantısı. */

const Stars = ({ v }: { v: number }) => (
  <span aria-hidden className="tracking-[0.06em] text-[#e7a600]">{"★★★★★".slice(0, Math.round(v))}<span className="text-line-2">{"★★★★★".slice(Math.round(v))}</span></span>
);

/** Başlıktaki Google puanı: yer baştan ayrılır (sayfa kayması yok); veri yoksa boş kalır. */
export function GoogleRatingBadge({ slug, google }: { slug: string; google: boolean }) {
  const g = useGoogleView(slug, google);
  if (!google || g.k === "idle" || g.k === "off") return null;
  const v = g.k === "ok" ? g.v : null;
  return (
    <div className="flex min-h-[38px] items-center" aria-live="polite">
      {g.k === "loading" && <span className="h-[34px] w-64 animate-pulse rounded-full bg-sheet" aria-label="Google puanı yükleniyor" />}
      {v?.rating ? (
        /* Google içeriği Gidenler içeriğinden ayrışsın: çerçeveli kap + resmî logo aynı kapta */
        <a href={v.mapsUri} target="_blank" rel="noopener noreferrer"
          className="group inline-flex items-center gap-x-2.5 rounded-full border border-line-2 bg-sheet py-1 pl-3.5 pr-1 text-[13px] text-ink-2 hover:border-ink">
          <span className="tnum text-[17px] font-extrabold text-ink">{v.rating.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}</span>
          <Stars v={v.rating} />
          {v.count ? <span className="tnum">{v.count.toLocaleString("tr-TR")} değerlendirme</span> : null}
          <span className="px-2.5 pb-[5px] pt-2.5"><GoogleMapsLogo /></span>
        </a>
      ) : null}
    </div>
  );
}

export function GooglePlace({ slug, name, mapsUrl, google }: { slug: string; name: string; mapsUrl?: string; google: boolean }) {
  const g = useGoogleView(slug, google);
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near, g.k]);

  const link = mapsUrl ? (
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 border border-line-2 px-4 py-3 text-[13.5px] hover:border-ink">
      <span>{name} — yorumlar ve fotoğraflar Google Haritalar&apos;da</span><span aria-hidden>↗</span>
    </a>
  ) : null;
  if (g.k === "limited") return <div className="flex flex-col gap-2"><p className="text-[12.5px] text-ink-3">Google bilgileri şu an gösterilemiyor.</p>{link}</div>;
  if (!google || g.k === "off") return link;
  if (g.k === "idle") return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => requestGoogleView(slug)} className="self-start border border-line-strong px-4 py-2.5 text-[13.5px] font-bold hover:bg-ink hover:text-paper">Google puanı, yorumları ve saatlerini göster</button>
      {link}
    </div>
  );
  if (g.k === "loading") return <div className="h-40 animate-pulse border border-line bg-sheet" aria-label="Google bilgisi yükleniyor" />;

  const p = g.v;
  return (
    <section ref={ref} id="google" aria-labelledby="h-google" className="scroll-mt-28 flex flex-col gap-4 border-2 border-line-strong p-4 sm:scroll-mt-32 sm:p-5">
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
        <span className="px-2.5 pb-[5px] pt-2.5"><GoogleMapsLogo /></span>
      </div>

      {p.hours.length > 0 && (
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Çalışma saatleri (Google)</p>
          <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 text-[13px] text-ink-2 sm:grid-cols-2">{p.hours.map((h) => <li key={h}>{h}</li>)}</ul>
        </div>
      )}

      {p.reviews.length > 0 && (
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Google kullanıcılarının yorumları · Gidenler deneyimi değildir</p>
          <p className="mt-1 text-[12px] text-ink-3">
            Google&apos;ın seçtiği {p.reviews.length} yorum gösteriliyor{p.count ? `; toplam ${p.count.toLocaleString("tr-TR")} değerlendirmenin tamamı Google Haritalar'da` : ""}.
          </p>
          {near ? (
            <ul className="mt-1 flex flex-col divide-y divide-line">
              {p.reviews.map((r, i) => (
                <li key={i} className="flex flex-col gap-1 py-3">
                  <span className="flex flex-wrap items-center gap-2 text-[12.5px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.authorPhoto && <img src={r.authorPhoto} alt="" loading="lazy" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />}
                    <a href={r.authorUri} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{r.author}</a>
                    <span className="tnum text-ink-3"><Stars v={r.rating} /> · {r.when}</span>
                  </span>
                  <p className="line-clamp-4 text-[13.5px] leading-relaxed text-ink-2">{r.text}</p>
                  <span className="flex flex-wrap gap-x-3 text-[11.5px] text-ink-3">
                    {r.translated && <span>Google tarafından çevrildi</span>}
                    {r.uri && <a href={r.uri} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Google Haritalar&apos;da gör{r.translated ? " (orijinali)" : ""}</a>}
                    {r.flagUri && <a href={r.flagUri} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Bildir</a>}
                  </span>
                </li>
              ))}
            </ul>
          ) : <div className="mt-2 h-64 animate-pulse bg-sheet" aria-hidden />}
        </div>
      )}

      <p className="text-[11px] leading-snug text-ink-3">
        Puan, yorumlar ve fotoğraflar Google Maps&apos;ten canlı gelir, Gidenler&apos;de saklanmaz ve Gidenler puanına katılmaz; yorumlar Google&apos;ın varsayılan sırasıyla
        (alaka düzeyi) gösterilir, Gidenler süzmez. Yorumlar Google tarafından doğrulanmaz; Google sahte içeriği tespit ettiğinde kaldırır
        (<a href="https://support.google.com/contributionpolicy/answer/7400114" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Google&apos;ın içerik politikası</a>).{" "}
        {(p.mapsUri ?? mapsUrl) && <a href={p.mapsUri ?? mapsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">Tümü Google Haritalar&apos;da</a>}
      </p>
    </section>
  );
}

export function OsmMapUnlessGoogle({ children }: { children: React.ReactNode }) {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const on = () => setHide(true);
    window.addEventListener("gidenler:google", on);
    return () => window.removeEventListener("gidenler:google", on);
  }, []);
  return hide ? null : <>{children}</>;
}
