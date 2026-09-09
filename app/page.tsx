import Link from "next/link";
import { listCards, listCreators, inIstanbul } from "@/lib/api";
import { nf } from "@/lib/format";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { AskHero } from "@/components/decision/AskHero";
import { ContinueModule } from "@/components/decision/ContinueModule";
import { HomeRankings, type HomeData } from "@/components/home/HomeRankings";
import { HOME_CATEGORIES, OTHER_CATEGORIES, buildRankings, buildRegulated, forYouRanking } from "@/lib/rankings";

/* ──────────────────────────────────────────────────────────────────────────
   ANA SAYFA = KARAR VER. "Ne arıyorsun? Bunlara bak."
   Hero (marka + Sor Gidenler) → kategori seçici → beş sıralama (Top 5) → Sana göre → Devam et.
   Pulse, endeksler, listeler, uzman radarı ve "nasıl çalışır" Keşfet / Nasıl çalışır'da yaşar.
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

export default function HomePage() {
  const data = homeData();
  const all = listCards();
  const istanbulCount = all.filter(inIstanbul).length;
  const creators = listCreators();

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-20 sm:px-7">
      {/* ───────── hero: marka + tek soru ───────── */}
      <section className="flex flex-col gap-5 pb-8 pt-10 sm:gap-6 sm:pb-10 sm:pt-16">
        <h1 className="max-w-[13ch] text-[clamp(2.5rem,9vw,5rem)] font-extrabold leading-[0.92] tracking-[-0.055em]">
          Gidenler{" "}
          <span className="font-[family-name:var(--font-brand)] font-normal italic tracking-[-0.02em] text-accent-ink">bilir.</span>
        </h1>
        <p className="prose-exp max-w-[44ch] text-[clamp(1.0625rem,2.1vw,1.3rem)] leading-[1.42] text-ink-2">
          Deneyimler sürekli değişir. Gidenler bunu ölçer; sadece bugünü değil, nereye gittiğini gösterir.
        </p>
        <div className="mt-1 flex flex-col gap-2">
          <p className="text-[13px] font-bold uppercase tracking-[0.2em]">Bugün ne arıyorsun?</p>
          <AskHero />
        </div>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <span>İstanbul</span>
          <span aria-hidden>·</span>
          <span className="tnum">{nf(istanbulCount)} kayıt</span>
          <span aria-hidden>·</span>
          <span className="tnum">{creators.length} doğrulanmış üretici</span>
          <span aria-hidden>·</span>
          <Link href="/kesfet/" className="normal-case tracking-normal underline decoration-line-2 underline-offset-4 hover:text-ink">diğer şehirler ve tüm evren Keşfet&apos;te</Link>
        </p>
      </section>

      {/* ───────── seçici + sıralamalar ───────── */}
      <HomeRankings data={data} />

      {/* ───────── devam et — sadece kaydettiğin/gittiğin bir şey varsa ───────── */}
      <div className="mt-12"><ContinueModule /></div>

      <div className="mt-12"><DemoNotice /></div>
    </div>
  );
}
