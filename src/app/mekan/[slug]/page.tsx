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
import { DecisionLayer } from "@/components/decision/DecisionLayer";
import { EventsTimeline } from "@/components/decision/EventsTimeline";
import { getEntityEvents, getSimilarUsersPerspective } from "@/lib/decision";

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
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
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
          <ScoreBlock intel={I} returnLabel={schema.returnLabel} />

          <div className="mt-9">
            <h3 className="label mb-4">Neye göre</h3>
            <RatingDimensions dimensions={I.ratingDimensions} />
          </div>

          <p className="mt-6 max-w-[70ch] border-t border-line pt-3 text-[12px] leading-relaxed text-ink-3">
            Puanlar {nf(I.experienceCount)} deneyimden hesaplandı. Doğrulanmış ziyaretler, yakın
            tarihli deneyimler ve yazarın Gidenler itibarı ağırlığı artırır; beyan edilmiş ticari
            ilişki ağırlığı düşürür.{" "}
            <strong className="font-semibold text-ink-2">Gidenler puanı dış kaynakların ortalaması değildir.</strong>
          </p>
        </section>
      ) : (
        <div className="mt-8">
          <ComplianceNotice policy={c} noun={category.noun} />
        </div>
      )}

      {/* ───────── 2b. GİTMELİ MİSİN — DECISION LAYER (V3) ───────── */}
      {I.overallScore !== null && c.mode === "standard" && (
        <div className="mt-10">
          <DecisionLayer
            entityId={entity.id} entitySlug={entity.slug} entityName={entity.name}
            compareWith={compareWith ? { slug: compareWith.entity.slug, name: compareWith.entity.name } : undefined}
          />
        </div>
      )}

      {/* ───────── 3. KİM NE DÜŞÜNÜYOR ───────── */}
      {I.perspectives.length > 0 && (
        <div className="mt-11">
          <Perspectives perspectives={I.perspectives} similar={similar} />
        </div>
      )}

      {I.consensus && (
        <div className="mt-11">
          <ConsensusSignal
            consensus={I.consensus}
            confidence={I.confidence}
            experienceCount={I.experienceCount}
          />
        </div>
      )}

      {/* ───────── 4. DIŞ DÜNYA NE DİYOR ───────── */}
      {I.externalSignals.length > 0 && (
        <div className="mt-11">
          <ExternalScores sources={I.externalSignals} />
        </div>
      )}

      {/* ───────── 5. NEDEN ───────── */}
      {I.aiSummary && (
        <div className="mt-12">
          <AISummaryBlock summary={I.aiSummary} />
        </div>
      )}

      {(I.positiveThemes.length > 0 || I.negativeThemes.length > 0) && I.overallScore !== null && (
        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <ThemeSignals title="En çok övülen" hint="Deneyimlerde en sık olumlu geçen konular." items={I.positiveThemes} tone="pos" />
          <ThemeSignals title="En sık şikayet" hint="Sayı değil, konu ve yön." items={I.negativeThemes} tone="neg" />
        </div>
      )}

      {I.overallScore === null && I.negativeThemes.length > 0 && (
        <section className="mt-8">
          <h2 className="label mb-1">Konu dağılımı</h2>
          <NeutralThemeCounts items={I.negativeThemes} />
        </section>
      )}

      {/* ───────── 6. NE DEĞİŞTİ — EXPERIENCE MARKET KATMANI ───────── */}
      {I.timeline.length > 1 && I.overallScore !== null && (
        <div className="mt-12">
          <TrendModule
            name={entity.name}
            score={I.overallScore}
            timeline={I.timeline}
            periodChanges={I.periodChanges}
            momentum={I.momentum}
            volume={I.volume}
            experienceCount={I.experienceCount}
            consensusLevel={I.consensus?.level}
            expertScore={I.perspectives.find((p) => p.segment === "expert")?.score ?? null}
            verifiedRatio={I.verifiedRatio}
          />
        </div>
      )}

      {/* ───────── 6a. NE OLDU — EVENTS (V3) ───────── */}
      {events.length > 0 && I.overallScore !== null && (
        <div className="mt-12">
          <EventsTimeline events={events} />
        </div>
      )}

      {/* ───────── 6b. TOPLULUK BEKLENTİSİ ───────── */}
      {I.expectation && (
        <div className="mt-12">
          <ExpectationModule e={I.expectation} />
        </div>
      )}

      {ad && <div className="mt-12"><SponsoredSlot {...ad} /></div>}

      {/* ───────── 7. UZMAN DENEYİMLERİ ───────── */}
      {expertExperiences.length > 0 && (
        <section className="mt-14" aria-labelledby="uzmanlar">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b-2 border-line-strong pb-3">
            <h2 id="uzmanlar" className="text-[13px] font-bold uppercase tracking-[0.2em]">
              Uzmanların deneyimleri
            </h2>
            <p className="max-w-[46ch] text-[12px] text-ink-3">
              Bu konuda Gidenler uzmanlığı olan {expertExperiences.length} kişi buraya gitti.
              Farklı bir perspektif; daha üstün bir görüş değil.
            </p>
          </div>
          <div className="mt-7">
            {expertExperiences.map((e) => (
              <ExperienceCard key={e.id} experience={e} schema={schema} showScores={c.showScores} />
            ))}
          </div>
        </section>
      )}

      {/* ───────── 8. BÜTÜN DENEYİMLER ───────── */}
      <section className="mt-14" aria-labelledby="deneyimler">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b-2 border-line-strong pb-3">
          <h2 id="deneyimler" className="text-[13px] font-bold uppercase tracking-[0.2em]">
            Bütün deneyimler
          </h2>
          <div className="flex items-center gap-5">
            <Tag>{nf(I.experienceCount)} deneyimin {experiences.length} tanesi</Tag>
            <span className="flex gap-4 text-[12px] font-semibold uppercase tracking-[0.1em]">
              <button className="border-b-2 border-accent pb-0.5 text-ink" type="button">Yeni gidenler</button>
              <button className="text-ink-3 hover:text-ink" type="button">En faydalı</button>
            </span>
          </div>
        </div>
        <div className="mt-7">
          {experiences.map((e) => (
            <ExperienceCard key={e.id} experience={e} schema={schema} showScores={c.showScores} />
          ))}
        </div>
      </section>

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
