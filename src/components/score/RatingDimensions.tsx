import { score1 } from "@/lib/format";
import { TrendIndicator } from "./TrendIndicator";
import type { TopicIntelligence } from "@/lib/types";

/**
 * Alt puanlar. RatingSchema'dan gelir — kategori değişince UI değişmez.
 * Mobilde accordion ya da yatay scroll YOK; ikili ızgara.
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
          <span className="tnum text-[26px] font-extrabold leading-none tracking-[-0.04em]">
            {score1(d.value)}
          </span>
          <span className="block h-[5px] w-full bg-sunk" aria-hidden>
            <span
              className="block h-full bg-accent"
              style={{ width: `${Math.max(2, d.value * 10)}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
