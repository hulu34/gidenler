"use client";

import Link from "next/link";
import { useMemo } from "react";
import { effectiveProfile, getPersonalMatch, tasteSourceOf } from "@/lib/decision";
import { resetTaste, toggleDislike, updateTasteCuisine, updateTasteDimension, useUserData } from "@/lib/store";
import type { TasteLevel } from "@/lib/types";

const LEVELS: TasteLevel[] = ["düşük", "orta", "yüksek", "çok yüksek"];
const DISLIKES = ["kalabalık", "gürültü", "uzun bekleme", "ilgisiz servis"];
const PREVIEW = [["ent.sakura-omakase", "Sakura"], ["ent.moda-lokantasi", "Moda"], ["ent.koz-durum", "Köz"], ["ent.asma-teras", "Asma"]] as const;

/**
 * ZEVKİM — kullanıcı algoritmanın söylediğini düzeltebilir.
 * "Sen seçtin" ile "deneyimlerinden öğrendik" ayrı etiketlenir.
 * Düzenleme demo profili değil, üstüne yazılan tercihleri değiştirir; uyum anında yeniden hesaplanır.
 */
export function TasteEditor({ compact = false }: { compact?: boolean }) {
  const data = useUserData();
  const profile = useMemo(() => effectiveProfile(data.taste), [data.taste]);
  const preview = useMemo(() => PREVIEW.map(([id, name]) => ({ name, id, m: getPersonalMatch(id, "default", undefined, undefined, profile)?.score ?? null })), [profile]);
  const edited = Object.keys(data.taste.dimensions).length + Object.keys(data.taste.cuisines).length + data.taste.dislikes.length > 0;

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-x-14 gap-y-7 lg:grid-cols-[1.3fr_1fr]">
        <section className="flex flex-col gap-3" aria-label="Benim için önemli">
          <div className="flex items-baseline justify-between gap-4">
            <span className="label">Benim için önemli</span>
            <span className="text-[11.5px] text-ink-3">0 = önemsiz · 100 = vazgeçilmez</span>
          </div>
          <ul className="flex flex-col gap-3">
            {[...profile.dimensions].sort((a, b) => b.weight - a.weight).map((d) => {
              const src = tasteSourceOf(data.taste, "dimension", d.key);
              return (
                <li key={d.key} className="grid grid-cols-[120px_1fr_44px] items-center gap-3 sm:grid-cols-[150px_1fr_44px_130px]">
                  <label htmlFor={`t-${d.key}`} className="text-[14px] font-semibold">{d.label}</label>
                  <input id={`t-${d.key}`} type="range" min={0} max={100} value={d.weight} onChange={(e) => updateTasteDimension(d.key, Number(e.target.value))}
                    className="h-1.5 w-full accent-[var(--accent)]" aria-valuetext={`${d.weight}`} />
                  <span className="tnum text-right text-[13px] font-bold">{d.weight}</span>
                  <span className="hidden text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-3 sm:block">{src === "explicit" ? "sen seçtin" : "deneyimlerinden"}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2" aria-label="Sevdiğim mutfaklar">
            <span className="label">Sevdiğim mutfaklar</span>
            <ul className="flex flex-col divide-y divide-line">
              {profile.cuisinePreferences.map((c) => {
                const src = tasteSourceOf(data.taste, "cuisine", c.key);
                return (
                  <li key={c.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                    <span className="text-[14px] font-semibold">{c.label} <span className="ml-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">{src === "explicit" ? "sen seçtin" : "deneyimlerinden"}</span></span>
                    <select value={c.level} onChange={(e) => updateTasteCuisine(c.key, e.target.value as TasteLevel)} aria-label={`${c.label} tercihi`}
                      className="h-8 border-b-2 border-line-2 bg-transparent text-[13px] font-semibold outline-none focus:border-accent">
                      {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="flex flex-col gap-2" aria-label="Sevmediklerim">
            <span className="label">Bunları sevmem</span>
            <div className="flex flex-wrap gap-1.5">
              {DISLIKES.map((t) => {
                const on = data.taste.dislikes.includes(t);
                return <button key={t} type="button" aria-pressed={on} onClick={() => toggleDislike(t)} className={`h-8 border px-3 text-[13px] font-semibold ${on ? "border-accent bg-accent text-on-accent" : "border-line-2 hover:border-ink"}`}>{t}</button>;
              })}
            </div>
            <p className="text-[11.5px] text-ink-3">"Kalabalık" sessizliği, "ilgisiz servis" servisi öne çıkarır.</p>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-line pt-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="label">Şu an uyumun</span>
          {preview.map((p) => (
            <Link key={p.id} href={`/mekan/${p.id.replace("ent.", "")}/`} className="flex items-baseline gap-1.5 hover:text-accent-ink">
              <span className="text-[13.5px] font-semibold">{p.name}</span>
              <span className="tnum text-[15px] font-extrabold text-accent-ink">{p.m === null ? "—" : `%${p.m}`}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[12.5px]">
          {edited && <button type="button" onClick={resetTaste} className="text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Çıkarımlara dön</button>}
          <span className="text-ink-3">{profile.visibility === "private" ? "Özel — yalnızca sen görürsün" : "Herkese açık"}</span>
        </div>
      </div>
      {!compact && (
        <p className="max-w-[70ch] text-[12.5px] leading-relaxed text-ink-3">
          Bu profil prototipte {profile.basedOnExperiences} demo deneyimden çıkarılmış gibi davranır. Gerçekte ziyaretlerinden ve yazdıklarından öğrenilir; sen düzelttiğinde senin seçimin çıkarımın üstüne yazar. Sor Gidenler'deki bir soru bu profili kalıcı olarak değiştirmez.
        </p>
      )}
    </div>
  );
}
