import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { entities } from "@/data/entities";
import { getBusinessDashboard } from "@/lib/api";
import { nf, score1 } from "@/lib/format";

import { DemoNotice } from "@/components/ui/DemoNotice";
import { RatingDimensions } from "@/components/score/RatingDimensions";
import { TrendTimeline } from "@/components/insight/TrendTimeline";
import { ThemeSignals } from "@/components/insight/ThemeSignals";
import { TrendIndicator } from "@/components/score/TrendIndicator";
import { ExperienceCard } from "@/components/experience/ExperienceCard";
import { Button } from "@/components/ui/Button";

export function generateStaticParams() {
  return entities
    .filter((e) => e.business?.claimed && e.categoryId !== "cat.physician")
    .map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = getBusinessDashboard(slug);
  return { title: d ? `${d.entity.name} — işletme paneli` : "Bulunamadı" };
}

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = getBusinessDashboard(slug);
  if (!d) notFound();
  const { entity, category, schema, intelligence: I, unanswered, answered, expertSummary, last30d } = d;

  const gap =
    expertSummary.expertScore !== null && expertSummary.communityScore !== null
      ? expertSummary.expertScore - expertSummary.communityScore
      : null;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-4 pt-8 sm:pt-12">
        <nav className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <Link href={`/mekan/${entity.slug}/`} className="hover:text-ink">{entity.name}</Link>
          <span aria-hidden>/</span>
          <span className="text-accent-ink">İşletme paneli</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
          <h1 className="max-w-[18ch] text-[clamp(1.75rem,5.5vw,2.75rem)] font-extrabold leading-[1] tracking-[-0.04em]">
            {entity.name}
          </h1>
          <Link href={`/mekan/${entity.slug}/`}>
            <Button variant="ghost" size="sm">Herkese açık sayfayı gör</Button>
          </Link>
        </div>
        <p className="max-w-[70ch] text-[13px] text-ink-2">
          Doğrulanmış işletme hesabı. Bu panel size <strong className="font-semibold">araç</strong> verir:
          bildirim, analiz, cevap yönetimi.{" "}
          <strong className="font-semibold">Puanı, sıralamayı ve deneyimleri değiştiremez.</strong>{" "}
          Cevap yazmak abonelikten bağımsız olarak ücretsizdir.
        </p>
      </header>

      {/* ───────── manşet sayılar ───────── */}
      <section className="mt-8 border-t-2 border-line-strong pt-7">
        <dl className="flex flex-wrap gap-x-12 gap-y-6">
          <div className="flex flex-col gap-1">
            <dt className="label">Gidenler puanı</dt>
            <dd className="flex items-baseline gap-2">
              <span className="tnum text-[52px] font-extrabold leading-none tracking-[-0.05em] text-accent-ink">
                {I.overallScore !== null ? score1(I.overallScore) : "—"}
              </span>
              <TrendIndicator direction={I.scoreTrend.direction} delta={I.scoreTrend.delta} showValue />
            </dd>
          </div>
          {[
            ["Son 30 günde yeni", nf(last30d.newExperiences), "deneyim"],
            ["Doğrulanmış oran", `%${Math.round(last30d.verifiedShare * 100)}`, "ziyaret"],
            ["Tekrar gelme", `%${Math.round(I.returnRate * 100)}`, schema.returnLabel],
            ["Cevap bekleyen", nf(unanswered.length), "deneyim"],
          ].map(([l, v, s]) => (
            <div key={l} className="flex flex-col gap-1">
              <dt className="label">{l}</dt>
              <dd className="tnum text-[30px] font-extrabold leading-none tracking-[-0.045em]">{v}</dd>
              <span className="text-[12px] text-ink-3">{s}</span>
            </div>
          ))}
        </dl>
      </section>

      {/* ───────── uzman zekâsı — SaaS'ın asıl ürünü ───────── */}
      {expertSummary.expertCount > 0 && (
        <section className="mt-11 border-l-2 border-accent pl-5" aria-labelledby="uzman">
          <h2 id="uzman" className="label">Uzmanlar ne diyor</h2>
          <div className="mt-4 flex flex-wrap items-end gap-x-12 gap-y-5">
            <div className="flex flex-col gap-0.5">
              <span className="label">Uzman ortalaması</span>
              <span className="tnum text-[34px] font-extrabold leading-none tracking-[-0.05em]">
                {expertSummary.expertScore !== null ? score1(expertSummary.expertScore) : "—"}
              </span>
              <span className="text-[12px] text-ink-3">{expertSummary.expertCount} uzman deneyimi</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="label">Topluluk ortalaması</span>
              <span className="tnum text-[34px] font-extrabold leading-none tracking-[-0.05em] text-ink-2">
                {expertSummary.communityScore !== null ? score1(expertSummary.communityScore) : "—"}
              </span>
              <span className="text-[12px] text-ink-3">bütün deneyimler</span>
            </div>
            {gap !== null && Math.abs(gap) >= 0.2 && (
              <p className="max-w-[38ch] text-[14px] leading-snug text-ink-2">
                Uzmanlar topluluktan{" "}
                <strong className={`font-semibold ${gap > 0 ? "text-pos-ink" : "text-neg-ink"}`}>
                  {gap > 0 ? "daha yüksek" : "daha düşük"}
                </strong>{" "}
                puan veriyor. Bu fark genelde beklenti farkından değil, farklı şeylere
                dikkat etmelerinden gelir.
              </p>
            )}
          </div>

          {expertSummary.experts.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
              {expertSummary.experts.map((u) => (
                <li key={u.id}>
                  <Link href={`/@${u.handle}/`} className="text-[13px] font-semibold hover:text-accent-ink">
                    @{u.handle}
                    <span className="ml-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
                      {u.expertise[0]?.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 max-w-[64ch] text-[12px] leading-relaxed text-ink-3">
            Uzmanlık Gidenler içindeki davranıştan gelir. Abonelik, reklam ya da davet
            bir kullanıcıyı uzman yapmaz; bu tablo satın alınamaz.
          </p>
        </section>
      )}

      {/* ───────── boyutlar + temalar ───────── */}
      <section className="mt-12">
        <h2 className="label mb-4">Boyut puanları ve 90 günlük yön</h2>
        <RatingDimensions dimensions={I.ratingDimensions} />
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ThemeSignals title="En çok övülen" items={I.positiveThemes} tone="pos" />
        <ThemeSignals
          title="En sık şikayet"
          hint="Yükselen oklar, üzerine gitmeniz gereken konular."
          items={I.negativeThemes}
          tone="neg"
        />
      </div>

      {I.timeline.length > 0 && (
        <div className="mt-12"><TrendTimeline points={I.timeline} /></div>
      )}

      {/* ───────── cevap kuyruğu ───────── */}
      <section className="mt-14" aria-labelledby="kuyruk">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b-2 border-line-strong pb-3">
          <h2 id="kuyruk" className="text-[13px] font-bold uppercase tracking-[0.2em]">
            Cevap bekleyenler
          </h2>
          <span className="label">{unanswered.length} deneyim · cevap ücretsiz</span>
        </div>
        <div className="mt-7">
          {unanswered.slice(0, 3).map((e) => (
            <div key={e.id} className="flex flex-col gap-4">
              <ExperienceCard experience={e} schema={schema} showScores={category.compliance.showScores} />
              <div className="mb-8 flex flex-wrap gap-2 border-l-2 border-line-2 pl-5">
                <Button variant="primary" size="sm">Resmî yanıt yaz</Button>
                <Button variant="ghost" size="sm">Not al</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {answered.length > 0 && (
        <section className="mt-8">
          <h2 className="label border-b border-line pb-2">Yanıtladıklarınız</h2>
          <div className="mt-6">
            {answered.map((e) => (
              <ExperienceCard key={e.id} experience={e} schema={schema} showScores={category.compliance.showScores} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-12"><DemoNotice /></div>
    </div>
  );
}
