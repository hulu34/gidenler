import type { ExpertiseArea } from "@/lib/types";

const TONE: Record<ExpertiseArea["level"], string> = {
  "çok yüksek": "text-accent-ink",
  "yüksek": "text-ink",
  "gelişiyor": "text-ink-3",
};

/**
 * UZMANLIK GRAFİĞİ — genel itibar değil, KONU BAZLI otorite.
 * Bir kullanıcı Japon mutfağında uzman, otelde acemi olabilir.
 */
export function ExpertiseBlock({
  areas,
  title = "Gidenler uzmanlığı",
  compact = false,
}: {
  areas: ExpertiseArea[];
  title?: string;
  compact?: boolean;
}) {
  if (!areas.length) return null;
  const shown = compact ? areas.slice(0, 3) : areas;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="label">{title}</h2>
      <ul className="flex flex-col gap-2.5 border-t border-line pt-3">
        {shown.map((a) => (
          <li key={a.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[14.5px] font-semibold">{a.label}</span>
              <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${TONE[a.level]}`}>
                {a.level}
              </span>
            </div>
            <span className="block h-[5px] w-full max-w-[360px] bg-sunk" aria-hidden>
              <span className="block h-full bg-accent" style={{ width: `${a.score}%` }} />
            </span>
            {!compact && (
              <span className="text-[11.5px] text-ink-3">
                <span className="tnum">{a.experienceCount}</span> deneyimden
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
