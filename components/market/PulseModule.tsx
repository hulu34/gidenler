import Link from "next/link";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { IndexStrip } from "@/components/market/IndexStrip";
import { listIndices, pulse } from "@/lib/api";
import { nf, score1 } from "@/lib/format";

/**
 * AĞIN NABZI — Gidenler Pulse + endeksler. Ana sayfadan Keşfet'e taşındı (V6):
 * ana sayfa karar verdirir, burası ağın nereye kıpırdadığını gösterir.
 */
export function PulseModule({ city = "İstanbul" }: { city?: string }) {
  const p = pulse(city);
  const idx = listIndices();
  return (
    <>
      <section aria-labelledby="pulse" className="mt-16 border-y-2 border-line-strong py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="pulse" className="text-[13px] font-bold uppercase tracking-[0.2em]">
            Gidenler Pulse
          </h2>
          <p className="max-w-[48ch] text-[12px] text-ink-3">
            Yukarıdaki deneyimlerden çıkan özet: son 90 günde ağ nereye kıpırdadı?
          </p>
        </div>

        <dl className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "En hızlı toparlanan", c: p.rising, tone: "text-pos-ink", arrow: "↑" },
            { l: "En hızlı gerileyen", c: p.falling, tone: "text-neg-ink", arrow: "↓" },
          ].map(({ l, c, tone, arrow }) =>
            c ? (
              <div key={l} className="flex flex-col gap-1">
                <dt className="label">{l}</dt>
                <dd>
                  <Link href={`/mekan/${c.entity.slug}/`} className="group flex flex-col gap-0.5">
                    <span className="text-[17px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink">
                      {c.entity.name}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <ScoreNumber score={c.score!} size="md" />
                      <span className={`tnum text-[13px] font-bold ${tone}`}>
                        <span aria-hidden>{arrow}</span> {c.delta90d > 0 ? "+" : ""}
                        {c.delta90d.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                    </span>
                    <span className="text-[11.5px] text-ink-3">son 90 gün</span>
                  </Link>
                </dd>
              </div>
            ) : null,
          )}

          {p.busiest && p.busiestVolume && (
            <div className="flex flex-col gap-1">
              <dt className="label">En çok deneyim alan</dt>
              <dd>
                <Link href={`/mekan/${p.busiest.entity.slug}/`} className="group flex flex-col gap-0.5">
                  <span className="text-[17px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink">
                    {p.busiest.entity.name}
                  </span>
                  <span className="tnum text-[26px] font-extrabold leading-none tracking-[-0.045em]">
                    {nf(p.busiestVolume.count)}
                  </span>
                  <span className="text-[11.5px] text-ink-3">son 30 günde yeni deneyim</span>
                </Link>
              </dd>
            </div>
          )}

          {p.expertPick && (
            <div className="flex flex-col gap-1">
              <dt className="label">Uzman görüşü</dt>
              <dd>
                <Link href={`/mekan/${p.expertPick.card.entity.slug}/`} className="group flex flex-col gap-0.5">
                  <span className="text-[17px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink">
                    {p.expertPick.card.entity.name}
                  </span>
                  <span className="tnum text-[26px] font-extrabold leading-none tracking-[-0.045em]">
                    {score1(p.expertPick.experience.overall)}
                  </span>
                  <span className="text-[11.5px] text-ink-3">
                    @{p.expertPick.experience.author.handle} ·{" "}
                    {p.expertPick.experience.author.expertise[0]?.label}
                  </span>
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </section>

      <div className="mt-14">
        <p className="prose-exp mb-7 max-w-[56ch] text-[clamp(1.0625rem,2vw,1.25rem)] leading-[1.45] text-ink-2">
          Tek tek deneyimler toplandığında bir semtin ya da bir mutfağın da nereye gittiği ölçülebiliyor.
        </p>
        <IndexStrip indices={idx} />
      </div>

    </>
  );
}
