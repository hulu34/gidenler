import type { TimingVerdict } from "@/lib/types";

const glyph = { up: "↑", down: "↓", flat: "→" } as const;
const tone = { up: "text-pos-ink", down: "text-neg-ink", flat: "text-ink-3" } as const;

/** "Şimdi gitmek için iyi zaman mı?" — trend, tüketici diline çevrilmiş. */
export function TimingCard({ t }: { t: TimingVerdict }) {
  const answerTone = t.answer === "Evet" ? "text-pos-ink" : t.answer === "Biraz bekle" ? "text-warn" : "text-ink";
  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-4">
      <span className="label">Şimdi gitmek için iyi zaman mı?</span>
      <span className={`text-[26px] font-extrabold leading-none tracking-[-0.035em] ${answerTone}`}>{t.answer}</span>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {t.signals.map((s) => (
          <li key={s.label} className="flex items-center gap-1 text-[12.5px] font-semibold">
            <span className="text-ink-2">{s.label}</span>
            <span aria-hidden className={tone[s.direction]}>{glyph[s.direction]}</span>
          </li>
        ))}
      </ul>
      <p className="prose-exp text-[14px] leading-snug text-ink-2">{t.explanation}</p>
      <span className="text-[11px] text-ink-3">{t.window} · deneyimlerin öncekilerle karşılaştırılması</span>
    </div>
  );
}
