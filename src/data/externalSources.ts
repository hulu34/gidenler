import type { ExternalSource } from "@/lib/types";

/**
 * DIŞ KAYNAKLAR — PROVIDER TABANLI.
 *
 * Prototipte tüm kayıtlar isDemo: true. Gerçek entegrasyon açılmadan önce
 * her sağlayıcının kendi gösterim ve lisans şartı vardır; `licensingNote`
 * bunu kodun içinde taşır ki canlıya çıkarken kimse unutmasın.
 *
 * Sağlayıcı eklemek: PROVIDERS'a bir satır + burada kayıt. UI değişmez.
 */

export const PROVIDERS = {
  google: { label: "Google", scale: 5, kind: "score" as const },
  tripadvisor: { label: "Tripadvisor", scale: 5, kind: "score" as const },
  yandex: { label: "Yandex", scale: 5, kind: "score" as const },
  sikayetvar: { label: "Şikayetvar", scale: 0, kind: "complaint" as const },
  booking: { label: "Booking", scale: 10, kind: "score" as const },
  imdb: { label: "IMDb", scale: 10, kind: "score" as const },
};

/** Sağlayıcıyı tek satır değiştirerek kapatmak için. */
export const enabledProviders: Array<keyof typeof PROVIDERS> = [
  "google",
  "tripadvisor",
  "yandex",
  "sikayetvar",
];


