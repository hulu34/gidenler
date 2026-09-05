import { TrendIndicator } from "./TrendIndicator";
import { ScoreNumber } from "./ScoreNumber";
import { getScoreSemantic } from "@/lib/semantic";
import type { TopicIntelligence } from "@/lib/types";

/**
 * Alt puanlar. RatingSchema'dan gelir — kategori değişince UI değişmez.
 * Mobilde accordion ya da yatay scroll YOK; ikili ızgara.
 * Renk = kalite (semantik); marka mavisi burada kullanılmaz.
 */
export function RatingDimensions({ dimensions }: { dimensions: TopicIntelligence["ratingDimensions"] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
      {dimensions.map((d) => (
        <li key={d.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="label leading-tight">{d.label}</span>
            <TrendIndicator direction={d.trend.direction} delta={d.trend.delta} />
          </div>
          <ScoreNumber score={d.value} size="md" />
          <span className="block h-[4px] w-full bg-sunk" aria-hidden>
            <span
              className={`block h-full ${getScoreSemantic(d.value).dot}`}
              style={{ width: `${Math.max(2, d.value * 10)}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
