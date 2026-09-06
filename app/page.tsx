import Link from "next/link";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import {
  expertExperiences, featuredLists, getTopicIntelligence, homeAgenda, homeFalling, homeRising, inIstanbul, latestExperiences,
  listCards, listCreators, listIndices, pulse, type EntityCard,
} from "@/lib/api";
import { changeInsight, talkInsight, talkStatus } from "@/lib/editorial";
import { EntityVisual } from "@/components/experience/EntityVisual";
import { PersonMark } from "@/components/experience/PersonMark";
import { IndexStrip } from "@/components/market/IndexStrip";
import { monthOf, nf, score1 } from "@/lib/format";
import { EntityCardRow } from "@/components/experience/EntityCardRow";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { Tag } from "@/components/ui/Badge";
import { ReputationChip } from "@/components/creator/ReputationChip";
import { AskHero } from "@/components/decision/AskHero";
import { forYou } from "@/lib/decision";
import { WhyThisResult } from "@/components/decision/WhyThisResult";
import { ContinueModule } from "@/components/decision/ContinueModule";
import { EntityActions } from "@/components/decision/EntityActions";

/* ──────────────────────────────────────────────────────────────────────────
   GÜNDEM VİTRİNİ — mekân → neden konuşuluyor → durum.
   Görsel + ad + tek cümle + puan + trend. Başka hiçbir şey.
   ────────────────────────────────────────────────────────────────────────── */
function AgendaHero({ card, rank }: { card: EntityCard; rank: number }) {
  const it = getTopicIntelligence(card.entity.id);
  const dir = card.delta90d > 0.15 ? "up" : card.delta90d < -0.15 ? "down" : "flat";
  const st = talkStatus(card);
  const tone = st.tone === "pos" ? "text-pos-ink" : st.tone === "neg" ? "text-neg-ink" : "text-ink-3";
  const loc = card.entity.location;
  return (
    <li className="min-w-0">
      <Link href={`/mekan/${card.entity.slug}/`} className="group flex flex-col gap-4">
        <span className="relative block overflow-hidden border border-line">
          <EntityVisual entity={card.entity} variant="hero" priority />
          <span className="absolute left-3 top-3 flex items-center gap-2 bg-paper/92 px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] backdrop-blur-[2px]">
            <span className="tnum text-ink-3">{String(rank).padStart(2, "0")}</span>
            <span className={tone}>{st.label}</span>
          </span>
        </span>
        <span className="grid grid-cols-[1fr_auto] items-start gap-x-5">
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[24px] font-bold leading-[1.05] tracking-[-0.03em] group-hover:text-accent-ink sm:text-[28px]">{card.entity.name}</span>
            <span className="flex flex-wrap items-center gap-x-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              <span className="text-accent-ink">{card.entity.subcategory ?? card.category.label}</span>
              {loc?.district && <span>{loc.district}{loc.neighborhood && loc.neighborhood !== loc.district ? ` · ${loc.neighborhood}` : ""}</span>}
            </span>
          </span>
          {card.score !== null && <ScoreNumber score={card.score} size="xl" label stack trend={{ direction: dir, delta: dir === "flat" ? undefined : card.delta90d }} />}
        </span>
        <span className="prose-exp text-[17px] leading-[1.4] text-ink">{talkInsight(card, it)}</span>
      </Link>
    </li>
  );
}

