import { ScoreNumber } from "@/components/score/ScoreNumber";
import { nf, score1 } from "@/lib/format";
import { fmtBand } from "@/lib/venue";
import type { ExternalSource, TopicIntelligence } from "@/lib/types";
import type { DemoMenuItem, DemoProfile } from "@/data/demoProfiles";

/* YATIRIMCI DEMOSU · PROFİL PARÇALARI — yalnız data/demoProfiles'ta kaydı olan demo mekânlarda çizilir.
   Bütün içerik kurgusaldır; dış puanlar simülasyondur ve Gidenler puanına karışmaz. */

const SIMULATED = "Simüle puan — canlı veri bağlantısı değil";
const STRIP = ["google", "tripadvisor", "yandex"] as const;

/** İsmin yanında: Gidenler puanı + Google · Tripadvisor · Yandex ayrı kartlar, her biri kendi ölçeğinde. Ortalama yok. */
export function DemoScoreStrip({ intel, sources }: { intel: TopicIntelligence; sources: ExternalSource[] }) {
  const ext = STRIP.map((p) => sources.find((s) => s.provider === p && s.kind === "score")).filter((s): s is ExternalSource => !!s);
  const dir = intel.scoreTrend.direction;
  return (
    <div aria-label="Puanlar" className="flex flex-col gap-2">
      <ul className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0">
        <li className="flex w-[150px] shrink-0 snap-start flex-col gap-1 border-2 border-ink p-2.5 sm:w-auto sm:p-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em]">Gidenler puanı</span>
          <ScoreNumber score={intel.overallScore!} size="lg" trend={{ direction: dir, delta: dir === "flat" ? undefined : intel.scoreTrend.delta }} />
          <span className="tnum text-[11.5px] text-ink-3">/10 · {nf(intel.experienceCount)} deneyim</span>
        </li>
        {ext.map((s) => (
          <li key={s.id} className="flex w-[150px] shrink-0 snap-start flex-col gap-1 border border-line-2 p-2.5 sm:w-auto sm:p-3">
            <span lang="en" translate="no" className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-2">{s.label}</span>
            <span className="tnum text-[22px] font-extrabold leading-none text-ink-2">{score1(s.score ?? 0)}<span className="text-[13px] font-semibold text-ink-3">/{s.scoreScale}</span></span>
            <span className="tnum text-[11.5px] text-ink-3">{nf(s.reviewCount ?? 0)} değerlendirme</span>
            <span className="text-[10px] leading-tight text-ink-3 sm:text-[10.5px]">{SIMULATED}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11.5px] text-ink-3">Dış puanlar simülasyondur ve her biri kendi ölçeğindedir; Gidenler puanı bunların ortalaması değildir, onlara karışmaz.</p>
    </div>
  );
}

const anchor = (id: string) => `menu-${id}`;

/** Genel bakış: tanıtım, öne çıkanlar (menüye bağlantılı), kimlere uygun, örnek bütçe, saatler, olanaklar. */
export function DemoOverview({ p }: { p: DemoProfile }) {
  const items = new Map(p.menu.flatMap((g) => g.items).map((i) => [i.id, i]));
  const hi = p.highlights.map((id) => items.get(id)).filter((i): i is DemoMenuItem => !!i);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-x-10 gap-y-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <p className="prose-exp text-[16.5px] leading-[1.55]">{p.intro}</p>
          <p className="text-[13.5px] text-ink-2"><strong className="font-semibold text-ink">Mutfak:</strong> {p.cuisine}</p>
          <p className="text-[13.5px] text-ink-2"><strong className="font-semibold text-ink">Atmosfer:</strong> {p.atmosphere}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 self-start border-t border-line pt-3 text-[13.5px]">
          <dt className="font-semibold">Kimlere uygun</dt><dd className="text-ink-2">{p.goodFor.join(" · ")}</dd>
          <dt className="font-semibold">Örnek bütçe</dt><dd className="tnum text-ink-2">{[p.priceBands.lunch && `Öğle ${fmtBand(p.priceBands.lunch)}`, p.priceBands.dinner && `Akşam ${fmtBand(p.priceBands.dinner)}`].filter(Boolean).join(" · ")} <span className="text-ink-3">kişi başı</span></dd>
          <dt className="font-semibold">Saatler</dt><dd className="text-ink-2">{p.hours}</dd>
          <dt className="font-semibold">Olanaklar</dt><dd className="text-ink-2">{p.amenities.join(" · ")}</dd>
        </dl>
      </div>
      <div>
        <h3 className="text-[12px] font-bold uppercase tracking-[0.16em]">Öne çıkanlar</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {hi.map((i) => (
            <li key={i.id}>
              <a href={`#${anchor(i.id)}`} className="group flex h-full gap-3 border border-line-2 p-2 hover:border-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.photo} alt="" loading="lazy" decoding="async" className="h-16 w-16 shrink-0 object-cover" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[14px] font-bold leading-tight group-hover:text-accent-ink">{i.name}</span>
                  <span className="tnum text-[12.5px] text-ink-2">{i.price}</span>
                  <span className="text-[11.5px] text-ink-3 underline decoration-line-2 underline-offset-2">Menüde gör ↓</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Fotoğraflı, kategorili örnek menü. Her öğenin bir çapası var; öne çıkan kartları buraya iner. */
export function DemoMenu({ p }: { p: DemoProfile }) {
  return (
    <div className="flex flex-col gap-7">
      <p className="border-l-2 border-line-2 pl-3 text-[12.5px] text-ink-3">Örnek menü ve fiyatlar — demo içindir, gerçek bir işletmenin menüsü değildir. Görseller temsilidir.</p>
      {p.menu.map((g) => (
        <div key={g.title}>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.16em]">{g.title}</h3>
          <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
            {g.items.map((i) => (
              <li key={i.id} id={anchor(i.id)} className="flex scroll-mt-32 gap-3 border-b border-line py-3 target:bg-sheet">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.photo} alt={i.name} loading="lazy" decoding="async" className="h-20 w-20 shrink-0 object-cover sm:h-24 sm:w-24" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-bold leading-tight">{i.name}</span>
                    <span className="tnum shrink-0 text-[14px] font-semibold">{i.price}</span>
                  </span>
                  <span className="text-[13px] leading-snug text-ink-2">{i.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
