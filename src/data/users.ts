import type { ExpertiseArea, Reputation, ReputationSignal, SocialIdentity, User } from "@/lib/types";

/* DEMO VERİ — kurgu kullanıcılar. Gerçek kişi veya influencer değildir. */

const sig = (key: ReputationSignal["key"], label: string, value: number, weight: number): ReputationSignal =>
  ({ key, label, value, weight });

const rep = (
  score: number,
  level: Reputation["level"],
  confidence: Reputation["confidence"],
  signals: ReputationSignal[],
): Reputation => ({ score, level, confidence, signals });

const ex = (
  key: string, label: string, scope: ExpertiseArea["scope"],
  score: number, count: number,
): ExpertiseArea => ({
  key, label, scope, score, experienceCount: count,
  level: score >= 90 ? "çok yüksek" : score >= 75 ? "yüksek" : "gelişiyor",
});

const soc = (
  provider: SocialIdentity["provider"], handle: string, followers: number,
  opts: Partial<SocialIdentity> = {},
): SocialIdentity => ({
  provider, handle,
  profileUrl: `https://${provider === "x" ? "x.com" : provider + ".com"}/${handle.replace("@", "")}`,
  followerCount: followers,
  verifiedByGidenler: true,
  providerVerified: false,
  lastCheckedAt: "2026-08-30",
  status: "ok",
  isDemo: true,
  ...opts,
});

