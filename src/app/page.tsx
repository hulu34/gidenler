import Link from "next/link";
import {
  expertExperiences, falling, featuredLists, latestExperiences,
  listCards, listCreators, listIndices, pulse, rising, trending,
} from "@/lib/api";
import { IndexStrip } from "@/components/market/IndexStrip";
import { monthOf, nf, score1 } from "@/lib/format";
import { EntityCardRow } from "@/components/experience/EntityCardRow";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { TrendIndicator } from "@/components/score/TrendIndicator";
import { Tag } from "@/components/ui/Badge";
import { ReputationChip } from "@/components/creator/ReputationChip";

export default function HomePage() {
  const trend = trending().slice(0, 5);
  const up = rising().slice(0, 3);
  const down = falling().slice(0, 3);
  const experts = expertExperiences(3);
  const latest = latestExperiences(3);
  const lists = featuredLists(4);
  const creators = listCreators();
  const all = listCards();
  const p = pulse();
  const idx = listIndices();

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-20 sm:px-7">
      {/* ───────── tez ───────── */}
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

      {/* ───────── gündem ───────── */}
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

      {/* ───────── GİDENLER PULSE — ağın bugünkü nabzı ───────── */}
      <section aria-labelledby="pulse" className="mt-14 border-y-2 border-line-strong py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="pulse" className="text-[13px] font-bold uppercase tracking-[0.2em]">
            Gidenler Pulse
          </h2>
          <p className="max-w-[44ch] text-[12px] text-ink-3">
            İstanbul deneyim verisinde son 90 günde ne oldu?
          </p>
        </div>

        <dl className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "En hızlı yükselen", c: p.rising, tone: "text-pos-ink", arrow: "↑" },
            { l: "En hızlı düşen", c: p.falling, tone: "text-neg-ink", arrow: "↓" },
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

      {/* ───────── endeksler ───────── */}
      <div className="mt-14">
        <IndexStrip indices={idx} />
      </div>

      {/* ───────── uzmanların radarında — creator katmanı ───────── */}
      {experts.length > 0 && (
        <section aria-labelledby="uzmanlar" className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
            <h2 id="uzmanlar" className="text-[13px] font-bold uppercase tracking-[0.2em]">
              Bu hafta uzmanların radarında
            </h2>
            <Tag>konu bazlı uzmanlığı olan kullanıcılar</Tag>
          </div>
          <ul className="grid gap-x-12 gap-y-8 pt-7 lg:grid-cols-3">
            {experts.map(({ experience: e, card }) => (
              <li key={e.id} className="flex flex-col gap-2.5">
                <Link href={`/@${e.author.handle}/`} className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="text-[13px] font-bold hover:text-accent-ink">@{e.author.handle}</span>
                  <ReputationChip reputation={e.author.reputation} kind={e.author.kind} />
                </Link>
                <Link href={`/mekan/${card.entity.slug}/`} className="group flex flex-col gap-1.5">
                  <span className="flex items-baseline gap-2.5">
                    <span className="text-[19px] font-bold leading-tight tracking-[-0.025em] group-hover:text-accent-ink">
                      {card.entity.name}
                    </span>
                    <span className="tnum text-[15px] font-bold text-ink-3">{score1(e.overall)}</span>
                  </span>
                  <span className="prose-exp line-clamp-3 text-[15px] text-ink-2">{e.body}</span>
                </Link>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                  {e.author.expertise[0]?.label} · {monthOf(e.visitedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ───────── yükselen / düşen ───────── */}
      <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <section aria-labelledby="yukselen">
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-line-strong pb-3">
            <h2 id="yukselen" className="text-[13px] font-bold uppercase tracking-[0.2em]">Toparlayanlar</h2>
            <TrendIndicator direction="up" />
          </div>
          <ul>
            {up.length ? up.map((c) => <EntityCardRow key={c.entity.id} card={c} />)
              : <li className="border-t border-line py-6 text-[14px] text-ink-3">Son 90 günde belirgin bir yükseliş yok.</li>}
          </ul>
        </section>

        <section aria-labelledby="dusen">
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-line-strong pb-3">
            <h2 id="dusen" className="text-[13px] font-bold uppercase tracking-[0.2em]">Bozulanlar</h2>
            <TrendIndicator direction="down" />
          </div>
          <ul>
            {down.length ? down.map((c) => <EntityCardRow key={c.entity.id} card={c} />)
              : <li className="border-t border-line py-6 text-[14px] text-ink-3">Son 90 günde belirgin bir düşüş yok.</li>}
          </ul>
        </section>
      </div>

      {/* ───────── listeler ───────── */}
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
                  @{l.author.handle} · {l.entityIds.length} mekân
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── neden farklı ───────── */}
      <section className="mt-16 border-y-2 border-line-strong py-9">
        <h2 className="label mb-6">Google Reviews&apos;dan farkı</h2>
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

      {/* ───────── son deneyimler ───────── */}
      <section aria-labelledby="son" className="mt-14">
        <h2 id="son" className="border-b-2 border-line-strong pb-3 text-[13px] font-bold uppercase tracking-[0.2em]">
          Son deneyimler
        </h2>
        <ul>
          {latest.map(({ experience: e, card }) => (
            <li key={e.id} className="border-b border-line">
              <Link href={`/mekan/${card.entity.slug}/`} className="group flex flex-col gap-2 py-6 hover:bg-sheet">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[17px] font-bold tracking-[-0.02em] group-hover:text-accent-ink">
                    {card.entity.name}
                  </span>
                  {card.category.compliance.showScores && (
                    <span className="tnum text-[13px] font-bold text-ink-3">{score1(e.overall)}</span>
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                    {e.author.handle} · {monthOf(e.visitedAt)}&apos;da gitti
                  </span>
                </span>
                <span className="prose-exp line-clamp-2 text-[15.5px] text-ink-2">{e.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12"><DemoNotice /></div>
    </div>
  );
}
