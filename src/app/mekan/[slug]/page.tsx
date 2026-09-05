import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { entities } from "@/data/entities";
import { getTopic } from "@/lib/api";
import { nf, score1 } from "@/lib/format";

import { Badge, Tag } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { ComplianceNotice } from "@/components/ui/ComplianceNotice";
import { SponsoredSlot } from "@/components/ui/SponsoredSlot";
import { ScoreBlock } from "@/components/score/ScoreBlock";
import { RatingDimensions } from "@/components/score/RatingDimensions";
import { ExternalScores } from "@/components/score/ExternalScores";
import { AISummaryBlock } from "@/components/insight/AISummaryBlock";
import { ThemeSignals, NeutralThemeCounts } from "@/components/insight/ThemeSignals";
import { ExperienceCard } from "@/components/experience/ExperienceCard";
import { Perspectives } from "@/components/topic/Perspectives";
import { ConsensusSignal } from "@/components/topic/ConsensusSignal";
import { TrendModule } from "@/components/market/TrendModule";
import { ExpectationModule } from "@/components/market/ExpectationModule";
import { DecisionHero, MobileActionBar } from "@/components/decision/DecisionHero";
import { EventsTimeline } from "@/components/decision/EventsTimeline";
import { getEntityEvents, getSimilarUsersPerspective } from "@/lib/decision";
import { blurbs } from "@/data/blurbs";
import { Disclosure } from "@/components/ui/Disclosure";

export function generateStaticParams() {
  return entities.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getTopic(slug);
  if (!t) return { title: "Bulunamadı" };
  const s = t.intelligence.overallScore ? ` — Gidenler ${score1(t.intelligence.overallScore)}` : "";
  return {
    title: `${t.entity.name}${s}`,
    description: t.intelligence.aiSummary?.lines[0] ?? `${t.entity.name} hakkında gerçek deneyimler.`,
  };
}

const ADS: Record<string, { title: string; body: string; domain: string }> = {
  "cat.restaurant": {
    title: "Nar Ocakbaşı · Yeldeğirmeni",
    body: "Akşam yemeği için iki kişilik masa. Hafta içi rezervasyonlarda %15 indirim.",
    domain: "nar-ocakbasi.example",
  },
  "cat.cafe": {
    title: "Kilo Kavurma Atölyesi",
    body: "Haftalık taze çekim filtre kahve, Kadıköy ve Beyoğlu'na aynı gün teslim.",
    domain: "kilokavurma.example",
  },
  "cat.hotel": {
    title: "Pera Rooms",
    body: "Tepebaşı'nda dört dakika. Hafta içi gecelik ₺2.400'den başlayan fiyatlar.",
    domain: "perarooms.example",
  },
};

