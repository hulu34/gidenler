"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { compareEntities } from "@/lib/decision";
import { listCards } from "@/lib/api";
import { getEntityById } from "@/data/entities";
import { score1 } from "@/lib/format";
import { getScoreSemantic } from "@/lib/semantic";
import { WhyThisResult } from "@/components/decision/WhyThisResult";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { EntityActions } from "@/components/decision/EntityActions";
import type { ComparisonRow } from "@/lib/types";

function fmt(v: number | string | null, f: ComparisonRow["format"]) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (f === "score") return score1(v);
  if (f === "pct") return `%${v}`;
  if (f === "delta") return `${v > 0 ? "+" : ""}${score1(v)}`;
  return String(v);
}

/**
 * KARŞILAŞTIR — sonuç tablo değil, karar. Tablo destekleyicidir.
 * "Hangisine gitmelisin?" + neden + bağlama göre değişen cevap.
 */
export default function ComparePage() {
  const cards = useMemo(() => listCards().filter((c) => c.score !== null && c.category.compliance.showScores), []);
  const [a, setA] = useState("sakura-omakase");
  const [b, setB] = useState("moda-lokantasi");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("a")) setA(p.get("a")!);
    if (p.get("b")) setB(p.get("b")!);
  }, []);

  const cmp = useMemo(() => (a !== b ? compareEntities([a, b]) : null), [a, b]);
  const ents = cmp ? cmp.entityIds.map((id) => getEntityById(id)!) : [];
  const winner = cmp ? getEntityById(cmp.winnerId)! : null;

  const Select = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      <select value={v} onChange={(e) => set(e.target.value)} className="h-10 border-b-2 border-line-strong bg-transparent text-[16px] font-semibold outline-none focus:border-accent">
        {cards.map((c) => <option key={c.entity.slug} value={c.entity.slug}>{c.entity.name}</option>)}
      </select>
    </label>
  );

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <section className="pt-10 sm:pt-14">
        <p className="label">Karşılaştır</p>
        <h1 className="mt-2 max-w-[16ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
          Hangisine gitmelisin?
        </h1>
        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <Select v={a} set={setA} label="Birinci" />
          <span className="hidden font-[family-name:var(--font-brand)] text-[28px] italic text-ink-3 sm:block">vs</span>
          <Select v={b} set={setB} label="İkinci" />
        </div>
      </section>

      {cmp && winner && (
        <>
          <section className="mt-9 border-t-2 border-line-strong pt-7">
            <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[1.3fr_1fr]">
              <div className="flex flex-col gap-4">
                <span className="label">Senin için</span>
                <Link href={`/mekan/${winner.slug}/`} className="text-[clamp(2rem,6vw,3.2rem)] font-extrabold leading-[0.98] tracking-[-0.045em] text-accent-ink hover:underline">
                  {winner.name}
                </Link>
                <WhyThisResult reasons={cmp.reasons} warnings={cmp.warnings} />
                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  <EntityActions entityId={winner.id} entitySlug={winner.slug} entityName={winner.name} variant="compact" via="compare" />
                  <Link href={`/birlikte/?q=${encodeURIComponent(`${ents[0].name} mı ${ents[1].name} mı?`)}`} className="inline-flex h-9 items-center rounded-[3px] border border-line-2 px-3.5 text-[13.5px] font-semibold hover:border-ink">Gruba sor</Link>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-line pt-4 lg:border-t-0 lg:pt-0">
                <span className="label">Duruma göre</span>
                <ul className="flex flex-col">
                  {cmp.byContext.map((x) => (
                    <li key={x.label} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 text-[14.5px]">
                      <span className="text-ink-2">{x.label}</span>
                      <span className="font-bold">{getEntityById(x.entityId)?.name}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[11.5px] text-ink-3">Bağlam profilini değiştirmez; öncelikleri o durum için geçici kaydırır.</p>
              </div>
            </div>
          </section>

          <section className="mt-12" aria-label="Karşılaştırma tablosu">
            <div className="flex items-baseline justify-between border-b-2 border-line-strong pb-3">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Yan yana</h2>
              <span className="text-[12px] text-ink-3">Destekleyici veri — karar yukarıda.</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[14px]">
                <thead>
                  <tr>
                    <th className="py-3 text-left label font-bold">Ölçüt</th>
                    {ents.map((e) => (
                      <th key={e.id} className="py-3 text-right text-[15px] font-bold tracking-[-0.01em]">
                        <Link href={`/mekan/${e.slug}/`} className="hover:text-accent-ink">{e.name}</Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cmp.rows.map((r) => {
                    const nums = r.values.map((v) => (typeof v === "number" ? v : null));
                    const best = r.format === "text" ? -1 : nums.indexOf(r.higherIsBetter ? Math.max(...nums.map((n) => n ?? -Infinity)) : Math.min(...nums.map((n) => n ?? Infinity)));
                    return (
                      <tr key={r.key} className="border-t border-line">
                        <td className="py-2.5 pr-4 text-ink-2">{r.label}{r.key === "match" || r.key === "similar" ? <span className="ml-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3">demo</span> : null}</td>
                        {r.values.map((v, i) => {
                          const isBest = i === best && nums.filter((n) => n !== null).length > 1 && new Set(nums).size > 1;
                          /* Semantik sistem: puan rengi = kalite; değişim = yön; uyum = marka; oranlar nötr. */
                          const tone = typeof v !== "number" ? "" :
                            r.format === "score" ? getScoreSemantic(v).text :
                            r.format === "delta" ? (v > 0 ? "text-pos-ink" : v < 0 ? "text-neg-ink" : "text-ink-3") :
                            r.key === "match" ? "text-accent-ink" : "";
                          return (
                            <td key={i} className={`tnum py-2.5 text-right ${tone} ${isBest ? "font-extrabold" : "font-semibold"}`}>
                              {fmt(v, r.format)}{isBest && <span className="sr-only"> (daha iyi)</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <div className="mt-12"><DemoNotice>"Sana göre" ve "Sana benzeyenler" satırları demo zevk profiline dayanır. Gidenler puanı ve boyutlar topluluğun deneyimlerinden gelir; iki sistem toplanmaz.</DemoNotice></div>
    </div>
  );
}
