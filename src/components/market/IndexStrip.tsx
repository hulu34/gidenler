import Link from "next/link";
import type { ExperienceIndex } from "@/lib/types";

/**
 * GİDENLER ENDEKSLERİ — birçok mekânın toplu deneyim zekâsı.
 * V2'de demo; mimari ileride gerçek hesaplamayı taşıyacak.
 */
export function IndexStrip({ indices }: { indices: ExperienceIndex[] }) {
  return (
    <section aria-labelledby="endeksler">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
        <h2 id="endeksler" className="text-[13px] font-bold uppercase tracking-[0.2em]">
          Gidenler endeksleri
        </h2>
        <span className="border border-dashed border-line-2 px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.12em] text-ink-3">
          Demo veri
        </span>
      </div>

      <ul className="grid gap-x-10 gap-y-6 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {indices.map((i) => (
          <li key={i.id} className="flex flex-col gap-1">
            <span className="label leading-tight">{i.label}</span>
            <span className="flex items-baseline gap-2.5">
              <span className="tnum text-[30px] font-extrabold leading-none tracking-[-0.045em]">
                {i.value.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <span className={`tnum text-[13px] font-bold ${
                i.direction === "up" ? "text-pos-ink" : i.direction === "down" ? "text-neg-ink" : "text-ink-3"}`}>
                <span aria-hidden>{i.direction === "up" ? "↑" : i.direction === "down" ? "↓" : "→"}</span>{" "}
                {i.deltaPct > 0 ? "+" : ""}{i.deltaPct.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </span>
            </span>
            <span className="text-[11.5px] text-ink-3">
              {i.scope} · <span className="tnum">{i.memberCount.toLocaleString("tr-TR")}</span> mekân
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 max-w-[70ch] text-[12px] leading-relaxed text-ink-3">
        Endeksler tek tek mekânların deneyim verisinden toplanır. Bir semtin ya da bir
        mutfağın zaman içinde iyileşip iyileşmediğini gösterir — bu, tek tek yorumların
        toplamından farklı bir veridir.
      </p>
    </section>
  );
}
