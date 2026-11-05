import type { Entity } from "@/lib/types";

/* ──────────────────────────────────────────────────────────────────────────
   VERİ TAMLIĞI — bir restoran profilinde GERÇEKTEN var olan bilgiler.
   · Yalnız kaynağı olan veri "var" sayılır; demo, tahmin ya da boş alan sayılmaz.
   · Aynı anahtarlar hem detay sayfasında hem yönetim raporunda (lib/db/quality) kullanılır.
   ────────────────────────────────────────────────────────────────────────── */

export const COMPLETENESS_KEYS = ["google", "photo", "reviews", "menu", "video", "reservation", "hours", "contact", "address"] as const;
export type CompletenessKey = (typeof COMPLETENESS_KEYS)[number];

export const COMPLETENESS_LABEL: Record<CompletenessKey, string> = {
  google: "Google bilgisi", photo: "Fotoğraf", reviews: "Gidenler deneyimi", menu: "Menü", video: "Video",
  reservation: "Online rezervasyon", hours: "Açılış saatleri", contact: "İletişim", address: "Adres",
};

export interface Completeness { have: Record<CompletenessKey, boolean>; score: number; filled: number; total: number }

/** Sunucuda bilinen ek durum (veritabanı, Google eşleşmesi). Verilmeyen alan "yok" sayılır. */
export interface CompletenessExtra { googleMatched?: boolean; reviews?: number; menuItems?: number; videos?: number; photos?: number }

export function completenessOf(e: Entity, x: CompletenessExtra = {}): Completeness {
  const real = !e.isDemo;
  const have: Record<CompletenessKey, boolean> = {
    google: !!x.googleMatched,
    photo: (x.photos ?? 0) > 0 || (real && !!e.photos?.length),
    reviews: (x.reviews ?? 0) > 0 || (real && !!e.isReal && (e.experienceTotal ?? 0) > 0),
    menu: (x.menuItems ?? 0) > 0,
    video: (x.videos ?? 0) > 0 || (real && !!e.media?.some((m) => m.platform === "youtube" || m.platform === "tiktok")),
    reservation: real && e.reservation?.mode === "gidenler",
    hours: !!(e.contact?.openingHours ?? e.hours),
    contact: !!(e.contact?.phone || e.contact?.website || e.contact?.instagram),
    address: !!e.address,
  };
  /* Google izni kapalıysa eksik sayılmaz: bu bir mekân eksiği değil, bizim kararımız */
  const keys = COMPLETENESS_KEYS.filter((k) => k !== "google" || have.google);
  const filled = keys.filter((k) => have[k]).length;
  return { have, filled, total: keys.length, score: Math.round((filled / keys.length) * 100) };
}
