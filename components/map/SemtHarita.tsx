"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import sinirlar from "@/data/harita/ilceler.json";
import { activeEntities } from "@/data/real/presentation";
import { useGoogleRatings } from "@/components/google/GoogleRatings";
import { usePublished } from "@/components/score/PublishedProvider";
import { fmtPublished } from "@/lib/score/publishedCards";
import {
  GRUP, TUR_GRUPLARI, YAKA_AD, baskin, bbox, fit, grupOf, grupSay, labelAt, mahalleAta, norm, pathD, project, sirala,
  type Box, type Ilce, type Mahalle, type Proj, type Yaka,
} from "@/lib/harita/semt";

/* SEMT HARİTASI — "hangi semtte ne yenir". İstanbul → yaka → ilçe → mahalle; bölge rengi baskın tür grubu.
   Sınırlar ve mekân konumları OpenStreetMap'ten (ODbL). Kullanıcı konumu alınmaz; dış harita servisine istek gitmez.
   Google puanı 5 üzerinden, sitenin onaylı aktarımından; Gidenler puanıyla (10 üzerinden) birleşmez. */

const PROJ = sinirlar.proj as Proj;
const ILCELER = sinirlar.ilceler as unknown as Ilce[];
const ILCE_BY = new Map(ILCELER.map((i) => [i.slug, i]));
const ILCE_BY_NORM = new Map(ILCELER.map((i) => [norm(i.ad), i]));
const ASPECT = 1.45;
const LIST_CAP = 6;

interface Yer {
  slug: string; name: string; kind?: string; grup: string; ilce: string; district: string;
  neighborhood?: string; address?: string; lat?: number; lng?: number; xy?: [number, number];
}
const YERLER: Yer[] = activeEntities.flatMap((e) => {
  const ilce = e.location?.district ? ILCE_BY_NORM.get(norm(e.location.district)) : undefined;
  if (!ilce) return [];
  const geo = e.location?.geo;
  return [{
    slug: e.slug, name: e.name, kind: e.subcategory, grup: grupOf(e.subcategory), ilce: ilce.slug, district: ilce.ad,
    neighborhood: e.location?.neighborhood, address: e.address, lat: geo?.lat, lng: geo?.lng, xy: geo ? project(PROJ, geo.lat, geo.lng) : undefined,
  }];
});
const YER_BY_ILCE = new Map<string, Yer[]>();
for (const y of YERLER) YER_BY_ILCE.set(y.ilce, [...(YER_BY_ILCE.get(y.ilce) ?? []), y]);

type MahalleDosya = { ilce: string; mahalleler: Mahalle[] };
const mahalleCache = new Map<string, Promise<MahalleDosya>>();
const loadMahalle = (slug: string) => {
  if (!mahalleCache.has(slug)) mahalleCache.set(slug, import(`../../data/harita/mahalle/${slug}.json`).then((m) => (m.default ?? m) as MahalleDosya));
  return mahalleCache.get(slug)!;
};

type Filtre = "tumu" | "secki" | string;
interface Durum { yaka?: Yaka; ilce?: string; mahalle?: string }

/* viewBox geçişi (hareket azaltma tercihinde anında). */
function useAnimatedBox(target: Box) {
  const [box, setBox] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    const from = cur.current, to = target;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { cur.current = to; setBox(to); return; }
    let raf = 0; const t0 = performance.now(); const D = 420;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / D); const e = 1 - Math.pow(1 - k, 3);
      const b = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
      cur.current = b; setBox(b); if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target.x, target.y, target.w, target.h]);
  return box;
}

