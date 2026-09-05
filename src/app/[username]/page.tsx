import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { users } from "@/data/users";
import { getCreatorProfile } from "@/lib/api";
import { monthOf, nf, score1 } from "@/lib/format";

import { DemoNotice } from "@/components/ui/DemoNotice";
import { SocialAuthority } from "@/components/creator/SocialAuthority";
import { ExpertiseBlock } from "@/components/creator/ExpertiseBlock";
import { ReputationChip, ReputationSignals } from "@/components/creator/ReputationChip";
import { ExperienceCard } from "@/components/experience/ExperienceCard";
import { getSchema, getCategory } from "@/lib/api";
import { tasteProfileOf } from "@/lib/decision";
import { TasteBlock } from "@/components/decision/TasteBlock";
import { CreatorSimilarity } from "@/components/decision/CreatorSimilarity";

/** Profil adresi: /@denizyer — SEO ve sosyal paylaşım için tek kelimelik kimlik. */
export function generateStaticParams() {
  return users.map((u) => ({ username: `@${u.handle}` }));
}

export async function generateMetadata({
  params,
}: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const p = getCreatorProfile(decodeURIComponent(username));
  if (!p) return { title: "Bulunamadı" };
  const top = p.user.expertise[0];
  return {
    title: `@${p.user.handle}${top ? ` — ${top.label}` : ""}`,
    description: p.user.bio ?? `${p.user.handle} kullanıcısının Gidenler deneyimleri.`,
  };
}

