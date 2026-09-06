import type { TasteProfile } from "@/lib/types";

/**
 * TASTE — "kim neyi seviyor". Reputation (kime güveniyoruz) ve
 * Expertise (kim neyi biliyor) ile karıştırılmaz. Ham skor değil, öncelik.
 */
export function TasteBlock({ profile, title = "Zevk profili", showPrivacy = false }: {
  profile: TasteProfile; title?: string; showPrivacy?: boolean;
}) {
  const dims = [...profile.dimensions].sort((a, b) => b.weight - a.weight);
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="label">{title}</h2>
        <span className="text-[12px] text-ink-3">
          {profile.basedOnExperiences} deneyimden öğrenildi
          {showPrivacy && ` · ${profile.visibility === "public" ? "herkese açık" : "özel"}`}
        </span>
      </div>
      <div className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Önem sırası</span>
          <ul className="flex flex-col gap-2">
            {dims.map((d) => (
              <li key={d.key} className="flex items-center gap-3">
                <span className="w-[130px] shrink-0 text-[13.5px] font-semibold">{d.label}</span>
                <span className="block h-[5px] flex-1 bg-sunk" aria-hidden>
                  <span className="block h-full bg-accent" style={{ width: `${d.weight}%` }} />
                </span>
                <span className="tnum w-8 shrink-0 text-right text-[12px] font-semibold text-ink-3">{d.weight}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Sevdikleri</span>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {profile.cuisinePreferences.filter((c) => c.level !== "düşük").map((c) => (
                <li key={c.key} className="text-[13.5px]">
                  <span className="font-semibold">{c.label}</span>
                  <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">{c.level}</span>
                </li>
              ))}
            </ul>
          </div>
          {profile.lowTolerance.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Tahammülü düşük</span>
              <p className="text-[13.5px] text-ink-2">{profile.lowTolerance.join(" · ")}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-3">
            <span>Fiyat hassasiyeti: <span className="font-semibold text-ink-2">{profile.priceSensitivity}</span></span>
            {profile.locationPreferences.length > 0 && (
              <span>Semtler: <span className="font-semibold text-ink-2">{profile.locationPreferences.join(", ")}</span></span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
