"use client";

import Link from "next/link";
import { useState } from "react";
import { Column } from "@/components/home/HomeRankings";
import { GoogleMapsLogo } from "@/components/venue/media/GoogleAttribution";
import type { RankItem, RankSection } from "@/lib/rankings";

/* EN YÜKSEK PUANLILAR — iki AYRI sekme, iki ayrı puan:
   · Gidenler (varsayılan): yalnız yayımlanmış Gidenler puanı, 10 üzerinden.
   · Google: kullanıcı seçince seçtiği türdeki en çok 5 Google eşleşmeli mekânın puanı CANLI gelir ve yalnız bu
     5 mekân kendi arasında sıralanır. 5 üzerinden, değerlendirme sayısı ve Google Maps atfıyla. Saklanmaz,
     Gidenler puanına katılmaz. Sekme açılmadan Google'a istek gitmez. */
export interface GoogleTheme { key: string; label: string; items: Array<{ slug: string; name: string; place: string }> }
type Rated = { slug: string; rating?: number; count?: number; mapsUri?: string };
/** Sıralamaya girmek için en az bu kadar Google değerlendirmesi; azı ayrı satırda, sırasız gösterilir. */
export const MIN_GOOGLE_REVIEWS = 100;

export function TopRated({ section, note, themes }: { section: RankSection; note?: string | null; themes: GoogleTheme[] }) {
  const [tab, setTab] = useState<"gidenler" | "google">("gidenler");
  const [theme, setTheme] = useState<string | null>(null);
  const [state, setState] = useState<{ k: "idle" | "loading" | "ok" | "limited" | "off" | "error"; list?: Rated[]; few?: Rated[] }>({ k: "idle" });
  const load = async (key: string) => {
    const t = themes.find((x) => x.key === key); if (!t) return;
    setTheme(key); setState({ k: "loading" });
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/google/puanlar/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slugs: t.items.map((i) => i.slug) }) });
      const j = await r.json().catch(() => ({}));
      if (j.disabled) return setState({ k: "off" });
      if (r.status === 429 || (j.limited && !j.ratings?.length)) return setState({ k: "limited" });
      const all = (j.ratings as Rated[]).filter((x) => typeof x.rating === "number");
      const ranked = all.filter((x) => (x.count ?? 0) >= MIN_GOOGLE_REVIEWS).sort((a, b) => b.rating! - a.rating! || (b.count ?? 0) - (a.count ?? 0));
      const few = all.filter((x) => (x.count ?? 0) < MIN_GOOGLE_REVIEWS).sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
      setState({ k: "ok", list: ranked, few });
    } catch { setState({ k: "error" }); }
  };
  const tabs = (
    <div role="tablist" aria-label="Puan kaynağı" className="mt-2 flex gap-1 text-[12px] font-semibold">
      {([["gidenler", "Gidenler puanı"], ["google", "Google puanı"]] as const).map(([k, l]) => (
        <button key={k} role="tab" type="button" aria-selected={tab === k} data-puan-sekme={k}
          onClick={() => { setTab(k); if (k === "google" && !theme && themes[0]) void load(themes[0].key); }}
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
  const byslug = new Map(themes.flatMap((t) => t.items).map((i) => [i.slug, i]));
  return (
    <section aria-labelledby="h-top-google" className="min-w-0" data-pano-kolon="top" data-google-siralama>
      <div className="flex min-h-[2.25rem] items-end justify-between gap-x-3 border-b-2 border-line-strong pb-2">
        <h2 id="h-top-google" className="min-w-0 text-[12px] font-bold uppercase leading-tight tracking-[0.14em]">En yüksek puanlılar</h2>
        <span className="shrink-0 text-[11px] text-ink-3">Google puanı · 5 üzerinden</span>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-3" role="group" aria-label="Tür">
        {themes.map((t) => (
          <button key={t.key} type="button" aria-pressed={theme === t.key} onClick={() => void load(t.key)}
            className={`h-7 rounded-full border px-2.5 text-[12px] font-semibold ${theme === t.key ? "border-ink bg-ink text-paper" : "border-line-2 hover:border-ink"}`}>{t.label}</button>
        ))}
      </div>
      {state.k === "loading" && <p className="pt-4 text-[12.5px] text-ink-3" role="status">Google puanları canlı alınıyor…</p>}
      {state.k === "off" && <p className="pt-4 text-[12.5px] text-ink-3">Google puanı bu ortamda kapalı.</p>}
      {state.k === "limited" && <p className="pt-4 text-[12.5px] text-ink-3">Google puanı için bugünkü sınır doldu; mekân profillerinde puan yine görünebilir.</p>}
      {state.k === "error" && <p className="pt-4 text-[12.5px] text-ink-3">Google puanları şu an alınamadı.</p>}
      {state.k === "ok" && (
        <ol className="divide-y divide-line" data-google-liste>
          {state.list!.map((r, i) => {
            const it = byslug.get(r.slug);
            return (
              <li key={r.slug}>
                <div className="grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-start gap-x-2 py-2.5">
                  <span className="tnum pt-[3px] text-[11px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <Link href={`/mekan/${r.slug}/`} className="group flex min-w-0 flex-col gap-0.5">
                    <span className="line-clamp-2 text-[15px] font-semibold leading-[1.25] group-hover:text-accent-ink">{it?.name}</span>
                    <span className="truncate text-[11px] text-ink-3">{it?.place}</span>
                  </Link>
                  <a href={r.mapsUri} target="_blank" rel="noopener noreferrer" className="flex shrink-0 flex-col items-end gap-0.5 hover:underline" aria-label={`${it?.name}: Google puanı ${r.rating} / 5, Google Haritalar'da aç`}>
                    <span className="tnum text-[15px] font-extrabold">★ {r.rating!.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}<span className="text-[11px] font-semibold text-ink-3">/5</span></span>
                    <span className="tnum text-[11px] text-ink-3">{(r.count ?? 0).toLocaleString("tr-TR")} değerlendirme</span>
                  </a>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {state.k === "ok" && state.few!.length > 0 && (
        <div className="pt-2" data-google-az>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-3">{MIN_GOOGLE_REVIEWS}&apos;den az değerlendirme · sıralamaya girmez</p>
          <ul className="divide-y divide-line">
            {state.few!.map((r) => { const it = byslug.get(r.slug); return (
              <li key={r.slug} className="flex items-baseline justify-between gap-3 py-2">
                <Link href={`/mekan/${r.slug}/`} className="min-w-0 truncate text-[14px] font-semibold hover:text-accent-ink">{it?.name}</Link>
                <a href={r.mapsUri} target="_blank" rel="noopener noreferrer" className="tnum shrink-0 text-[12px] text-ink-3 hover:underline">★ {r.rating!.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}/5 · {(r.count ?? 0).toLocaleString("tr-TR")} değerlendirme</a>
              </li>); })}
          </ul>
        </div>
      )}
      {state.k === "ok" && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug text-ink-3">
          <GoogleMapsLogo />
          <span>Puanlar Google Maps&apos;ten canlı gelir, saklanmaz ve Gidenler puanı değildir. Bu türden Google ile eşleşmiş {state.list!.length + state.few!.length} mekân sorgulandı; en az {MIN_GOOGLE_REVIEWS} değerlendirmesi olanlar kendi arasında sıralandı.</span>
        </p>
      )}
      {tabs}
    </section>
  );
}

