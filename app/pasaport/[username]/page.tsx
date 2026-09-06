import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { users } from "@/data/users";
import { getPassport } from "@/lib/decision";
import { getUserByHandle } from "@/data/users";
import { nf } from "@/lib/format";
import { PassportCard } from "@/components/decision/PassportCard";
import { ReputationChip } from "@/components/creator/ReputationChip";
import { DemoNotice } from "@/components/ui/DemoNotice";

export function generateStaticParams() {
  return users.map((u) => ({ username: u.handle }));
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — Gidenler Pasaportu` };
}

/**
 * GİDENLER PASSPORT — kişinin gerçek deneyim geçmişinin estetik özeti.
 * Rozet spam'i yok; statü deneyimden doğar. Paylaşım opt-in.
 */
export default async function PassportPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const u = getUserByHandle(username);
  const p = getPassport(username);
  if (!u || !p) notFound();
  const main = p.periods[0];

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-8 sm:pt-12">
        <nav className="flex flex-wrap items-center gap-x-2.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <Link href={`/@${u.handle}/`} className="hover:text-ink">@{u.handle}</Link>
          <span aria-hidden>/</span>
          <span className="text-accent-ink">Pasaport</span>
        </nav>
        <h1 className="max-w-[14ch] text-[clamp(2rem,7vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
          {main.label}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[15px] font-bold">@{u.handle}</span>
          <ReputationChip reputation={u.reputation} kind={u.kind} />
        </div>
      </header>

      <section className="mt-8 border-t-2 border-line-strong pt-7">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Mekân", nf(main.entityCount)], ["Semt", nf(main.districtCount)], ["Mutfak", nf(main.cuisineCount)],
            ["Tekrar gider", `%${Math.round(main.returnRate * 100)}`], ["Doğrulanmış ziyaret", nf(main.verifiedVisits)], ["En çok gittiği semt", main.topDistrict],
          ].map(([l, v]) => (
            <div key={l} className="flex flex-col gap-1">
              <dt className="label">{l}</dt>
              <dd className="tnum text-[28px] font-extrabold leading-none tracking-[-0.045em]">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-7 flex flex-col gap-2">
          <span className="label">En çok</span>
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            {main.topFacets.map((f) => (
              <li key={f.label} className="flex items-baseline gap-2">
                <span className="text-[17px] font-bold tracking-[-0.01em]">{f.label}</span>
                <span className="tnum text-[13px] font-semibold text-ink-3">{f.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="kartlar">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
          <h2 id="kartlar" className="text-[13px] font-bold uppercase tracking-[0.2em]">Paylaşım kartları</h2>
          <p className="text-[12px] text-ink-3">
            9:16 · hikâye formatı · {p.shareable ? "paylaşıma açık" : "paylaşım kapalı (opt-in)"}
          </p>
        </div>
        <div className="mt-6 flex gap-5 overflow-x-auto pb-3">
          {p.periods.map((per) => <PassportCard key={per.key} handle={u.handle} period={per} />)}
        </div>
        <p className="mt-3 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-3">
          Kartlar rozet değildir; gerçek deneyim geçmişinin özetidir. Pasaportun tamamı özel kalabilir, kartlar tek tek paylaşılır.
        </p>
      </section>

      <div className="mt-12"><DemoNotice>Kurgu kullanıcı; dönem kırılımları demo hesaplamadır ve kullanıcının toplam istatistikleriyle tutarlı olacak şekilde ölçeklenmiştir.</DemoNotice></div>
    </div>
  );
}
