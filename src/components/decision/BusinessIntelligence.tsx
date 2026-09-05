import type { BusinessAlert, BusinessBenchmark, BusinessRecommendation, BusinessRootCause } from "@/lib/types";
import { score1 } from "@/lib/format";

const sign = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${score1(Math.abs(n))}`;
const tone = (n: number) => (n > 0.05 ? "text-pos-ink" : n < -0.05 ? "text-neg-ink" : "text-ink-3");

/**
 * BUSINESS ROOT CAUSE — "Neden değişti?" + "Nereden başlamalısın?" + benchmark + uyarılar.
 * Demo zekâ: nedensellik değil, deneyimlerden gözlenen ilişki. Rakip özel verisi yok;
 * benchmark anonim toplulaştırılmış kategori ortalamasıdır.
 */
export function RootCauses({ window, from, to, causes }: { window: string; from: number; to: number; causes: BusinessRootCause[] }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="neden">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
        <h2 id="neden" className="text-[13px] font-bold uppercase tracking-[0.2em]">Neden değişti?</h2>
        <span className="border border-dashed border-line-2 px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.12em] text-ink-3">demo zekâ</span>
      </div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <span className="label">{window} · Gidenler puanı</span>
        <span className="flex items-baseline gap-2">
          <span className="tnum text-[30px] font-extrabold leading-none tracking-[-0.045em] text-ink-3">{score1(from)}</span>
          <span aria-hidden className="text-ink-3">→</span>
          <span className="tnum text-[30px] font-extrabold leading-none tracking-[-0.045em]">{score1(to)}</span>
        </span>
      </div>
      <ul className="flex flex-col">
        {causes.map((c) => (
          <li key={c.dimensionKey} className="grid gap-x-8 gap-y-1 border-t border-line py-4 sm:grid-cols-[170px_90px_1fr]">
            <span className="text-[15px] font-bold tracking-[-0.01em]">{c.label}</span>
            <span className={`tnum text-[20px] font-extrabold leading-none tracking-[-0.03em] ${tone(c.delta)}`}>{sign(c.delta)}</span>
            <span className="flex flex-col gap-0.5">
              {c.theme && c.themeChangePct !== undefined && (
                <span className="text-[13.5px] font-semibold">“{c.theme}” teması <span className="tnum">+%{c.themeChangePct}</span></span>
              )}
              <span className="text-[13px] text-ink-2">{c.note}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11.5px] text-ink-3">Deneyimlerden gözlenen ilişki; nedensellik iddiası değildir.</p>
    </section>
  );
}

export function Recommendations({ items }: { items: BusinessRecommendation[] }) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-4 border-l-2 border-accent pl-5" aria-labelledby="basla">
      <h2 id="basla" className="label">Nereden başlamalısın?</h2>
      <ul className="flex flex-col gap-5">
        {items.map((r) => (
          <li key={r.title} className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-ink">En yüksek etki alanı · {r.impactArea}</span>
            <span className="text-[19px] font-bold leading-tight tracking-[-0.02em]">{r.title}</span>
            <p className="prose-exp max-w-[60ch] text-[14.5px] leading-snug text-ink-2">{r.body}</p>
            <span className="text-[11.5px] text-ink-3">Kaynak: {r.source} · demo</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Benchmarks({ items }: { items: BusinessBenchmark[] }) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="kiyas">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="kiyas" className="label">Kategorinle kıyas</h2>
        <span className="text-[12px] text-ink-3">{items[0].peerGroup} · anonim toplulaştırma</span>
      </div>
      <ul className="grid gap-x-10 gap-y-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((b) => {
          const f = (n: number) => (b.format === "pct" ? `%${n}` : score1(n));
          const diff = b.you - b.peers;
          return (
            <li key={b.label} className="flex flex-col gap-1">
              <span className="label">{b.label}</span>
              <span className="flex items-baseline gap-2">
                <span className="tnum text-[26px] font-extrabold leading-none tracking-[-0.04em]">{f(b.you)}</span>
                <span className="tnum text-[12px] text-ink-3">sen</span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="tnum text-[15px] font-semibold text-ink-3">{f(b.peers)}</span>
                <span className="text-[12px] text-ink-3">benzerler</span>
                <span className={`tnum text-[12px] font-bold ${diff > 0 ? "text-pos-ink" : diff < 0 ? "text-neg-ink" : "text-ink-3"}`}>
                  {diff > 0 ? "↑" : diff < 0 ? "↓" : "→"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[11.5px] text-ink-3">Rakip özel verisi gösterilmez; yalnızca kategori ortalaması.</p>
    </section>
  );
}

export function Alerts({ items }: { items: BusinessAlert[] }) {
  if (!items.length) return null;
  const tone = { action: "text-neg-ink", watch: "text-warn", info: "text-ink-3" } as const;
  const label = { action: "aksiyon", watch: "izle", info: "bilgi" } as const;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="uyari">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="uyari" className="label">Uyarılar</h2>
        <span className="text-[12px] text-ink-3">Demo uyarı merkezi · ileride bildirim olarak gelir</span>
      </div>
      <ul className="flex flex-col border-t border-line">
        {items.map((a) => (
          <li key={a.id} className="grid gap-x-6 gap-y-0.5 border-b border-line py-3 sm:grid-cols-[70px_1fr]">
            <span className={`text-[11px] font-bold uppercase tracking-[0.12em] ${tone[a.severity]}`}>{label[a.severity]}</span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[14.5px] font-semibold">{a.title}</span>
              <span className="text-[13px] text-ink-2">{a.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
