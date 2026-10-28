import Link from "next/link";
import { entities } from "@/data/entities";
import { getTopic, getTopicIntelligence } from "@/lib/api";
import { pulseOf } from "@/lib/pulse";
import { Pulse } from "@/components/viz/Pulse";
import { ScoreNumber } from "@/components/score/ScoreNumber";
import { periodLabel, score1 } from "@/lib/format";

/* YATIRIMCI DEMOSU · HAREKET — yalnız /demo sayfasında (demo dağıtımı). Bütün sayılar mekân sayfalarının kullandığı
   aynı hesaplamadan gelir (getTopicIntelligence): puan, son üç ay değişimi, aylık grafik ve deneyimler birbirini tutar.
   Veriler simülasyondur; gerçek bir işletmeye ait değildir. */

export const DEMO_TRIO = [
  { slug: "moda-lokantasi", role: "Yükselen", note: "Nisandaki mevsim menüsünden sonra lezzet notları yükseldi; haziran zammına rağmen puan 8,3'ten 8,7'ye çıktı." },
  { slug: "koz-durum", role: "Sabit", note: "Yüzlerce deneyimle aylardır aynı bantta: istikrar da bir sinyal." },
  { slug: "asma-teras", role: "Düşen", note: "On iki ayda 8,6'dan 5,4'e kesintisiz düştü; şubattaki şef değişimi ve mayıstaki zam deneyimlerde açıkça görülüyor." },
] as const;

const dirLabel = (d: "up" | "down" | "flat") => (d === "up" ? "yükseliyor" : d === "down" ? "geriliyor" : "sabit");
/** Deneyimden ~140 karakterlik alıntı (kelime sınırında). */
const excerpt = (s: string, n = 140) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(" ", n))}…`);
const delta = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${score1(Math.abs(n))}`;

/** Restoran kategorisindeki demo mekânlar, son üç ay değişimine göre. */
export function restaurantMovers() {
  const rows = entities
    .filter((e) => e.isDemo && e.categoryId === "cat.restaurant")
    .map((e) => ({ e, i: getTopicIntelligence(e.id) }))
    .filter((x): x is { e: (typeof entities)[number]; i: NonNullable<ReturnType<typeof getTopicIntelligence>> } => !!x.i && x.i.overallScore !== null && x.i.timeline.length >= 4);
  const up = rows.filter((r) => r.i.scoreTrend.direction === "up").sort((a, b) => b.i.scoreTrend.delta - a.i.scoreTrend.delta);
  const down = rows.filter((r) => r.i.scoreTrend.direction === "down").sort((a, b) => a.i.scoreTrend.delta - b.i.scoreTrend.delta);
  return { up, down };
}

export function DemoMovers() {
  const trio = DEMO_TRIO.map((t) => {
    const topic = getTopic(t.slug)!;
    const i = topic.intelligence;
    const last = i.timeline[i.timeline.length - 1];
    const recent = [...topic.experiences].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))[0];
    return { ...t, topic, i, last, recent, pulse: pulseOf(topic.entity.id, 14) };
  });
  const { up, down } = restaurantMovers();
  return (
    <section id="hareket" className="mt-12 scroll-mt-24 border-t-2 border-line-strong pt-7" aria-labelledby="h-hareket">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="h-hareket" className="label">Üç restoran, üç yön</h2>
        <span className="text-[12px] text-ink-3">Son üç ay · simüle edilmiş veri</span>
      </div>
      <ul className="mt-4 grid gap-4 md:grid-cols-3">
        {trio.map((t) => (
          <li key={t.slug} className="flex min-w-0 flex-col gap-3 border border-line-2 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">{t.role}</span>
              <span className={`tnum text-[13px] font-semibold ${t.i.scoreTrend.direction === "up" ? "text-pos-ink" : t.i.scoreTrend.direction === "down" ? "text-neg-ink" : "text-ink-2"}`}>
                {delta(t.i.scoreTrend.delta)} · {dirLabel(t.i.scoreTrend.direction)}
              </span>
            </div>
            <Link href={`/mekan/${t.slug}/`} className="text-[20px] font-extrabold leading-tight tracking-[-0.02em] hover:text-accent-ink">{t.topic.entity.name}</Link>
            <div className="flex items-end justify-between gap-3">
              <ScoreNumber score={t.i.overallScore} size="md" />
              {t.pulse && <Pulse pulse={t.pulse} width={150} height={40} label={`${t.topic.entity.name} aylık Gidenler puanı`} />}
            </div>
            <p className="text-[12.5px] text-ink-3">{t.i.timeline.length} aylık grafik · son ay ({periodLabel(t.last.period)}) {t.last.experienceCount} deneyim · toplam {t.i.experienceCount}</p>
            {t.recent && (
              <blockquote className="prose-exp border-l-2 border-line-2 pl-3 text-[14px] leading-[1.5] text-ink-2">
                <span className="mb-0.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-3 not-italic">Örnek deneyim · seçkiden en yeni</span>
                “{excerpt(t.recent.body)}” <span className="tnum whitespace-nowrap text-[12px] text-ink-3">· bu deneyimin puanı {score1(t.recent.overall)}</span>
              </blockquote>
            )}
            <p className="text-[12.5px] text-ink-2">{t.note}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px]">
        <Link href="/karsilastir/?a=moda-lokantasi&b=asma-teras" className="font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">Yükseleni ve düşeni karşılaştır →</Link>
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {([["En çok yükselen restoranlar", up], ["En çok düşen restoranlar", down]] as const).map(([title, list]) => {
          const rows = list.slice(0, 5).map((r, k) => ({ ...r, k }));
          return (
          <div key={title} className="min-w-0">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.16em]">{title} <span className="font-semibold normal-case tracking-normal text-ink-3">· son üç ay · {list.length} restoran içinden</span></h3>
            <ol className="mt-2 flex flex-col">
              {rows.map(({ e, i, k }) => (
                <li key={e.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
                  <Link href={`/mekan/${e.slug}/`} className="min-w-0 truncate text-[15px] font-semibold hover:text-accent-ink"><span className="tnum mr-2 text-[12px] font-normal text-ink-3">{k + 1}.</span>{e.name}</Link>
                  <span className="tnum flex shrink-0 items-baseline gap-3 text-[13px]">
                    <span>{score1(i.overallScore!)}</span>
                    <span className={i.scoreTrend.direction === "up" ? "text-pos-ink" : "text-neg-ink"}>{delta(i.scoreTrend.delta)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          );
        })}
      </div>
    </section>
  );
}
