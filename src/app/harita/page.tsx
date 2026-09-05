"use client";

import Link from "next/link";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { useMemo, useState } from "react";
import { getEntityById } from "@/data/entities";
import { getMapRecommendations, mapFilters } from "@/lib/decision";
import { useUserData } from "@/lib/store";
import { score1 } from "@/lib/format";
import type { MapFilter } from "@/lib/types";
import { EntityActions } from "@/components/decision/EntityActions";
import { DemoNotice } from "@/components/ui/DemoNotice";

/**
 * HARİTADA GİDENLER — harita klonu değil, konum + zevk.
 * "Yakınımdaki en yüksek puan" değil, "yakınımda bana en uygun".
 * Şematik SVG; kullanıcı konumu alınmaz, canlı kalabalık/masa uydurulmaz.
 */
const W = 900, H = 420;
const BOUNDS = { minLat: 40.970, maxLat: 41.062, minLng: 28.962, maxLng: 29.048 };
const px = (lng: number) => ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * (W - 80) + 40;
const py = (lat: number) => H - (((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * (H - 80) + 40);

export default function MapPage() {
  const data = useUserData();
  const [filter, setFilter] = useState<MapFilter>("sana_gore");
  const [active, setActive] = useState<string | null>(null);
  const results = useMemo(() => getMapRecommendations(filter, data.taste), [filter, data.taste]);
  const sel = active ? results.find((r) => r.entityId === active) : results[0];
  const selE = sel ? getEntityById(sel.entityId) : null;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <section className="pt-10 sm:pt-14">
        <p className="label">Haritada Gidenler</p>
        <h1 className="mt-2 max-w-[16ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Yakınında sana göre.</h1>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {mapFilters.map((f) => (
            <button key={f.key} type="button" onClick={() => { setFilter(f.key); setActive(null); }} aria-pressed={filter === f.key}
              className={`h-8 border px-3 text-[13px] font-semibold ${filter === f.key ? "border-accent bg-accent text-on-accent" : "border-line-2 hover:border-ink"}`}>{f.label}</button>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="overflow-x-auto border-2 border-line-strong bg-sheet">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[560px]" role="img" aria-label="Şematik İstanbul haritası, demo konumlar">
            {/* boğaz şeridi — şematik */}
            <path d={`M ${px(29.0)} 0 C ${px(28.996)} ${H * 0.3}, ${px(29.016)} ${H * 0.55}, ${px(29.010)} ${H}`} stroke="var(--line-2)" strokeWidth="26" fill="none" strokeLinecap="round" opacity="0.5" />
            {[["Kadıköy", 29.030, 41.008], ["Beşiktaş", 29.014, 41.056], ["Şişli", 28.978, 41.058], ["Beyoğlu", 28.972, 41.040]].map(([n, lng, lat]) => (
              <text key={n as string} x={px(lng as number)} y={py(lat as number)} fontSize="11" fontWeight="700" letterSpacing="2" fill="var(--ink-3)" textAnchor="middle" fontFamily="var(--font-ui)">{(n as string).toLocaleUpperCase("tr")}</text>
            ))}
            {results.map((r) => {
              const e = getEntityById(r.entityId)!; const on = sel?.entityId === r.entityId; const x = px(r.lng), y = py(r.lat);
              const primary = filter === "sana_gore" || filter === "date" || filter === "aile" || filter === "sessiz" || filter === "fp" ? (r.match !== null ? `%${r.match}` : "—") : (r.score !== null ? score1(r.score) : "—");
              const arrow = r.direction === "up" ? "↑" : r.direction === "down" ? "↓" : "→";
              return (
                <g key={r.entityId} onClick={() => setActive(r.entityId)} style={{ cursor: "pointer" }} role="button" aria-label={`${e.name}, ${primary}`} tabIndex={0} onKeyDown={(ev) => { if (ev.key === "Enter") setActive(r.entityId); }}>
                  <circle cx={x} cy={y} r={on ? 7 : 5} fill={on ? "var(--accent)" : "var(--ink)"} />
                  <rect x={x + 9} y={y - 15} width={primary.length * 8 + 30} height={24} fill={on ? "var(--accent)" : "var(--paper)"} stroke={on ? "var(--accent)" : "var(--line-strong)"} strokeWidth="1.5" />
                  <text x={x + 16} y={y + 2} fontSize="13" fontWeight="800" fill={on ? "var(--on-accent)" : "var(--ink)"} fontFamily="var(--font-ui)">{primary} <tspan fontSize="12" fill={on ? "var(--on-accent)" : r.direction === "up" ? "var(--pos-ink)" : r.direction === "down" ? "var(--neg-ink)" : "var(--ink-3)"}>{arrow}</tspan></text>
                  <text x={x + 9} y={y + 24} fontSize="11" fontWeight="600" fill="var(--ink-2)" fontFamily="var(--font-ui)">{e.name}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex flex-col gap-5">
          {sel && selE && (
            <div className="flex flex-col gap-3 border-t-2 border-line-strong pt-4" aria-live="polite">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <Link href={`/mekan/${selE.slug}/`} className="text-[24px] font-extrabold leading-tight tracking-[-0.03em] hover:text-accent-ink">{selE.name}</Link>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{selE.location?.district} · {"₺".repeat(selE.priceLevel ?? 2)}</span>
              </div>
              <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
                <span className="flex flex-col gap-1"><span className="label">Gidenler</span><ScoreNumber score={sel.score} size="lg" label trend={{ direction: sel.direction }} /></span>
                {sel.match !== null && <span className="flex flex-col"><span className="label">Sana göre</span><span className="text-[30px] font-extrabold leading-none tracking-[-0.05em] text-accent-ink">%{sel.match}</span></span>}
              </div>
              <p className="prose-exp text-[14.5px] leading-snug text-ink-2">{sel.insight}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/mekan/${selE.slug}/`} className="inline-flex h-9 items-center rounded-[3px] border border-line-2 px-3.5 text-[13.5px] font-semibold hover:border-ink">Gör</Link>
                <EntityActions entityId={sel.entityId} entitySlug={selE.slug} entityName={selE.name} variant="compact" via="map" />
              </div>
            </div>
          )}
          <ol className="flex flex-col divide-y divide-line border-t border-line">
            {results.map((r) => { const e = getEntityById(r.entityId)!; return (
              <li key={r.entityId}>
                <button type="button" onClick={() => setActive(r.entityId)} className={`flex w-full items-baseline justify-between gap-3 py-2 text-left hover:text-accent-ink ${sel?.entityId === r.entityId ? "text-accent-ink" : ""}`}>
                  <span className="text-[14px] font-semibold"><span className="tnum mr-2 text-[11px] text-ink-3">{String(r.rank).padStart(2, "0")}</span>{e.name}</span>
                  <span className="tnum text-[12.5px] font-semibold">{r.score !== null ? score1(r.score) : "—"} · {r.match !== null ? `%${r.match}` : "—"}</span>
                </button>
              </li>
            ); })}
          </ol>
        </div>
      </div>
      <div className="mt-12"><DemoNotice>Şematik harita; konumlar demodur, kullanıcı konumu alınmaz. Canlı kalabalık, masa veya bekleme süresi gösterilmez.</DemoNotice></div>
    </div>
  );
}
