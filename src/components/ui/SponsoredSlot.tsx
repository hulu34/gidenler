import { Tag } from "./Badge";

/**
 * Sponsorlu içerik. Kuralları:
 *  - insan deneyimi gibi görünmez (tipografisi ve konumu ayrı),
 *  - puanı ve sıralamayı etkilemez,
 *  - kategori compliance.allowAdvertising false ise hiç render edilmez.
 */
export function SponsoredSlot({
  title,
  body,
  domain,
}: {
  title: string;
  body: string;
  domain: string;
}) {
  return (
    <aside className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-y-2 border-line-strong py-5">
      <div className="flex max-w-[52ch] flex-col gap-1.5">
        <Tag className="tracking-[0.28em]">Sponsorlu alternatif · reklam</Tag>
        <p className="text-[19px] font-bold tracking-[-0.02em]">{title}</p>
        <p className="prose-exp text-[15px] leading-snug text-ink-2">{body}</p>
      </div>
      <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-3 underline decoration-line-2 underline-offset-4">
        {domain}
      </span>
      <p className="w-full text-[11.5px] text-ink-3">
        Sponsorlu alanlar puanı, uyumu ve sıralamayı etkilemez; öneri değildir. Sıralama satın alınamaz.
      </p>
    </aside>
  );
}
