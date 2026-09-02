import Link from "next/link";
import {
  expertExperiences, falling, featuredLists, getTopicIntelligence, latestExperiences,
  listCards, listCreators, listIndices, pulse, rising, trending, type EntityCard,
} from "@/lib/api";
import { IndexStrip } from "@/components/market/IndexStrip";
import { monthOf, nf, score1 } from "@/lib/format";
import { EntityCardRow } from "@/components/experience/EntityCardRow";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { Tag } from "@/components/ui/Badge";
import { ReputationChip } from "@/components/creator/ReputationChip";
import type { TopicIntelligence } from "@/lib/types";

/* ──────────────────────────────────────────────────────────────────────────
   "Ne değişiyor?" için insan dili.
   Sayı ikincil kanıttır; önce ne olduğunu söyleriz. Yalnızca mevcut
   TopicIntelligence'tan türetilir — yeni bir skor sistemi değildir.
   ────────────────────────────────────────────────────────────────────────── */
const lower = (s: string) => s.toLocaleLowerCase("tr");

function changeInsight(it: TopicIntelligence | null, dir: "up" | "down"): string {
  if (!it) return dir === "up" ? "Son deneyimler öncekilerden daha olumlu." : "Son deneyimler öncekilerden daha olumsuz.";
  const dims = it.ratingDimensions.filter((d) => d.trend.sufficient);

  if (dir === "up") {
    const best = [...dims].sort((a, b) => b.trend.delta - a.trend.delta)[0];
    if (best && best.trend.delta > 0.25) return `Son deneyimlerde ${lower(best.label)} puanı yükseliyor.`;
    const praised = it.positiveThemes.find((t) => t.direction === "up");
    if (praised) return `${praised.label} son haftalarda daha sık övülüyor.`;
    const easing = it.negativeThemes.find((t) => t.direction === "down");
    if (easing) return `${easing.label} şikâyetleri azalıyor.`;
    return "Son deneyimler öncekilerden daha olumlu.";
  }

  const growing = it.negativeThemes.find((t) => t.direction === "up");
  if (growing) return `${growing.label} şikâyetleri artıyor.`;
  const worst = [...dims].sort((a, b) => a.trend.delta - b.trend.delta)[0];
  if (worst && worst.trend.delta < -0.25) return `Son deneyimlerde ${lower(worst.label)} puanı geriliyor.`;
  const fading = it.positiveThemes.find((t) => t.direction === "down");
  if (fading) return `${fading.label} eskisi kadar övülmüyor.`;
  return "Son deneyimler öncekilerden daha olumsuz.";
}

function ChangeRow({ card, dir }: { card: EntityCard; dir: "up" | "down" }) {
  const it = getTopicIntelligence(card.entity.id);
  const tone = dir === "up" ? "text-pos-ink" : "text-neg-ink";
  return (
    <li className="border-t border-line">
      <Link
        href={`/mekan/${card.entity.slug}/`}
        className="group grid grid-cols-[1fr_auto] items-start gap-x-6 gap-y-1.5 py-5 transition-colors hover:bg-sheet"
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[19px] font-bold leading-tight tracking-[-0.02em] group-hover:text-accent-ink">
            {card.entity.name}
          </span>
          <span className="prose-exp text-[15px] leading-snug text-ink-2">{changeInsight(it, dir)}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            <span className="text-accent-ink">{card.category.label}</span>
            {card.entity.location?.district && <span>{card.entity.location.district}</span>}
            <span className="tnum">{nf(card.experienceCount)} deneyim</span>
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {card.score !== null && (
            <span className="tnum text-[24px] font-extrabold leading-none tracking-[-0.04em] group-hover:text-accent-ink">
              {score1(card.score)}
            </span>
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
  const trend = trending().slice(0, 5);
  const up = rising().slice(0, 3);
  const down = falling().slice(0, 3);
  const experts = expertExperiences(3);
  const shown = new Set(experts.map((x) => x.experience.id));
  const latest = latestExperiences(10).filter((x) => !shown.has(x.experience.id)).slice(0, 4);
  const lists = featuredLists(4);
  const creators = listCreators();
  const all = listCards();
  const p = pulse();
  const idx = listIndices();

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
        <p className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <span>İstanbul · yeme-içme</span>
          <span aria-hidden>·</span>
          <span className="tnum">{nf(all.length)} mekân</span>
          <span aria-hidden>·</span>
          <span className="tnum">{creators.length} doğrulanmış üretici</span>
        </p>
      </section>

      {/* ───────── 2 · gündem — deneyimin kendisi ───────── */}
      <section aria-labelledby="gundem" className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
          <h2 id="gundem" className="text-[13px] font-bold uppercase tracking-[0.2em]">
            İstanbul&apos;da bugün konuşulanlar
          </h2>
          <Tag>en çok deneyim alan mekânlar</Tag>
        </div>
        <ul>
          {trend.map((c, i) => (<EntityCardRow key={c.entity.id} card={c} rank={i + 1} />))}
        </ul>
      </section>

      {/* ───────── 3 · uzmanların radarında — insan ve güven ağı ───────── */}
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
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center border border-line-2 font-[family-name:var(--font-brand)] text-[19px] leading-none text-ink-2"
                    >
                      {e.author.handle.slice(0, 1).toLocaleUpperCase("tr")}
                    </span>
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
                    <Link href={`/@${e.author.handle}/`} className="text-[13px] font-bold hover:text-accent-ink">
                      @{e.author.handle}
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
                      <span className="tnum text-[26px] font-extrabold leading-none tracking-[-0.045em]">
                        {score1(c.score!)}
                      </span>
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
            Bir sayı tek başına ne yaşandığını anlatmaz. Gidenler; deneyimin ne zaman yaşandığını, hangi boyutlarda değiştiğini, kimin söylediğini ve ne kadar güvenilir olduğunu birlikte değerlendirir.
          </p>
        </div>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "Zaman", t: "Bir mekân bugünkü puanı değil, bir eğridir.",
              d: "Her deneyimde ne zaman gidildiği kayıtlı. Bir yerin bozulduğunu ya da toparlandığını görebilirsin." },
            { n: "Boyut", t: "Tek yıldız değil, beş ayrı sinyal.",
              d: "Lezzet iyi, servis kötü olabilir. Kategoriye göre değişen alt puanlar kararı senin yerine değil, seninle birlikte verir." },
            { n: "Kim", t: "Herkesin görüşü aynı ağırlıkta değil.",
              d: "Japon mutfağında 37 deneyimi olan biriyle ilk kez giden aynı sayılmaz. Uzmanlık satın alınamaz, kazanılır." },
            { n: "Kaynak", t: "Puan bir girdi değil, çıktıdır.",
              d: "Kimse yıldıza tıklamıyor. Puanlar yazılan deneyimlerden üretilir; satın alınacak bir düğme yok." },
          ].map((x) => (
            <li key={x.n} className="flex flex-col gap-2">
              <span className="label">{x.n}</span>
              <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em]">{x.t}</h3>
              <p className="prose-exp text-[14.5px] leading-[1.5] text-ink-2">{x.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12"><DemoNotice /></div>
    </div>
  );
}
