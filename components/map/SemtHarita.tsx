"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AtlasEtiket, AtlasIcon, AtlasSayi } from "./AtlasPrimitives";
import styles from "./atlas.module.css";
import { mobilAtlasEtiketleri } from "@/lib/harita/atlas-etiketleri";
import { atlasKumeleri } from "@/lib/harita/atlas-pinleri";
import sinirlar from "@/data/harita/ilceler.json";
import { activeEntities } from "@/data/real/presentation";
import { useGoogleRatings } from "@/components/google/GoogleRatings";
import { usePublished } from "@/components/score/PublishedProvider";
import { fmtPublished } from "@/lib/score/publishedCards";
import {
  GRUP, YAKA_AD, baskin, bbox, fit, grupOf, grupSay, haritaKoordinati, haritaListesinde, konumDogrulanmadi, labelAt, mahalleAta, norm, pathD, project, sirala,
  type Box, type Ilce, type Mahalle, type Proj, type Yaka,
} from "@/lib/harita/semt";
import { haritaSorgusu, mahalleGorunumu, mahalleYukleyici, type Durum, type MahalleYukleme } from "@/lib/harita/mahalle-yukleme";

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
  const geo = haritaKoordinati(e.slug, e.location?.geo);
  return [{
    slug: e.slug, name: e.name, kind: e.subcategory, grup: grupOf(e.subcategory), ilce: ilce.slug, district: ilce.ad,
    neighborhood: e.location?.neighborhood, address: e.address, lat: geo?.lat, lng: geo?.lng, xy: geo ? project(PROJ, geo.lat, geo.lng) : undefined,
  }];
});
const YER_BY_ILCE = new Map<string, Yer[]>();
for (const y of YERLER) YER_BY_ILCE.set(y.ilce, [...(YER_BY_ILCE.get(y.ilce) ?? []), y]);

const loadMahalle = mahalleYukleyici((slug) =>
  import(`../../data/harita/mahalle/${slug}.json`).then((m) => m.default ?? m));