const PRICE = (n?: 1 | 2 | 3 | 4) => (n ? "₺".repeat(n) : undefined);

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTopic(slug);
  if (!t) notFound();

  const { entity, category, schema, intelligence: I, expertExperiences, experiences, nearby } = t;
  const c = category.compliance;
  const ad = c.allowAdvertising ? ADS[category.id] : undefined;
  const district = entity.location?.district;
  const canPanel = entity.business?.claimed && c.mode !== "regulated";
  const similar = c.showScores ? getSimilarUsersPerspective(entity.id) : null;
  const events = getEntityEvents(entity.id);
  const compareWith = nearby.find((n) => n.score !== null && n.category.id === category.id)
    ?? (entity.slug === "sakura-omakase" ? { entity: { slug: "moda-lokantasi", name: "Moda Lokantası" } } : entity.slug === "moda-lokantasi" ? { entity: { slug: "sakura-omakase", name: "Sakura Omakase" } } : undefined);

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-32 sm:px-7 sm:pb-24">
      {/* ───────── 1. NE BURASI ───────── */}
      <header className="flex flex-col gap-4 pt-8 sm:pt-12">
        <nav className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <Link href="/" className="hover:text-ink">Keşfet</Link>
          <span aria-hidden>/</span>
          <span className="text-accent-ink">{category.label}</span>
          {district && (<><span aria-hidden>/</span><span>{district}</span></>)}
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
          <h1 className="max-w-[16ch] text-[clamp(2rem,7vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
            {entity.name}
          </h1>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={`/yaz/${entity.slug}/`}>
              <Button variant="primary" size="sm">Deneyim yaz</Button>
            </Link>
            {canPanel && (
              <Link href={`/isletme/${entity.slug}/`}>
                <Button variant="ghost" size="sm">İşletme paneli</Button>
              </Link>
            )}
          </div>
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
          {entity.address && <span>{entity.address}</span>}
          {entity.hours && (<><span aria-hidden className="text-ink-3">·</span><span>{entity.hours}</span></>)}
          {PRICE(entity.priceLevel) && (
            <><span aria-hidden className="text-ink-3">·</span><span className="tnum">{PRICE(entity.priceLevel)}</span></>
          )}
          {entity.isDemo && <Badge tone="demo" className="ml-1">Demo kayıt</Badge>}
        </p>

        {blurbs[entity.id] && (
          <p className="prose-exp max-w-[60ch] text-[16px] leading-[1.5] text-ink-2">{blurbs[entity.id]}</p>
        )}
        {entity.facets && entity.facets.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {entity.facets.map((f) => (
              <li key={f} className="label">{f}</li>
            ))}
          </ul>
        )}
      </header>

      {/* ───────── 2. GİDENLER NE DİYOR ───────── */}
      {I.overallScore !== null ? (
        <section className="mt-8 border-t-2 border-line-strong pt-7" aria-labelledby="karar">
          <h2 id="karar" className="sr-only">Gidenler değerlendirmesi</h2>
          <ScoreBlock intel={I} returnLabel={schema.returnLabel} lastVisitedAt={experiences[0]?.visitedAt} />

        </section>
      ) : (
        <div className="mt-8">
          <ComplianceNotice policy={c} noun={category.noun} />
        </div>
      )}

      {/* ───────── 2b. GİTMELİ MİSİN — DECISION LAYER (V3) ───────── */}
      {I.overallScore !== null && c.mode === "standard" && (
        <div className="mt-10">
          <DecisionHero
            entityId={entity.id} entitySlug={entity.slug} entityName={entity.name}
            compareWith={compareWith ? { slug: compareWith.entity.slug, name: compareWith.entity.name } : undefined}
          />
          <MobileActionBar entityId={entity.id} entitySlug={entity.slug} />
        </div>
      )}

      {/* ═══════════ KATMAN 2 — KANIT: Neden? (kompakt) ═══════════ */}
      {I.overallScore !== null && (
        <section className="mt-12 border-t-2 border-line-strong pt-6" aria-labelledby="kanit">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="kanit" className="text-[13px] font-bold uppercase tracking-[0.2em]">Neden?</h2>
            <p className="max-w-[48ch] text-[12px] text-ink-3">Puanın arkasındaki kanıt. Renk kaliteyi, ok yönü söyler.</p>
          </div>
          <div className="mt-6">
            <RatingDimensions dimensions={I.ratingDimensions} />
          </div>
          {I.perspectives.length > 0 && (
            <div className="mt-9">
              <Perspectives perspectives={I.perspectives} similar={similar} />
            </div>
          )}
          {I.externalSignals.length > 0 && (
            <div className="mt-9">
              <ExternalScores sources={I.externalSignals} />
            </div>
          )}
          <p className="mt-6 max-w-[70ch] border-t border-line pt-3 text-[12px] leading-relaxed text-ink-3">
            Puanlar {nf(I.experienceCount)} deneyimden hesaplandı. Doğrulanmış ziyaretler, yakın tarihli deneyimler ve
            yazarın Gidenler itibarı ağırlığı artırır; beyan edilmiş ticari ilişki ağırlığı düşürür.{" "}
            <strong className="font-semibold text-ink-2">Gidenler puanı dış kaynakların ortalaması değildir.</strong>
          </p>
        </section>
      )}

      {I.overallScore === null && I.negativeThemes.length > 0 && (
        <section className="mt-8">
          <h2 className="label mb-1">Konu dağılımı</h2>
          <NeutralThemeCounts items={I.negativeThemes} />
        </section>
      )}

      {/* ═══════════ KATMAN 3 — DERİNLİK: isteyen iner ═══════════ */}
      {I.overallScore !== null && (
        <section className="mt-12 border-t-2 border-line-strong pt-6" aria-labelledby="derin">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="derin" className="text-[13px] font-bold uppercase tracking-[0.2em]">Daha derine in</h2>
            <p className="text-[12px] text-ink-3">Özet, konular, zaman serisi, olaylar, beklenti ve bütün deneyimler.</p>
          </div>

          <Disclosure title="Deneyim özeti ve konular" hint={I.aiSummary ? `${nf(I.aiSummary.basedOnCount)} deneyim · son ${I.aiSummary.windowDays} gün` : undefined} defaultOpen>
            {I.aiSummary && <AISummaryBlock summary={I.aiSummary} />}
            {(I.positiveThemes.length > 0 || I.negativeThemes.length > 0) && (
              <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
                <ThemeSignals title="En çok övülen" hint="Deneyimlerde en sık olumlu geçen konular." items={I.positiveThemes} tone="pos" />
                <ThemeSignals title="En sık şikayet" hint="Sayı değil, konu ve yön." items={I.negativeThemes} tone="neg" />
              </div>
            )}
            {I.consensus && (
              <div className="mt-8">
                <ConsensusSignal consensus={I.consensus} confidence={I.confidence} experienceCount={I.experienceCount} />
              </div>
            )}
          </Disclosure>

          {I.timeline.length > 1 && (
            <Disclosure title="Gidenler Trend" hint="Bir mekân bugünkü puanı değil, bir zaman serisidir." defaultOpen>
              <TrendModule
                name={entity.name} score={I.overallScore} timeline={I.timeline} periodChanges={I.periodChanges}
                momentum={I.momentum} volume={I.volume} experienceCount={I.experienceCount}
                consensusLevel={I.consensus?.level}
                expertScore={I.perspectives.find((p) => p.segment === "expert")?.score ?? null}
                verifiedRatio={I.verifiedRatio}
              />
            </Disclosure>
          )}

          {events.length > 0 && (
            <Disclosure title="Ne oldu?" hint="Puan neden değişti — olaylar ve ardından gelen sinyaller." defaultOpen={I.momentum === "down" || I.momentum === "strong_down"}>
              <EventsTimeline events={events} />
            </Disclosure>
          )}

          {I.expectation && (
            <Disclosure title="Topluluk beklentisi" hint="Deneysel · ikincil · puanı değiştirmez">
              <ExpectationModule e={I.expectation} />
            </Disclosure>
          )}

          {expertExperiences.length > 0 && (
            <Disclosure title="Uzmanların deneyimleri" hint={`${expertExperiences.length} uzman · farklı bir perspektif, daha üstün bir görüş değil`} defaultOpen>
              {expertExperiences.map((e) => (
                <ExperienceCard key={e.id} experience={e} schema={schema} showScores={c.showScores} />
              ))}
            </Disclosure>
          )}

          {ad && <div className="mt-10"><SponsoredSlot {...ad} /></div>}

          <Disclosure title="Bütün deneyimler" hint={`${nf(I.experienceCount)} deneyimin ${experiences.length} tanesi`}>
            {experiences.map((e) => (
              <ExperienceCard key={e.id} experience={e} schema={schema} showScores={c.showScores} />
            ))}
          </Disclosure>
        </section>
      )}

      {I.overallScore === null && (
        <section className="mt-10" aria-labelledby="deneyimler">
          <h2 id="deneyimler" className="border-b-2 border-line-strong pb-3 text-[13px] font-bold uppercase tracking-[0.2em]">Bütün deneyimler</h2>
          <div className="mt-7">
            {experiences.map((e) => (
              <ExperienceCard key={e.id} experience={e} schema={schema} showScores={c.showScores} />
            ))}
          </div>
        </section>
      )}

      {/* ───────── 9. YAKINDAKİLER ───────── */}
      {nearby.length > 0 && (
        <section className="mt-14" aria-labelledby="yakin">
          <h2 id="yakin" className="label border-b border-line pb-2">
            {district}&apos;de yakındakiler
          </h2>
          <ul className="mt-1">
            {nearby.map((n) => (
              <li key={n.entity.id} className="border-b border-line">
                <Link href={`/mekan/${n.entity.slug}/`} className="group flex items-baseline justify-between gap-6 py-4 hover:bg-sheet">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[17px] font-bold tracking-tight group-hover:text-accent-ink">{n.entity.name}</span>
                    <span className="label">{n.category.label}</span>
                  </span>
                  {n.score !== null && (
                    <span className="tnum text-[22px] font-extrabold tracking-[-0.04em]">{score1(n.score)}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12"><DemoNotice /></div>
    </div>
  );
}
