import type { SocialIdentity } from "@/lib/types";

const LABEL: Record<SocialIdentity["provider"], string> = {
  instagram: "Instagram", x: "X", youtube: "YouTube", tiktok: "TikTok",
};

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toLocaleString("tr-TR", { maximumFractionDigits: n >= 100000 ? 0 : 1 })}B` : String(n);

/**
 * DIŞ OTORİTE — Gidenler güveniyle AYNI ŞEY DEĞİLDİR.
 * Bu blok kasıtlı olarak küçük ve nötr; takipçi sayısı bir sinyaldir,
 * güvenin kendisi değil. Uzmanlık ayrı bir blokta gösterilir.
 */
export function SocialAuthority({ identities }: { identities: SocialIdentity[] }) {
  if (!identities.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="label">Dış platformlar</span>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {identities.map((s) => (
          <li key={s.provider} className="flex items-baseline gap-1.5 text-[13px]">
            <span className="font-semibold">{LABEL[s.provider]}</span>
            {s.followerCount !== undefined && (
              <span className="tnum text-ink-2">{compact(s.followerCount)}</span>
            )}
            {s.verifiedByGidenler && (
              <span className="text-accent-ink" title="Gidenler tarafından doğrulandı" aria-label="doğrulandı">
                ✓
              </span>
            )}
            {s.isDemo && (
              <span className="border border-dashed border-line-2 px-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-3">
                demo
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="max-w-[54ch] text-[11.5px] leading-relaxed text-ink-3">
        Takipçi sayısı Gidenler güveninin ölçüsü değildir; yalnızca bir sinyaldir.
      </p>
    </div>
  );
}
