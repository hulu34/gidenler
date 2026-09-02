import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "pos" | "neg" | "warn" | "demo";

const tones: Record<Tone, string> = {
  neutral: "text-ink-3 border-line-2",
  accent: "text-accent-ink border-accent",
  pos: "text-pos-ink border-pos",
  neg: "text-neg-ink border-neg",
  warn: "text-warn border-warn",
  demo: "text-ink-3 border-dashed border-line-2",
};

/** Rozet: ürünün her yerinde tek görünüm. Renk yalnızca anlam taşır. */
export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.12em] leading-[1.6] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Etiketsiz, çerçevesiz mikro etiket — yoğun yerlerde. */
export function Tag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3 ${className}`}>
      {children}
    </span>
  );
}
