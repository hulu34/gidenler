import type { Reputation, User } from "@/lib/types";

/**
 * İtibar SEVİYE olarak gösterilir; ham 0–100 puanı her yerde basılmaz.
 * Seviye Gidenler içi davranıştan gelir — dışarıdaki popülerlikten değil.
 */
export function ReputationChip({
  reputation,
  kind,
  className = "",
}: {
  reputation: Reputation;
  kind?: User["kind"];
  className?: string;
}) {
  const strong = reputation.level === "uzman" || reputation.level === "çok yüksek uzmanlık";
  return (
    <span className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}>
      <span
        className={`text-[11px] font-bold uppercase tracking-[0.11em] ${
          strong ? "text-accent-ink" : "text-ink-3"
        }`}
      >
        {reputation.level}
      </span>
      {kind === "creator" && (
        <span className="border border-accent px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.11em] text-accent-ink">
          Doğrulanmış üretici
        </span>
      )}
    </span>
  );
}

/** Neyden geldiğini açan detay — profilde, "bu seviye nereden çıktı". */
export function ReputationSignals({ reputation }: { reputation: Reputation }) {
  const sorted = [...reputation.signals].sort((a, b) => b.weight - a.weight);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="label">İtibar neden bu seviyede</h2>
        <p className="max-w-[44ch] text-[12px] text-ink-3">
          Ağırlığı yüksek sinyaller üstte. Abonelik ya da ödeme bu tabloyu değiştiremez.
        </p>
      </div>
      <ul className="grid gap-x-10 gap-y-3 border-t border-line pt-3 sm:grid-cols-2">
        {sorted.map((s) => (
          <li key={s.key} className="flex items-center gap-3">
            <span className="flex-1 text-[13px] text-ink-2">{s.label}</span>
            <span className="block h-[4px] w-20 bg-sunk" aria-hidden>
              <span className="block h-full bg-ink-2" style={{ width: `${s.value}%` }} />
            </span>
            <span className="tnum w-8 shrink-0 text-right text-[12px] font-semibold text-ink-3">
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
