import Link from "next/link";
import { inIstanbul, listCards } from "@/lib/api";
import { cityRidges, smoothPath } from "@/lib/pulse";
import { nf, score1 } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────────────────
   SEMTLER — gazete ızgarası. Semt adı dev serif başlık (tipografi = görsel),
   altında semtin aylık deneyim hacmi çizgisi ve şu an en iyi giden yer.
   ────────────────────────────────────────────────────────────────────────── */

export function Districts() {
  const { ridges } = cityRidges(6);
  const cards = listCards().filter((c) => inIstanbul(c) && c.category.compliance.showScores && c.score !== null && c.experienceCount >= 40);
  return (
    <section aria-labelledby="h-districts" className="reveal">
      <div className="kunye"><h2 id="h-districts">Semtler · ne oluyor?</h2><span className="text-[11.5px] text-ink-3">aylık deneyim hacmi</span></div>
      <ul className="mt-5 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {ridges.map((r) => {
          const max = Math.max(...r.values, 1);
          const pts = r.values.map((v, i) => ({ x: 2 + (i / (r.values.length - 1)) * 236, y: 46 - (v / max) * 40 }));
          const top = cards.filter((c) => c.entity.location?.district === r.district).sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.experienceCount - a.experienceCount)[0];
          const trend = r.values[r.values.length - 1] - r.values[r.values.length - 4];
          return (
            <li key={r.district} className="border-b border-r border-line">
              <Link href={`/ara/?q=${encodeURIComponent(r.district)}`} className="group flex h-full flex-col gap-3 p-5 transition-colors hover:bg-sheet">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-[family-name:var(--font-brand)] text-[clamp(2rem,3.4vw,2.75rem)] leading-none group-hover:text-accent-ink">{r.district}</span>
                  <span className={`tnum text-[12px] font-bold ${trend >= 0 ? "text-pos-ink" : "text-neg-ink"}`}>{trend >= 0 ? "▲" : "▼"} %{Math.abs(Math.round((trend / Math.max(1, r.values[r.values.length - 4])) * 100))}</span>
                </span>
                <svg viewBox="0 0 240 50" className="h-12 w-full" aria-hidden>
                  <path d={`${smoothPath(pts)} L238,48 L2,48 Z`} fill="var(--ink)" opacity={0.06} />
                  <path d={smoothPath(pts)} fill="none" stroke="var(--ink)" strokeWidth={1.4} pathLength={1} className="pulse-draw" />
                </svg>
                <span className="flex items-baseline justify-between gap-3 text-[12px] text-ink-3">
                  <span className="tnum">{nf(r.total)} deneyim · 14 ay</span>
                  {top && <span className="truncate">Şu an önde: <b className="text-ink">{top.entity.name}</b> <span className="tnum">{score1(top.score!)}</span></span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
