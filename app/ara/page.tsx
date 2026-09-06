"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listCards, listCategories, search } from "@/lib/api";
import { effectiveProfile, getPersonalMatch } from "@/lib/decision";
import { useUserData } from "@/lib/store";
import { EntityCardRow } from "@/components/experience/EntityCardRow";
import { ReputationChip } from "@/components/creator/ReputationChip";

const ORNEKLER = ["Sakura", "japon", "Kadıköy", "filtre kahve", "@denizyer", "steakhouse"];

/**
 * ARA — kullanıcı ne aradığını biliyor: mekân, kategori, semt, kişi, liste.
 * SOR GİDENLER ayrıdır: orada karar verilir. İki ürün birbirine dönüştürülmez.
 * `?yaz=1` → deneyim yazmak için mekân seçme modu (Header'daki "Deneyim yaz").
 */
export default function SearchPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("hepsi");
  const [city, setCity] = useState("hepsi");
  const [district, setDistrict] = useState("hepsi");
  const [limit, setLimit] = useState(40);
  const [writeMode, setWriteMode] = useState(false);
  const cats = listCategories();
  const data = useUserData();
  const profile = useMemo(() => effectiveProfile(data.taste), [data.taste]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("q")) setQ(p.get("q")!);
    if (p.get("yaz")) setWriteMode(true);
    if (p.get("kategori")) setCat(p.get("kategori")!);
    if (p.get("sehir")) setCity(p.get("sehir")!);
    if (p.get("semt")) setDistrict(p.get("semt")!);
  }, []);
  /* konum listeleri — gerçek veriden; sahte mesafe yok */
  const allCards = useMemo(() => listCards(), []);
  const cities = useMemo(() => Array.from(new Set(allCards.map((c) => c.entity.location?.city).filter(Boolean))) as string[], [allCards]);
  const districts = useMemo(() => Array.from(new Set(allCards.filter((c) => city === "hepsi" || c.entity.location?.city === city).map((c) => c.entity.location?.district).filter(Boolean))).sort((a, b) => (a as string).localeCompare(b as string, "tr")) as string[], [allCards, city]);
  const inLoc = (e: { location?: { city?: string; district?: string } }) => (city === "hepsi" || e.location?.city === city) && (district === "hepsi" || e.location?.district === district);

  const qq = q.trim().replace(/^@/, "");
  const results = useMemo(() => {
    if (!qq) {
      const all = allCards.filter((c) => (cat === "hepsi" || c.category.id === cat) && inLoc(c.entity))
        .sort((a, b) => ((a.entity.tier === "C" ? 1 : 0) - (b.entity.tier === "C" ? 1 : 0)) || (b.score ?? 0) - (a.score ?? 0) || b.experienceCount - a.experienceCount);
      return { entities: all, creators: [], lists: [] };
    }
    const r = search(qq);
    const byId = new Map(allCards.map((c) => [c.entity.id, c]));
    return {
      ...r,
      entities: r.entities
        .map((e) => byId.get(e.entity.id)!)
        .filter((c) => c && (cat === "hepsi" || c.category.id === cat) && inLoc(c.entity)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qq, cat, city, district, allCards]);
  useEffect(() => setLimit(40), [qq, cat, city, district]);

  const total = results.entities.length + results.creators.length + results.lists.length;
  const matchOf = (id: string, showScores: boolean) => (showScores ? getPersonalMatch(id, "default", undefined, undefined, profile)?.score ?? null : null);

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <section className="pt-10 sm:pt-14">
        <p className="label">{writeMode ? "Deneyim yaz" : "Ara"}</p>
        <h1 className="mt-2 text-[clamp(2rem,6vw,3rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
          {writeMode ? "Nereye gittin?" : "Ne arıyorsun?"}
        </h1>
        <p className="mt-2 max-w-[56ch] text-[14.5px] text-ink-2">
          {writeMode ? "Deneyimini yazacağın mekânı seç. Bulamazsan ilk deneyimi yazan kişi başlığı açar." : "Mekân, kategori, semt, kişi veya liste ara."}{" "}
          {!writeMode && <>Karar vermek istiyorsan <Link href="/sor/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Sor Gidenler</Link>.</>}
        </p>

        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Sakura, japon, Kadıköy, @denizyer…"
          aria-label="Ara" autoFocus
          className="mt-6 h-12 w-full border-b-2 border-line-strong bg-transparent pb-1 text-[clamp(1.125rem,3vw,1.5rem)] outline-none placeholder:text-ink-3 focus:border-accent"
        />

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="label">Kategori</span>
          <button type="button" aria-pressed={cat === "hepsi"} onClick={() => setCat("hepsi")}
            className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${cat === "hepsi" ? "border-b-2 border-accent pb-0.5 text-ink" : "text-ink-3 hover:text-ink"}`}>Hepsi</button>
          {cats.map((c) => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}
              className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${cat === c.id ? "border-b-2 border-accent pb-0.5 text-ink" : "text-ink-3 hover:text-ink"}`}>{c.label}</button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="label">Konum</span>
          <select value={city} onChange={(e) => { setCity(e.target.value); setDistrict("hepsi"); }} aria-label="Şehir" className="h-8 border-b-2 border-line-2 bg-transparent text-[13px] font-semibold outline-none focus:border-accent">
            <option value="hepsi">Tüm şehirler</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="Semt" className="h-8 border-b-2 border-line-2 bg-transparent text-[13px] font-semibold outline-none focus:border-accent">
            <option value="hepsi">Tüm semtler</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {(city !== "hepsi" || district !== "hepsi") && <button type="button" onClick={() => { setCity("hepsi"); setDistrict("hepsi"); }} className="text-[12px] text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">temizle</button>}
        </div>

        {!qq && (
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ink-3">
            <span className="label">Dene</span>
            {ORNEKLER.map((o) => (
              <button key={o} type="button" onClick={() => setQ(o)} className="underline decoration-line-2 underline-offset-4 hover:text-ink">{o}</button>
            ))}
            {data.recentIntents.length > 0 && (
              <>
                <span className="label ml-2">Son aradıkların</span>
                {data.recentIntents.slice(0, 2).map((i) => (
                  <Link key={i.text} href={`/sor/?q=${encodeURIComponent(i.text)}`} className="underline decoration-line-2 underline-offset-4 hover:text-ink">{i.text}</Link>
                ))}
              </>
            )}
          </p>
        )}
      </section>

      {results.entities.length > 0 && (
        <section className="mt-9">
          <div className="flex items-baseline justify-between border-b-2 border-line-strong pb-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Mekânlar</h2>
            <span className="tnum label">{results.entities.length}</span>
          </div>
          <ul>
            {results.entities.slice(0, limit).map((c) => (
              <EntityCardRow key={c.entity.id} card={c} match={matchOf(c.entity.id, c.category.compliance.showScores)}
                href={writeMode ? `/yaz/${c.entity.slug}/` : undefined} />
            ))}
          </ul>
          {results.entities.length > limit && (
            <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
              <button type="button" onClick={() => setLimit((l) => l + 40)} className="inline-flex h-9 items-center border border-line-2 px-3.5 text-[13px] font-semibold hover:border-ink">Daha fazla göster</button>
              <span className="tnum text-[12px] text-ink-3">{Math.min(limit, results.entities.length)} / {results.entities.length}</span>
            </div>
          )}
        </section>
      )}

      {results.creators.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between border-b-2 border-line-strong pb-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Uzmanlar</h2>
            <span className="tnum label">{results.creators.length}</span>
          </div>
          <ul>
            {results.creators.map((u) => (
              <li key={u.id} className="border-b border-line">
                <Link href={`/@${u.handle}/`} className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 hover:bg-sheet">
                  <span className="flex flex-col gap-1">
                    <span className="text-[19px] font-bold tracking-[-0.02em] group-hover:text-accent-ink">@{u.handle}</span>
                    <ReputationChip reputation={u.reputation} kind={u.kind} />
                  </span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
                    {u.expertise.slice(0, 3).map((x) => <span key={x.key}>{x.label} <span className="tnum font-semibold text-ink-2">{x.score}</span></span>)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.lists.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between border-b-2 border-line-strong pb-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Listeler</h2>
            <span className="tnum label">{results.lists.length}</span>
          </div>
          <ul>
            {results.lists.map((l) => (
              <li key={l.id} className="border-b border-line">
                <Link href={`/liste/${l.slug}/`} className="group flex flex-col gap-1 py-4 hover:bg-sheet">
                  <span className="text-[19px] font-bold tracking-[-0.02em] group-hover:text-accent-ink">{l.title}</span>
                  <span className="text-[12px] text-ink-3">@{l.author.handle} · {l.entityIds.length} mekân</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {total === 0 && (
        <section className="mt-10 border-t-2 border-line-strong pt-6">
          <h2 className="text-[clamp(1.4rem,4vw,2rem)] font-extrabold leading-tight tracking-[-0.03em]">&ldquo;{q.trim()}&rdquo; için eşleşme yok.</h2>
          <p className="mt-2 max-w-[56ch] text-[14.5px] text-ink-2">Aradığın yer henüz Gidenler&apos;de olmayabilir; ilk deneyimi yazan kişi başlığı açar. Şunları deneyebilirsin:</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {cats.map((c) => <li key={c.id}><button type="button" onClick={() => { setQ(""); setCat(c.id); }} className="inline-flex h-9 items-center border border-line-2 px-3 text-[13px] font-semibold hover:border-ink">{c.label}</button></li>)}
            <li><Link href="/kesfet/" className="inline-flex h-9 items-center border border-line-2 px-3 text-[13px] font-semibold hover:border-ink">Keşfet</Link></li>
            <li><Link href={`/sor/?q=${encodeURIComponent(q.trim())}`} className="inline-flex h-9 items-center rounded-[3px] bg-accent px-3 text-[13px] font-semibold text-on-accent">Sor Gidenler&apos;e sor</Link></li>
          </ul>
        </section>
      )}
    </div>
  );
}
