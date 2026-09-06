import { nf } from "@/lib/format";
import type { AISummary } from "@/lib/types";

/**
 * AI ÖZETİ.
 * Kurallar: (1) insan yerine yazmaz, (2) kaç deneyime dayandığını
 * her zaman gösterir, (3) kendi rengi yoktur — etiketle ayrılır,
 * (4) regüle kategorilerde hiç render edilmez (üst katman karar verir).
 */
export function AISummaryBlock({ summary }: { summary: AISummary }) {
  return (
    <section aria-labelledby="ai-ozet" className="flex flex-col gap-4 border-l-2 border-ink pl-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="ai-ozet" className="label">
          Gidenler AI özeti
        </h2>
        <span className="text-[12px] text-ink-3">
          son {summary.windowDays} günde{" "}
          <strong className="tnum font-semibold text-ink-2">{nf(summary.basedOnCount)}</strong>{" "}
          deneyim okundu
        </span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {summary.lines.map((line, i) => (
          <li key={i} className="prose-exp relative pl-5 text-[16px] leading-[1.5]">
            <span className="absolute left-0 top-[0.62em] block h-[2px] w-2.5 bg-ink-3" aria-hidden />
            {line}
          </li>
        ))}
      </ul>

      <p className="max-w-[62ch] text-[12px] leading-relaxed text-ink-3">
        Bu özet insan deneyimlerinden üretildi ve yorumların yerine geçmez. AI kendi
        deneyimini yazmaz, yalnızca yazılanları sayar ve özetler.
      </p>
    </section>
  );
}