const fill = (g: string | null) => (g ? `var(--map-${g})` : "var(--map-bos)");
const f1 = (x: number) => x.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function SemtHarita({ secki = [] }: { secki?: string[] }) {
  const google = useGoogleRatings();
  const published = usePublished();
  const seckiSet = useMemo(() => new Set(secki), [secki]);
  const [d, setD] = useState<Durum>({});
  const [filtre, setFiltre] = useState<Filtre>("tumu");
  const [mah, setMah] = useState<MahalleDosya | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [acik, setAcik] = useState<Record<string, boolean>>({});
  const [tumCip, setTumCip] = useState(false);
  const [q, setQ] = useState("");
  const pendingMahalle = useRef<string | null>(null);

  /* Adres çubuğu: ?ilce=kadikoy&mahalle=caddebostan&tur=kebap (paylaşılabilir; geçmişe yazılmaz). */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const il = p.get("ilce"); const ya = p.get("yaka"); const tur = p.get("tur");
    if (il && ILCE_BY.has(il)) { setD({ yaka: ILCE_BY.get(il)!.yaka, ilce: il }); pendingMahalle.current = p.get("mahalle"); }
    else if (ya === "avrupa" || ya === "anadolu") setD({ yaka: ya });
    if (tur && (tur === "secki" || GRUP.has(tur))) setFiltre(tur);
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (d.ilce) p.set("ilce", d.ilce); else if (d.yaka) p.set("yaka", d.yaka);
    if (d.mahalle) p.set("mahalle", norm(d.mahalle));
    if (filtre !== "tumu") p.set("tur", filtre);
    const s = p.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  }, [d, filtre]);

  /* İlçe seçilince o ilçenin mahalleleri ayrı parça olarak yüklenir. */
  useEffect(() => {
    if (!d.ilce) { setMah(null); return; }
    let live = true; setMah(null);
    loadMahalle(d.ilce).then((m) => {
      if (!live) return; setMah(m);
      const want = pendingMahalle.current; pendingMahalle.current = null;
      if (want) { const hit = m.mahalleler.find((x) => norm(x.ad) === want); if (hit) setD((s) => ({ ...s, mahalle: hit.ad })); }
    }).catch(() => live && setMah({ ilce: "", mahalleler: [] }));
    return () => { live = false; };
  }, [d.ilce]);

  const atama = useMemo(() => (d.ilce && mah ? mahalleAta(PROJ, YER_BY_ILCE.get(d.ilce) ?? [], mah.mahalleler) : new Map<string, { ad: string }>()), [d.ilce, mah]);

  const ilce = d.ilce ? ILCE_BY.get(d.ilce)! : null;
  const bolgeYerler = useMemo(() => {
    if (ilce) { const xs = YER_BY_ILCE.get(ilce.slug) ?? []; return d.mahalle ? xs.filter((y) => atama.get(y.slug)?.ad === d.mahalle) : xs; }
    if (d.yaka) return YERLER.filter((y) => ILCE_BY.get(y.ilce)!.yaka === d.yaka);
    return YERLER;
  }, [ilce, d.mahalle, d.yaka, atama]);

  const gecer = useCallback((y: Yer) => filtre === "tumu" || (filtre === "secki" ? seckiSet.has(y.slug) : y.grup === filtre), [filtre, seckiSet]);

  /* ---------- harita katmanı ---------- */
  type Parca = { id: string; ad: string; shape: Ilce | Mahalle; yerler: Yer[]; tikla: () => void; secili?: boolean; baglam?: boolean };
  const parcalar: Parca[] = useMemo(() => {
    if (ilce) {
      const by = new Map<string, Yer[]>();
      for (const y of YER_BY_ILCE.get(ilce.slug) ?? []) { const a = atama.get(y.slug)?.ad; if (a) by.set(a, [...(by.get(a) ?? []), y]); }
      const ctx: Parca[] = ILCELER.filter((i) => i.slug !== ilce.slug).map((i) => ({ id: i.slug, ad: i.ad, shape: i, yerler: [], baglam: true, tikla: () => setD({ yaka: i.yaka, ilce: i.slug }) }));
      if (!mah || !mah.mahalleler.length) return [...ctx, { id: ilce.slug, ad: ilce.ad, shape: ilce, yerler: YER_BY_ILCE.get(ilce.slug) ?? [], tikla: () => {} }];
      return [...ctx, ...mah.mahalleler.map((m) => ({ id: `m:${m.osm}`, ad: m.ad, shape: m, yerler: by.get(m.ad) ?? [], secili: d.mahalle === m.ad, tikla: () => setD((s) => ({ ...s, mahalle: s.mahalle === m.ad ? undefined : m.ad })) }))];
    }
    return ILCELER.map((i) => ({
      id: i.slug, ad: i.ad, shape: i, yerler: YER_BY_ILCE.get(i.slug) ?? [], baglam: !!d.yaka && i.yaka !== d.yaka,
      tikla: () => setD({ yaka: i.yaka, ilce: i.slug }),
    }));
  }, [ilce, mah, atama, d.mahalle, d.yaka]);

  const hedef = useMemo(() => {
    if (ilce) return fit(bbox([ilce]), ASPECT, 0.05);
    if (d.yaka) return fit(bbox(ILCELER.filter((i) => i.yaka === d.yaka)), ASPECT, 0.03);
    return fit(bbox(ILCELER), ASPECT, 0.02);
  }, [ilce, d.yaka]);
  const box = useAnimatedBox(hedef);

  const maxN = useMemo(() => Math.max(1, ...parcalar.filter((p) => !p.baglam).map((p) => p.yerler.filter(gecer).length)), [parcalar, gecer]);
  const renk = (p: Parca) => {
    if (p.baglam) return { f: "var(--map-ctx)", o: 1 };
    if (filtre === "tumu") return { f: fill(baskin(p.yerler.map((y) => y.kind))), o: 1 };
    const n = p.yerler.filter(gecer).length;
    if (!n) return { f: "var(--map-bos)", o: 1 };
    return { f: filtre === "secki" ? "var(--accent-soft)" : fill(filtre), o: 0.35 + 0.65 * (n / maxN) };
  };
  const boxes = useMemo(() => new Map(parcalar.map((p) => [p.id, bbox([p.shape])])), [parcalar]);
  const u = box.w / 1000; // 1000 birimlik görünüm ölçeği

  /* ---------- panel ---------- */
  const say = useMemo(() => grupSay(bolgeYerler.map((y) => y.kind)), [bolgeYerler]);
  const seckiN = bolgeYerler.filter((y) => seckiSet.has(y.slug)).length;
  const listede = useMemo(() => bolgeYerler.filter(gecer).map((y) => ({ ...y, g: google[y.slug] ?? null })), [bolgeYerler, gecer, google]);
  const bolumler = useMemo(() => {
    if (filtre !== "tumu") return [{ key: filtre, ad: filtre === "secki" ? "Gidenler Seçkisi" : GRUP.get(filtre)!.ad, yerler: sirala(listede) }];
    return say.map((s) => ({ key: s.key, ad: GRUP.get(s.key)!.ad, yerler: sirala(listede.filter((y) => y.grup === s.key)) })).filter((b) => b.yerler.length);
  }, [filtre, listede, say]);
  const baslik = d.mahalle ?? ilce?.ad ?? (d.yaka ? YAKA_AD[d.yaka] : "İstanbul");
  const ust = [d.mahalle && ilce ? ilce.ad : null, ilce || d.mahalle ? null : d.yaka ? "İstanbul" : null].filter(Boolean).join(" · ") || (ilce ? YAKA_AD[ilce.yaka] : "Semt semt");
  const bas = baskin(bolgeYerler.map((y) => y.kind));
  const atanmamis = ilce && mah?.mahalleler.length && !d.mahalle ? (YER_BY_ILCE.get(ilce.slug) ?? []).filter((y) => !atama.has(y.slug)).length : 0;
  const cipler = [...say.filter((s) => s.key !== "diger"), ...say.filter((s) => s.key === "diger")];
  const gorunenCip = tumCip ? cipler : cipler.slice(0, 7);

  /* ---------- arama ---------- */
  const sonuc = useMemo(() => {
    const n = norm(q); if (n.length < 2) return [];
    const ilceS = ILCELER.filter((i) => norm(i.ad).includes(n)).slice(0, 3).map((i) => ({ t: "ilce" as const, id: i.slug, ad: i.ad, alt: YAKA_AD[i.yaka], ilce: i.slug }));
    const mahSeen = new Set<string>();
    const mahS = YERLER.filter((y) => y.neighborhood && norm(y.neighborhood).includes(n)).flatMap((y) => {
      const k = `${y.ilce}|${norm(y.neighborhood!)}`; if (mahSeen.has(k)) return []; mahSeen.add(k);
      return [{ t: "mahalle" as const, id: k, ad: y.neighborhood!.replace(/\s+Mahallesi$/u, ""), alt: y.district, ilce: y.ilce, mahalle: norm(y.neighborhood!) }];
    }).slice(0, 3);
    const yerS = YERLER.filter((y) => norm(y.name).includes(n) || (y.kind && norm(y.kind).includes(n))).slice(0, 6).map((y) => ({ t: "yer" as const, id: y.slug, ad: y.name, alt: `${y.kind ?? ""} · ${y.district}`, ilce: y.ilce }));
    return [...ilceS, ...mahS, ...yerS];
  }, [q]);
  const git = (s: (typeof sonuc)[number]) => {
    setQ("");
    if (s.t === "mahalle") { pendingMahalle.current = s.mahalle; if (d.ilce === s.ilce && mah) { const hit = mah.mahalleler.find((x) => norm(x.ad) === s.mahalle); setD((x) => ({ ...x, mahalle: hit?.ad })); pendingMahalle.current = null; return; } }
    setD({ yaka: ILCE_BY.get(s.ilce)!.yaka, ilce: s.ilce });
  };

  const kirinti: { ad: string; to: Durum | null }[] = [
    { ad: "İstanbul", to: {} },
    ...(d.yaka ? [{ ad: YAKA_AD[d.yaka], to: { yaka: d.yaka } as Durum }] : []),
    ...(ilce ? [{ ad: ilce.ad, to: { yaka: ilce.yaka, ilce: ilce.slug } as Durum }] : []),
    ...(d.mahalle ? [{ ad: d.mahalle, to: null }] : []),
  ];

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.55fr_1fr] lg:gap-6" data-semt-harita>
      {/* HARİTA */}
      <div className="relative flex min-w-0 flex-col">
        <div className="relative border-2 border-line-strong bg-[var(--map-water)]">
          <div className="absolute left-3 top-3 z-10 w-[min(320px,calc(100%-24px))]">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }} placeholder="Mekân, semt ya da tür ara" aria-label="Mekân, semt ya da tür ara"
              className="h-10 w-full border border-line-2 bg-paper px-3 text-[14px] outline-none placeholder:text-ink-3 focus:border-accent" />
            {sonuc.length > 0 && (
              <ul className="mt-1 max-h-[300px] overflow-y-auto border border-line-strong bg-paper shadow-[var(--shadow-1)]" role="listbox">
                {sonuc.map((s) => (
                  <li key={`${s.t}:${s.id}`}>
                    {s.t === "yer"
                      ? <Link href={`/mekan/${s.id}/`} className="flex items-baseline justify-between gap-3 px-3 py-2 text-[13.5px] hover:bg-sheet"><span className="font-semibold">{s.ad}</span><span className="shrink-0 text-[11.5px] text-ink-3">{s.alt}</span></Link>
                      : <button type="button" onClick={() => git(s)} className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-[13.5px] hover:bg-sheet"><span className="font-semibold">{s.ad}</span><span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-3">{s.t === "ilce" ? "İlçe" : `Mahalle · ${s.alt}`}</span></button>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className="block h-auto w-full touch-manipulation select-none" role="group"
            aria-label={`${baslik} haritası: bölgeler en çok bulunan türe göre renkli`} style={{ aspectRatio: `${ASPECT}` }}>
            {parcalar.map((p) => {
              const { f, o } = renk(p); const on = p.secili; const hov = hover === p.id;
              const n = p.yerler.filter(gecer).length; const bg = baskin(p.yerler.map((y) => y.kind));
              return (
                <path key={p.id} d={pathD(p.shape)} fill={f} fillOpacity={o} fillRule="evenodd"
                  stroke={on ? "var(--accent)" : p.baglam ? "var(--map-edge)" : hov ? "var(--ink)" : n || filtre !== "tumu" ? "var(--map-edge)" : "var(--line-2)"} strokeWidth={on ? 2.5 : hov ? 1.6 : 1}
                  vectorEffect="non-scaling-stroke" className={`cursor-pointer transition-[fill-opacity] ${d.mahalle && !on && !p.baglam ? "opacity-70" : ""}`}
                  role="button" tabIndex={p.baglam ? -1 : 0} aria-pressed={on}
                  aria-label={`${p.ad}: ${n} mekân${bg && bg !== "diger" ? `, en çok ${GRUP.get(bg)!.ad}` : ""}`}
                  onClick={p.tikla} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.tikla(); } }}
                  onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover((h) => (h === p.id ? null : h))}>
                  <title>{`${p.ad} · ${n} mekân${bg && bg !== "diger" ? ` · en çok ${GRUP.get(bg)!.ad.toLocaleLowerCase("tr")}` : ""}`}</title>
                </path>
              );
            })}

            {/* mekân noktaları (ilçe görünümünde) */}
            {ilce && (YER_BY_ILCE.get(ilce.slug) ?? []).filter((y) => y.xy && gecer(y)).map((y) => {
              const sec = d.mahalle ? atama.get(y.slug)?.ad === d.mahalle : true; const h = hover === y.slug;
              return <circle key={y.slug} cx={y.xy![0]} cy={y.xy![1]} r={(h ? 7 : 3.6) * u} className={h ? "fill-accent" : sec ? "fill-ink" : "fill-ink-3"} opacity={sec ? 0.9 : 0.35} pointerEvents="none" />;
            })}

            {/* etiketler */}
            {parcalar.filter((p) => !p.baglam).map((p) => {
              /* Büyük bölgeye ad + baskın tür; küçük ama kalabalık ilçeye (Beyoğlu, Beşiktaş…) yalnız ad. */
              const b = boxes.get(p.id)!; const buyuk = b.w >= box.w * (ilce ? 0.075 : 0.05);
              const kalabalik = !ilce && p.yerler.length >= 20 && b.w >= box.w * 0.014;
              if (!buyuk && !kalabalik) return null;
              const [x, y] = labelAt(p.shape); const bg = buyuk ? baskin(p.yerler.map((v) => v.kind)) : null;
              const fs = (ilce ? 15 : 13) * u * (buyuk ? 1 : 0.8);
              return (
                <g key={`l:${p.id}`} pointerEvents="none" textAnchor="middle" style={{ paintOrder: "stroke" }} stroke="var(--paper)" strokeWidth={3 * u} strokeLinejoin="round">
                  <text x={x} y={y} fontSize={fs} fontWeight={700} fill="var(--ink)" fontFamily="var(--font-ui)">{p.ad}</text>
                  {bg && bg !== "diger" && <text x={x} y={y + fs * 1.05} fontSize={fs * 0.6} fontWeight={700} letterSpacing={fs * 0.08} fill="var(--ink-2)" fontFamily="var(--font-ui)">{GRUP.get(bg)!.kisa.toLocaleUpperCase("tr")}</text>}
                </g>
              );
            })}
          </svg>

          {/* kırıntı */}
          <nav aria-label="Harita düzeyi" className="flex flex-wrap items-center gap-1 border-t-2 border-line-strong bg-paper px-3 py-2">
            {kirinti.map((k, i) => {
              const son = i === kirinti.length - 1;
              return (
                <span key={k.ad} className="flex items-center gap-1">
                  {i > 0 && <span aria-hidden className="text-[12px] text-ink-3">›</span>}
                  {son || !k.to
                    ? <span aria-current="location" className="inline-flex h-7 items-center bg-ink px-2.5 text-[12px] font-semibold text-paper">{k.ad}</span>
                    : <button type="button" onClick={() => setD(k.to!)} className="inline-flex h-7 items-center border border-line-2 bg-paper px-2.5 text-[12px] font-semibold hover:border-ink">{k.ad}</button>}
                </span>
              );
            })}
            {!d.yaka && !ilce && (["avrupa", "anadolu"] as Yaka[]).map((y) => (
              <button key={y} type="button" onClick={() => setD({ yaka: y })} className="inline-flex h-7 items-center border border-line-2 bg-paper px-2.5 text-[12px] font-semibold hover:border-ink">{YAKA_AD[y]}</button>
            ))}
          </nav>
        </div>

        {/* lejant */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Renkler">
          {filtre === "tumu"
            ? TUR_GRUPLARI.filter((g) => parcalar.some((p) => !p.baglam && baskin(p.yerler.map((y) => y.kind)) === g.key)).map((g) => (
                <span key={g.key} className="inline-flex items-center gap-1.5 text-[12px] text-ink-2"><span aria-hidden className="h-3 w-3 border border-line-2" style={{ background: fill(g.key) }} />{g.ad}</span>
              ))
            : <span className="text-[12px] text-ink-2">Koyu bölgede {filtre === "secki" ? "Seçki mekânı" : GRUP.get(filtre)!.ad.toLocaleLowerCase("tr")} daha çok.</span>}
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-ink-3">
          Sınırlar ve konumlar © OpenStreetMap katkıcıları (ODbL). Renk, bölgedeki Gidenler kayıtlarında en çok bulunan türdür; bütün semti değil, kataloğumuzu anlatır.
        </p>
      </div>

      {/* PANEL */}
      <aside className="flex min-w-0 flex-col border-2 border-line-strong bg-paper lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start" aria-live="polite">
        <div className="border-b border-line px-4 pb-3 pt-4 sm:px-5">
          <p className="label">{ust}</p>
          <h2 className="mt-1 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,2.75rem)] leading-[0.95] tracking-[-0.01em]">{baslik}</h2>
          <p className="tnum mt-2 text-[13px] text-ink-2">
            {bolgeYerler.length} mekân{bas && bas !== "diger" ? <> · en çok <span className="font-semibold text-ink">{GRUP.get(bas)!.ad.toLocaleLowerCase("tr")}</span></> : null}
            {atanmamis > 0 && <span className="text-ink-3"> · {atanmamis} kaydın mahallesi belirsiz, yalnız ilçe listesinde</span>}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Tür">
            <Cip on={filtre === "tumu"} onClick={() => setFiltre("tumu")}>Tümü</Cip>
            {seckiN > 0 && <Cip on={filtre === "secki"} onClick={() => setFiltre("secki")}>Seçki <span className="tnum opacity-70">{seckiN}</span></Cip>}
            {gorunenCip.map((s) => <Cip key={s.key} on={filtre === s.key} onClick={() => setFiltre(s.key)}>{GRUP.get(s.key)!.kisa} <span className="tnum opacity-70">{s.n}</span></Cip>)}
            {!tumCip && cipler.length > 7 && <Cip on={false} onClick={() => setTumCip(true)}>+{cipler.length - 7}</Cip>}
            {filtre !== "tumu" && filtre !== "secki" && !say.some((s) => s.key === filtre) && <Cip on onClick={() => setFiltre("tumu")}>{GRUP.get(filtre)?.kisa} <span className="tnum opacity-70">0</span></Cip>}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
          {bolumler.length === 0 && (
            <p className="py-6 text-[14px] text-ink-2">{d.mahalle ? "Bu mahallede bu türde kayıt henüz yok." : "Bu bölgede bu türde kayıt henüz yok."}</p>
          )}
          {bolumler.map((b) => {
            const all = acik[b.key] || filtre !== "tumu"; const xs = all ? b.yerler : b.yerler.slice(0, LIST_CAP);
            return (
              <section key={b.key} className="pt-4">
                <h3 className="flex items-center gap-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-3">
                  <span aria-hidden className="h-2.5 w-2.5 border border-line-2" style={{ background: b.key === "secki" ? "var(--accent-soft)" : fill(b.key) }} />
                  {b.ad}<span className="tnum font-semibold">{b.yerler.length}</span><span aria-hidden className="h-px flex-1 bg-line" />
                </h3>
                <ol className="mt-1 divide-y divide-line">
                  {xs.map((y) => {
                    const sub = ilce ? (atama.get(y.slug)?.ad ?? y.district) : y.district;
                    const p = published[y.slug];
                    return (
                      <li key={y.slug} onMouseEnter={() => setHover(y.slug)} onMouseLeave={() => setHover((h) => (h === y.slug ? null : h))}>
                        <Link href={`/mekan/${y.slug}/`} className="group flex items-baseline justify-between gap-3 py-2">
                          <span className="min-w-0">
                            <span className="block truncate text-[14.5px] font-semibold group-hover:text-accent-ink">{y.name}{seckiSet.has(y.slug) && <span className="ml-1.5 align-[1px] text-[9.5px] font-bold uppercase tracking-[0.12em] text-accent-ink">Seçki</span>}</span>
                            <span className="block truncate text-[12px] text-ink-3">{sub}{y.kind && y.kind !== sub ? ` · ${y.kind}` : ""}</span>
                          </span>
                          <span className="tnum flex shrink-0 flex-col items-end text-right">
                            {y.g ? <span className="text-[13.5px] font-bold" title={`Google puanı ${f1(y.g.rating)}/5. Gidenler puanı değildir.`}>★ {f1(y.g.rating)}{y.g.count != null && <span className="ml-1 text-[11.5px] font-medium text-ink-3">({y.g.count.toLocaleString("tr-TR")})</span>}</span>
                              : <span className="text-[12px] text-ink-3">—</span>}
                            {p?.score != null && <span className="text-[11px] font-semibold text-accent-ink">Gidenler {fmtPublished(p.score)}</span>}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
                {!all && b.yerler.length > LIST_CAP && (
                  <button type="button" onClick={() => setAcik((s) => ({ ...s, [b.key]: true }))} className="mt-1 text-[12.5px] font-semibold text-accent-ink hover:underline">
                    {b.yerler.length - LIST_CAP} mekân daha
                  </button>
                )}
              </section>
            );
          })}
          <p className="mt-5 border-t border-line pt-3 text-[11.5px] leading-snug text-ink-3">★ Google puanı, 5 üzerinden; parantezde Google değerlendirme sayısı. Gidenler puanı ayrıdır ve yalnız yeterli deneyim olduğunda görünür.</p>
        </div>
      </aside>
    </div>
  );
}

function Cip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`inline-flex h-7 items-center gap-1 border px-2.5 text-[12.5px] font-semibold ${on ? "border-ink bg-ink text-paper" : "border-line-2 hover:border-ink"}`}>
      {children}
    </button>
  );
}
