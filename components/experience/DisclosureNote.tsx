import type { Disclosure } from "@/lib/types";

/**
 * TİCARİ ŞEFFAFLIK — gizlemiyoruz ama bağırmıyoruz da.
 * Ayrıca: bu ilişki puan ağırlığını düşürür (bkz. lib/api weightOf).
 */
export function DisclosureNote({ disclosure }: { disclosure: Disclosure }) {
  if (disclosure.relationship === "none") return null;
  return (
    <p className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink-3">
      <span className="border border-line-2 px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.11em] text-warn">
        {disclosure.label}
      </span>
      <span>
        {disclosure.declaredByAuthor
          ? "Yazar tarafından beyan edildi. Bu deneyim puan hesabında daha düşük ağırlık alır."
          : "Beyan edilmedi; sistem tarafından işaretlendi."}
      </span>
    </p>
  );
}
