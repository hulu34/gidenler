import type {
  DecisionContext, DecisionContextKey, SimilarUsersPerspective, TasteProfile,
} from "@/lib/types";

/**
 * DEMO VERİ — TASTE GRAPH.
 * Reputation "kime güveniyoruz", Expertise "kim neyi biliyor", Taste "kim neyi seviyor".
 * Buradaki profil, prototipte oturum açmış kabul edilen demo kişiye aittir.
 * Production'da bu profil kullanıcının kendi deneyimlerinden öğrenilir;
 * burada elle yazılmıştır ve açıkça demodur.
 */

export const DEMO_USER_ID = "u.atlasdemo";
export const DEMO_USER_HANDLE = "atlasdemo";

export const tasteProfiles: Record<string, TasteProfile> = {
  [DEMO_USER_ID]: {
    userId: DEMO_USER_ID,
    dimensions: [
      { key: "taste", label: "Lezzet", weight: 94 },
      { key: "service", label: "Servis", weight: 78 },
      { key: "quiet", label: "Sessizlik", weight: 72 },
      { key: "value", label: "Fiyat / performans", weight: 58 },
      { key: "atmosphere", label: "Atmosfer", weight: 45 },
      { key: "speed", label: "Hız", weight: 30 },
    ],
    cuisinePreferences: [
      { key: "Japon mutfağı", label: "Japon mutfağı", level: "çok yüksek" },
      { key: "Fine dining", label: "Fine dining", level: "yüksek" },
      { key: "Esnaf lokantası", label: "Esnaf lokantası", level: "yüksek" },
      { key: "Sokak lezzeti", label: "Sokak lezzeti", level: "yüksek" },
      { key: "Balık", label: "Balık", level: "orta" },
      { key: "Steakhouse", label: "Steakhouse", level: "orta" },
      { key: "Filtre kahve", label: "Filtre kahve", level: "yüksek" },
      { key: "Manzara", label: "Manzara mekânları", level: "düşük" },
    ],
    categoryPreferences: [
      { key: "cat.restaurant", label: "Restoran", level: "çok yüksek" },
      { key: "cat.cafe", label: "Kafe", level: "yüksek" },
      { key: "cat.hotel", label: "Otel", level: "orta" },
    ],
    locationPreferences: ["Kadıköy", "Şişli"],
    priceSensitivity: "orta",
    lowTolerance: ["gürültü", "uzun bekleme", "ilgisiz servis"],
    visibility: "private",
    confidence: "high",
    basedOnExperiences: 57,
    updatedAt: "2026-08-30",
    isDemo: true,
  },

  /* Creator taste kimliği — profilde "bakış açısını anlamak" için. */
  "u.denizyer": {
    userId: "u.denizyer",
    dimensions: [
      { key: "taste", label: "Lezzet", weight: 97 },
      { key: "service", label: "Servis", weight: 88 },
      { key: "atmosphere", label: "Atmosfer", weight: 61 },
      { key: "value", label: "Fiyat / performans", weight: 42 },
      { key: "quiet", label: "Sessizlik", weight: 55 },
      { key: "speed", label: "Hız", weight: 18 },
    ],
    cuisinePreferences: [
      { key: "Japon mutfağı", label: "Japon mutfağı", level: "çok yüksek" },
      { key: "Fine dining", label: "Fine dining", level: "çok yüksek" },
      { key: "Şef masası", label: "Şef masası", level: "yüksek" },
      { key: "Steakhouse", label: "Steakhouse", level: "orta" },
      { key: "Sokak lezzeti", label: "Sokak lezzeti", level: "orta" },
    ],
    categoryPreferences: [{ key: "cat.restaurant", label: "Restoran", level: "çok yüksek" }],
    locationPreferences: ["Nişantaşı", "Şişli", "Beşiktaş"],
    priceSensitivity: "düşük",
    lowTolerance: ["ilgisiz servis", "fiyatı karşılamayan menü"],
    visibility: "public",
    confidence: "high",
    basedOnExperiences: 186,
    updatedAt: "2026-08-28",
    isDemo: true,
  },
  "u.sokakvesofra": {
    userId: "u.sokakvesofra",
    dimensions: [
      { key: "taste", label: "Lezzet", weight: 92 },
      { key: "value", label: "Fiyat / performans", weight: 90 },
      { key: "speed", label: "Hız", weight: 64 },
      { key: "service", label: "Servis", weight: 48 },
      { key: "atmosphere", label: "Atmosfer", weight: 22 },
      { key: "quiet", label: "Sessizlik", weight: 15 },
    ],
    cuisinePreferences: [
      { key: "Sokak lezzeti", label: "Sokak lezzeti", level: "çok yüksek" },
      { key: "Esnaf lokantası", label: "Esnaf lokantası", level: "çok yüksek" },
      { key: "Balık", label: "Balık", level: "yüksek" },
      { key: "Fine dining", label: "Fine dining", level: "düşük" },
    ],
    categoryPreferences: [{ key: "cat.restaurant", label: "Restoran", level: "çok yüksek" }],
    locationPreferences: ["Kadıköy"],
    priceSensitivity: "yüksek",
    lowTolerance: ["turist fiyatı", "gösteriş"],
    visibility: "public",
    confidence: "high",
    basedOnExperiences: 240,
    updatedAt: "2026-08-25",
    isDemo: true,
  },
  "u.filtrekayit": {
    userId: "u.filtrekayit",
    dimensions: [
      { key: "drink", label: "Kahve", weight: 98 },
      { key: "quiet", label: "Sessizlik", weight: 80 },
      { key: "atmosphere", label: "Atmosfer", weight: 66 },
      { key: "service", label: "Servis", weight: 50 },
      { key: "value", label: "Fiyat / performans", weight: 44 },
      { key: "speed", label: "Hız", weight: 35 },
    ],
    cuisinePreferences: [
      { key: "Filtre kahve", label: "Filtre kahve", level: "çok yüksek" },
      { key: "Fırın ve ekmek", label: "Fırın ve ekmek", level: "yüksek" },
    ],
    categoryPreferences: [{ key: "cat.cafe", label: "Kafe", level: "çok yüksek" }],
    locationPreferences: ["Beşiktaş", "Kadıköy"],
    priceSensitivity: "orta",
    lowTolerance: ["yanık kavurma", "gürültülü mekân"],
    visibility: "public",
    confidence: "high",
    basedOnExperiences: 131,
    updatedAt: "2026-08-20",
    isDemo: true,
  },
};

