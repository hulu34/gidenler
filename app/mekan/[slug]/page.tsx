import Link from "next/link";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import type { Metadata } from "next";

import { entities } from "@/data/entities";
import { getTopic } from "@/lib/api";
import { pulseOf } from "@/lib/pulse";
import { Pulse } from "@/components/viz/Pulse";
import { PlaceSeal } from "@/components/viz/PlaceSeal";
import { VenueArt } from "@/components/art/DataArt";
import { AtAGlance } from "@/components/topic/AtAGlance";
import { SocialMedia } from "@/components/topic/SocialMedia";
import { VenueInfo } from "@/components/venue/VenueInfo";
import { VenueVisuals } from "@/components/venue/VenueVisuals";
import { VenueBadges, RealVenueNotice } from "@/components/venue/VenueBadges";
import { ReservationBlock } from "@/components/reservation/ReservationBlock";
import { canReserve } from "@/lib/reservation";
import { completenessOf } from "@/lib/completeness";
import { DataCompleteness } from "@/components/venue/DataCompleteness";
import { GooglePlace, GoogleRatingBadge } from "@/components/venue/GooglePlace";
import { googleUsable, placeProfile, placeReviews, placeScore, videoCounts } from "@/lib/live";
import { ThresholdBar, ThresholdCard, type ThresholdVenue } from "@/components/venue/ThresholdCard";
import { ProfileMenu, ProfileOverview, withProfile } from "@/components/venue/profile/ProfileSections";
import { GidenlerExperiences } from "@/components/venue/GidenlerExperiences";
import { PhotoMosaic } from "@/components/venue/media/PhotoMosaic";
import { VideoRail, type RailVideo } from "@/components/venue/media/VideoRail";
import { VenueSecki } from "@/components/seckisi/Seckisi";
import { articlesForVenue } from "@/lib/seckisi";
import { parseVideoUrl } from "@/lib/media/embed";
import { mapLinks } from "@/lib/venue";
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
  const e = t.entity;
  /* Demo kayıtlar arama motorlarına kapalı; başlıkta puan ve "gerçek deneyim" iddiası yok. */
  if (e.isDemo) return { title: `${e.name} (demo kayıt)`, description: "Prototip için üretilmiş demo kayıt; gerçek bir işletme değildir.", robots: { index: false, follow: false } };
  if (e.isReal) {
    const where = [e.subcategory, e.location?.district].filter(Boolean).join(" · ");
    return { title: `${e.name}${where ? ` · ${where}` : ""}`, description: `${e.name}${where ? ` (${where}, İstanbul)` : ""}: adres, iletişim ve çalışma saatleri. Henüz Gidenler puanı yok; ilk deneyimi sen yaz.` };
  }
  const s = t.intelligence.overallScore ? ` — Gidenler ${score1(t.intelligence.overallScore)}` : "";
  return {
    title: `${e.name}${s}`,
    description: t.intelligence.aiSummary?.lines[0] ?? `${e.name} hakkında deneyimler.`,
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

/** Kayıtlı (statik) sosyal medya bağlantılarından oynatılabilir videolar: YouTube / Instagram Reel / TikTok. */
function railFromMedia(media: import("@/lib/types").MediaLink[] = []): RailVideo[] {
  return media.flatMap((m) => {
    const v = parseVideoUrl(m.url) ?? (m.platform === "youtube" && m.videoId ? parseVideoUrl(`https://www.youtube.com/watch?v=${m.videoId}`) : null);
    return v ? [{ id: `static:${v.platform}:${v.id}`, platform: v.platform, externalId: v.id, url: v.url, credit: m.author ?? null }] : [];
  });
}

/* Statik sayfa + saatlik yenileme; Google eşleşmesi ve videolar veritabanından (lib/live), yönetimdeki
   değişiklik ilgili önbelleği hemen geçersiz kılar — yeni onaylanan restoran için yeniden derleme gerekmez. */
export const revalidate = 3600;

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
  const pulse = scored ? pulseOf(entity.id) : null;
  const dir = I.scoreTrend.direction;
  const oneLine = blurbs[entity.id] ?? I.aiSummary?.lines[0] ?? (scored ? talkInsight(cardOf(entity), I) : undefined);
  const expertIds = expertExperiences.map((e) => e.id);
  const expertAuthors = Array.from(new Map(expertExperiences.map((e) => [e.author.id, e])).values());
  const sections: TopicSection[] = [
    ...(canReserve(entity) ? [{ id: "bilgi", label: "Bilgi" }] : []),
    { id: "deneyimler", label: "Deneyimler" },
    ...(scored && I.aiSummary ? [{ id: "ozet", label: "Özet" }] : []),
    ...(scored ? [{ id: "puanlar", label: "Puanlar" }] : []),
    ...(scored && I.timeline.length > 1 ? [{ id: "trend", label: "Trend" }] : []),
    ...(expertAuthors.length ? [{ id: "uzmanlar", label: "Uzmanlar" }] : []),
    ...(I.positiveThemes.length || I.negativeThemes.length ? [{ id: "analiz", label: "Analiz" }] : []),
    ...(entity.isReal ? [{ id: "gor", label: "Konum" }] : []),
    { id: "sosyal", label: "Sosyal" },
  ];
  const compareWith = nearby.find((n) => n.score !== null && n.category.id === category.id)
    ?? (entity.slug === "sakura-omakase" ? { entity: { slug: "moda-lokantasi", name: "Moda Lokantası" } } : entity.slug === "moda-lokantasi" ? { entity: { slug: "sakura-omakase", name: "Sakura Omakase" } } : undefined);

  /* Kapak fotoğrafı ilk ekrandaki en büyük öğe: HTML ayrıştırılırken hemen, mozaikle aynı boyut kuralıyla iner */
  const [usable, videos, realReviews, rp, ps] = entity.isReal ? await Promise.all([googleUsable(), videoCounts(), placeReviews(entity.slug), placeProfile(entity.slug), placeScore(entity.slug)]) : [[], {} as Record<string, number>, [], null, null];
  /* Deneme eşiği: yalnız puan gösterilen kategorideki gerçek mekân; kart ve sayfa aynı yayımlanmış Gidenler puanını okur */
  const esik: ThresholdVenue | null = entity.isReal && c.showScores ? { slug: entity.slug, name: entity.name, score: ps?.score ?? null, menu: !!rp?.menu } : null;
  const google = !!entity.isReal && usable.includes(entity.slug);
  /* Gerçek restoran profili (kaynaklı içerik varsa): içerik odaklı düzen — genel bakış, menü, fotoğraflar, videolar, deneyimler */
  const ent = withProfile(entity, rp);
  const nVideos = videos[entity.slug] ?? 0;
  const profileNav: TopicSection[] = rp ? [
    { id: "genel", label: "Genel bakış" },
    { id: "menu", label: "Menü" },
    { id: "fotograflar", label: "Fotoğraflar" },
    ...(nVideos ? [{ id: "videolar", label: "Videolar" }] : []),
    { id: "deneyimler", label: "Deneyimler" },
    ...(google ? [{ id: "google", label: "Google" }] : []),
    { id: "gor", label: "Konum" },
  ] : [];
  const cover = entity.photos?.[0];
  if (cover?.srcSet) preload(cover.src, { as: "image", imageSrcSet: cover.srcSet, fetchPriority: "high",
    imageSizes: `(max-width: 640px) 60vw, ${(entity.photos?.length ?? 0) === 1 ? "1180px" : "590px"}` });

  return (
    <div className="mx-auto max-w-[1180px] overflow-x-clip px-5 pb-32 sm:px-7 sm:pb-24">
      {/* ═══════════ HERO — kısa ve güçlü: ad · tür · puan · yön · sana göre · tek cümle · eylem ═══════════ */}
      <header className="relative isolate flex flex-col gap-4 pt-7 sm:pt-10">
        {scored && pulse && (
          <div aria-hidden className="pointer-events-none absolute -right-40 -top-24 -z-10 hidden opacity-80 md:block [mask-image:radial-gradient(closest-side,black_55%,transparent)]">
            <VenueArt pulse={pulse} size={560} />
          </div>
        )}
        <nav className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <Link href="/kesfet/" className="hover:text-ink">Keşfet</Link>
          <span aria-hidden>/</span>
          <Link href={`/kategori/${category.slug}/`} className="text-accent-ink hover:underline">{category.label}</Link>
          {district && (<><span aria-hidden>/</span><span>{district}</span></>)}
        </nav>

        <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="max-w-[18ch] text-[clamp(2rem,7vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">{entity.name}</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            <CategoryGlyph entity={entity} />
            <span className="text-ink-2">{entity.subcategory ?? category.label}</span>
            {(district || (entity.location?.city && entity.location.city !== "İstanbul")) && (<><span aria-hidden>·</span><span>{[entity.location?.city !== "İstanbul" ? entity.location?.city : null, district, entity.location?.neighborhood && entity.location.neighborhood !== district ? entity.location.neighborhood : null].filter(Boolean).join(" · ")}</span></>)}
            {PRICE(entity.priceLevel) && (<><span aria-hidden>·</span><span className="tnum">{PRICE(entity.priceLevel)}</span></>)}
            {entity.isDemo && <Badge tone="demo" className="ml-1">Demo kayıt</Badge>}
            {entity.isReal && <span className="ml-1 rounded-full border border-pos px-2 py-px text-[9.5px] tracking-[0.14em] text-pos-ink">Gerçek mekân</span>}
          </p>
          <VenueBadges entityId={entity.id} />
          {google && <GoogleRatingBadge slug={entity.slug} google />}
          {scored && pulse && (
            <div className="mt-2 flex items-center gap-3 text-[12px] text-ink-3">
              <Pulse pulse={pulse} width={180} height={34} draw />
              <span className="tnum">son {pulse.raw.length} ay · {nf(pulse.volume)} deneyim</span>
            </div>
          )}
        </div>
        {esik ? (
          <div className="hidden w-[300px] shrink-0 sm:block"><ThresholdCard v={esik} /></div>
        ) : scored && pulse && (
          <div className="hidden flex-col items-center gap-1 sm:flex">
            <PlaceSeal pulse={pulse} size={132} label={`${entity.name} mührü: son ${pulse.raw.length} ayın puanı ve deneyim hacmi`} />
            <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-3">deneyim mührü</span>
          </div>
        )}
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
        ) : entity.isReal && c.showScores ? (
          <RealVenueNotice entity={entity} reviewCount={realReviews.length} score={ps?.score ?? null} scoredFrom={ps?.score != null ? ps.reviewCount : null} confidence={ps?.confidence ?? null} />
        ) : (
          <ComplianceNotice policy={c} noun={category.noun} />
        )}
      </header>

      {/* ═══════════ KAPAK MOZAİĞİ — büyük kapak + küçük kareler; fotoğraf yoksa ince şerit ═══════════ */}
      {(entity.isReal || entity.photos?.length) && <div id="fotograflar" className="scroll-mt-28 sm:scroll-mt-32"><PhotoMosaic slug={entity.slug} name={entity.name} photos={entity.photos} google={google} /></div>}
      {esik && <div className="mt-4 sm:hidden"><ThresholdBar v={esik} /></div>}

      {rp && (
        <>
          <TopicNav sections={profileNav} />
          {/* başlıktaki "Bilgi ve rezervasyon" bağlantısı (#bilgi) genel bakışa iner */}
          <div id="bilgi" aria-hidden className="scroll-mt-28 sm:scroll-mt-32" />
          <section id="genel" aria-labelledby="h-genel" className="scroll-mt-28 mt-8 grid gap-6 sm:scroll-mt-32 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start">
            <div className="min-w-0">
              <div className="kunye"><h2 id="h-genel">Genel bakış</h2><span /></div>
              <div className="mt-3"><ProfileOverview entity={ent} p={rp} googleHours={google} /></div>
            </div>
            <div className="min-w-0 md:sticky md:top-24"><ReservationBlock entity={ent} /></div>
          </section>
          <section id="menu" aria-labelledby="h-menu" className="scroll-mt-28 mt-12 sm:scroll-mt-32">
            <div className="kunye"><h2 id="h-menu">Menü</h2><span /></div>
            <div className="mt-4">
              {rp.menu ? <ProfileMenu m={rp.menu} /> : <p className="text-[13.5px] text-ink-2">Bu restoranın menüsü henüz doğrulanmış bir kaynaktan eklenmedi. Örnek menü ya da fiyat gösterilmez.</p>}
            </div>
          </section>
        </>
      )}

      {/* ═══════════ BİR BAKIŞTA — yeni ilk kat (mevcut bölümler aynen aşağıda) ═══════════ */}
      {scored && <AtAGlance entityId={entity.id} intel={I} pulse={pulse} />}

      {/* ═══════════ BİLGİ & REZERVASYON — Tabelog'un mağaza bilgisi + boş yer takvimi ═══════════ */}
      {!rp && canReserve(entity) && (
        <section id="bilgi" aria-labelledby="h-bilgi" className="scroll-mt-28 mt-10 grid gap-6 sm:scroll-mt-32 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start">
          <div className="min-w-0">
            <div className="kunye"><h2 id="h-bilgi">Mekân bilgisi</h2><span /></div>
            <div className="mt-3"><VenueInfo entity={entity} /></div>
          </div>
          <div className="min-w-0 md:sticky md:top-24"><ReservationBlock entity={entity} /></div>
        </section>
      )}

      {/* Google: puan, fotoğraf, saatler, yorumlar — temel bilgilerin hemen altında, ekrana girince yüklenir */}
      {entity.isReal && <div className="mt-8"><GooglePlace slug={entity.slug} name={entity.name} mapsUrl={mapLinks(entity)?.googleMaps} google={google} /></div>}

      {/* ═══════════ VİDEOLAR — Shorts · Reels · TikTok, resmî oynatıcılarla sitede; video yoksa çizilmez ═══════════ */}
      <VideoRail slug={entity.slug} name={entity.name} initial={railFromMedia(entity.media)} />

      {entity.isReal && <DataCompleteness c={completenessOf(ent, { googleMatched: google, videos: nVideos + articlesForVenue(entity.slug).reduce((n, a) => n + (a.media?.videos.length ?? 0), 0), menuItems: rp?.menu?.sections.reduce((a, s) => a + s.items.length, 0) ?? 0 })} slug={entity.slug} google={google} />}

      {/* ═══════════ YAPIŞKAN GEZİNTİ ═══════════ */}
      {!rp && <TopicNav sections={sections} />}

      {/* ═══════════ 1 · DENEYİMLER — insanlar ne diyor? Kahraman burası. ═══════════ */}
      <section id="deneyimler" className="scroll-mt-28 pt-8 sm:scroll-mt-32" aria-labelledby="h-deneyimler">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-2.5">
          <h2 id="h-deneyimler" className="text-[13px] font-bold uppercase tracking-[0.2em]">{entity.isReal ? "Gidenler deneyimleri" : "İnsanlar ne diyor?"}</h2>
          <p className="max-w-[48ch] text-[12px] text-ink-3">{entity.isReal ? `${realReviews.length ? `${nf(realReviews.length)} deneyim · ` : ""}Gidenler üyelerinin kendi deneyimleri; Google yorumları ayrı bölümde ve Gidenler puanına girmez.` : scored ? `${nf(I.experienceCount)} deneyim · ${Math.round(I.verifiedRatio * 100)}% doğrulanmış ziyaret` : "Bu kategoride puan üretilmez; deneyimler nötr anlatıdır."}</p>
        </div>
        <div className="mt-4">
          {entity.isReal ? (
            <GidenlerExperiences slug={entity.slug} name={entity.name} reviews={realReviews} dimensions={schema.dimensions} showScores={c.showScores} />
          ) : experiences.length > 0 ? (
            <ExperienceFeed experiences={experiences} expertIds={expertIds} schema={schema} showScores={c.showScores} entitySlug={entity.slug} total={I.experienceCount} />
          ) : (
            <p className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-4 text-[13.5px] text-ink-2">
              <span>{entity.isReal ? `${entity.name} için henüz Gidenler deneyimi yok. Gittiysen ilk deneyimi sen yaz; puan, yeterli sayıda deneyimden sonra oluşur.` : scored ? `Bu kayıt için deneyim metinleri prototipte gösterilmiyor; puan ve yön ${nf(I.experienceCount)} deneyimin özetidir.` : `Bu kayıt için deneyim metni prototipte gösterilmiyor; yalnızca nötr konu sayımı (${nf(I.experienceCount)} deneyim) var.`}</span>
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

      {/* Seçki: bu restoranı konu alan yazı, basın ve videolar; yayında yazı yoksa çizilmez */}
      {entity.isReal && <VenueSecki slug={entity.slug} />}

      {/* ═══════════ SOSYAL MEDYADA — videolar sitede oynar, gönderiler platformunda açılır ═══════════ */}
      <VenueVisuals entity={entity} />

      <SocialMedia name={entity.name} district={district ?? undefined} media={entity.media} />

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
      {entity.isDemo && <div className="mt-12"><DemoNotice /></div>}
    </div>
  );
}
