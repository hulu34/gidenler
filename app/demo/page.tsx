import Link from "next/link";
import { DemoControls } from "@/app/demo/DemoControls";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { notFound } from "next/navigation";
import { DemoMovers } from "@/components/demo/DemoMovers";
import { ScoreScenario } from "@/components/demo/ScoreScenario";
import type { ThresholdVenue } from "@/components/demo/ThresholdCard";
import { DEMO_PROFILES } from "@/data/demoProfiles";
import { getTopic } from "@/lib/api";
import { canReserve, isPartner } from "@/lib/reservation";

export const metadata = { title: "Yatırımcı demosu" };

/**
 * /demo — sunum için kontrol paneli.
 * Tek tıkla "yaşanmış" hesap: flywheel'in her aşamasında bir örnek.
 * Sunum akışı buradan başlar; her adım için doğrudan bağlantı var.
 */
export default function DemoPage() {
  /* Sunum modu yalnız yatırımcı demosu dağıtımında; gerçek sitede bu adres yoktur. */
  if (!DEMO_VISIBLE) notFound();
  /* deneme eşiği senaryosu: içerik profili olan demo restoranlar, gerçek (demo verisindeki) Gidenler puanıyla */
  const venues: ThresholdVenue[] = Object.keys(DEMO_PROFILES).flatMap((slug) => {
    const t = getTopic(slug);
    return t ? [{ entityId: t.entity.id, slug, name: t.entity.name, score: t.intelligence.overallScore, menu: true, reservation: canReserve(t.entity) && isPartner(t.entity) }] : [];
  });
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <nav className="flex flex-wrap items-center gap-x-2.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <Link href="/" className="hover:text-ink">Gidenler</Link><span aria-hidden>/</span><span className="text-accent-ink">Demo</span>
        </nav>
        <h1 className="max-w-[16ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Sunum modu.</h1>
        <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
          Yatırımcı demosu — simüle edilmiş veriler. Bu mod, karar → ziyaret → deneyim döngüsünün her aşamasında bir örnek bulunan yaşanmış bir hesap kurar. Mekânlar, puanlar, deneyimler ve kişiler simülasyondur; puanlama kuralları ve ürün akışı gerçektir.
        </p>
      </header>
      <div className="mt-8 border-t-2 border-line-strong pt-7"><DemoControls /></div>
      <ScoreScenario venues={venues} />
      <DemoMovers />
    </div>
  );
}