export const getTasteProfile = (userId: string) => tasteProfiles[userId];

/**
 * "SANA BENZEYENLER" — demo kohort anlık görüntüleri.
 * Production'da ortak yüksek/düşük puanlar, kategori tercihleri ve boyut
 * ağırlıkları üzerinden hesaplanır. Burada sabit; iç tutarlılık için
 * sampleSize her zaman mekânın toplam deneyim sayısından küçüktür.
 */
export const similarUsers: Record<string, SimilarUsersPerspective> = {
  "ent.moda-lokantasi":   { entityId: "ent.moda-lokantasi",   score: 8.6, sampleSize: 128, returnRate: 0.87, confidence: "high",   isDemo: true },
  "ent.sakura-omakase":   { entityId: "ent.sakura-omakase",   score: 9.2, sampleSize: 61,  returnRate: 0.91, confidence: "high",   isDemo: true },
  "ent.ates-steak":       { entityId: "ent.ates-steak",       score: 8.0, sampleSize: 74,  returnRate: 0.71, confidence: "high",   isDemo: true },
  "ent.koz-durum":        { entityId: "ent.koz-durum",        score: 8.8, sampleSize: 152, returnRate: 0.89, confidence: "high",   isDemo: true },
  "ent.asma-teras":       { entityId: "ent.asma-teras",       score: 5.9, sampleSize: 83,  returnRate: 0.38, confidence: "high",   isDemo: true },
  "ent.balikci-sokagi":   { entityId: "ent.balikci-sokagi",   score: 8.3, sampleSize: 66,  returnRate: 0.79, confidence: "high",   isDemo: true },
  "ent.kuzey-kahve":      { entityId: "ent.kuzey-kahve",      score: 8.7, sampleSize: 48,  returnRate: 0.85, confidence: "medium", isDemo: true },
  "ent.demlik-roastery":  { entityId: "ent.demlik-roastery",  score: 9.0, sampleSize: 57,  returnRate: 0.88, confidence: "medium", isDemo: true },
  "ent.tas-firin-cihangir": { entityId: "ent.tas-firin-cihangir", score: 8.4, sampleSize: 52, returnRate: 0.83, confidence: "medium", isDemo: true },
  "ent.hotel-payitaht":   { entityId: "ent.hotel-payitaht",   score: 8.1, sampleSize: 19,  returnRate: 0.68, confidence: "low",    isDemo: true },
};

