import { contextFit, decisionContexts } from "@/data/taste";
import { consensusLabel } from "@/lib/semantic";
import { nf, periodLabel, score1 } from "@/lib/format";
import type { Pulse as PulseData } from "@/lib/pulse";
import type { TopicIntelligence } from "@/lib/types";
import { Pulse } from "@/components/viz/Pulse";

/* ──────────────────────────────────────────────────────────────────────────
   BİR BAKIŞTA — mekân sayfasının yeni ilk katı (mevcut bölümlerin ÜSTÜNE eklenir, hiçbirini kaldırmaz).
   Dört soru, dört kutu: Nereye gidiyor? · Kime uygun? · Gidenler hemfikir mi? · Tekrar gidiliyor mu?
   Her kutu veriye bağlı; veri yoksa kutu çizilmez (uydurma yok).
   ────────────────────────────────────────────────────────────────────────── */

export function AtAGlance({ entityId, intel, pulse }: { entityId: string; intel: TopicIntelligence; pulse: PulseData | null }) {
  const fit = contextFit[entityId] ?? {};
  /* contextFit: bağlama göre uyum düzeltmesi (puan, yaklaşık −35…+25). Iraksak çubuk: sağ = uygun, sol = değil. */
  const ctx = decisionContexts.filter((d) => d.key !== "default" && typeof fit[d.key] === "number")
    .map((d) => ({ label: d.label, v: fit[d.key] as number })).sort((a, b) => b.v - a.v);
  const raw = pulse?.raw ?? [];
  const best = raw.length ? raw.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const worst = raw.length ? raw.reduce((a, b) => (b.score < a.score ? b : a)) : null;
  const cons = consensusLabel(intel.consensus?.level);
  const pol = intel.consensus?.polarization ?? null;
  const ret = Math.round(intel.returnRate * 100);
  const ver = Math.round(intel.verifiedRatio * 100);

  const box = "flex flex-col gap-3 border-line p-5 sm:p-6";
  return (
    <section aria-labelledby="h-glance" className="mt-10">
      <div className="kunye"><h2 id="h-glance">Bir bakışta</h2><span className="text-[11.5px] text-ink-3">{nf(intel.experienceCount)} deneyimden · demo veri</span></div>
      <div className="mt-4 grid border border-line sm:grid-cols-2 lg:grid-cols-4 [&>*]:border-line max-sm:[&>*+*]:border-t sm:[&>*:nth-child(2n)]:border-l lg:[&>*+*]:border-l sm:max-lg:[&>*:nth-child(n+3)]:border-t">
        {pulse && (
          <div className={box}>
            <span className="label">Nereye gidiyor?</span>
            <Pulse pulse={pulse} width={220} height={54} draw />
            <span className="flex items-baseline gap-2">
              <span className={`tnum text-[26px] font-extrabold leading-none ${pulse.direction === "up" ? "text-accent-ink" : pulse.direction === "down" ? "text-neg-ink" : "text-ink"}`}>{pulse.delta > 0 ? "▲" : pulse.delta < 0 ? "▼" : "■"} {score1(Math.abs(pulse.delta))}</span>
              <span className="text-[12px] text-ink-3">son {raw.length} ay</span>
            </span>
            {best && worst && <span className="text-[12px] leading-snug text-ink-2">En iyi ay {periodLabel(best.period)} (<span className="tnum">{score1(best.score)}</span>), en zayıf {periodLabel(worst.period)} (<span className="tnum">{score1(worst.score)}</span>).</span>}
          </div>
        )}
        {ctx.length > 0 && (
          <div className={box}>
            <span className="label">Kime uygun?</span>
            <ul className="flex flex-col gap-2">
              {ctx.map((c) => {
                const w = Math.min(50, (Math.abs(c.v) / 25) * 50);
                return (
                  <li key={c.label} className="grid grid-cols-[6.5rem_1fr_2.25rem] items-center gap-2 text-[12.5px]">
                    <span className={`truncate ${c.v > 3 ? "font-semibold text-ink" : "text-ink-2"}`}>{c.label}</span>
                    <span className="relative h-2.5">
                      <span className="absolute inset-y-0 left-1/2 w-px bg-line-2" />
                      <span className={`absolute inset-y-0 ${c.v >= 0 ? "left-1/2 bg-pos" : "right-1/2 bg-neg"}`} style={{ width: `${w}%` }} />
                    </span>
                    <span className={`tnum text-right font-bold ${c.v > 0 ? "text-pos-ink" : c.v < 0 ? "text-neg-ink" : "text-ink-3"}`}>{c.v > 0 ? "+" : ""}{c.v}</span>
                  </li>
                );
              })}
            </ul>
            <span className="text-[11.5px] text-ink-3">Bu bağlamda gidenlerin deneyimi, genel uyuma göre kaç puan farklı.</span>
          </div>
        )}
        {cons && (
          <div className={box}>
            <span className="label">Gidenler hemfikir mi?</span>
            <span className="font-[family-name:var(--font-brand)] text-[30px] leading-none">{cons}</span>
            {pol !== null && (
              <span className="relative h-6 w-full" aria-label={`Görüş dağınıklığı %${Math.round(pol * 100)}`}>
                <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 bg-ink/10" style={{ width: `${Math.max(8, Math.round(pol * 100))}%` }} />
                <span className="absolute inset-y-0 left-1/2 w-px bg-ink" />
              </span>
            )}
            <span className="text-[12px] leading-snug text-ink-2">
              {intel.positiveThemes[0] && <>Övülen: <b className="text-pos-ink">{intel.positiveThemes[0].label}</b>. </>}
              {intel.negativeThemes[0] && <>Şikâyet: <b className="text-neg-ink">{intel.negativeThemes[0].label}</b>.</>}
            </span>
          </div>
        )}
        <div className={box}>
          <span className="label">Tekrar gidiliyor mu?</span>
          <span className="tnum font-[family-name:var(--font-brand)] text-[44px] leading-none">%{ret}</span>
          <span className="text-[12px] leading-snug text-ink-2">Gidenlerin tekrar gitme niyeti. Deneyimlerin <b className="tnum">%{ver}</b>&apos;i doğrulanmış ziyaret.</span>
        </div>
      </div>
    </section>
  );
}
