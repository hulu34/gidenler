"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { smoothPath } from "@/lib/pulse";
import { periodShort, score1 } from "@/lib/format";

export interface ScoreLiesData { name: string; slug: string; kind: string; district: string; score: number; n: number; series: Array<{ period: string; score: number }> }

const W = 640, H = 240, PX = 36, PT = 20, PB = 30;

export function ScoreLiesClient({ data }: { data: ScoreLiesData }) {
  const s = data.series;
  const known = Math.max(4, Math.floor(s.length * 0.58));
  const lo = Math.min(...s.map((p) => p.score)) - 0.6, hi = Math.max(...s.map((p) => p.score)) + 0.6;
  const x = (i: number) => PX + (i / (s.length - 1)) * (W - PX * 2);
  const y = (v: number) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
  const v = (py: number) => lo + (1 - (py - PT) / (H - PT - PB)) * (hi - lo);

  const [guess, setGuess] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState(false);
  const drawing = useRef(false);
  const svg = useRef<SVGSVGElement>(null);

  const onPoint = (e: React.PointerEvent) => {
    if (revealed || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H;
    const i = Math.round(((px - PX) / (W - PX * 2)) * (s.length - 1));
    if (i < known || i >= s.length) return;
    const val = Math.max(lo, Math.min(hi, v(py)));
    setGuess((g) => {
      const n = { ...g, [i]: val };
      /* aradaki boş ayları doğrusal doldur: çizgi kopmasın */
      const keys = [known - 1, ...Object.keys(n).map(Number).filter((k) => k >= known)].sort((a, b) => a - b);
      const base: Record<number, number> = { [known - 1]: s[known - 1].score, ...n };
      for (let k = 0; k < keys.length - 1; k++) {
        const a = keys[k], b = keys[k + 1];
        for (let j = a + 1; j < b; j++) if (n[j] === undefined) n[j] = base[a] + ((base[b] - base[a]) * (j - a)) / (b - a);
      }
      return n;
    });
  };

  const knownPath = useMemo(() => smoothPath(s.slice(0, known).map((p, i) => ({ x: x(i), y: y(p.score) }))), [s, known]); // eslint-disable-line react-hooks/exhaustive-deps
  const truthPath = useMemo(() => smoothPath(s.slice(known - 1).map((p, i) => ({ x: x(i + known - 1), y: y(p.score) }))), [s, known]); // eslint-disable-line react-hooks/exhaustive-deps
  const gIdx = Object.keys(guess).map(Number).sort((a, b) => a - b);
  const guessPath = gIdx.length ? smoothPath([{ x: x(known - 1), y: y(s[known - 1].score) }, ...gIdx.map((i) => ({ x: x(i), y: y(guess[i]) }))]) : "";
  const last3 = s.slice(-3).reduce((a, p) => a + p.score, 0) / 3;
  const prev = s.slice(-7, -3).reduce((a, p) => a + p.score, 0) / 4;
  const change = last3 - prev;

  return (
    <section aria-labelledby="h-lies" className="reveal grid gap-8 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-center">
      <div>
        <div className="kunye"><h2 id="h-lies">Tek puan yanıltır</h2><span /></div>
        <p className="mt-4 font-[family-name:var(--font-brand)] text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.02] tracking-[-0.01em]">
          {data.name} bugün <span className="tnum">{score1(data.score)}</span>. <br />Sence önümüzdeki aylar nasıl geçti?
        </p>
        <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-2">
          Gri alanın içine parmağınla ya da farenle çiz. Sonra gerçekte gidenlerin ne yaşadığını gör. Klasik bir puan sitesi sana yalnızca <b className="tnum">{score1(data.score)}</b> derdi.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setRevealed(true)} disabled={revealed} className="h-10 rounded-[3px] bg-ink px-4 text-[14px] font-semibold text-paper transition-colors hover:bg-accent disabled:opacity-40">
            {gIdx.length ? "Gerçeği göster" : "Çizmeden göster"}
          </button>
          {(revealed || gIdx.length > 0) && <button type="button" onClick={() => { setGuess({}); setRevealed(false); }} className="text-[13px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Yeniden çiz</button>}
        </div>
        {revealed && (
          <p className="rise mt-5 border-l-2 border-neg pl-4 text-[15px] leading-relaxed" aria-live="polite">
            Son 3 ayda deneyim <b className="tnum text-neg-ink">▼ {score1(Math.abs(change))}</b> düştü; puan hâlâ yüksek görünüyor.
            Gidenler bunu <i>puan düşmeden önce</i> gösterir. <Link href={`/mekan/${data.slug}/`} className="font-semibold underline decoration-line-2 underline-offset-4 hover:text-accent-ink">Mekânın tüm eğrisi →</Link>
          </p>
        )}
      </div>

      <figure className="select-none">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" role="img"
          aria-label={`${data.name}: ilk ${known} ayın puanı gösteriliyor; kalan ${s.length - known} ay için tahmin çizin`}
          onPointerDown={(e) => { drawing.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); onPoint(e); }}
          onPointerMove={(e) => { if (drawing.current) onPoint(e); }}
          onPointerUp={() => { drawing.current = false; }} onPointerLeave={() => { drawing.current = false; }}>
          <rect x={x(known - 1)} y={PT - 6} width={x(s.length - 1) - x(known - 1) + 8} height={H - PT - PB + 12} fill="var(--sheet)" stroke="var(--line-2)" strokeDasharray="3 4" />
          {!gIdx.length && !revealed && <text x={(x(known) + x(s.length - 1)) / 2} y={H / 2} textAnchor="middle" className="fill-[var(--ink-3)] text-[13px] font-semibold">buraya çiz ✎</text>}
          <line x1={PX} x2={W - PX} y1={y(data.score)} y2={y(data.score)} stroke="var(--line-2)" strokeDasharray="2 3" />
          <text x={W - PX} y={y(data.score) - 6} textAnchor="end" className="fill-[var(--ink-3)] text-[11px] font-semibold">tek puan {score1(data.score)}</text>
          <path d={knownPath} fill="none" stroke="var(--ink)" strokeWidth={2.2} strokeLinecap="round" />
          {guessPath && <path d={guessPath} fill="none" stroke="var(--accent)" strokeWidth={2.2} strokeDasharray="5 5" strokeLinecap="round" />}
          {revealed && <path d={truthPath} fill="none" stroke="var(--neg)" strokeWidth={2.6} strokeLinecap="round" pathLength={1} className="pulse-draw" />}
          {[0, known - 1, s.length - 1].map((i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="tnum fill-[var(--ink-3)] text-[11px]">{periodShort(s[i].period)}</text>)}
        </svg>
        <figcaption className="mt-1 flex flex-wrap gap-x-4 text-[11.5px] text-ink-3">
          <span><i className="mr-1 inline-block h-0.5 w-4 bg-ink align-middle" />bilinen</span>
          <span><i className="mr-1 inline-block h-0.5 w-4 bg-accent align-middle" />senin tahminin</span>
          <span><i className="mr-1 inline-block h-0.5 w-4 bg-neg align-middle" />gerçek</span>
          <span className="ml-auto">{data.kind} · {data.district} · n={data.n} · demo veri</span>
        </figcaption>
      </figure>
    </section>
  );
}
