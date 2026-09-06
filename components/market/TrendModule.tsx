"use client";

import { useMemo, useState } from "react";
import { nf, periodLabel, periodShort, score1 } from "@/lib/format";
import { TrendIndicator } from "@/components/score/TrendIndicator";
import type {
  ConsensusLevel, ExperienceVolume, Momentum, PeriodChange, TimelinePoint, TrendPeriod,
} from "@/lib/types";

const MOMENTUM_LABEL: Record<Momentum, string> = {
  strong_up: "Güçlü yükseliş",
  up: "Yükseliyor",
  stable: "Yatay",
  down: "Düşüyor",
  strong_down: "Hızlı düşüş",
};
const MOMENTUM_TONE: Record<Momentum, string> = {
  strong_up: "text-pos-ink", up: "text-pos-ink", stable: "text-ink-2",
  down: "text-neg-ink", strong_down: "text-neg-ink",
};
const MONTHS_BACK: Record<TrendPeriod, number> = {
  "7d": 1, "30d": 2, "90d": 4, "6m": 7, "1y": 13, all: 999,
};

/**
 * GİDENLER TREND — zaman serisi katmanı.
 *
 * Tasarım kuralı: bu bir finans terminali DEĞİLDİR. Mum grafiği,
 * neon yeşil/kırmızı ekran, canlı tik yok. Editoryal tipografi +
 * ciddi veri. Anlatılan tek şey: bir mekân bir zaman serisidir.
 */
