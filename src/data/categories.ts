import type { Category, RatingSchema } from "@/lib/types";

/* Rating şemaları kategoriden bağımsız tanımlanır ve paylaşılabilir. */
export const ratingSchemas: RatingSchema[] = [
  {
    id: "schema.dining",
    returnQuestion: "Tekrar gider misin?",
    returnLabel: "tekrar giderim",
    dimensions: [
      { key: "taste", label: "Lezzet", hint: "Yemeğin kendisi." },
      { key: "service", label: "Servis", hint: "Karşılama, hız, ilgi." },
      { key: "value", label: "Fiyat / performans", hint: "Ödediğinin karşılığı." },
      { key: "atmosphere", label: "Atmosfer", hint: "Mekân, gürültü, oturma." },
      { key: "cleanliness", label: "Temizlik" },
    ],
  },
  {
    id: "schema.cafe",
    returnQuestion: "Tekrar gider misin?",
    returnLabel: "tekrar giderim",
    dimensions: [
      { key: "drink", label: "Kahve / içecek" },
      { key: "food", label: "Yiyecek" },
      { key: "service", label: "Servis" },
      { key: "value", label: "Fiyat / performans" },
      { key: "atmosphere", label: "Atmosfer", hint: "Çalışılır mı, oturulur mu?" },
    ],
  },
  {
    id: "schema.hotel",
    returnQuestion: "Tekrar kalır mısın?",
    returnLabel: "tekrar kalırım",
    dimensions: [
      { key: "room", label: "Oda" },
      { key: "cleanliness", label: "Temizlik" },
      { key: "location", label: "Konum" },
      { key: "service", label: "Servis" },
      { key: "value", label: "Fiyat / performans" },
    ],
  },
  {
    id: "schema.film",
    returnQuestion: "Tekrar izler misin?",
    returnLabel: "tekrar izlerim",
    dimensions: [
      { key: "story", label: "Hikâye" },
      { key: "acting", label: "Oyunculuk" },
      { key: "visuals", label: "Görüntü" },
      { key: "sound", label: "Ses" },
      { key: "pacing", label: "Tempo" },
    ],
  },
  {
    id: "schema.professional",
    returnQuestion: "Tekrar gider misin?",
    returnLabel: "tekrar giderim",
    dimensions: [
      { key: "communication", label: "İletişim" },
      { key: "time", label: "Süre ve program" },
      { key: "transparency", label: "Şeffaflık" },
    ],
  },
];

export const categories: Category[] = [
  {
    id: "cat.restaurant",
    slug: "restoran",
    label: "Restoran",
    noun: "mekân",
    ratingSchemaId: "schema.dining",
    externalProviders: ["google", "tripadvisor", "yandex", "sikayetvar"],
    facets: [
      "Japon mutfağı", "Fine dining", "Steakhouse", "Balık",
      "Sokak lezzeti", "Esnaf lokantası", "Manzara",
    ],
    compliance: {
      mode: "standard",
      showScores: true,
      showAISummary: true,
      allowAdvertising: true,
      allowBusinessPromotion: true,
      freeOwnerResponse: true,
    },
  },
  {
    id: "cat.cafe",
    slug: "kafe",
    label: "Kafe",
    noun: "mekân",
    ratingSchemaId: "schema.cafe",
    externalProviders: ["google", "yandex"],
    facets: ["Filtre kahve", "Fırın ve ekmek", "Kahvaltı"],
    compliance: {
      mode: "standard",
      showScores: true,
      showAISummary: true,
      allowAdvertising: true,
      allowBusinessPromotion: true,
      freeOwnerResponse: true,
    },
  },
  {
    id: "cat.hotel",
    slug: "otel",
    label: "Otel",
    noun: "otel",
    ratingSchemaId: "schema.hotel",
    externalProviders: ["google", "tripadvisor", "booking"],
    compliance: {
      mode: "standard",
      showScores: true,
      showAISummary: true,
      allowAdvertising: true,
      allowBusinessPromotion: true,
      freeOwnerResponse: true,
    },
  },
  {
    id: "cat.film",
    slug: "film",
    label: "Film",
    noun: "film",
    ratingSchemaId: "schema.film",
    externalProviders: ["imdb"],
    compliance: {
      mode: "standard",
      showScores: true,
      showAISummary: true,
      allowAdvertising: true,
      allowBusinessPromotion: false,
      freeOwnerResponse: false,
    },
  },
  {
    id: "cat.physician",
    slug: "hekim",
    label: "Hekim",
    noun: "hekim",
    ratingSchemaId: "schema.professional",
    externalProviders: [],
    compliance: {
      mode: "regulated",
      showScores: false,
      showAISummary: false,
      allowAdvertising: false,
      allowBusinessPromotion: false,
      freeOwnerResponse: true,
      basis:
        "1219 sayılı Tababet ve Şuabatı San'atlarının Tarzı İcrasına Dair Kanun m.24 ve Tıbbi Deontoloji Tüzüğü. Hekimler üçüncü taraf mecralarda reklam veremez ve alamaz; platform da adı geçen hekim hakkında hüküm veren bir puan ya da özet yayımlamaz.",
    },
  },
  {
    id: "cat.lawyer",
    slug: "avukat",
    label: "Avukat",
    noun: "avukat",
    ratingSchemaId: "schema.professional",
    externalProviders: [],
    compliance: {
      mode: "regulated",
      showScores: false,
      showAISummary: false,
      allowAdvertising: false,
      allowBusinessPromotion: false,
      freeOwnerResponse: true,
      basis:
        "Türkiye Barolar Birliği Reklam Yasağı Yönetmeliği. Avukatlar çevrim içi mecralarda reklam veremez ve alamaz, müvekkil referansı paylaşamaz.",
    },
  },
];

export const getCategory = (id: string) => categories.find((c) => c.id === id);
export const getSchema = (id: string) => ratingSchemas.find((s) => s.id === id);