type Filtre = "tumu" | "secki" | string;

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
  const router = useRouter();
  const searchId = useId();
  const [searchFocus, setSearchFocus] = useState(false);
  const [searchIndex, setSearchIndex] = useState(-1);
  const [kumeId, setKumeId] = useState<string | null>(null);
  const [widthPx, setWidthPx] = useState(375);
  const [paylasim, setPaylasim] = useState<"bos" | "kopya" | "sec">("bos");
  const atlasHeading = useRef<HTMLHeadingElement>(null);
  const mapRef = useRef<SVGSVGElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const clusterHeading = useRef<HTMLHeadingElement>(null);
  const clusterTrigger = useRef<SVGGElement | null>(null);
  const moveClusterFocus = useRef(false);
  const shareInput = useRef<HTMLInputElement>(null);
  const google = useGoogleRatings();
  const published = usePublished();
  const seckiSet = useMemo(() => new Set(secki), [secki]);
  const [d, setD] = useState<Durum>({});
  const [filtre, setFiltre] = useState<Filtre>("tumu");
  const [yukleme, setYukleme] = useState<MahalleYukleme | null>(null);
  const [deneme, setDeneme] = useState(0);
  const [urlHazir, setUrlHazir] = useState(false);
  const { mah, mahalle, urlMahalle, yuklemeDurumu } = mahalleGorunumu(d, yukleme);
  const [hover, setHover] = useState<string | null>(null);
  const [seciliSlug, setSeciliSlug] = useState<string | null>(null);
  const listedeGoster = useRef(false);
  const [acik, setAcik] = useState<Record<string, boolean>>({});
  const [tumCip, setTumCip] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const svg = mapRef.current;
    if (!svg) return;
    const sync = () => setWidthPx(Math.max(1, Math.round(svg.getBoundingClientRect().width)));
    sync();
    if (!window.ResizeObserver) return;
    const observer = new ResizeObserver(sync);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setKumeId(null);
    setPaylasim("bos");
  }, [d, filtre]);
  useEffect(() => {
    if (paylasim === "sec") shareInput.current?.select();
  }, [paylasim]);

  /* Adres çubuğu: ?ilce=kadikoy&mahalle=caddebostan&tur=kebap (paylaşılabilir; geçmişe yazılmaz). */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const il = p.get("ilce"); const ya = p.get("yaka"); const tur = p.get("tur");
    if (il && ILCE_BY.has(il)) setD({ yaka: ILCE_BY.get(il)!.yaka, ilce: il, mahalleKey: norm(p.get("mahalle") ?? "") || undefined });
    else if (ya === "avrupa" || ya === "anadolu") setD({ yaka: ya });
    if (tur && (tur === "secki" || GRUP.has(tur))) setFiltre(tur);
    setUrlHazir(true);
  }, []);
  useEffect(() => {
    if (!urlHazir) return;
    const s = haritaSorgusu(d, urlMahalle, filtre);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${s ? `?${s}` : ""}${window.location.hash}`);
  }, [d, filtre, urlHazir, urlMahalle]);

  /* Keep loading/error separate from an empty catalog. Ignore old-district results. */
  useEffect(() => {
    const ilce = d.ilce;
    if (!ilce) { setYukleme(null); return; }
    let live = true;
    setYukleme({ ilce, durum: "bekliyor" });
    loadMahalle(ilce).then((dosya) => {
      if (live) setYukleme({ ilce, durum: "hazir", dosya });
    }).catch(() => {
      if (live) setYukleme({ ilce, durum: "hata" });
    });
    return () => { live = false; };
  }, [d.ilce, deneme]);

  const atama = useMemo(() => (d.ilce && mah ? mahalleAta(PROJ, YER_BY_ILCE.get(d.ilce) ?? [], mah.mahalleler) : new Map<string, { ad: string }>()), [d.ilce, mah]);

  const ilce = d.ilce ? ILCE_BY.get(d.ilce)! : null;
  const bolgeYerler = useMemo(() => {
    if (ilce) { const xs = YER_BY_ILCE.get(ilce.slug) ?? []; return mahalle ? xs.filter((y) => atama.get(y.slug)?.ad === mahalle) : xs; }
    if (d.yaka) return YERLER.filter((y) => ILCE_BY.get(y.ilce)!.yaka === d.yaka);
    return YERLER;
  }, [ilce, mahalle, d.yaka, atama]);

  const gecer = useCallback((y: Yer) => filtre === "tumu" || (filtre === "secki" ? seckiSet.has(y.slug) : y.grup === filtre), [filtre, seckiSet]);

  /* ---------- harita katmanı ---------- */
  type Parca = { id: string; ad: string; shape: Ilce | Mahalle; yerler: Yer[]; tikla: () => void; secili?: boolean; baglam?: boolean };
  const parcalar: Parca[] = useMemo(() => {
    if (ilce) {
      const by = new Map<string, Yer[]>();
      for (const y of YER_BY_ILCE.get(ilce.slug) ?? []) { const a = atama.get(y.slug)?.ad; if (a) by.set(a, [...(by.get(a) ?? []), y]); }
      const ctx: Parca[] = ILCELER.filter((i) => i.slug !== ilce.slug).map((i) => ({ id: i.slug, ad: i.ad, shape: i, yerler: [], baglam: true, tikla: () => setD({ yaka: i.yaka, ilce: i.slug }) }));
      if (!mah || !mah.mahalleler.length) return [...ctx, { id: ilce.slug, ad: ilce.ad, shape: ilce, yerler: YER_BY_ILCE.get(ilce.slug) ?? [], tikla: () => {} }];
      return [...ctx, ...mah.mahalleler.map((m) => ({ id: `m:${m.osm}`, ad: m.ad, shape: m, yerler: by.get(m.ad) ?? [], secili: mahalle === m.ad, tikla: () => setD((s) => ({ ...s, mahalleKey: s.mahalleKey === norm(m.ad) ? undefined : norm(m.ad) })) }))];
    }
    return ILCELER.map((i) => ({
      id: i.slug, ad: i.ad, shape: i, yerler: YER_BY_ILCE.get(i.slug) ?? [], baglam: !!d.yaka && i.yaka !== d.yaka,
      tikla: () => setD({ yaka: i.yaka, ilce: i.slug }),
    }));
  }, [ilce, mah, atama, mahalle, d.yaka]);

  const hedef = useMemo(() => {
    const aktifMahalle = mah?.mahalleler.find((m) => m.ad === mahalle);
    if (aktifMahalle) return fit(bbox([aktifMahalle]), ASPECT, 0.24);
    if (ilce) return fit(bbox([ilce]), ASPECT, 0.11);
    if (d.yaka) return fit(bbox(ILCELER.filter((i) => i.yaka === d.yaka)), ASPECT, 0.03);
    return fit(bbox(ILCELER), ASPECT, 0.02);
  }, [ilce, d.yaka, mah, mahalle]);
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
  const etiketler = useMemo(() => {
    const candidates = parcalar.filter((p) => !p.baglam && (!mahalle || p.secili)).flatMap((p) => {
      const b = boxes.get(p.id)!;
      const large = b.w >= hedef.w * (ilce ? .09 : .042);
      if (!large && !(!ilce && p.yerler.length >= 20 && b.w >= hedef.w * .014)) return [];
      const [x, y] = labelAt(p.shape);
      return [{ id: p.id, ad: p.ad, x, y, n: p.yerler.length }];
    });
    return !ilce && widthPx < 520 ? mobilAtlasEtiketleri(candidates, hedef, widthPx) : candidates;
  }, [boxes, hedef, ilce, mahalle, parcalar, widthPx]);


  /* ---------- panel ---------- */
  const say = useMemo(() => grupSay(bolgeYerler.map((y) => y.kind)), [bolgeYerler]);
  const seckiN = bolgeYerler.filter((y) => seckiSet.has(y.slug)).length;
  const listede = useMemo(() => bolgeYerler
    .filter((y) => haritaListesinde(y.slug, !!ilce, !!mahalle) && gecer(y))
    .map((y) => ({ ...y, g: google[y.slug] ?? null })), [bolgeYerler, gecer, google, ilce, mahalle]);
  const visibleNoktalar = useMemo(() => listede.flatMap((y) => {
    if (!ilce || !y.xy) return [];
    const [x, yy] = y.xy, { x: x0, y: y0, w, h } = hedef;
    return x >= x0 && x <= x0 + w && yy >= y0 && yy <= y0 + h ? [{ ...y, xy: y.xy }] : [];
  }), [hedef, ilce, listede]);
  const kumeler = useMemo(() => atlasKumeleri(visibleNoktalar, hedef.w / widthPx), [visibleNoktalar, hedef.w, widthPx]);
  const acikKume = kumeId == null ? undefined : kumeler.find((k) => k.id === kumeId);
  const pinSlugs = useMemo(() => new Set(visibleNoktalar.map((y) => y.slug)), [visibleNoktalar]);
  useEffect(() => {
    if (!acikKume || !moveClusterFocus.current) return;
    moveClusterFocus.current = false;
    gorunumeGetir(clusterHeading.current);
    clusterHeading.current?.focus({ preventScroll: true });
  }, [acikKume]);
  function kumeyiKapat() {
    setKumeId(null);
    clusterTrigger.current?.focus({ preventScroll: true });
  }
  const seciliYer = seciliSlug && pinSlugs.has(seciliSlug) ? listede.find((y) => y.slug === seciliSlug) : undefined;
  const satiriGoster = (slug: string) => {
    const row = document.getElementById(`semt-mekan-${slug}`);
    const profile = row?.querySelector<HTMLAnchorElement>("a[href]");
    if (!row || !profile) return false;
    // Focus without a native scroll; then reveal the result with one deliberate scroll.
    profile.focus({ preventScroll: true });
    gorunumeGetir(row);
    return true;
  };
  function mekanSec(y: Yer, yon: "listeye" | "haritaya" | "burada", klavye = false) {
    if (yon === "listeye") {
      setAcik((s) => s[y.grup] ? s : { ...s, [y.grup]: true });
      if (seciliYer?.slug === y.slug && satiriGoster(y.slug)) listedeGoster.current = false;
      else listedeGoster.current = true;
    } else if (yon === "haritaya") {
      gorunumeGetir(atlasHeading.current);
      if (klavye) atlasHeading.current?.focus({ preventScroll: true });
    }
    setSeciliSlug(y.slug);
  }
  function listeyeGit() {
    gorunumeGetir(listHeading.current);
    listHeading.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (seciliSlug && !seciliYer) { listedeGoster.current = false; setSeciliSlug(null); }
    else if (seciliYer && listedeGoster.current) {
      if (satiriGoster(seciliYer.slug)) listedeGoster.current = false;
    }
  }, [acik, seciliSlug, seciliYer]);

  const bolumler = useMemo(() => {
    if (filtre !== "tumu") return [{ key: filtre, ad: filtre === "secki" ? "Gidenler Seçkisi" : GRUP.get(filtre)!.ad, yerler: sirala(listede) }];
    return say.map((s) => ({ key: s.key, ad: GRUP.get(s.key)!.ad, yerler: sirala(listede.filter((y) => y.grup === s.key)) })).filter((b) => b.yerler.length);
  }, [filtre, listede, say]);
  const baslik = mahalle ?? ilce?.ad ?? (d.yaka ? YAKA_AD[d.yaka] : "İstanbul");
  const ust = [mahalle && ilce ? ilce.ad : null, ilce || mahalle ? null : d.yaka ? "İstanbul" : null].filter(Boolean).join(" · ") || (ilce ? YAKA_AD[ilce.yaka] : "Semt semt");
  const bas = baskin(bolgeYerler.map((y) => y.kind));
  const ilceListesineAyrilan = !ilce ? bolgeYerler.filter((y) => gecer(y) && konumDogrulanmadi(y.slug)).length : 0;
  const atanmamis = ilce && mah?.mahalleler.length && !mahalle ? (YER_BY_ILCE.get(ilce.slug) ?? []).filter((y) => !atama.has(y.slug)).length : 0;
  const cipler = [...say.filter((s) => s.key !== "diger"), ...say.filter((s) => s.key === "diger")];
  const gorunenCip = tumCip ? cipler : cipler.slice(0, 4);

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
    setQ(""); setSearchIndex(-1); setSearchFocus(false);
    if (s.t === "yer") { router.push(`/mekan/${s.id}/`); return; }
    setD({ yaka: ILCE_BY.get(s.ilce)!.yaka, ilce: s.ilce, mahalleKey: s.t === "mahalle" ? s.mahalle : undefined });
  };
  function ilceAc(slug: string) {
    const next = ILCE_BY.get(slug);
    setD(next ? { yaka: next.yaka, ilce: next.slug } : d.yaka ? { yaka: d.yaka } : {});
  }
  const aramaAcik = searchFocus && norm(q).length >= 2;
  const bolgeTuru = mahalle ? "Mahalle" : ilce ? "İlçe" : d.yaka ? "Yaka" : "Şehir";
  const format = (n: number) => n.toLocaleString("tr-TR");
  const paylasimSorgusu = haritaSorgusu(d, urlMahalle, filtre);
  const paylasimYolu = `/harita/${paylasimSorgusu ? `?${paylasimSorgusu}` : ""}`;
  async function baglantiyiKopyala() {
    try {
      await navigator.clipboard.writeText(new URL(paylasimYolu, window.location.origin).href);
      setPaylasim("kopya");
    } catch {
      setPaylasim("sec");
    }
  }

  const kirinti: { ad: string; to: Durum | null }[] = [
    { ad: "İstanbul", to: {} },
    ...(d.yaka ? [{ ad: YAKA_AD[d.yaka], to: { yaka: d.yaka } as Durum }] : []),
    ...(ilce ? [{ ad: ilce.ad, to: { yaka: ilce.yaka, ilce: ilce.slug } as Durum }] : []),
    ...(mahalle ? [{ ad: mahalle, to: null }] : []),
  ];

  return (
    <div className={styles.atlas} data-semt-harita>
      <header className={styles.hero}>
        <div>
          <div className={styles.masthead}><span />Gidenler rehberi <span className={styles.mastDivider} /> İstanbul</div>
          <h1>İstanbul’u <em>semt semt</em> keşfet.</h1>
          <p>Bir bölge seç, mahallesine yaklaş, oradaki mekânlara bak.</p>
        </div>
        <div className={styles.heroMetrics} aria-label="Atlas kapsamı">
          <AtlasSayi value={ILCELER.length} label="ilçe" />
          <AtlasSayi value={YERLER.length} label="aktif katalog kaydı" />
        </div>
      </header>

      <div className={styles.workbench}>
        <section className={styles.mapCard} aria-labelledby="atlas-harita">
          <div className={styles.mapHead}>
            <div className={styles.mapName}>
              <span className={styles.brandIcon}><AtlasIcon name="layers" size={21} /></span>
              <div><AtlasEtiket>Gidenler Atlası</AtlasEtiket><h2 id="atlas-harita" ref={atlasHeading} tabIndex={-1}>Semt haritası</h2></div>
            </div>
            <button type="button" className={styles.utility} onClick={baglantiyiKopyala}>
              <AtlasIcon name={paylasim === "kopya" ? "check" : "share"} size={17} />
              <span>{paylasim === "kopya" ? "Kopyalandı" : "Paylaş"}</span>
            </button>
          </div>
          {paylasim === "kopya" && <span className={styles.srOnly} role="status">Harita bağlantısı kopyalandı.</span>}
          {paylasim === "sec" && <label className={styles.shareFallback}>Bağlantıyı kopyala
            <input ref={shareInput} readOnly value={typeof window !== "undefined" ? new URL(paylasimYolu, window.location.origin).href : paylasimYolu} />
          </label>}

          <div className={styles.searchBar}>
            <div className={styles.searchBox} role="search" aria-label="Haritada ara">
              <AtlasIcon name="search" />
              <input
                value={q} onFocus={() => setSearchFocus(true)} onBlur={() => { setSearchFocus(false); setSearchIndex(-1); }}
                role="combobox" aria-expanded={aramaAcik} aria-autocomplete="list" aria-controls={aramaAcik ? searchId : undefined}
                aria-activedescendant={aramaAcik && searchIndex >= 0 ? `${searchId}-${searchIndex}` : undefined}
                aria-label="İlçe, mahalle veya mekân ara" placeholder="İlçe, mahalle veya mekân ara"
                onChange={(e) => { setQ(e.target.value); setSearchFocus(true); setSearchIndex(-1); }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setSearchFocus(false); setSearchIndex(-1); return; }
                  if ((e.key === "ArrowDown" || e.key === "ArrowUp") && sonuc.length) {
                    e.preventDefault(); setSearchFocus(true);
                    setSearchIndex((i) => e.key === "ArrowDown" ? (i + 1) % sonuc.length : (i <= 0 ? sonuc.length - 1 : i - 1));
                  }
                  if (e.key === "Enter" && aramaAcik && sonuc.length) {
                    e.preventDefault(); git(sonuc[searchIndex >= 0 ? searchIndex : 0]);
                  }
                }} />
              {aramaAcik && (
                <>
                  <ul className={styles.suggestions} role="listbox" id={searchId} aria-label="Harita arama sonuçları">
                    {sonuc.map((s, i) => (
                      <li id={`${searchId}-${i}`} key={`${s.t}:${s.id}`} role="option" aria-selected={searchIndex === i}
                        onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setSearchIndex(i)} onClick={() => git(s)}>
                        <AtlasIcon name={s.t === "yer" ? "pin" : "layers"} size={16} />
                        <span>{s.ad}<small>{s.t === "ilce" ? `İlçe · ${s.alt}` : s.t === "mahalle" ? `Mahalle · ${s.alt}` : s.alt}</small></span>
                        <AtlasIcon name="arrow" size={15} />
                      </li>
                    ))}
                  </ul>
                  {!sonuc.length && <span className={styles.zeroSuggestion} role="status">Eşleşme bulunamadı.</span>}
                </>
              )}
            </div>
            <label className={styles.districtSelect}>
              <span className={styles.srOnly}>İlçe seç</span>
              <select aria-label="İlçe seç" value={ilce?.slug ?? ""} onChange={(e) => ilceAc(e.target.value)}>
                <option value="">İlçe seç</option>
                {ILCELER.map((i) => <option key={i.slug} value={i.slug}>{i.ad}</option>)}
              </select>
            </label>
          </div>

          <nav className={styles.breadcrumb} aria-label="Harita düzeyi">
            {kirinti.map((k, i) => {
              const son = i === kirinti.length - 1;
              return (
                <span key={k.ad}>
                  {i > 0 && <span className={styles.crumbSep} aria-hidden="true">›</span>}
                  {son || !k.to
                    ? <span aria-current="location" className={styles.crumbCurrent}>{k.ad}</span>
                    : <button type="button" onClick={() => setD(k.to!)}>{k.ad}</button>}
                </span>
              );
            })}
            {!d.yaka && !ilce && (
              <div className={styles.sides}>
                {(["avrupa", "anadolu"] as const).map((y) => (
                  <button key={y} type="button" onClick={() => setD({ yaka: y })}>{y === "avrupa" ? "Avrupa" : "Anadolu"}</button>
                ))}
              </div>
            )}
          </nav>

          <div className={styles.canvas}>
            <span className={styles.canvasLabel}><span />{baslik}</span>
            <span className={styles.compass} aria-hidden="true">↑<small>K</small></span>
            <svg ref={mapRef} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className={styles.svg} role="group"
              aria-label={`${baslik} haritası: bölgeler katalogdaki türlere göre renkli`} style={{ aspectRatio: `${ASPECT}` }}>
              {parcalar.map((p) => {
                const { f, o } = renk(p); const on = p.secili; const hov = hover === p.id;
                const n = p.yerler.filter(gecer).length; const bg = baskin(p.yerler.map((y) => y.kind));
                const selectable = !(ilce && !mah?.mahalleler.length && p.id === ilce.slug);
                return (
                  <path key={p.id} d={pathD(p.shape)} fill={f} fillOpacity={o} fillRule="evenodd"
                    stroke={on ? "var(--accent)" : hov ? "var(--ink-2)" : "var(--map-edge)"} strokeWidth={on ? 2.6 : hov ? 1.5 : 1}
                    vectorEffect="non-scaling-stroke" className={selectable ? styles.region : undefined}
                    opacity={mahalle && !on ? 0.63 : 1}
                    role={selectable ? "button" : undefined} tabIndex={selectable && !p.baglam ? 0 : -1}
                    aria-pressed={selectable && ilce && !p.baglam && mah ? !!p.secili : undefined}
                    aria-label={`${p.ad}: ${n} mekân${bg && bg !== "diger" ? `, en çok ${GRUP.get(bg)!.ad}` : ""}`}
                    onClick={selectable ? p.tikla : undefined}
                    onKeyDown={(e) => { if (selectable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); p.tikla(); } }}
                    onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover((h) => (h === p.id ? null : h))}>
                    <title>{`${p.ad} · ${n} mekân`}</title>
                  </path>
                );
              })}
              {ilce && mah && <path d={pathD(ilce)} fill="none" stroke="var(--accent)" strokeWidth="1.2" strokeOpacity=".63" vectorEffect="non-scaling-stroke" pointerEvents="none" />}

              {etiketler.map(({ id, ad, x, y }) => (
                <text key={`l:${id}`} x={x} y={y} fontSize={Math.max(ilce ? 18 : 16, box.w * 10 / widthPx)} textAnchor="middle"
                  className={styles.mapLabel} strokeWidth={3.2 * box.w / widthPx}
                  pointerEvents="none" aria-hidden="true">{ad}</text>
              ))}

              {kumeler.map((k) => {
                const [x, y] = k.xy, group = k.yerler.length > 1, scale = box.w / widthPx;
                const picked = k.yerler.some((y) => y.slug === seciliYer?.slug);
                const title = group ? `${k.yerler.length} yakın mekân. Listeden seç` : `${k.yerler[0].name}, listede göster`;
                function activate(trigger: SVGGElement, keyboard: boolean) {
                  if (!group) { mekanSec(k.yerler[0], "listeye"); return; }
                  if (acikKume?.id === k.id) { kumeyiKapat(); return; }
                  clusterTrigger.current = trigger;
                  moveClusterFocus.current = keyboard;
                  setKumeId(k.id);
                }
                return (
                  <g key={k.id} role="button" tabIndex={group ? 0 : -1} aria-label={title}
                    aria-expanded={group ? acikKume?.id === k.id : undefined}
                    aria-pressed={group ? undefined : picked} className={styles.mapPin} onClick={(e) => activate(e.currentTarget, false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(e.currentTarget, true); }
                      if (e.key === "Escape" && acikKume?.id === k.id) kumeyiKapat();
                    }}>
                    <circle cx={x} cy={y} r={14 * scale} fill="transparent" />
                    <circle cx={x} cy={y} r={(group ? 11 : 3.4) * scale}
                      fill={picked ? "var(--accent)" : "var(--ink)"} stroke="var(--paper)" strokeWidth={1.4 * scale} />
                    {group && <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="var(--paper)" fontSize={10 * scale} pointerEvents="none" fontWeight={700}>{k.yerler.length}</text>}
                    <title>{title}</title>
                  </g>
                );
              })}

              {seciliYer?.xy && <g pointerEvents="none" aria-hidden="true">
                <circle cx={seciliYer.xy[0]} cy={seciliYer.xy[1]} r={9 * box.w / widthPx}
                  fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <circle cx={seciliYer.xy[0]} cy={seciliYer.xy[1]} r={5 * box.w / widthPx}
                  fill="var(--accent)" stroke="var(--paper)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              </g>}
            </svg>
          </div>

          <div className={styles.mapFooter}>
            <div className={styles.mapLegend}>
              <span className={styles.legendDot} style={{ background: filtre === "tumu" ? "var(--map-deniz)" : filtre === "secki" ? "var(--accent-soft)" : fill(filtre) }} />
              <span>{filtre === "tumu" ? "Renk: bölgede en çok bulunan tür" : filtre === "secki" ? "Koyu renk: daha fazla Seçki mekânı" : `Koyu renk: daha fazla ${GRUP.get(filtre)?.ad.toLocaleLowerCase("tr")}`}</span>
            </div>
            {mah && ilce && (
              <label className={styles.neighborhood}>
                <span className={styles.srOnly}>Mahalle seç</span>
                <select aria-label="Mahalle seç" value={urlMahalle ?? ""} onChange={(e) => setD((state) => ({ ...state, mahalleKey: e.target.value || undefined }))}>
                  <option value="">Tüm mahalleler</option>
                  {mah.mahalleler.map((m) => <option key={m.osm} value={norm(m.ad)}>{m.ad}</option>)}
                </select>
              </label>
            )}
          </div>
          {yuklemeDurumu === "bekliyor" && <p className={styles.loadNote} role="status">Mahalle sınırları yükleniyor. İlçe listesi açık.</p>}
          {yuklemeDurumu === "hata" && <div className={styles.loadNote}>
            <p role="status">Mahalle sınırları yüklenemedi. İlçe listesi kullanılabilir.</p>
            <button className={styles.utility} type="button" onClick={() => setDeneme((n) => n + 1)}>Tekrar dene</button>
          </div>}
          {acikKume && (
            <section className={styles.cluster} aria-label="Yakın mekânlar" onKeyDown={(e) => { if (e.key === "Escape") kumeyiKapat(); }}>
              <div className={styles.clusterHead}>
                <div><AtlasEtiket>Yakın noktalar</AtlasEtiket><h3 ref={clusterHeading} tabIndex={-1}>{acikKume.yerler.length} mekândan birini seç</h3></div>
                <button type="button" className={styles.utility} aria-label="Yakın mekân listesini kapat" onClick={kumeyiKapat}><AtlasIcon name="close" /></button>
              </div>
              <div className={styles.clusterList}>
                {[...acikKume.yerler].sort((a, b) => a.name.localeCompare(b.name, "tr")).map((y) => (
                  <button key={y.slug} type="button" aria-pressed={seciliYer?.slug === y.slug} onClick={() => mekanSec(y, "burada")}>
                    <span>{y.name}</span><AtlasIcon name={seciliYer?.slug === y.slug ? "check" : "pin"} size={16} />
                  </button>
                ))}
              </div>
            </section>
          )}
          {seciliYer && (
            <div className={styles.selection}>
              <div className={styles.selectionLabel} role="status"><AtlasIcon name="pin" /><strong>{seciliYer.name}</strong></div>
              <button type="button" className={styles.utility} onClick={() => mekanSec(seciliYer, "listeye")}>Listede göster <AtlasIcon name="arrow" size={15} /></button>
            </div>
          )}
          <p className={styles.attribution}>Sınırlar ve konumlar © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap katkıcıları (ODbL)</a>. Renkler yalnız Gidenler kataloğunu anlatır.</p>
        </section>

        <button type="button" onClick={listeyeGit} className={styles.mobileResults}><AtlasIcon name="list" /><span><small>{baslik}</small><strong>{format(listede.length)} mekânı gör</strong></span><AtlasIcon name="arrow" /></button>

        <aside className={styles.detail} aria-labelledby="atlas-mekanlar">
          <header className={styles.detailHead}>
            <div className={styles.detailKicker}><AtlasEtiket>Bölge dosyası</AtlasEtiket><span>{bolgeTuru} {ust !== "Semt semt" && `· ${ust}`}</span></div>
            <div className={styles.detailTitle}>
              <h2 id="atlas-mekanlar" ref={listHeading} tabIndex={-1}>{baslik}</h2>
              <AtlasSayi value={listede.length} label={filtre === "tumu" ? "mekân" : "sonuç"} />
            </div>
            <p className={styles.detailDescription}>{bas && bas !== "diger" ? <>Katalogda en çok <strong>{GRUP.get(bas)!.ad.toLocaleLowerCase("tr")}</strong>.</> : "Buradaki kayıtlı mekânları türüne göre keşfet."}</p>
            {ilceListesineAyrilan > 0 && <p className={styles.unplaced}>{ilceListesineAyrilan} mekânın konumu doğrulanmadı; yalnız kendi ilçe listesinde gösteriliyor.</p>}
            {atanmamis > 0 && <p className={styles.unplaced}>{atanmamis} kaydın mahallesi belirsiz; yalnız ilçe listesinde.</p>}
            <div className={styles.filters} role="group" aria-label="Mekân türü">
              <Cip on={filtre === "tumu"} onClick={() => setFiltre("tumu")}>Tümü</Cip>
              {(seckiN > 0 || filtre === "secki") && <Cip on={filtre === "secki"} onClick={() => setFiltre("secki")} tone="var(--accent-soft)">Seçki <span>{seckiN}</span></Cip>}
              {gorunenCip.map((s) => <Cip key={s.key} on={filtre === s.key} tone={fill(s.key)} onClick={() => setFiltre(s.key)}>{GRUP.get(s.key)!.kisa} <span>{s.n}</span></Cip>)}
              {!tumCip && cipler.length > 4 && <Cip on={false} onClick={() => setTumCip(true)}>+{cipler.length - 4} tür</Cip>}
              {tumCip && cipler.length > 4 && <Cip on={false} onClick={() => setTumCip(false)}>Daha az</Cip>}
              {filtre !== "tumu" && filtre !== "secki" && !gorunenCip.some((s) => s.key === filtre) && (
                <Cip on onClick={() => setFiltre("tumu")} tone={fill(filtre)}>{GRUP.get(filtre)?.kisa}<span aria-label="Filtreyi kaldır">×</span></Cip>
              )}
            </div>
          </header>

          <div className={styles.results}>
            {!listede.length && (
              <div className={styles.empty}><AtlasIcon name="scope" size={27} />
                <strong>Bu seçimde mekân yok.</strong><p>Başka bir tür veya bölge seçerek keşfe devam et.</p>
                {filtre !== "tumu" && <button className={styles.utility} type="button" onClick={() => setFiltre("tumu")}>Filtreyi kaldır</button>}
              </div>
            )}
            {bolumler.map((b) => {
              if (!b.yerler.length) return null;
              const all = acik[b.key] || filtre !== "tumu";
              const xs = all ? b.yerler : b.yerler.slice(0, LIST_CAP);
              return (
                <section key={b.key} className={styles.resultGroup}>
                  <h3><span style={{ background: b.key === "secki" ? "var(--accent-soft)" : fill(b.key) }} />{b.ad}<small>{b.yerler.length}</small></h3>
                  <ol>
                    {xs.map((y) => {
                      const sub = ilce ? (atama.get(y.slug)?.ad ?? y.district) : y.district;
                      const p = published[y.slug];
                      const picked = seciliYer?.slug === y.slug;
                      return (
                        <li key={y.slug} id={`semt-mekan-${y.slug}`} className={styles.venueRow} data-selected={picked}>
                          <Link href={`/mekan/${y.slug}/`} className={styles.venueLink}>
                            <div className={styles.venueMain}>
                              <strong>{y.name}</strong>{seckiSet.has(y.slug) && <small>Seçki</small>}
                              <span>{sub}{y.kind && y.kind !== sub ? ` · ${y.kind}` : ""}</span>
                              {konumDogrulanmadi(y.slug) && <span>Konum doğrulanmadı</span>}
                            </div>
                            {(y.g || p?.score != null) && <span className={styles.score}>
                              {y.g && <><strong title={`Google puanı ${f1(y.g.rating)}/5. Gidenler puanı değildir.`}>★ {f1(y.g.rating)}</strong><small>Google{y.g.count != null && ` · ${format(y.g.count)}`}</small></>}
                              {p?.score != null && <small className={styles.gidenlerScore}>Gidenler {fmtPublished(p.score)}</small>}
                            </span>}
                            <AtlasIcon name="arrow" size={15} />
                          </Link>
                          {ilce && pinSlugs.has(y.slug) && (
                            <button type="button" className={styles.showPin} aria-label={picked ? `${y.name}: Haritada seçili` : `${y.name} haritada göster`} aria-pressed={picked}
                              onClick={(e) => mekanSec(y, "haritaya", e.detail === 0)}>
                              <AtlasIcon name={picked ? "check" : "pin"} size={15} />{picked ? "Haritada seçili" : "Haritada göster"}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {!all && b.yerler.length > LIST_CAP && (
                    <button type="button" onClick={() => setAcik((s) => ({ ...s, [b.key]: true }))} className={styles.more}>
                      {b.yerler.length - LIST_CAP} mekân daha <AtlasIcon name="arrow" size={15} />
                    </button>
                  )}
                </section>
              );
            })}
            <p className={styles.scoreNote}>Google puanı 5 üzerinden. Gidenler puanı ayrı gösterilir ve yalnız yeterli deneyim olduğunda görünür.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function gorunumeGetir(element: Element | null) {
  if (!element) return;
  element.scrollIntoView({
    block: "start",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
}

function Cip({ on, onClick, tone, children }: { on: boolean; onClick: () => void; tone?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={styles.chip}>
      {tone && <i aria-hidden="true" style={{ background: tone }} />}{children}
    </button>
  );
}