/* ───────────────────────────── BAĞLAM ──────────────────────────────────── */

export const decisionContexts: DecisionContext[] = [
  { key: "default",  label: "Genel" },
  { key: "date",     label: "Date",        overrides: { atmosphere: 85, quiet: 85, speed: 10 } },
  { key: "friends",  label: "Arkadaşlar",  overrides: { atmosphere: 60, quiet: 30, value: 70 } },
  { key: "business", label: "İş",          overrides: { quiet: 90, service: 90, speed: 50 } },
  { key: "family",   label: "Aile",        overrides: { value: 80, speed: 55, quiet: 40 } },
  { key: "solo",     label: "Tek başına",  overrides: { speed: 60, atmosphere: 30 } },
  { key: "quick",    label: "Hızlı yemek", overrides: { speed: 95, value: 85, atmosphere: 15, quiet: 20 } },
];

/**
 * Mekânın bağlama uygunluğu — deneyimlerden çıkarılan demo işaretler
 * ("kalabalık grup", "rezervasyonlu", "ayakta" gibi etiketler ve temalar).
 * Pozitif = bu bağlam için doğal, negatif = zorlama.
 */
export const contextFit: Record<string, Partial<Record<DecisionContextKey, number>>> = {
  "ent.moda-lokantasi":   { date: -6,  friends: 2,  business: -4,  family: 5,   solo: 4,  quick: 6 },
  "ent.sakura-omakase":   { date: 3,   friends: -6, business: 2,   family: -28, solo: 2,  quick: -34 },
  "ent.ates-steak":       { date: 3,   friends: 4,  business: 6,   family: -4,  solo: -6, quick: -18 },
  "ent.koz-durum":        { date: -18, friends: 6,  business: -22, family: -5,  solo: 6,  quick: 10 },
  "ent.asma-teras":       { date: 8,   friends: 4,  business: -8,  family: -10, solo: -8, quick: -20 },
  "ent.balikci-sokagi":   { date: -2,  friends: 8,  business: -2,  family: 2,   solo: -8, quick: -14 },
  "ent.kuzey-kahve":      { date: -8,  friends: 0,  business: 3,   family: 0,   solo: 7,  quick: 8 },
  "ent.demlik-roastery":  { date: -6,  friends: 0,  business: 4,   family: -2,  solo: 7,  quick: 6 },
  "ent.tas-firin-cihangir": { date: -8, friends: 2, business: -4,  family: 6,   solo: 4,  quick: 8 },
  "ent.hotel-payitaht":   { date: 2,   friends: 0,  business: 4,   family: 0,   solo: 0,  quick: 0 },
};

/** Sessizlik/hız için mekân sinyalleri (temalardan ve etiketlerden çıkarım). */
export const ambientSignals: Record<string, { quiet: number; speed: number }> = {
  //                       0–10: 10 = çok sessiz / çok hızlı
  "ent.moda-lokantasi":   { quiet: 6.2, speed: 7.5 },
  "ent.sakura-omakase":   { quiet: 9.1, speed: 3.0 },
  "ent.ates-steak":       { quiet: 5.0, speed: 4.5 },
  "ent.koz-durum":        { quiet: 3.4, speed: 9.2 },
  "ent.asma-teras":       { quiet: 4.8, speed: 4.0 },
  "ent.balikci-sokagi":   { quiet: 3.9, speed: 5.0 },
  "ent.kuzey-kahve":      { quiet: 7.8, speed: 8.0 },
  "ent.demlik-roastery":  { quiet: 7.4, speed: 7.8 },
  "ent.tas-firin-cihangir": { quiet: 5.6, speed: 7.9 },
  "ent.hotel-payitaht":   { quiet: 7.0, speed: 6.0 },
};