export function TrendModule({
  name,
  score,
  timeline,
  periodChanges,
  momentum,
  volume,
  experienceCount,
  consensusLevel,
  expertScore,
  verifiedRatio,
}: {
  name: string;
  score: number;
  timeline: TimelinePoint[];
  periodChanges: PeriodChange[];
  momentum: Momentum;
  volume: ExperienceVolume;
  experienceCount: number;
  consensusLevel?: ConsensusLevel;
  expertScore?: number | null;
  verifiedRatio: number;
}) {
  const usable = periodChanges.filter((p) => p.sufficient);
  const [period, setPeriod] = useState<TrendPeriod>(usable.find((p) => p.period === "90d")?.period ?? usable[0]?.period ?? "all");

  const active = periodChanges.find((p) => p.period === period);

  const shown = useMemo(() => {
    const back = MONTHS_BACK[period];
    return back >= timeline.length ? timeline : timeline.slice(-1 - back);
  }, [timeline, period]);

  return (
    <section className="border-t-2 border-line-strong pt-7" aria-labelledby="trend">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h2 id="trend" className="text-[13px] font-bold uppercase tracking-[0.2em]">
          Gidenler trend
        </h2>
        <p className="max-w-[48ch] text-[12px] text-ink-3">
          Bir mekân bugünkü puanı değildir; bir zaman serisidir.
        </p>
      </div>

      {/* ── manşet: puan + seçili dönem değişimi + momentum ── */}
      <div className="mt-6 flex flex-wrap items-end gap-x-12 gap-y-6">
        <div className="flex flex-col gap-1">
          <span className="label">{name}</span>
          <span className="flex items-baseline gap-3">
            <span className="tnum text-[clamp(2.75rem,8vw,4rem)] font-extrabold leading-none tracking-[-0.05em]">
              {score1(score)}
            </span>
            {active && (
              <span className={`tnum flex items-baseline gap-1 text-[19px] font-bold ${
                active.direction === "up" ? "text-pos-ink"
                : active.direction === "down" ? "text-neg-ink" : "text-ink-3"}`}>
                <span aria-hidden>{active.direction === "up" ? "↑" : active.direction === "down" ? "↓" : "→"}</span>
                {active.deltaPct > 0 ? "+" : ""}{active.deltaPct.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </span>
            )}
          </span>
        </div>

        <dl className="flex flex-wrap gap-x-9 gap-y-5">
          <div className="flex flex-col gap-0.5">
            <dt className="label">Momentum</dt>
            <dd className={`text-[17px] font-bold tracking-tight ${MOMENTUM_TONE[momentum]}`}>
              {MOMENTUM_LABEL[momentum]}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="label">Deneyim hacmi</dt>
            <dd className="flex items-baseline gap-2">
              <span className="tnum text-[17px] font-bold tracking-tight">{nf(volume.count)}</span>
              <span className={`tnum text-[12px] font-semibold ${
                volume.direction === "up" ? "text-pos-ink" : volume.direction === "down" ? "text-neg-ink" : "text-ink-3"}`}>
                {volume.changePct > 0 ? "+" : ""}{volume.changePct}%
              </span>
            </dd>
            <span className="text-[11px] text-ink-3">{volume.label}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="label">Toplam deneyim</dt>
            <dd className="tnum text-[17px] font-bold tracking-tight">{nf(experienceCount)}</dd>
          </div>
          {consensusLevel && (
            <div className="flex flex-col gap-0.5">
              <dt className="label">Görüş birliği</dt>
              <dd className="text-[17px] font-bold capitalize tracking-tight">{consensusLevel}</dd>
            </div>
          )}
          {expertScore != null && (
            <div className="flex flex-col gap-0.5">
              <dt className="label">Uzman puanı</dt>
              <dd className="tnum text-[17px] font-bold tracking-tight">{score1(expertScore)}</dd>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <dt className="label">Doğrulanmış</dt>
            <dd className="tnum text-[17px] font-bold tracking-tight">%{Math.round(verifiedRatio * 100)}</dd>
          </div>
        </dl>
      </div>

      {/* ── dönem seçici ── */}
      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3">
        <span className="label">Dönem</span>
        {periodChanges.map((p) => (
          <button
            key={p.period}
            type="button"
            disabled={!p.sufficient}
            onClick={() => setPeriod(p.period)}
            aria-pressed={period === p.period}
            className={`flex items-baseline gap-1.5 text-[12px] font-semibold uppercase tracking-[0.11em] disabled:opacity-30 ${
              period === p.period ? "border-b-2 border-accent pb-0.5 text-ink" : "text-ink-3 hover:text-ink"
            }`}
          >
            {p.label}
            {p.sufficient && (
              <span className={`tnum normal-case tracking-normal ${
                p.direction === "up" ? "text-pos-ink" : p.direction === "down" ? "text-neg-ink" : "text-ink-3"}`}>
                {p.deltaPct > 0 ? "+" : ""}{p.deltaPct.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}%
              </span>
            )}
          </button>
        ))}
      </div>

      <TrendChart points={shown} />
    </section>
  );
}

/* ─────────────────────────── grafik ──────────────────────────── */

function TrendChart({ points }: { points: TimelinePoint[] }) {
  if (points.length < 2) {
    return (
      <p className="mt-6 border-t border-line pt-4 text-[13px] text-ink-3">
        Bu dönem için yeterli veri yok.
      </p>
    );
  }

  const W = 760, H = 190, padX = 4, padT = 26, padB = 44;
  const scores = points.map((p) => p.score);
  const lo = Math.floor(Math.min(...scores) * 2) / 2 - 0.4;
  const hi = Math.ceil(Math.max(...scores) * 2) / 2 + 0.4;
  const span = Math.max(1, hi - lo);
  const maxVol = Math.max(...points.map((p) => p.experienceCount), 1);

  const x = (i: number) => padX + (i * (W - padX * 2)) / (points.length - 1);
  const y = (v: number) => padT + (1 - (v - lo) / span) * (H - padT - padB);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;

  const first = points[0], last = points[points.length - 1];
  const d = last.score - first.score;
  const stroke = d < -0.2 ? "var(--neg)" : d > 0.2 ? "var(--pos)" : "var(--ink-2)";
  const barW = Math.min(14, (W - padX * 2) / points.length - 3);

  return (
    <figure className="mt-5">
      <div className="overflow-x-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-[190px] w-full min-w-[540px]"
          role="img"
          aria-label={`Aylık Gidenler puanı ve deneyim hacmi: ${points.map((p) => `${periodLabel(p.period)} ${score1(p.score)}, ${p.experienceCount} deneyim`).join("; ")}`}
        >
          <defs>
            <linearGradient id="tm-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.15" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* deneyim hacmi — puanın altında sessiz bir zemin */}
          {points.map((p, i) => {
            const h = (p.experienceCount / maxVol) * 22;
            return (
              <rect
                key={`v-${p.period}`}
                x={x(i) - barW / 2}
                y={H - padB + 8}
                width={barW}
                height={Math.max(1.5, h)}
                fill="var(--line-2)"
              />
            );
          })}
          <text x={padX} y={H - 5} fontSize="9.5" fontWeight="600" letterSpacing="0.12em" fill="var(--ink-3)">
            DENEYİM HACMİ
          </text>

          <line x1={padX} x2={W - padX} y1={H - padB} y2={H - padB} stroke="var(--line)" strokeWidth="1" />
          <path d={area} fill="url(#tm-fill)" />
          <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          <circle cx={x(0)} cy={y(first.score)} r="4" fill="var(--paper)" stroke={stroke} strokeWidth="2" />
          <circle cx={x(points.length - 1)} cy={y(last.score)} r="5" fill={stroke} stroke="var(--paper)" strokeWidth="2" />

          <text x={x(0)} y={y(first.score) - 12} fontSize="12" fontWeight="600" fill="var(--ink-3)">{score1(first.score)}</text>
          <text x={x(points.length - 1)} y={y(last.score) - 13} textAnchor="end" fontSize="13" fontWeight="700" fill="var(--ink)">{score1(last.score)}</text>

          {points.map((p, i) =>
            i % Math.ceil(points.length / 6) === 0 ? (
              <text key={p.period} x={x(i)} y={H - padB + 20} textAnchor="middle" fontSize="10.5" fontWeight="600" letterSpacing="0.06em" fill="var(--ink-3)">
                {periodShort(p.period)}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <figcaption className="mt-2 text-[11.5px] text-ink-3">
        {periodLabel(first.period)} → {periodLabel(last.period)} · çizgi Gidenler puanı, alttaki
        çubuklar o ay yazılan deneyim sayısı.
      </figcaption>
    </figure>
  );
}
