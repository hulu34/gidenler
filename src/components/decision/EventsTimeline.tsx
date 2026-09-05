import type { EntityEvent } from "@/lib/types";
import { monthOf } from "@/lib/format";

const glyph = { up: "↑", down: "↓", flat: "→" } as const;
const tone = { up: "text-pos-ink", down: "text-neg-ink", flat: "text-ink-3" } as const;
const TYPE_LABEL: Record<EntityEvent["type"], string> = {
  chef_change: "Şef değişimi", ownership_change: "Sahip değişimi", renovation: "Tadilat", menu_change: "Menü değişimi",
  price_change: "Fiyat değişimi", service_change: "Servis değişimi", relocation: "Taşınma", opening: "Açılış",
  closure: "Kapanış", award: "Ödül / liste", incident: "Olay", unknown: "Bilinmiyor",
};

/**
 * NE OLDU? — puanın neden değiştiğini olaylarla açıklamaya çalışır.
 * Olay → izleyen sinyal değişimleri. Korelasyon; nedensellik hükmü verilmez.
 */
export function EventsTimeline({ events }: { events: EntityEvent[] }) {
  if (!events.length) return null;
  return (
    <section aria-labelledby="neoldu" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-line-strong pb-3">
        <h2 id="neoldu" className="text-[13px] font-bold uppercase tracking-[0.2em]">Ne oldu?</h2>
        <p className="max-w-[48ch] text-[12px] text-ink-3">
          Puan neden değişti? Olaylar ve ardından gelen sinyaller. Ardışıklık, nedensellik değildir.
        </p>
      </div>
      <ol className="flex flex-col">
        {events.map((ev) => (
          <li key={ev.id} className="grid gap-x-8 gap-y-2 border-b border-line py-5 sm:grid-cols-[150px_1fr]">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold tracking-[-0.01em]">{monthOf(ev.occurredAt)}</span>
              <span className="label">{TYPE_LABEL[ev.type]}</span>
              <span className="text-[11px] text-ink-3">
                {ev.sourceType} · güven {ev.confidence === "high" ? "yüksek" : ev.confidence === "medium" ? "orta" : "düşük"}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[17px] font-bold leading-tight tracking-[-0.02em]">{ev.title}</span>
              <p className="prose-exp text-[14.5px] leading-snug text-ink-2">{ev.description}</p>
              {ev.relatedSignals.length > 0 && (
                <ul className="mt-1 flex flex-col gap-1 border-l-2 border-line pl-4">
                  {ev.relatedSignals.map((s, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
                      <span className="label w-[110px] shrink-0">{s.period}</span>
                      <span className="text-ink">{s.label}</span>
                      <span aria-hidden className={`font-bold ${tone[s.direction]}`}>{glyph[s.direction]}</span>
                    </li>
                  ))}
                </ul>
              )}
              <span className="text-[11.5px] text-ink-3">
                {ev.type === "chef_change" || ev.type === "price_change" ? "Olayın ardından gelen değişim; olayın tek neden olduğu iddia edilmez." : "Deneyimlerden gözlenen değişim."}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
