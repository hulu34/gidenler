"use client";

import { useEffect, useMemo, useState } from "react";
import { listCards } from "@/lib/api";
import { effectiveProfile, getPersonalMatch } from "@/lib/decision";
import { useUserData } from "@/lib/store";
import { EntityCardRow } from "@/components/experience/EntityCardRow";

const PAGE = 40;
type Sort = "puan" | "yukselen" | "konusulan";

/** Kategori listesi — semt, alt tür ve sıralama gerçek çalışır; 1.500 kart aynı anda DOM'a girmez. */
export function CategoryList({ categoryId, subs, cities }: { categoryId: string; subs: string[]; cities: string[] }) {
  const data = useUserData();
  const profile = useMemo(() => effectiveProfile(data.taste), [data.taste]);
  const all = useMemo(() => listCards().filter((c) => c.category.id === categoryId), [categoryId]);
  const [sub, setSub] = useState("hepsi");
  const [city, setCity] = useState("hepsi");
  const [district, setDistrict] = useState("hepsi");
  const [sort, setSort] = useState<Sort>("puan");
  const [limit, setLimit] = useState(PAGE);
  /* Ana sayfa "Tümünü gör →" bağlantıları: ?sirala=puan|yukselen|konusulan&sehir=İstanbul&alt=Kahveci */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const so = p.get("sirala"); if (so === "puan" || so === "yukselen" || so === "konusulan") setSort(so);
    if (p.get("sehir")) setCity(p.get("sehir")!);
    if (p.get("alt")) setSub(p.get("alt")!);
  }, []);
  const districts = useMemo(() => Array.from(new Set(all.filter((c) => city === "hepsi" || c.entity.location?.city === city).map((c) => c.entity.location?.district).filter(Boolean))).sort((a, b) => (a as string).localeCompare(b as string, "tr")) as string[], [all, city]);
  const rows = useMemo(() => all
    .filter((c) => (sub === "hepsi" || c.entity.subcategory === sub) && (city === "hepsi" || c.entity.location?.city === city) && (district === "hepsi" || c.entity.location?.district === district))
    .sort((a, b) => sort === "puan" ? ((b.score ?? -1) - (a.score ?? -1)) || b.experienceCount - a.experienceCount : sort === "yukselen" ? b.delta90d - a.delta90d : b.experienceCount - a.experienceCount), [all, sub, city, district, sort]);
  useEffect(() => setLimit(PAGE), [sub, city, district, sort]);
  const showScores = all[0]?.category.compliance.showScores ?? true;

  const chip = (on: boolean) => `inline-flex h-8 items-center border px-3 text-[12.5px] font-semibold ${on ? "border-accent bg-accent text-on-accent" : "border-line-2 hover:border-ink"}`;
  return (
    <div className="flex flex-col gap-5">
      {subs.length > 1 && (
        <div className="flex flex-wrap items-center gap-2"><span className="label mr-1">Alt tür</span>
          <button type="button" aria-pressed={sub === "hepsi"} onClick={() => setSub("hepsi")} className={chip(sub === "hepsi")}>Hepsi</button>
          {subs.map((s) => <button key={s} type="button" aria-pressed={sub === s} onClick={() => setSub(s)} className={chip(sub === s)}>{s}</button>)}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="label">Konum</span>
        <select value={city} onChange={(e) => { setCity(e.target.value); setDistrict("hepsi"); }} aria-label="Şehir" className="h-8 border-b-2 border-line-2 bg-transparent text-[13px] font-semibold outline-none focus:border-accent">
          <option value="hepsi">Tüm şehirler</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="Semt" className="h-8 border-b-2 border-line-2 bg-transparent text-[13px] font-semibold outline-none focus:border-accent">
          <option value="hepsi">Tüm semtler</option>{districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {showScores && (
          <span className="ml-auto flex items-center gap-2"><span className="label">Sırala</span>
            {([["puan", "Puan"], ["yukselen", "Yükselen"], ["konusulan", "En çok konuşulan"]] as Array<[Sort, string]>).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)} className={`text-[12px] font-semibold uppercase tracking-[0.1em] ${sort === k ? "border-b-2 border-accent pb-0.5 text-ink" : "text-ink-3 hover:text-ink"}`}>{l}</button>
            ))}
          </span>
        )}
      </div>
      <ul className="border-t border-line">
        {rows.slice(0, limit).map((c, i) => (
          <EntityCardRow key={c.entity.id} card={c} rank={sort === "puan" && showScores ? i + 1 : undefined}
            match={showScores ? getPersonalMatch(c.entity.id, "default", undefined, undefined, profile)?.score ?? null : null} />
        ))}
      </ul>
      {rows.length === 0 && <p className="text-[14px] text-ink-2">Bu filtreyle kayıt yok.</p>}
      {rows.length > limit && (
        <div className="flex items-center gap-4 border-t border-line pt-4">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="inline-flex h-9 items-center border border-line-2 px-3.5 text-[13px] font-semibold hover:border-ink">Daha fazla göster</button>
          <span className="tnum text-[12px] text-ink-3">{Math.min(limit, rows.length)} / {rows.length}</span>
        </div>
      )}
    </div>
  );
}
