import { listCards, listCreators, inIstanbul } from "@/lib/api";
import { nf, periodLabel } from "@/lib/format";
import { lastPeriodVolume } from "@/lib/pulse";
import { CityArt } from "@/components/art/DataArt";
import { Ticker } from "@/components/home/Ticker";
import { Risers } from "@/components/home/Risers";
import { ScoreLies } from "@/components/home/ScoreLies";
import { Districts } from "@/components/home/Districts";
import { Method } from "@/components/home/Method";
import { RealVenues } from "@/components/home/RealVenues";
import { RealExplore } from "@/components/home/RealExplore";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { DEMO_VISIBLE } from "@/data/entities";
import { isRestaurantTarget, realVenueRecords } from "@/data/real";
import { AskAI } from "@/components/home/AskAI";
import { ContinueModule } from "@/components/decision/ContinueModule";
import { HomeRankings, type HomeData } from "@/components/home/HomeRankings";
import { HOME_CATEGORIES, OTHER_CATEGORIES, buildRankings, buildRegulated, forYouRanking } from "@/lib/rankings";

/* ──────────────────────────────────────────────────────────────────────────
   ANA SAYFA = KARAR VER (yatırımcı sprinti, V7).
   Hero: manşet + AI kutusu (birincil eylem), arkada İstanbul sismografı (gerçek semt×ay hacmi)
   → borsa bandı → Yükselenler tablosu (nabız) → "Tek puan yanıltır" (çiz-tahmin et)
   → Semtler → kategori sıralamaları → Devam et → Nasıl çalışır + tekrar CTA.
   Tüm görseller veriden üretilen SVG; fotoğraf/stok yok.
   ────────────────────────────────────────────────────────────────────────── */

function homeData(): HomeData {
  const rankings: HomeData["rankings"] = {};
  const forYou: HomeData["forYou"] = {};
  for (const c of HOME_CATEGORIES) {
    if (c.key === "other") continue;
    rankings[c.key] = buildRankings(c, { all: c.key === "all" });
    forYou[c.key] = forYouRanking(c);
  }
  for (const o of OTHER_CATEGORIES) {
    if (o.regulated) { rankings[o.key] = buildRegulated(o); forYou[o.key] = []; }
    else { rankings[o.key] = buildRankings(o); forYou[o.key] = forYouRanking(o); }
  }
  return {
    primary: HOME_CATEGORIES.map(({ key, label }) => ({ key, label })),
    other: OTHER_CATEGORIES.map(({ key, label, regulated }) => ({ key, label, regulated })),
    rankings, forYou,
  };
}

export const metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  const data = homeData();
  const all = listCards();
  const istanbulCount = all.filter(inIstanbul).length;
  const realRestaurants = realVenueRecords.filter(isRestaurantTarget).length;
  const creators = listCreators();
  const last = lastPeriodVolume();

  return (
    <>
      {/* ───────── hero: manşet + tek soru, arkada İstanbul sismografı (gerçek veri) ───────── */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-full opacity-90 [mask-image:linear-gradient(to_bottom,transparent,black_30%)]">
          <CityArt />
        </div>
        <div className="mx-auto max-w-[1180px] px-5 pb-12 pt-10 sm:px-7 sm:pb-16 sm:pt-16">
          <p className="rise flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
            <span className="inline-flex items-center gap-1.5"><i aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />İstanbul</span>
            <span aria-hidden>·</span>
            {DEMO_VISIBLE ? (
              <>
                <span className="tnum">{periodLabel(last.period)}: {nf(last.count)} deneyim</span>
                <span aria-hidden>·</span>
                <span className="tnum">{nf(istanbulCount)} kayıt · {creators.length} doğrulanmış üretici</span>
                <span className="rounded-full border border-line-2 px-2 py-px text-[9.5px] tracking-[0.14em]">demo veri</span>
              </>
            ) : (
              <span className="tnum">{nf(istanbulCount)} gerçek mekân · {nf(realRestaurants)} restoran · kaynak OpenStreetMap</span>
            )}
          </p>
          <h1 className="rise mt-5 text-[clamp(2.75rem,8.4vw,6.25rem)] font-extrabold leading-[0.9] tracking-[-0.055em]" style={{ animationDelay: "80ms" }}>
            Nereye gidelim?<br />
            <span className="font-[family-name:var(--font-brand)] font-normal italic tracking-[-0.02em] text-accent-ink">Gidenler bilir.</span>
          </h1>
          <p className="rise mt-5 max-w-[46ch] font-[family-name:var(--font-read)] text-[clamp(1.0625rem,2.1vw,1.35rem)] leading-[1.42] text-ink-2" style={{ animationDelay: "160ms" }}>
            Puan değil, son aylarda gidenlerin gerçekte yaşadığı. Koşulunu yaz; deneyim grafiğinden sana uyan üç yeri gerekçesiyle seçelim.
          </p>
          <div className="rise mt-8" style={{ animationDelay: "240ms" }}>
            <AskAI />
          </div>
        </div>
      </section>

      {DEMO_VISIBLE && <Ticker />}

      <div className="mx-auto flex max-w-[1180px] flex-col gap-20 px-5 pb-20 pt-14 sm:px-7">
        {/* en iyiler · en çok konuşulanlar · yükselişte… — önceki sürümün kalbi, aynen ve en üstte */}
        {/* Demo kapalıyken (varsayılan) yalnız gerçek veriye dayanan modüller; sıralama, yükselenler, semt hacmi
            gerçek deneyimler biriktiğinde açılır. */}
        {DEMO_VISIBLE && (
          <section aria-label="Kategorilere göre sıralamalar">
            <HomeRankings data={data} />
          </section>
        )}
        <ContinueModule />
        {!DEMO_VISIBLE && <RealExplore />}
        <RealVenues />
        {DEMO_VISIBLE && <><Risers /><ScoreLies /><Districts /></>}
        <Method />
        {DEMO_VISIBLE && <DemoNotice />}
      </div>
    </>
  );
}