function ChangeRow({ card, dir }: { card: EntityCard; dir: "up" | "down" }) {
  const it = getTopicIntelligence(card.entity.id);
  const tone = dir === "up" ? "text-pos-ink" : "text-neg-ink";
  return (
    <li className="border-t border-line">
      <Link
        href={`/mekan/${card.entity.slug}/`}
        className="group grid grid-cols-[64px_1fr_auto] items-center gap-x-4 py-4 transition-colors hover:bg-sheet sm:gap-x-5 sm:py-5"
      >
        <EntityVisual entity={card.entity} variant="thumb" className="w-16" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="line-clamp-2 text-[19px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink">
            {card.entity.name}
          </span>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            <span className="text-accent-ink">{card.entity.subcategory ?? card.category.label}</span>
            {card.entity.location?.district && <span>{card.entity.location.district}</span>}
          </span>
          <span className="prose-exp line-clamp-2 text-[14.5px] leading-snug text-ink-2">{changeInsight(it, dir)}</span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {card.score !== null && (
            <ScoreNumber score={card.score} size="md" />
          )}
          <span className={`tnum text-[12px] font-semibold ${tone}`}>
            {card.delta90d > 0 ? "+" : ""}
            {card.delta90d.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            <span className="font-medium text-ink-3"> · 90 gün</span>
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function HomePage() {
  const agenda = homeAgenda(5);
  const heroes = agenda.slice(0, 2);
  const compact = agenda.slice(2);
  const up = homeRising(3);
  const down = homeFalling(3);
  const experts = expertExperiences(3, "İstanbul");
  const shown = new Set(experts.map((x) => x.experience.id));
  const latest = latestExperiences(12, "İstanbul").filter((x) => !shown.has(x.experience.id)).slice(0, 4);
  const lists = featuredLists(4);
  const creators = listCreators();
  const all = listCards();
  const istanbulCount = all.filter(inIstanbul).length;
  const p = pulse("İstanbul");
  const idx = listIndices();
  const mine = forYou(3);

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-20 sm:px-7">
      {/* ───────── 1 · tez ───────── */}
      <section className="flex flex-col gap-6 pb-10 pt-12 sm:pb-14 sm:pt-20">
        <h1 className="max-w-[13ch] text-[clamp(2.75rem,10vw,5.5rem)] font-extrabold leading-[0.92] tracking-[-0.055em]">
          Gidenler{" "}
          <span className="font-[family-name:var(--font-brand)] font-normal italic tracking-[-0.02em] text-accent-ink">
            bilir.
          </span>
        </h1>
        <p className="prose-exp max-w-[56ch] text-[clamp(1.0625rem,2.2vw,1.375rem)] leading-[1.45] text-ink-2">
          Deneyimler sürekli değişir. Gidenler bunu ölçer. Her deneyim bir sinyal. Her ziyaret yeni bir veri noktası. Her değişim bir yön. Gidenler, insanların deneyimlerini güven, uzmanlık ve zamanla anlamlandırır. Sadece bugünü değil, nereye gittiğini gösterir.
        </p>
        <div className="mt-2"><AskHero /></div>
        <p className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <span>İstanbul · yeme-içme, kültür, gezi</span>
          <span aria-hidden>·</span>
          <span className="tnum">{nf(istanbulCount)} mekân</span>
          <span aria-hidden>·</span>
          <span className="tnum">{creators.length} doğrulanmış üretici</span>
        </p>
      </section>

      {/* ───────── 2 · gündem — vitrin: mekân → neden konuşuluyor → durum ───────── */}
      <section aria-labelledby="gundem" className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
          <h2 id="gundem" className="text-[13px] font-bold uppercase tracking-[0.2em]">
            İstanbul&apos;da bugün konuşulanlar
          </h2>
          <p className="max-w-[44ch] text-[12px] text-ink-3">Deneyim hacmi ve son 90 günün hareketine göre; sponsor yok, sıralama satılmaz.</p>
        </div>
        <ul className="grid gap-x-10 gap-y-10 pt-7 md:grid-cols-2">
          {heroes.map((c, i) => <AgendaHero key={c.entity.id} card={c} rank={i + 1} />)}
        </ul>
        {compact.length > 0 && (
          <ul className="mt-8">
            {compact.map((c, i) => (
              <EntityCardRow key={c.entity.id} card={c} rank={i + 3} insight={talkInsight(c, getTopicIntelligence(c.entity.id))} />
            ))}
          </ul>
        )}
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-[12.5px] text-ink-3">
          <Link href="/kesfet/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Keşfet</Link>
          <Link href="/ara/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Ara</Link>
          <span>Vitrin İstanbul&apos;dur; diğer şehirler Keşfet&apos;te.</span>
        </p>
      </section>

      {/* ───────── 3 · sana göre — decision layer (V3) ───────── */}
      {mine.length > 0 && (
        <section aria-labelledby="sanagore" className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
            <h2 id="sanagore" className="text-[13px] font-bold uppercase tracking-[0.2em]">Sana göre</h2>
            <p className="flex items-center gap-3 text-[12px] text-ink-3">
              <span>Aynı mekân herkes için aynı değil. Zevk profiline göre uyum.</span>
              <span className="border border-dashed border-line-2 px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.12em]">demo profil</span>
            </p>
          </div>
          <ul className="grid gap-x-12 gap-y-8 pt-7 lg:grid-cols-3">
            {mine.map(({ card, match, decision }) => (
              <li key={card.entity.id} className="flex flex-col gap-3">
                <Link href={`/mekan/${card.entity.slug}/`} className="group flex items-baseline justify-between gap-4">
                  <span className="text-[21px] font-bold leading-tight tracking-[-0.025em] group-hover:text-accent-ink">{card.entity.name}</span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[30px] font-extrabold leading-none tracking-[-0.05em] text-accent-ink">%{match!.score}</span>
                    <span className="label">uyum</span>
                  </span>
                </Link>
                <span className="flex flex-wrap items-center gap-x-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                  <span className={decision!.verdict === "Biraz bekle" ? "text-warn" : "text-pos-ink"}>{decision!.verdict}</span>
                  {card.score !== null && <span className="normal-case tracking-normal"><ScoreNumber score={card.score} size="sm" label /></span>}
                  {card.entity.location?.district && <span>{card.entity.location.district}</span>}
                </span>
                <WhyThisResult reasons={decision!.reasons.slice(0, 2)} warnings={decision!.warnings.slice(0, 1)} compact />
                <EntityActions entityId={card.entity.id} entitySlug={card.entity.slug} entityName={card.entity.name} variant="compact" via="home" />
              </li>
            ))}
          </ul>
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-[12.5px] text-ink-3">
            <Link href="/sor/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Sor Gidenler</Link>
            <Link href="/simdi/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Bu akşam nereye?</Link>
            <Link href="/karsilastir/" className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Karşılaştır</Link>
            <span>Uyum, Gidenler puanı değildir; ikisi yan yana durur, toplanmaz.</span>
          </p>
        </section>
      )}

      {/* ───────── 3b · devam et — döngü (V4) ───────── */}
      <ContinueModule />

      {/* ───────── 4 · uzmanların radarında — insan ve güven ağı ───────── */}
      {experts.length > 0 && (
        <section aria-labelledby="uzmanlar" className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
            <h2 id="uzmanlar" className="text-[13px] font-bold uppercase tracking-[0.2em]">
              Bu hafta uzmanların radarında
            </h2>
            <p className="max-w-[44ch] text-[12px] text-ink-3">
              Uzmanlık takipçiyle değil, yazılmış deneyimle kazanılır.
            </p>
          </div>
          <ul className="grid gap-x-12 gap-y-9 pt-7 lg:grid-cols-3">
            {experts.map(({ experience: e, card }) => {
              const area = e.author.expertise[0];
              return (
                <li key={e.id} className="flex flex-col gap-3">
                  <Link href={`/@${e.author.handle}/`} className="group/u flex items-center gap-3">
                    <PersonMark user={e.author} size="md" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[14px] font-bold leading-tight group-hover/u:text-accent-ink">
                        @{e.author.handle}
                      </span>
                      <ReputationChip reputation={e.author.reputation} kind={e.author.kind} />
                    </span>
                  </Link>
                  {area && (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                      {area.label} · {area.level} · <span className="tnum">{nf(area.experienceCount)}</span> deneyim
                    </span>
                  )}
                  <Link href={`/mekan/${card.entity.slug}/`} className="group flex flex-col gap-1.5">
                    <span className="flex items-baseline gap-2.5">
                      <span className="text-[20px] font-bold leading-tight tracking-[-0.025em] group-hover:text-accent-ink">
                        {card.entity.name}
                      </span>
                      <span className="tnum text-[14px] font-bold text-ink-3">{score1(e.overall)}</span>
                    </span>
                    <span className="prose-exp line-clamp-3 text-[15.5px] text-ink-2">{e.body}</span>
                  </Link>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                    {monthOf(e.visitedAt)}&apos;da gitti
                    {e.verification.verified && <span className="text-accent-ink"> · doğrulanmış ziyaret</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ───────── 4 · son deneyimler — hammadde ───────── */}
      <section aria-labelledby="son" className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
          <h2 id="son" className="text-[13px] font-bold uppercase tracking-[0.2em]">Son deneyimler</h2>
          <Tag>puan bunlardan üretilir</Tag>
        </div>
        <ul>
          {latest.map(({ experience: e, card }) => (
            <li key={e.id} className="border-b border-line">
              <article className="grid gap-x-6 gap-y-2 py-6 sm:grid-cols-[1fr_auto]">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link href={`/mekan/${card.entity.slug}/`} className="text-[18px] font-bold tracking-[-0.02em] hover:text-accent-ink">
                      {card.entity.name}
                    </Link>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                      {card.category.label}
                      {card.entity.location?.district && ` · ${card.entity.location.district}`}
                    </span>
                  </span>
                  <p className="prose-exp line-clamp-3 max-w-[70ch] text-[16px] text-ink-2">{e.body}</p>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link href={`/@${e.author.handle}/`} className="flex items-center gap-2 text-[13px] font-bold hover:text-accent-ink">
                      <PersonMark user={e.author} size="xs" />@{e.author.handle}
                    </Link>
                    <ReputationChip reputation={e.author.reputation} kind={e.author.kind} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                      {monthOf(e.visitedAt)}&apos;da gitti
                      {e.verification.verified && <span className="text-accent-ink"> · doğrulanmış</span>}
                    </span>
                  </span>
                </div>
                {card.category.compliance.showScores && (
                  <div className="flex items-start sm:flex-col sm:items-end">
                    <span className="tnum text-[24px] font-extrabold leading-none tracking-[-0.04em]">{score1(e.overall)}</span>
                    <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3 sm:ml-0 sm:mt-1">
                      bu deneyim
                    </span>
                  </div>
                )}
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── 5 · ne değişiyor? — trend, deneyimi anlamlandırır ───────── */}
      <section aria-labelledby="degisen" className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
          <h2 id="degisen" className="text-[13px] font-bold uppercase tracking-[0.2em]">Ne değişiyor?</h2>
          <p className="max-w-[48ch] text-[12px] text-ink-3">
            Son 90 günün deneyimleri öncekilerle karşılaştırıldığında.
          </p>
        </div>
        <div className="grid gap-x-14 gap-y-10 pt-6 lg:grid-cols-2">
          <section aria-labelledby="toparlayan">
            <h3 id="toparlayan" className="label pb-1">Toparlayanlar</h3>
            <ul>
              {up.length ? up.map((c) => <ChangeRow key={c.entity.id} card={c} dir="up" />)
                : <li className="border-t border-line py-6 text-[14px] text-ink-3">Son 90 günde belirgin bir toparlanma yok.</li>}
            </ul>
          </section>
          <section aria-labelledby="gerileyen">
            <h3 id="gerileyen" className="label pb-1">Gerileyenler</h3>
            <ul>
              {down.length ? down.map((c) => <ChangeRow key={c.entity.id} card={c} dir="down" />)
                : <li className="border-t border-line py-6 text-[14px] text-ink-3">Son 90 günde belirgin bir gerileme yok.</li>}
            </ul>
          </section>
        </div>
      </section>

      {/* ───────── 6 · uzman listeleri ───────── */}
      <section aria-labelledby="listeler" className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
          <h2 id="listeler" className="text-[13px] font-bold uppercase tracking-[0.2em]">Uzman listeleri</h2>
          <Tag>algoritma değil, birinin görüşü</Tag>
        </div>
        <ul className="grid gap-x-12 gap-y-7 pt-7 sm:grid-cols-2">
          {lists.map((l) => (
            <li key={l.id}>
              <Link href={`/liste/${l.slug}/`} className="group flex flex-col gap-1.5">
                <span className="text-[20px] font-bold leading-tight tracking-[-0.025em] group-hover:text-accent-ink">
                  {l.title}
                </span>
                {l.subtitle && <span className="text-[13.5px] text-ink-2">{l.subtitle}</span>}
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                  @{l.author.handle} · {l.author.expertise[0]?.label ?? l.author.reputation.level} · {l.entityIds.length} mekân
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── 7 · Gidenler Pulse — zekâ katmanının özeti ───────── */}
      <section aria-labelledby="pulse" className="mt-16 border-y-2 border-line-strong py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="pulse" className="text-[13px] font-bold uppercase tracking-[0.2em]">
            Gidenler Pulse
          </h2>
          <p className="max-w-[48ch] text-[12px] text-ink-3">
            Yukarıdaki deneyimlerden çıkan özet: son 90 günde ağ nereye kıpırdadı?
          </p>
        </div>

        <dl className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "En hızlı toparlanan", c: p.rising, tone: "text-pos-ink", arrow: "↑" },
            { l: "En hızlı gerileyen", c: p.falling, tone: "text-neg-ink", arrow: "↓" },
          ].map(({ l, c, tone, arrow }) =>
            c ? (
              <div key={l} className="flex flex-col gap-1">
                <dt className="label">{l}</dt>
                <dd>
                  <Link href={`/mekan/${c.entity.slug}/`} className="group flex flex-col gap-0.5">
                    <span className="text-[17px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink">
                      {c.entity.name}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <ScoreNumber score={c.score!} size="md" />
                      <span className={`tnum text-[13px] font-bold ${tone}`}>
                        <span aria-hidden>{arrow}</span> {c.delta90d > 0 ? "+" : ""}
                        {c.delta90d.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                    </span>
                    <span className="text-[11.5px] text-ink-3">son 90 gün</span>
                  </Link>
                </dd>
              </div>
            ) : null,
          )}

          {p.busiest && p.busiestVolume && (
            <div className="flex flex-col gap-1">
              <dt className="label">En çok deneyim alan</dt>
              <dd>
                <Link href={`/mekan/${p.busiest.entity.slug}/`} className="group flex flex-col gap-0.5">
                  <span className="text-[17px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink">
                    {p.busiest.entity.name}
                  </span>
                  <span className="tnum text-[26px] font-extrabold leading-none tracking-[-0.045em]">
                    {nf(p.busiestVolume.count)}
                  </span>
                  <span className="text-[11.5px] text-ink-3">son 30 günde yeni deneyim</span>
                </Link>
              </dd>
            </div>
          )}

          {p.expertPick && (
            <div className="flex flex-col gap-1">
              <dt className="label">Uzman görüşü</dt>
              <dd>
                <Link href={`/mekan/${p.expertPick.card.entity.slug}/`} className="group flex flex-col gap-0.5">
                  <span className="text-[17px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink">
                    {p.expertPick.card.entity.name}
                  </span>
                  <span className="tnum text-[26px] font-extrabold leading-none tracking-[-0.045em]">
                    {score1(p.expertPick.experience.overall)}
                  </span>
                  <span className="text-[11.5px] text-ink-3">
                    @{p.expertPick.experience.author.handle} ·{" "}
                    {p.expertPick.experience.author.expertise[0]?.label}
                  </span>
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* ───────── 8 · endeksler — "aha" anı ───────── */}
      <div className="mt-14">
        <p className="prose-exp mb-7 max-w-[56ch] text-[clamp(1.0625rem,2vw,1.25rem)] leading-[1.45] text-ink-2">
          Tek tek deneyimler toplandığında bir semtin ya da bir mutfağın da nereye gittiği ölçülebiliyor.
        </p>
        <IndexStrip indices={idx} />
      </div>

      {/* ───────── 9 · bir puandan fazlası ───────── */}
      <section className="mt-16 border-y-2 border-line-strong py-9">
        <div className="mb-7 flex flex-col gap-3">
          <h2 className="max-w-[16ch] text-[clamp(1.75rem,4.5vw,2.5rem)] font-extrabold leading-[1.02] tracking-[-0.045em]">
            Bir puandan fazlası.
          </h2>
          <p className="prose-exp max-w-[60ch] text-[15.5px] leading-[1.5] text-ink-2">
            Bir sayı tek başına ne yaşandığını anlatmaz. Gidenler her mekân için aynı dört soruyu cevaplar — ve beşincisini de saklamaz.
          </p>
        </div>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", t: "Kaç puan?",
              d: "Topluluğun deneyimlerinden üretilen Gidenler puanı. Kimse yıldıza tıklamıyor; puan bir girdi değil, çıktıdır." },
            { n: "02", t: "Nereye gidiyor?",
              d: "Son 90 günün yönü. Bir mekân bugünkü puanı değil, bir eğridir — bozulduğunu ya da toparlandığını görürsün." },
            { n: "03", t: "Sana uygun mu?",
              d: "Zevk profilinle bu deneyimler arasındaki uyum. Puandan ayrı bir sayı; 9,4 alan bir yer sana %51 uyabilir." },
            { n: "04", t: "Neden?",
              d: "Hangi boyutlar, kimin deneyimleri, hangi tarihler. Karar senin yerine değil, seninle birlikte verilir." },
          ].map((x) => (
            <li key={x.n} className="flex flex-col gap-2">
              <span className="label tnum">{x.n}</span>
              <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em]">{x.t}</h3>
              <p className="prose-exp text-[14.5px] leading-[1.5] text-ink-2">{x.d}</p>
            </li>
          ))}
        </ul>
        <p className="mt-7 border-t border-line pt-4 text-[13.5px] leading-relaxed text-ink-2">
          <span className="font-bold">Ne kadar eminiz?</span>{" "}
          <span className="text-ink-3">Her puanın yanında güven düzeyi var: kaç deneyim, kaçı doğrulanmış, ne kadar yeni, görüşler ne kadar örtüşüyor. Az veri puanı düşürmez; yalnızca daha temkinli okunmasını söyler.</span>
        </p>
      </section>

      <div className="mt-12"><DemoNotice /></div>
    </div>
  );
}
