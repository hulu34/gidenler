import type { ReactNode } from "react";

/**
 * Aşamalı açılım — <details>: içerik DOM'da kalır (SEO, okunabilirlik),
 * kullanıcı isterse iner. Klavyeyle çalışır; JS gerekmez.
 */
export function Disclosure({ title, hint, defaultOpen = false, children }: {
  title: string; hint?: string; defaultOpen?: boolean; children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-line">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-baseline gap-3">
          <span aria-hidden className="w-3 text-[13px] font-bold text-ink-3 group-open:rotate-90 inline-block transition-transform">›</span>
          <span className="text-[15px] font-bold tracking-[-0.01em]">{title}</span>
        </span>
        {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
      </summary>
      <div className="pb-8 pt-2">{children}</div>
    </details>
  );
}
