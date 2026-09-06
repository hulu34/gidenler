import type { User } from "@/lib/types";

const SIZE = { xs: "h-6 w-6", sm: "h-8 w-8", md: "h-11 w-11", lg: "h-16 w-16", xl: "h-24 w-24" } as const;

/**
 * KİŞİ GÖRSELİ — fotoğraf varsa o; yoksa zarif, nötr silüet.
 * Baş harf yok, hash'ten renk yok. Herkes aynı kâğıt/mürekkep paletinde.
 */
export function PersonMark({ user, size = "md", className = "" }: { user: Pick<User, "handle" | "displayName" | "photo">; size?: keyof typeof SIZE; className?: string }) {
  if (user.photo) {
    return (
      <span className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-sunk ${SIZE[size]} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.photo} alt={user.displayName ?? `@${user.handle}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      data-person="silhouette"
      className={`relative inline-block shrink-0 overflow-hidden rounded-full text-ink ${SIZE[size]} ${className}`}
      style={{ background: "linear-gradient(160deg, var(--sheet) 0%, var(--sunk) 100%)" }}
    >
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full">
        <circle cx="32" cy="25" r="11" fill="currentColor" opacity="0.28" />
        <path d="M10 62 c2 -16 11 -24 22 -24 s20 8 22 24 z" fill="currentColor" opacity="0.28" />
      </svg>
    </span>
  );
}