export default async function ProfilePage({
  params,
}: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const handle = decodeURIComponent(username);
  if (!handle.startsWith("@")) notFound();

  const p = getCreatorProfile(handle);
  if (!p) notFound();

  const { user: u, lists, experiences, topRated, wouldReturn, categoryBreakdown } = p;
  const verifiedShare = u.stats.experiences
    ? Math.round((u.stats.verifiedExperiences / u.stats.experiences) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      {/* ───────── kimlik ───────── */}
      <header className="flex flex-col gap-5 pt-9 sm:pt-14">
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-[clamp(2rem,7vw,3.25rem)] font-extrabold leading-none tracking-[-0.05em]">
              @{u.handle}
            </h1>
            <ReputationChip reputation={u.reputation} kind={u.kind} />
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <span className="label">Gidenler adresi</span>
            <span className="text-[13px] font-semibold text-ink-2">gidenler.com/@{u.handle}</span>
          </div>
        </div>

        {u.bio && <p className="prose-exp max-w-[54ch] text-[17px]">{u.bio}</p>}
      </header>

      {/* ───────── V4: seninle zevk uyumu + takip ───────── */}
      <div className="mt-6"><CreatorSimilarity userId={u.id} handle={u.handle} /></div>

      {/* ───────── sayılar: Gidenler içi ───────── */}
      <section className="mt-8 border-t-2 border-line-strong pt-6">
        <dl className="flex flex-wrap gap-x-10 gap-y-5">
          {[
            ["Deneyim", nf(u.stats.experiences), null],
            ["Doğrulanmış", nf(u.stats.verifiedExperiences), `%${verifiedShare}`],
            ["Faydalı bulundu", nf(u.stats.helpfulVotes), null],
            ["Gittiği mekân", nf(u.stats.entitiesVisited), null],
          ].map(([label, value, sub]) => (
            <div key={label as string} className="flex flex-col gap-0.5">
              <dt className="label">{label}</dt>
              <dd className="tnum text-[30px] font-extrabold leading-none tracking-[-0.045em]">
                {value}
              </dd>
              {sub && <span className="tnum text-[12px] font-semibold text-ink-3">{sub}</span>}
            </div>
          ))}
        </dl>
      </section>

      {/* ───────── uzmanlık + dış otorite: AYRI TUTULUR ───────── */}
      <div className="mt-11 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <ExpertiseBlock areas={u.expertise} />
        <div className="flex flex-col gap-8">
          <SocialAuthority identities={u.social} />
          {categoryBreakdown.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="label">Nerede yazıyor</h2>
              <ul className="flex flex-col gap-2 border-t border-line pt-3">
                {categoryBreakdown.map((c) => (
                  <li key={c.label} className="flex items-baseline justify-between gap-4">
                    <span className="text-[14px]">{c.label}</span>
                    <span className="tnum text-[13px] font-semibold text-ink-3">
                      {c.count} deneyim
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* ───────── taste: kim neyi seviyor (V3) ───────── */}
      {(() => { const tp = tasteProfileOf(u.id); return tp && tp.visibility === "public" ? (
        <div className="mt-12 border-t-2 border-line-strong pt-6">
          <TasteBlock profile={tp} title="Zevk kimliği" showPrivacy />
          <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink-3">
            <span>Zevk, uzmanlık değildir: uzmanlık neyi bildiğini, zevk neyi sevdiğini anlatır.</span>
            <Link href={`/pasaport/${u.handle}/`} className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Gidenler Pasaportu</Link>
          </p>
        </div>
      ) : (
        <p className="mt-10 text-[12.5px] text-ink-3">
          <Link href={`/pasaport/${u.handle}/`} className="font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">Gidenler Pasaportu</Link>
          <span> · zevk profili özel</span>
        </p>
      ); })()}

      {/* ───────── listeler ───────── */}
      {lists.length > 0 && (
        <section className="mt-14" aria-labelledby="listeler">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b-2 border-line-strong pb-3">
            <h2 id="listeler" className="text-[13px] font-bold uppercase tracking-[0.2em]">Listeleri</h2>
            <span className="label">{lists.length} liste</span>
          </div>
          <ul className="grid gap-x-12 gap-y-8 pt-7 sm:grid-cols-2">
            {lists.map((l) => (
              <li key={l.id}>
                <Link href={`/liste/${l.slug}/`} className="group flex flex-col gap-2">
                  <span className="text-[21px] font-bold leading-tight tracking-[-0.025em] group-hover:text-accent-ink">
                    {l.title}
                  </span>
                  {l.subtitle && <span className="text-[13.5px] text-ink-2">{l.subtitle}</span>}
                  <span className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                    {l.entities.map((x) => (
                      <span key={x.entity.id} className="text-[12px] text-ink-3">
                        {x.entity.name}
                        {x.score !== null && <span className="tnum font-semibold"> {score1(x.score)}</span>}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ───────── en yüksek puanları + tekrar gideceği ───────── */}
      <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-16">
        {topRated.length > 0 && (
          <section>
            <h2 className="label border-b border-line pb-2">En yüksek puan verdikleri</h2>
            <ol className="mt-1">
              {topRated.map((x, i) => (
                <li key={x.entity.id} className="border-b border-line">
                  <Link href={`/mekan/${x.entity.slug}/`} className="group flex items-baseline justify-between gap-6 py-3.5">
                    <span className="flex items-baseline gap-3">
                      <span className="tnum text-[12px] font-bold text-ink-3">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[16px] font-semibold group-hover:text-accent-ink">
                        {x.entity.name}
                      </span>
                    </span>
                    <span className="tnum text-[19px] font-extrabold tracking-[-0.04em]">
                      {score1(x.score)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        {wouldReturn.length > 0 && (
          <section>
            <h2 className="label border-b border-line pb-2">Tekrar gideceği yerler</h2>
            <ul className="mt-1">
              {wouldReturn.map((x) => (
                <li key={x.entity.id} className="border-b border-line">
                  <Link href={`/mekan/${x.entity.slug}/`} className="group flex items-baseline justify-between gap-6 py-3.5">
                    <span className="text-[16px] font-semibold group-hover:text-accent-ink">{x.entity.name}</span>
                    <span className="label">{x.category.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* ───────── trend tahminleri ───────── */}
      {u.predictions && (
        <section className="mt-14 border-t-2 border-line-strong pt-6" aria-labelledby="tahmin">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="tahmin" className="label">Trend tahminleri</h2>
            <p className="max-w-[46ch] text-[12px] text-ink-3">
              Bir mekânın 30 gün sonraki yönü hakkında verdiği görüşlerin isabeti.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-5">
            <div className="flex flex-col gap-0.5">
              <span className="label">İsabet</span>
              <span className="tnum text-[30px] font-extrabold leading-none tracking-[-0.045em]">
                {u.predictions.correctDirection} / {u.predictions.totalPredictions}
              </span>
              <span className="tnum text-[12px] font-semibold text-ink-3">
                %{u.predictions.accuracy}
              </span>
            </div>
            {u.predictions.categoryAccuracy.map((c) => (
              <div key={c.label} className="flex flex-col gap-0.5">
                <span className="label">{c.label}</span>
                <span className="tnum text-[22px] font-bold leading-none tracking-tight">%{c.accuracy}</span>
                <span className="tnum text-[11.5px] text-ink-3">{c.count} tahmin</span>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-[66ch] text-[12px] leading-relaxed text-ink-3">
            Tahminler bir bahis değildir; para, jeton ve oran yoktur. İsabet oranı
            satın alınamaz ve Gidenler puanını etkilemez.
          </p>
        </section>
      )}

      {/* ───────── itibar nereden geliyor ───────── */}
      <div className="mt-14">
        <ReputationSignals reputation={u.reputation} />
      </div>

      {/* ───────── deneyimleri ───────── */}
      <section className="mt-14" aria-labelledby="deneyimleri">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b-2 border-line-strong pb-3">
          <h2 id="deneyimleri" className="text-[13px] font-bold uppercase tracking-[0.2em]">
            Son deneyimleri
          </h2>
          <span className="label">{experiences.length} kayıt gösteriliyor</span>
        </div>
        <div className="mt-7">
          {experiences.map((e) => {
            const schema = getSchema(e.category.ratingSchemaId);
            if (!schema) return null;
            return (
              <ExperienceCard
                key={e.id}
                experience={e}
                schema={schema}
                showScores={e.category.compliance.showScores}
                showEntity={{
                  name: e.entity.name,
                  slug: e.entity.slug,
                  category: getCategory(e.entity.categoryId)?.label ?? "",
                }}
              />
            );
          })}
        </div>
      </section>

      <div className="mt-12">
        <DemoNotice>
          Bu profil, deneyimleri, uzmanlık puanları ve dış platform takipçi sayıları prototip için
          üretilmiştir. Gerçek bir kişiye ait değildir.
        </DemoNotice>
      </div>
    </div>
  );
}