export const externalSources: ExternalSource[] = [
  {
    id: "ext.1", entityId: "ent.moda-lokantasi", provider: "google", label: "Google",
    kind: "score", score: 4.6, scoreScale: 5, reviewCount: 2341,
    attribution: "Google", lastUpdated: "2026-08-30", isDemo: true, status: "ok",
    history: [
      { provider: "google", capturedAt: "2026-01-15", score: 4.7, reviewCount: 1890 },
      { provider: "google", capturedAt: "2026-04-15", score: 4.7, reviewCount: 2040 },
      { provider: "google", capturedAt: "2026-07-15", score: 4.6, reviewCount: 2210 },
      { provider: "google", capturedAt: "2026-08-30", score: 4.6, reviewCount: 2341 },
    ],
    licensingNote:
      "Canlıda Google Places şartları: yorumcu adı/avatarı/profil bağlantısı, Google atıfı ve önbellek sınırları zorunlu.",
  },
  {
    id: "ext.2", entityId: "ent.moda-lokantasi", provider: "tripadvisor", label: "Tripadvisor",
    kind: "score", score: 4.5, scoreScale: 5, reviewCount: 918,
    attribution: "Tripadvisor", lastUpdated: "2026-08-28", isDemo: true, status: "ok",
    licensingNote:
      "Canlıda Content API şartları: kendi puan simgen kullanılamaz, Tripadvisor baloncuk grafiği ve ≥20px logo zorunlu.",
  },
  {
    id: "ext.3", entityId: "ent.moda-lokantasi", provider: "yandex", label: "Yandex",
    kind: "score", score: 4.7, scoreScale: 5, reviewCount: 1104,
    attribution: "Yandex Haritalar", lastUpdated: "2026-08-29", isDemo: true, status: "ok",
    licensingNote: "Canlıda Yandex Maps API kullanım şartları ve atıf zorunluluğu geçerli.",
  },
  {
    id: "ext.4", entityId: "ent.moda-lokantasi", provider: "sikayetvar", label: "Şikayetvar",
    kind: "complaint", complaintCount: 17,
    attribution: "Şikayetvar", lastUpdated: "2026-08-27", isDemo: true, status: "ok",
    licensingNote:
      "Üçüncü taraf şikayet sayısını göstermek ayrı bir anlaşma gerektirir; itibar riski nedeniyle hukuk onayı olmadan açılmaz.",
  },

  { id: "ext.5", entityId: "ent.asma-teras", provider: "google", label: "Google",
    kind: "score", score: 4.1, scoreScale: 5, reviewCount: 1876,
    attribution: "Google", lastUpdated: "2026-08-30", isDemo: true, status: "ok",
    /* Gidenler düşüşü şubatta gördü; Google ancak temmuzda kırıldı. */
    history: [
      { provider: "google", capturedAt: "2026-01-15", score: 4.6, reviewCount: 1402 },
      { provider: "google", capturedAt: "2026-04-15", score: 4.5, reviewCount: 1588 },
      { provider: "google", capturedAt: "2026-07-15", score: 4.3, reviewCount: 1744 },
      { provider: "google", capturedAt: "2026-08-30", score: 4.1, reviewCount: 1876 },
    ] },
  { id: "ext.6", entityId: "ent.asma-teras", provider: "tripadvisor", label: "Tripadvisor",
    kind: "score", score: 4.0, scoreScale: 5, reviewCount: 402,
    attribution: "Tripadvisor", lastUpdated: "2026-08-26", isDemo: true, status: "ok" },
  { id: "ext.7", entityId: "ent.asma-teras", provider: "yandex", label: "Yandex",
    kind: "score", score: 4.3, scoreScale: 5, reviewCount: 512,
    attribution: "Yandex Haritalar", lastUpdated: "2026-08-25", isDemo: true, status: "stale" },
  { id: "ext.8", entityId: "ent.asma-teras", provider: "sikayetvar", label: "Şikayetvar",
    kind: "complaint", complaintCount: 63,
    attribution: "Şikayetvar", lastUpdated: "2026-08-27", isDemo: true, status: "ok" },

  { id: "ext.9", entityId: "ent.balikci-sokagi", provider: "google", label: "Google",
    kind: "score", score: 4.4, scoreScale: 5, reviewCount: 3102,
    attribution: "Google", lastUpdated: "2026-08-30", isDemo: true, status: "ok" },
  { id: "ext.10", entityId: "ent.balikci-sokagi", provider: "tripadvisor", label: "Tripadvisor",
    kind: "score", score: 4.4, scoreScale: 5, reviewCount: 1290,
    attribution: "Tripadvisor", lastUpdated: "2026-08-24", isDemo: true, status: "ok" },
  { id: "ext.11", entityId: "ent.balikci-sokagi", provider: "sikayetvar", label: "Şikayetvar",
    kind: "complaint", complaintCount: 9,
    attribution: "Şikayetvar", lastUpdated: "2026-08-27", isDemo: true, status: "ok" },

  { id: "ext.12", entityId: "ent.kuzey-kahve", provider: "google", label: "Google",
    kind: "score", score: 4.7, scoreScale: 5, reviewCount: 894,
    attribution: "Google", lastUpdated: "2026-08-30", isDemo: true, status: "ok" },
  { id: "ext.13", entityId: "ent.kuzey-kahve", provider: "yandex", label: "Yandex",
    kind: "score", score: 4.6, scoreScale: 5, reviewCount: 310,
    attribution: "Yandex Haritalar", lastUpdated: "2026-08-29", isDemo: true, status: "ok" },

  { id: "ext.14", entityId: "ent.tas-firin-cihangir", provider: "google", label: "Google",
    kind: "score", score: 4.5, scoreScale: 5, reviewCount: 1522,
    attribution: "Google", lastUpdated: "2026-08-30", isDemo: true, status: "ok" },

  { id: "ext.15", entityId: "ent.hotel-payitaht", provider: "google", label: "Google",
    kind: "score", score: 4.4, scoreScale: 5, reviewCount: 706,
    attribution: "Google", lastUpdated: "2026-08-30", isDemo: true, status: "ok" },
  { id: "ext.16", entityId: "ent.hotel-payitaht", provider: "tripadvisor", label: "Tripadvisor",
    kind: "score", score: 4.3, scoreScale: 5, reviewCount: 388,
    attribution: "Tripadvisor", lastUpdated: "2026-08-22", isDemo: true, status: "ok" },
  { id: "ext.17", entityId: "ent.hotel-payitaht", provider: "booking", label: "Booking",
    kind: "score", score: 8.6, scoreScale: 10, reviewCount: 1204,
    attribution: "Booking.com", lastUpdated: "2026-08-23", isDemo: true, status: "ok" },
  /* ---- yeni varlıklar ---- */
  { id: "ext.20", entityId: "ent.sakura-omakase", provider: "google", label: "Google",
    kind: "score", score: 4.8, scoreScale: 5, reviewCount: 412,
    attribution: "Google", lastUpdated: "2026-08-30", isDemo: true, status: "ok",
    history: [
      { provider: "google", capturedAt: "2026-01-15", score: 4.7, reviewCount: 214 },
      { provider: "google", capturedAt: "2026-05-15", score: 4.8, reviewCount: 321 },
      { provider: "google", capturedAt: "2026-08-30", score: 4.8, reviewCount: 412 },
    ] },
  { id: "ext.21", entityId: "ent.sakura-omakase", provider: "tripadvisor", label: "Tripadvisor",
    kind: "score", score: 4.7, scoreScale: 5, reviewCount: 96,
    attribution: "Tripadvisor", lastUpdated: "2026-08-24", isDemo: true, status: "ok" },
  { id: "ext.22", entityId: "ent.sakura-omakase", provider: "yandex", label: "Yandex",
    kind: "score", score: 4.9, scoreScale: 5, reviewCount: 128,
    attribution: "Yandex Haritalar", lastUpdated: "2026-08-28", isDemo: true, status: "ok" },
  { id: "ext.23", entityId: "ent.sakura-omakase", provider: "sikayetvar", label: "Şikayetvar",
    kind: "complaint", complaintCount: 2, resolvedCount: 2,
    attribution: "Şikayetvar", lastUpdated: "2026-08-27", isDemo: true, status: "ok" },

  { id: "ext.24", entityId: "ent.ates-steak", provider: "google", label: "Google",
    kind: "score", score: 4.5, scoreScale: 5, reviewCount: 2870,
    attribution: "Google", lastUpdated: "2026-08-30", isDemo: true, status: "ok",
    history: [
      { provider: "google", capturedAt: "2026-01-15", score: 4.6, reviewCount: 2210 },
      { provider: "google", capturedAt: "2026-05-15", score: 4.6, reviewCount: 2540 },
      { provider: "google", capturedAt: "2026-08-30", score: 4.5, reviewCount: 2870 },
    ] },
  { id: "ext.25", entityId: "ent.ates-steak", provider: "tripadvisor", label: "Tripadvisor",
    kind: "score", score: 4.4, scoreScale: 5, reviewCount: 706,
    attribution: "Tripadvisor", lastUpdated: "2026-08-21", isDemo: true, status: "ok" },
  { id: "ext.26", entityId: "ent.ates-steak", provider: "yandex", label: "Yandex",
    kind: "score", score: 4.5, scoreScale: 5, reviewCount: 611,
    attribution: "Yandex Haritalar", lastUpdated: "2026-08-29", isDemo: true, status: "ok" },
  { id: "ext.27", entityId: "ent.ates-steak", provider: "sikayetvar", label: "Şikayetvar",
    kind: "complaint", complaintCount: 34, resolvedCount: 19,
    attribution: "Şikayetvar", lastUpdated: "2026-08-27", isDemo: true, status: "ok" },

  { id: "ext.28", entityId: "ent.koz-durum", provider: "google", label: "Google",
    kind: "score", score: 4.6, scoreScale: 5, reviewCount: 5104,
    attribution: "Google", lastUpdated: "2026-08-30", isDemo: true, status: "ok" },
  { id: "ext.29", entityId: "ent.koz-durum", provider: "yandex", label: "Yandex",
    kind: "score", score: 4.7, scoreScale: 5, reviewCount: 1980,
    attribution: "Yandex Haritalar", lastUpdated: "2026-08-29", isDemo: true, status: "ok" },
  { id: "ext.30", entityId: "ent.koz-durum", provider: "sikayetvar", label: "Şikayetvar",
    kind: "complaint", complaintCount: 6, resolvedCount: 5,
    attribution: "Şikayetvar", lastUpdated: "2026-08-27", isDemo: true, status: "ok" },

  { id: "ext.31", entityId: "ent.demlik-roastery", provider: "google", label: "Google",
    kind: "score", score: 4.7, scoreScale: 5, reviewCount: 1140,
    attribution: "Google", lastUpdated: "2026-08-30", isDemo: true, status: "ok" },
  { id: "ext.32", entityId: "ent.demlik-roastery", provider: "yandex", label: "Yandex",
    kind: "score", score: 4.6, scoreScale: 5, reviewCount: 402,
    attribution: "Yandex Haritalar", lastUpdated: "2026-08-25", isDemo: true, status: "stale" },
];
