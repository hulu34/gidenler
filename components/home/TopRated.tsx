"use client";

import Link from "next/link";
import { useState } from "react";
import { Column } from "@/components/home/HomeRankings";
import { GoogleMapsLogo } from "@/components/venue/media/GoogleAttribution";
import type { RankItem, RankSection } from "@/lib/rankings";

/* EN YÜKSEK PUANLILAR — iki AYRI sekme, iki ayrı puan:
   · Gidenler (varsayılan): yalnız yayımlanmış Gidenler puanı, 10 üzerinden.
   · Google: günlük güncellenen Google puanı tablosundan (sunucuda hazır), tür başına sıralı. Sekme açılınca
     Google'a istek GİTMEZ, sorgu sınırı yoktur. 5 üzerinden, değerlendirme sayısı ve Google Maps atfıyla;
     Gidenler puanına katılmaz. */
type GItem = { slug: string; name: string; place: string; rating: number; count: number | null; mapsUrl: string | null; checkedAt: string };
export interface GoogleTheme { key: string; label: string; items: GItem[]; few: GItem[]; pool: number }
/** Sıralamaya girmek için en az bu kadar Google değerlendirmesi; azı ayrı satırda, sırasız gösterilir. */
export const MIN_GOOGLE_REVIEWS = 100;
const f1 = (x: number) => x.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const day = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });

export function TopRated({ section, note, themes }: { section: RankSection; note?: string | null; themes: GoogleTheme[] }) {
  const [tab, setTab] = useState<"gidenler" | "google">("gidenler");
  const [theme, setTheme] = useState<string>(themes[0]?.key ?? "");
  const t = themes.find((x) => x.key === theme) ?? themes[0];
  const newest = themes.flatMap((x) => x.items).reduce((m, i) => (i.checkedAt > m ? i.checkedAt : m), "");
  const tabs = (
    <div role="tablist" aria-label="Puan kaynağı" className="mt-2 flex gap-1 text-[12px] font-semibold">
      {([["gidenler", "Gidenler puanı"], ["google", "Google puanı"]] as const).map(([k, l]) => (
        <button key={k} role="tab" type="button" aria-selected={tab === k} data-puan-sekme={k}
          onClick={() => setTab(k)}
          className={`h-8 border px-2.5 ${tab === k ? "border-ink bg-ink text-paper" : "border-line-2 text-ink-2 hover:border-ink"}`}>{l}</button>
      ))}
    </div>
  );
  if (tab === "gidenler") {
    return (
      <div className="min-w-0" data-pano-kolon="top">
        <Column demo={false} section={section} empty={<div className="flex flex-col gap-2 pt-4"><p className="text-[12.5px] leading-snug text-ink-3">{note}</p></div>} />
        {tabs}
      </div>
    );
  }
  return (
    <section aria-labelledby="h-top-google" className="min-w-0" data-pano-kolon="top" data-google-siralama>
      <div className="flex min-h-[2.25rem] items-end justify-between gap-x-3 border-b-2 border-line-strong pb-2">
        <h2 id="h-top-google" className="min-w-0 text-[12px] font-bold uppercase leading-tight tracking-[0.14em]">En yüksek puanlılar</h2>
        <span className="shrink-0 text-[11px] text-ink-3">Google puanı · 5 üzerinden</span>
      </div>
      {!t ? <p className="pt-4 text-[12.5px] text-ink-3" data-google-bos>Google puanları henüz aktarılmadı.</p> : (<>
      <div className="flex flex-wrap gap-1.5 pt-3" role="group" aria-label="Tür">
        {themes.map((x) => (
          <button key={x.key} type="button" aria-pressed={t.key === x.key} onClick={() => setTheme(x.key)}
            className={`h-7 rounded-full border px-2.5 text-[12px] font-semibold ${t.key === x.key ? "border-ink bg-ink text-paper" : "border-line-2 hover:border-ink"}`}>{x.label}</button>
        ))}
      </div>
      <ol className="divide-y divide-line" data-google-liste>
        {t.items.map((r, i) => (
          <li key={r.slug}>
            <div className="grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-start gap-x-2 py-2.5">
              <span className="tnum pt-[3px] text-[11px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <Link href={`/mekan/${r.slug}/`} className="group flex min-w-0 flex-col gap-0.5">
                <span className="line-clamp-2 text-[15px] font-semibold leading-[1.25] group-hover:text-accent-ink">{r.name}</span>
                <span className="truncate text-[11px] text-ink-3">{r.place}</span>
              </Link>
              <a href={r.mapsUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="flex shrink-0 flex-col items-end gap-0.5 hover:underline" aria-label={`${r.name}: Google puanı ${f1(r.rating)} / 5, Google Haritalar'da aç`}>
                <span className="tnum text-[15px] font-extrabold">★ {f1(r.rating)}<span className="text-[11px] font-semibold text-ink-3">/5</span></span>
                <span className="tnum text-[11px] text-ink-3">{(r.count ?? 0).toLocaleString("tr-TR")} değerlendirme</span>
              </a>
            </div>
          </li>
        ))}
      </ol>
      {t.few.length > 0 && (
        <div className="pt-2" data-google-az>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-3">{MIN_GOOGLE_REVIEWS}&apos;den az ya da görünmeyen değerlendirme sayısı · sıralamaya girmez, ada göre</p>
          <ul className="divide-y divide-line">
            {t.few.map((r) => (
              <li key={r.slug} className="flex items-baseline justify-between gap-3 py-2">
                <Link href={`/mekan/${r.slug}/`} className="min-w-0 truncate text-[14px] font-semibold hover:text-accent-ink">{r.name}</Link>
                <a href={r.mapsUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="tnum shrink-0 text-[12px] text-ink-3 hover:underline">★ {f1(r.rating)}/5{r.count != null ? ` · ${r.count.toLocaleString("tr-TR")} değerlendirme` : ""}</a>
              </li>))}
          </ul>
        </div>
      )}
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug text-ink-3">
        <GoogleMapsLogo />
        <span>Kaynak: Google Maps. Gidenler puanı değildir. Bu türde Google puanı olan {t.pool} mekân var; yalnız değerlendirme sayısı görünen ve en az {MIN_GOOGLE_REVIEWS} olanlar sıralanır. Ana sayfada yukarıda görünenler tekrarlanmaz.{newest ? ` Son kontrol ${day(newest)}.` : ""}</span>
      </p>
      </>)}
      {tabs}
    </section>
  );
}

