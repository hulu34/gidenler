import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { entities } from "@/data/entities";
import { getTopic } from "@/lib/api";
import { nf, score1 } from "@/lib/format";

import { Badge } from "@/components/ui/Badge";
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
import { EvidenceStrip } from "@/components/topic/EvidenceStrip";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { TopicNav, type TopicSection } from "@/components/topic/TopicNav";
import { HeroMatch } from "@/components/topic/HeroMatch";
import { ExperienceFeed } from "@/components/topic/ExperienceFeed";
import { EntityActions } from "@/components/decision/EntityActions";
import { PersonMark } from "@/components/experience/PersonMark";
import { CategoryGlyph } from "@/components/experience/CategoryGlyph";
import { verbsFor } from "@/lib/verbs";
import { talkInsight } from "@/lib/editorial";
import { consensusLabel } from "@/lib/semantic";
import { cardOf } from "@/lib/api";

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
  const V = verbsFor(entity);
  const scored = I.overallScore !== null;
  const dir = I.scoreTrend.direction;
  const oneLine = blurbs[entity.id] ?? I.aiSummary?.lines[0] ?? (scored ? talkInsight(cardOf(entity), I) : undefined);
  const expertIds = expertExperiences.map((e) => e.id);
  const expertAuthors = Array.from(new Map(expertExperiences.map((e) => [e.author.id, e])).values());
  const sections: TopicSection[] = [
    { id: "deneyimler", label: "Deneyimler" },
    ...(scored && I.aiSummary ? [{ id: "ozet", label: "Özet" }] : []),
    ...(scored ? [{ id: "puanlar", label: "Puanlar" }] : []),
    ...(scored && I.timeline.length > 1 ? [{ id: "trend", label: "Trend" }] : []),
    ...(expertAuthors.length ? [{ id: "uzmanlar", label: "Uzmanlar" }] : []),
    ...(I.positiveThemes.length || I.negativeThemes.length ? [{ id: "analiz", label: "Analiz" }] : []),
  ];
  const compareWith = nearby.find((n) => n.score !== null && n.category.id === category.id)
    ?? (entity.slug === "sakura-omakase" ? { entity: { slug: "moda-lokantasi", name: "Moda Lokantası" } } : entity.slug === "moda-lokantasi" ? { entity: { slug: "sakura-omakase", name: "Sakura Omakase" } } : undefined);

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-32 sm:px-7 sm:pb-24">
      {/* ═══════════ HERO — kısa ve güçlü: ad · tür · puan · yön · sana göre · tek cümle · eylem ═══════════ */}
      <header className="flex flex-col gap-4 pt-7 sm:pt-10">
        <nav className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <Link href="/kesfet/" className="hover:text-ink">Keşfet</Link>
          <span aria-hidden>/</span>
          <Link href={`/kategori/${category.slug}/`} className="text-accent-ink hover:underline">{category.label}</Link>
          {district && (<><span aria-hidden>/</span><span>{district}</span></>)}
        </nav>

        <div className="flex flex-col gap-2">
          <h1 className="max-w-[18ch] text-[clamp(2rem,7vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">{entity.name}</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            <CategoryGlyph entity={entity} />
            <span className="text-ink-2">{entity.subcategory ?? category.label}</span>
            {(district || (entity.location?.city && entity.location.city !== "İstanbul")) && (<><span aria-hidden>·</span><span>{[entity.location?.city !== "İstanbul" ? entity.location?.city : null, district, entity.location?.neighborhood && entity.location.neighborhood !== district ? entity.location.neighborhood : null].filter(Boolean).join(" · ")}</span></>)}
            {PRICE(entity.priceLevel) && (<><span aria-hidden>·</span><span className="tnum">{PRICE(entity.priceLevel)}</span></>)}
            {entity.isDemo && <Badge tone="demo" className="ml-1">Demo kayıt</Badge>}
          </p>
        </div>

        {scored ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <ScoreNumber score={I.overallScore!} size="xl" label trend={{ direction: dir, delta: dir === "flat" ? undefined : I.scoreTrend.delta }} />
              {c.mode === "standard" && <HeroMatch entityId={entity.id} />}
            </div>
            {oneLine && <p className="prose-exp max-w-[60ch] text-[17px] leading-[1.45] text-ink">{oneLine}</p>}
            {c.mode === "standard" && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
                <EntityActions entityId={entity.id} entitySlug={entity.slug} entityName={entity.name} variant="compact" via="topic-hero" />
                <Link href={`/yaz/${entity.slug}/`} className="text-[13px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Deneyim yaz</Link>
                {canPanel && <Link href={`/isletme/${entity.slug}/`} className="text-[13px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">İşletme paneli</Link>}
              </div>
            )}
          </div>
        ) : (
          <ComplianceNotice policy={c} noun={category.noun} />
        )}
      </header>

      {/* ═══════════ YAPIŞKAN GEZİNTİ ═══════════ */}
      <TopicNav sections={sections} />

      {/* ═══════════ 1 · DENEYİMLER — insanlar ne diyor? Kahraman burası. ═══════════ */}
      <section id="deneyimler" className="scroll-mt-28 pt-8 sm:scroll-mt-32" aria-labelledby="h-deneyimler">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
          <h2 id="h-deneyimler" className="text-[13px] font-bold uppercase tracking-[0.2em]">İnsanlar ne diyor?</h2>
          <p className="max-w-[48ch] text-[12px] text-ink-3">{scored ? `${nf(I.experienceCount)} deneyim · ${Math.round(I.verifiedRatio * 100)}% doğrulanmış ziyaret` : "Bu kategoride puan üretilmez; deneyimler nötr anlatıdır."}</p>
        </div>
        <div className="mt-4">
          {experiences.length > 0 ? (
            <ExperienceFeed experiences={experiences} expertIds={expertIds} schema={schema} showScores={c.showScores} entitySlug={entity.slug} total={I.experienceCount} />
          ) : (
            <p className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-4 text-[13.5px] text-ink-2">
              <span>{scored ? `Bu kayıt için deneyim metinleri prototipte gösterilmiyor; puan ve yön ${nf(I.experienceCount)} deneyimin özetidir.` : `Bu kayıt için deneyim metni prototipte gösterilmiyor; yalnızca nötr konu sayımı (${nf(I.experienceCount)} deneyim) var.`}</span>
              <Link href={`/yaz/${entity.slug}/`} className="font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">İlk metni sen yaz</Link>
            </p>
          )}
        </div>
      </section>

      {/* ═══════════ 2 · ÖZET — kanıta dayalı kısa sentez ═══════════ */}
      {scored && I.aiSummary && (
        <section id="ozet" className="scroll-mt-28 mt-12 sm:scroll-mt-32" aria-labelledby="h-ozet">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
            <h2 id="h-ozet" className="text-[13px] font-bold uppercase tracking-[0.2em]">Özet</h2>
            <p className="max-w-[48ch] text-[12px] text-ink-3">Son {I.aiSummary.windowDays} günde {nf(I.aiSummary.basedOnCount)} deneyimden; yorumların yerine geçmez.</p>
          </div>
          <ul className="mt-4 flex flex-col gap-2.5">
            {I.aiSummary.lines.slice(0, 3).map((line, i) => (
              <li key={i} className="prose-exp relative pl-5 text-[16.5px] leading-[1.5]"><span className="absolute left-0 top-[0.62em] block h-[2px] w-2.5 bg-ink-3" aria-hidden />{line}</li>
            ))}
          </ul>
          {(I.positiveThemes[0] || I.negativeThemes[0]) && (
            <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-2">
              {I.positiveThemes[0] && <span>En çok övülen: <strong className="font-semibold text-pos-ink">{I.positiveThemes[0].label}</strong></span>}
              {I.negativeThemes[0] && <span>En sık şikâyet: <strong className="font-semibold text-neg-ink">{I.negativeThemes[0].label}</strong></span>}
              {I.consensus && <span>Görüş: <strong className="font-semibold text-ink">{consensusLabel(I.consensus.level)}</strong></span>}
            </p>
          )}
        </section>
      )}

      {/* ═══════════ 3 · PUANLAR — Gidenler puanı · boyutlar · güven · dış kaynaklar · sana göre ═══════════ */}
      {scored && (
        <section id="puanlar" className="scroll-mt-28 mt-12 sm:scroll-mt-32" aria-labelledby="h-puanlar">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
            <h2 id="h-puanlar" className="text-[13px] font-bold uppercase tracking-[0.2em]">Puanlar</h2>
            <p className="max-w-[48ch] text-[12px] text-ink-3">Renk kaliteyi, ok yönü, güven ne kadar emin olduğumuzu söyler.</p>
          </div>
          <div className="mt-5"><ScoreBlock intel={I} /></div>
          <div className="mt-6"><EvidenceStrip intel={I} returnLabel={schema.returnLabel} lastVisitedAt={experiences[0]?.visitedAt ?? (I.timeline.length ? `${I.timeline[I.timeline.length - 1].period}-20` : undefined)} /></div>
          <div className="mt-7 border-t border-line pt-5"><RatingDimensions dimensions={I.ratingDimensions} /></div>
          {I.perspectives.length > 0 && <div className="mt-8"><Perspectives perspectives={I.perspectives} similar={similar} /></div>}
          {I.externalSignals.length > 0 && <div className="mt-8"><ExternalScores sources={I.externalSignals} /></div>}
          <p className="mt-6 max-w-[70ch] border-t border-line pt-3 text-[12px] leading-relaxed text-ink-3">
            Puanlar {nf(I.experienceCount)} deneyimden hesaplandı. Doğrulanmış ziyaretler, yakın tarihli deneyimler ve yazarın Gidenler itibarı ağırlığı artırır; beyan edilmiş ticari ilişki ağırlığı düşürür.{" "}
            <strong className="font-semibold text-ink-2">Gidenler puanı dış kaynakların ortalaması değildir.</strong>
          </p>
          {c.mode === "standard" && (
            <div className="mt-10">
              <DecisionHero entityId={entity.id} entitySlug={entity.slug} entityName={entity.name} compareWith={compareWith ? { slug: compareWith.entity.slug, name: compareWith.entity.name } : undefined} />
            </div>
          )}
        </section>
      )}

      {/* ═══════════ 4 · TREND — nereye gidiyor? ═══════════ */}
      {scored && I.timeline.length > 1 && (
        <section id="trend" className="scroll-mt-28 mt-12 sm:scroll-mt-32" aria-labelledby="h-trend">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
            <h2 id="h-trend" className="text-[13px] font-bold uppercase tracking-[0.2em]">Trend</h2>
            <p className="max-w-[48ch] text-[12px] text-ink-3">{I.timeline.length} dönem · son 90 gün {I.scoreTrend.delta > 0 ? "+" : ""}{score1(I.scoreTrend.delta)} · {I.momentum === "up" || I.momentum === "strong_up" ? "yükseliyor" : I.momentum === "down" || I.momentum === "strong_down" ? "geriliyor" : "stabil"}</p>
          </div>
          <div className="mt-5">
            <TrendModule name={entity.name} score={I.overallScore!} timeline={I.timeline} periodChanges={I.periodChanges} momentum={I.momentum} volume={I.volume} experienceCount={I.experienceCount} consensusLevel={I.consensus?.level} expertScore={I.perspectives.find((p) => p.segment === "expert")?.score ?? null} verifiedRatio={I.verifiedRatio} />
          </div>
          {events.length > 0 && (
            <div className="mt-6">
              <Disclosure title="Ne oldu?" hint="Olaylar ve ardından gelen sinyaller — birlikte görülür, nedensellik kurulmaz." defaultOpen={I.momentum === "down" || I.momentum === "strong_down"}>
                <EventsTimeline events={events} />
              </Disclosure>
            </div>
          )}
        </section>
      )}

      {/* ═══════════ 5 · UZMANLAR — kim bunu biliyor? ═══════════ */}
      {expertAuthors.length > 0 && (
        <section id="uzmanlar" className="scroll-mt-28 mt-12 sm:scroll-mt-32" aria-labelledby="h-uzmanlar">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
            <h2 id="h-uzmanlar" className="text-[13px] font-bold uppercase tracking-[0.2em]">Uzmanlar</h2>
            <p className="max-w-[48ch] text-[12px] text-ink-3">Bu alanda uzmanlığı kanıtlanmış ve burada gerçekten bulunmuş kişiler. Takipçi sayısı ölçü değildir.</p>
          </div>
          <ul className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {expertAuthors.map((e) => (
              <li key={e.author.id} className="flex items-center gap-3 border-b border-line py-3">
                <PersonMark user={e.author} size="md" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/@${e.author.handle}/`} className="text-[15px] font-bold leading-tight hover:text-accent-ink">@{e.author.handle}</Link>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{e.author.expertise.slice(0, 2).map((x) => x.label).join(" · ")}</span>
                </span>
                {c.showScores && <span className="ml-auto"><ScoreNumber score={e.overall} size="sm" /></span>}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Disclosure title="Uzmanların deneyimleri" hint={`${expertExperiences.length} deneyim · farklı bir perspektif, daha üstün bir görüş değil`}>
              {expertExperiences.map((e) => <ExperienceCard key={e.id} experience={e} schema={schema} showScores={c.showScores} entitySlug={entity.slug} />)}
            </Disclosure>
          </div>
        </section>
      )}

      {/* ═══════════ 6 · ANALİZ — neden? (motor AI, kahraman deneyim) ═══════════ */}
      {(I.positiveThemes.length > 0 || I.negativeThemes.length > 0) && (
        <section id="analiz" className="scroll-mt-28 mt-12 sm:scroll-mt-32" aria-labelledby="h-analiz">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
            <h2 id="h-analiz" className="text-[13px] font-bold uppercase tracking-[0.2em]">Analiz <span className="ml-1 font-semibold normal-case tracking-normal text-ink-3">· deneyimlerden çıkarım</span></h2>
            <p className="max-w-[48ch] text-[12px] text-ink-3">Konular, yön ve birlikte görülen sinyaller. Neden yerine kanıt; "nedeni budur" demez.</p>
          </div>
          {scored ? (
            <>
              <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
                <ThemeSignals title="En çok övülen" hint="Deneyimlerde en sık olumlu geçen konular." items={I.positiveThemes} tone="pos" />
                <ThemeSignals title="En sık şikâyet" hint="Sayı değil, konu ve yön." items={I.negativeThemes} tone="neg" />
              </div>
              {I.consensus && <div className="mt-8"><ConsensusSignal consensus={I.consensus} confidence={I.confidence} experienceCount={I.experienceCount} /></div>}
              {I.aiSummary && (
                <div className="mt-6"><Disclosure title="Tam özet" hint="Motor: Gidenler AI. Yalnızca yazılanları sayar ve özetler; kendi deneyimini yazmaz."><AISummaryBlock summary={I.aiSummary} /></Disclosure></div>
              )}
              {I.expectation && <div className="mt-2"><Disclosure title="Topluluk beklentisi" hint="Deneysel · ikincil · puanı değiştirmez"><ExpectationModule e={I.expectation} /></Disclosure></div>}
            </>
          ) : (
            <div className="mt-5"><NeutralThemeCounts items={I.negativeThemes} /></div>
          )}
          {ad && <div className="mt-10"><SponsoredSlot {...ad} /></div>}
        </section>
      )}

      {/* ═══════════ yakındakiler / benzerler — kategoriye duyarlı başlık, boş konum asla ═══════════ */}
      {nearby.length > 0 && (
        <section className="mt-14" aria-labelledby="yakin">
          <h2 id="yakin" className="label border-b border-line pb-2">{V.nearby(district)}</h2>
          <ul className="mt-1">
            {nearby.map((n) => (
              <li key={n.entity.id} className="border-b border-line">
                <Link href={`/mekan/${n.entity.slug}/`} className="group flex items-baseline justify-between gap-6 py-4 hover:bg-sheet">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[17px] font-bold tracking-tight group-hover:text-accent-ink">{n.entity.name}</span>
                    <span className="label">{n.entity.subcategory ?? n.category.label}</span>
                  </span>
                  {n.score !== null && <ScoreNumber score={n.score} size="md" label />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.mode === "standard" && scored && <MobileActionBar entityId={entity.id} entitySlug={entity.slug} />}
      <div className="mt-12"><DemoNotice /></div>
    </div>
  );
}
