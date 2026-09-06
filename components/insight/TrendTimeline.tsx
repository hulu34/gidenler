import { periodLabel, periodShort, score1 } from "@/lib/format";
import type { TimelinePoint } from "@/lib/types";

/**
 * ZAMAN EKSENİ — ürünün savunulabilir farkı.
 * Bir mekân bugünkü puanı değildir; bir eğridir.
 *
 * Form seçimi: değişim-zaman → çizgi + alan. Tek seri olduğu için
 * legend yok (başlık seriyi adlandırıyor); yalnızca uç noktalar
 * etiketlenir, her noktaya sayı basılmaz.
 */
export function TrendTimeline({ points }: { points: TimelinePoint[] }) {
  if (points.length < 3) return null;

  const W = 720;
  const H = 168;
  const padX = 4;
  const padT = 22;
  const padB = 26;

  const scores = points.map((p) => p.score);
  const lo = Math.floor(Math.min(...scores) * 2) / 2 - 0.5;
  const hi = Math.ceil(Math.max(...scores) * 2) / 2 + 0.5;
  const span = Math.max(1, hi - lo);

  const x = (i: number) => padX + (i * (W - padX * 2)) / (points.length - 1);
  const y = (v: number) => padT + (1 - (v - lo) / span) * (H - padT - padB);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.score - first.score;
  const dir = delta > 0.2 ? "up" : delta < -0.2 ? "down" : "flat";
  const stroke = dir === "down" ? "var(--neg)" : dir === "up" ? "var(--pos)" : "var(--ink-2)";

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="label">Zaman ekseni</h2>
        <p className="text-[12px] text-ink-3">
          {periodLabel(first.period)} → {periodLabel(last.period)} ·{" "}
          <span className={dir === "down" ? "text-neg-ink font-semibold" : dir === "up" ? "text-pos-ink font-semibold" : ""}>
            {dir === "flat"
              ? "yatay seyrediyor"
              : `${delta > 0 ? "+" : ""}${score1(delta)} puan`}
          </span>
        </p>
      </figcaption>

      <div className="overflow-x-auto border-t border-line pt-2 no-scrollbar">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-[168px] w-full min-w-[520px]"
          role="img"
          aria-label={`Aylık Gidenler puanı: ${points.map((p) => `${periodLabel(p.period)} ${score1(p.score)}`).join(", ")}`}
        >
          <defs>
            <linearGradient id="tl-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* recessive baseline */}
          <line x1={padX} x2={W - padX} y1={H - padB} y2={H - padB} stroke="var(--line)" strokeWidth="1" />

          <path d={area} fill="url(#tl-fill)" />
          <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* yalnızca uçlar vurgulanır */}
          <circle cx={x(0)} cy={y(first.score)} r="4" fill="var(--paper)" stroke={stroke} strokeWidth="2" />
          <circle cx={x(points.length - 1)} cy={y(last.score)} r="5" fill={stroke} stroke="var(--paper)" strokeWidth="2" />

          <text
            x={x(points.length - 1)}
            y={y(last.score) - 12}
            textAnchor="end"
            className="tnum"
            fontSize="13"
            fontWeight="700"
            fill="var(--ink)"
          >
            {score1(last.score)}
          </text>
          <text
            x={x(0)}
            y={y(first.score) - 12}
            textAnchor="start"
            className="tnum"
            fontSize="12"
            fontWeight="600"
            fill="var(--ink-3)"
          >
            {score1(first.score)}
          </text>

          {points.map((p, i) =>
            i % 2 === 0 || points.length <= 7 ? (
              <text
                key={p.period}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="600"
                letterSpacing="0.06em"
                fill="var(--ink-3)"
              >
                {periodShort(p.period)}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </figure>
  );
}