export const users: User[] = [
  /* ─────────────── CREATOR 1 — fine dining + Japon mutfağı ─────────────── */
  {
    id: "u.denizyer", handle: "denizyer", displayName: "Deniz Yer", kind: "creator",
    bio: "On yıldır İstanbul'da yiyorum ve yazıyorum. Omakase ve fine dining ağırlıklı. Hesabı ben ödüyorum; ödemediğim zaman yazıyorum.",
    joinedAt: "2024-02-11",
    homeLocation: { city: "İstanbul", district: "Şişli" },
    reputation: rep(94, "çok yüksek uzmanlık", "high", [
      sig("contribution", "Gidenler katkı geçmişi", 96, 0.2),
      sig("verified_visits", "Doğrulanmış ziyaret oranı", 76, 0.2),
      sig("helpful_ratio", "Faydalı bulunma oranı", 93, 0.15),
      sig("experience_quality", "Deneyim kalitesi", 91, 0.15),
      sig("disclosure_behavior", "Ticari şeffaflık", 98, 0.1),
      sig("external_authority", "Dış otorite (sinyal)", 88, 0.1),
      sig("account_age", "Hesap yaşı", 62, 0.05),
      sig("moderation_history", "Moderasyon geçmişi", 100, 0.05),
    ]),
    expertise: [
      ex("japon-mutfagi", "Japon mutfağı", "facet", 96, 41),
      ex("fine-dining", "Fine dining", "facet", 91, 63),
      ex("steakhouse", "Steakhouse", "facet", 78, 19),
      ex("nisantasi", "Nişantaşı", "location", 84, 34),
    ],
    social: [
      soc("instagram", "denizyer", 482000, { providerVerified: true }),
      soc("youtube", "denizyer", 116000),
      soc("x", "denizyer", 81000, { providerVerified: true }),
    ],
    predictions: { totalPredictions: 41, correctDirection: 31, accuracy: 76, streak: 5,
      categoryAccuracy: [{ label: "Fine dining", accuracy: 82, count: 22 }, { label: "Japon mutfağı", accuracy: 78, count: 14 }] },
    stats: { experiences: 186, verifiedExperiences: 141, helpfulVotes: 18400, entitiesVisited: 174, listsCreated: 6 },
    isDemo: true,
  },

  /* ─────────────── CREATOR 2 — sokak lezzeti + Kadıköy ─────────────── */
  {
    id: "u.sokakvesofra", handle: "sokakvesofra", displayName: "Sokak ve Sofra", kind: "creator",
    bio: "Kadıköy'de büyüdüm, hâlâ aynı sokaklarda yiyorum. Dürüm, kokoreç, esnaf lokantası. Beyaz masa örtüsü yok.",
    joinedAt: "2024-06-02",
    homeLocation: { city: "İstanbul", district: "Kadıköy" },
    reputation: rep(88, "uzman", "high", [
      sig("contribution", "Gidenler katkı geçmişi", 89, 0.2),
      sig("verified_visits", "Doğrulanmış ziyaret oranı", 84, 0.2),
      sig("helpful_ratio", "Faydalı bulunma oranı", 90, 0.15),
      sig("experience_quality", "Deneyim kalitesi", 85, 0.15),
      sig("disclosure_behavior", "Ticari şeffaflık", 94, 0.1),
      sig("external_authority", "Dış otorite (sinyal)", 71, 0.1),
      sig("account_age", "Hesap yaşı", 55, 0.05),
      sig("moderation_history", "Moderasyon geçmişi", 100, 0.05),
    ]),
    expertise: [
      ex("sokak-lezzeti", "Sokak lezzeti", "facet", 93, 88),
      ex("kadikoy", "Kadıköy", "location", 89, 112),
      ex("esnaf-lokantasi", "Esnaf lokantası", "facet", 81, 44),
    ],
    social: [
      soc("instagram", "sokakvesofra", 94000),
      soc("tiktok", "sokakvesofra", 210000),
    ],
    predictions: { totalPredictions: 28, correctDirection: 19, accuracy: 68, streak: 2,
      categoryAccuracy: [{ label: "Sokak lezzeti", accuracy: 74, count: 19 }] },
    stats: { experiences: 231, verifiedExperiences: 194, helpfulVotes: 12600, entitiesVisited: 198, listsCreated: 4 },
    isDemo: true,
  },

  /* ─────────────── CREATOR 3 — kahve + fırın ─────────────── */
  {
    id: "u.filtrekayit", handle: "filtrekayit", displayName: "Filtre Kayıt", kind: "creator",
    bio: "Kahve ve ekmek. Aynı mekâna en az üç kez gitmeden yazmıyorum, çünkü bir fincan hiçbir şey anlatmaz.",
    joinedAt: "2025-01-19",
    homeLocation: { city: "İstanbul", district: "Beyoğlu" },
    reputation: rep(85, "uzman", "high", [
      sig("contribution", "Gidenler katkı geçmişi", 82, 0.2),
      sig("verified_visits", "Doğrulanmış ziyaret oranı", 91, 0.2),
      sig("helpful_ratio", "Faydalı bulunma oranı", 88, 0.15),
      sig("experience_quality", "Deneyim kalitesi", 89, 0.15),
      sig("disclosure_behavior", "Ticari şeffaflık", 96, 0.1),
      sig("external_authority", "Dış otorite (sinyal)", 54, 0.1),
      sig("account_age", "Hesap yaşı", 44, 0.05),
      sig("moderation_history", "Moderasyon geçmişi", 100, 0.05),
    ]),
    expertise: [
      ex("filtre-kahve", "Filtre kahve", "facet", 95, 74),
      ex("firin", "Fırın ve ekmek", "facet", 87, 39),
      ex("beyoglu", "Beyoğlu", "location", 72, 61),
    ],
    social: [
      soc("instagram", "filtrekayit", 38000),
      soc("youtube", "filtrekayit", 61000),
    ],
    predictions: { totalPredictions: 16, correctDirection: 12, accuracy: 75, streak: 3,
      categoryAccuracy: [{ label: "Filtre kahve", accuracy: 79, count: 12 }] },
    stats: { experiences: 143, verifiedExperiences: 130, helpfulVotes: 7900, entitiesVisited: 96, listsCreated: 3 },
    isDemo: true,
  },

  /* ───── NORMAL KULLANICI, AMA UZMAN — ürünün en önemli iddiası ───── */
  {
    id: "u.nazli-ada", handle: "nazli-ada", kind: "user",
    bio: "Instagram'da 512 takipçim var. Gidenler'de 268 deneyim yazdım. İkincisi daha çok şey anlatıyor.",
    joinedAt: "2023-04-08",
    homeLocation: { city: "İstanbul", district: "Kadıköy" },
    reputation: rep(91, "uzman", "high", [
      sig("contribution", "Gidenler katkı geçmişi", 97, 0.2),
      sig("verified_visits", "Doğrulanmış ziyaret oranı", 94, 0.2),
      sig("helpful_ratio", "Faydalı bulunma oranı", 89, 0.15),
      sig("experience_quality", "Deneyim kalitesi", 87, 0.15),
      sig("disclosure_behavior", "Ticari şeffaflık", 100, 0.1),
      sig("external_authority", "Dış otorite (sinyal)", 6, 0.1),
      sig("account_age", "Hesap yaşı", 88, 0.05),
      sig("moderation_history", "Moderasyon geçmişi", 100, 0.05),
    ]),
    expertise: [
      ex("japon-mutfagi", "Japon mutfağı", "facet", 91, 37),
      ex("kadikoy", "Kadıköy", "location", 86, 94),
      ex("esnaf-lokantasi", "Esnaf lokantası", "facet", 79, 52),
    ],
    social: [soc("instagram", "nazliada", 512, { verifiedByGidenler: false })],
    predictions: { totalPredictions: 34, correctDirection: 27, accuracy: 79, streak: 6,
      categoryAccuracy: [{ label: "Japon mutfağı", accuracy: 83, count: 12 }, { label: "Kadıköy", accuracy: 77, count: 18 }] },
    stats: { experiences: 268, verifiedExperiences: 214, helpfulVotes: 9100, entitiesVisited: 203, listsCreated: 2 },
    isDemo: true,
  },

  /* ─────────────── DİĞER KULLANICILAR ─────────────── */
  {
    id: "u.kirmizibiletci", handle: "kirmizibiletci", kind: "user",
    joinedAt: "2023-03-12", homeLocation: { city: "İstanbul", district: "Kadıköy" },
    reputation: rep(79, "yerel uzman", "high", [
      sig("contribution", "Gidenler katkı geçmişi", 84, 0.25),
      sig("verified_visits", "Doğrulanmış ziyaret oranı", 78, 0.25),
      sig("helpful_ratio", "Faydalı bulunma oranı", 82, 0.2),
      sig("account_age", "Hesap yaşı", 86, 0.1),
      sig("experience_quality", "Deneyim kalitesi", 71, 0.2),
    ]),
    expertise: [ex("kadikoy", "Kadıköy", "location", 83, 71), ex("esnaf-lokantasi", "Esnaf lokantası", "facet", 76, 38)],
    social: [],
    stats: { experiences: 214, verifiedExperiences: 168, helpfulVotes: 4820, entitiesVisited: 160, listsCreated: 1 },
    isDemo: true,
  },
  {
    id: "u.yorgun-kartograf", handle: "yorgun-kartograf", kind: "user",
    joinedAt: "2024-01-08", homeLocation: { city: "İstanbul" },
    reputation: rep(64, "güvenilir", "medium", [
      sig("contribution", "Gidenler katkı geçmişi", 62, 0.3),
      sig("verified_visits", "Doğrulanmış ziyaret oranı", 48, 0.3),
      sig("helpful_ratio", "Faydalı bulunma oranı", 79, 0.25),
      sig("account_age", "Hesap yaşı", 58, 0.15),
    ]),
    expertise: [ex("beyoglu", "Beyoğlu", "location", 61, 24)],
    social: [], isDemo: true,
    stats: { experiences: 96, verifiedExperiences: 61, helpfulVotes: 1740, entitiesVisited: 88, listsCreated: 0 },
  },
  {
    id: "u.mor-kaskol", handle: "mor-kaskol", kind: "user",
    joinedAt: "2023-11-02", homeLocation: { city: "İstanbul", district: "Beşiktaş" },
    reputation: rep(72, "güvenilir", "medium", [
      sig("contribution", "Gidenler katkı geçmişi", 74, 0.3),
      sig("verified_visits", "Doğrulanmış ziyaret oranı", 56, 0.3),
      sig("helpful_ratio", "Faydalı bulunma oranı", 84, 0.25),
      sig("account_age", "Hesap yaşı", 70, 0.15),
    ]),
    expertise: [ex("besiktas", "Beşiktaş", "location", 68, 31)],
    social: [], isDemo: true,
    stats: { experiences: 132, verifiedExperiences: 74, helpfulVotes: 2110, entitiesVisited: 119, listsCreated: 0 },
  },
  {
    id: "u.gri-pazartesi", handle: "gri-pazartesi", kind: "user",
    joinedAt: "2024-07-30", homeLocation: { city: "İstanbul" },
    reputation: rep(58, "güvenilir", "medium", [
      sig("contribution", "Gidenler katkı geçmişi", 55, 0.3),
      sig("verified_visits", "Doğrulanmış ziyaret oranı", 33, 0.3),
      sig("helpful_ratio", "Faydalı bulunma oranı", 76, 0.25),
      sig("account_age", "Hesap yaşı", 50, 0.15),
    ]),
    expertise: [], social: [], isDemo: true,
    stats: { experiences: 88, verifiedExperiences: 29, helpfulVotes: 1290, entitiesVisited: 84, listsCreated: 0 },
  },
  {
    id: "u.bahar-gecikmesi", handle: "bahar-gecikmesi", kind: "user",
    joinedAt: "2024-09-03", homeLocation: { city: "İstanbul" },
    reputation: rep(46, "katkıda bulunan", "medium", [
      sig("contribution", "Gidenler katkı geçmişi", 44, 0.3),
      sig("verified_visits", "Doğrulanmış ziyaret oranı", 40, 0.3),
      sig("helpful_ratio", "Faydalı bulunma oranı", 62, 0.25),
      sig("account_age", "Hesap yaşı", 42, 0.15),
    ]),
    expertise: [], social: [], isDemo: true,
    stats: { experiences: 52, verifiedExperiences: 21, helpfulVotes: 830, entitiesVisited: 49, listsCreated: 0 },
  },
  {
    id: "u.uzun-koridor", handle: "uzun-koridor", kind: "user",
    joinedAt: "2026-01-21", homeLocation: { city: "Ankara" },
    reputation: rep(21, "yeni", "low", [
      sig("contribution", "Gidenler katkı geçmişi", 12, 0.3),
      sig("verified_visits", "Doğrulanmış ziyaret oranı", 57, 0.3),
      sig("helpful_ratio", "Faydalı bulunma oranı", 30, 0.25),
      sig("account_age", "Hesap yaşı", 8, 0.15),
    ]),
    expertise: [], social: [], isDemo: true,
    stats: { experiences: 7, verifiedExperiences: 4, helpfulVotes: 44, entitiesVisited: 7, listsCreated: 0 },
  },
];

export const getUser = (id: string) => users.find((u) => u.id === id);
export const getUserByHandle = (h: string) => users.find((u) => u.handle === h.replace(/^@/, ""));
export const creators = () => users.filter((u) => u.kind === "creator");
