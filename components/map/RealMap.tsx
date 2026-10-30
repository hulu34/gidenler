"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { realEntities } from "@/data/real";
import { SCORE_WAITING, fmtPublished, type PublishedMap } from "@/lib/score/publishedCards";

/* GERÇEK MEKÂN HARİTASI — 456 gerçek kayıt, OSM koordinatlarıyla. Öneri, kalabalık bilgisi yok;
   konum, tür, kimlik ve yayımlanmış Gidenler puanı. Kullanıcı konumu alınmaz. Altlık şematik (sokak haritası yok), mekân
   sayfasında gerçek OSM haritası var. */
const W = 900, H = 560;
const BOX = { minLat: 40.84, maxLat: 41.26, minLng: 28.55, maxLng: 29.45 };
const px = (lng: number) => ((lng - BOX.minLng) / (BOX.maxLng - BOX.minLng)) * W;
const py = (lat: number) => H - ((lat - BOX.minLat) / (BOX.maxLat - BOX.minLat)) * H;

export function RealMap({ published }: { published?: PublishedMap }) {
  const pts = useMemo(() => realEntities.filter((e) => e.location?.geo).map((e) => ({ e, lat: e.location!.geo!.lat, lng: e.location!.geo!.lng })), []);
  const kinds = useMemo(() => [...new Set(pts.map((p) => p.e.subcategory ?? ""))].filter(Boolean).sort((a, b) => a.localeCompare(b, "tr")), [pts]);
  const districts = useMemo(() => [...new Set(pts.map((p) => p.e.location?.district ?? ""))].filter(Boolean).sort((a, b) => a.localeCompare(b, "tr")), [pts]);
  const [kind, setKind] = useState("hepsi");
  const [district, setDistrict] = useState("hepsi");
  const [sel, setSel] = useState<string | null>(null);
  const shown = pts.filter((p) => (kind === "hepsi" || p.e.subcategory === kind) && (district === "hepsi" || p.e.location?.district === district));
  const inBox = shown.filter((p) => p.lat >= BOX.minLat && p.lat <= BOX.maxLat && p.lng >= BOX.minLng && p.lng <= BOX.maxLng);
  const s = shown.find((p) => p.e.id === sel)?.e ?? null;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <select value={kind} onChange={(ev) => { setKind(ev.target.value); setSel(null); }} aria-label="Tür" className="h-9 border-b-2 border-line-2 bg-transparent text-[14px] font-semibold outline-none focus:border-accent">
          <option value="hepsi">Tüm türler</option>
          {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={district} onChange={(ev) => { setDistrict(ev.target.value); setSel(null); }} aria-label="Semt" className="h-9 border-b-2 border-line-2 bg-transparent text-[14px] font-semibold outline-none focus:border-accent">
          <option value="hepsi">Tüm semtler</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="tnum text-[13px] text-ink-3">{shown.length} gerçek mekân{inBox.length < shown.length ? ` · ${shown.length - inBox.length} tanesi harita çerçevesi dışında (listede)` : ""}</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="overflow-x-auto border-2 border-line-strong bg-sheet">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="İstanbul'daki gerçek mekânların konumları (şematik)">
            <path d={`M ${px(29.0)} 0 C ${px(28.99)} ${H * 0.3}, ${px(29.03)} ${H * 0.55}, ${px(29.02)} ${H * 0.62} L ${px(28.98)} ${H}`} stroke="var(--line-2)" strokeWidth="16" fill="none" strokeLinecap="round" opacity="0.55" />
            {inBox.map((p) => (
              <circle key={p.e.id} cx={px(p.lng)} cy={py(p.lat)} r={sel === p.e.id ? 7 : 3.6}
                className={`cursor-pointer ${sel === p.e.id ? "fill-accent" : p.e.categoryId === "cat.restaurant" ? "fill-ink" : "fill-ink-3"}`}
                onClick={() => setSel(p.e.id)}>
                <title>{`${p.e.name} · ${p.e.subcategory} · ${p.e.location?.district}`}</title>
              </circle>
            ))}
          </svg>
        </div>
        <div className="flex flex-col gap-3">
          {s ? (
            <div className="border-2 border-line-strong p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{s.subcategory} · {s.location?.district}</p>
              <p className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.02em]">{s.name}</p>
              {s.address && <p className="mt-1 text-[13.5px] text-ink-2">{s.address}</p>}
              {s.hours && <p className="mt-1 text-[12.5px] text-ink-3">Saatler (OpenStreetMap): {s.hours}</p>}
              {published?.[s.slug]?.score != null
                ? <p className="tnum mt-2 text-[13px] font-semibold">Gidenler puanı {fmtPublished(published[s.slug].score!)}/10 · {published[s.slug].reviewCount} deneyim</p>
                : <p className="mt-2 text-[12.5px] text-pos-ink">{SCORE_WAITING}</p>}
              <Link href={`/mekan/${s.slug}/`} className="mt-3 inline-flex h-9 items-center rounded-[3px] bg-ink px-3 text-[13px] font-semibold text-paper hover:bg-accent">Mekâna git</Link>
            </div>
          ) : (
            <p className="text-[14px] text-ink-2">Bir noktaya dokun ya da listeden seç. Koyu noktalar restoran, açık noktalar kafe ve bar.</p>
          )}
          <ul className="max-h-[420px] overflow-y-auto border-t border-line">
            {shown.slice(0, 200).map((p) => (
              <li key={p.e.id} className="border-b border-line">
                <button type="button" onClick={() => setSel(p.e.id)} aria-pressed={sel === p.e.id}
                  className={`flex w-full items-baseline justify-between gap-3 py-2 text-left text-[14px] hover:text-accent-ink ${sel === p.e.id ? "text-accent-ink" : ""}`}>
                  <span className="font-semibold">{p.e.name}</span>
                  <span className="shrink-0 text-[12px] text-ink-3">{p.e.subcategory} · {p.e.location?.district}</span>
                </button>
              </li>
            ))}
          </ul>
          {shown.length > 200 && <p className="text-[12px] text-ink-3">İlk 200 gösteriliyor; tür ya da semt seçerek daralt.</p>}
        </div>
      </div>
      <p className="text-[11.5px] text-ink-3">Konumlar © OpenStreetMap katkıcıları (ODbL). Şematik altlık; kullanıcı konumu alınmaz.</p>
    </div>
  );
}
