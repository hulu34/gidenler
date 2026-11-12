export type SeckiRestaurant = {
  slug: string;
  name: string;
  district: string;
  eyebrow: string;
  note: string;
  sourceLabel: string;
  sourceUrl: string;
  disclosure?: string;
  en: { eyebrow: string; note: string; sourceLabel: string; disclosure?: string };
};

/**
 * Toplantı seçkisi: yalnız doğrulanmış Gidenler profili bulunan gerçek işletmeler.
 * MICHELIN durumları 11 Kasım 2026'da güncel rehberden kontrol edildi.
 */
export const SECKI_RESTAURANTS: SeckiRestaurant[] = [
  {
    slug: "japon-erdal-beyoglu",
    name: "Japon Erdal",
    district: "Galata · Beyoğlu",
    eyebrow: "Yeni nesil pide",
    note: "Yaklaşık 36 saat dinlenen hamur, dört pidelik kısa menü ve Galata'da kulaktan kulağa büyüyen bir adres.",
    sourceLabel: "Resmî site",
    sourceUrl: "https://japonerdal.com/",
    disclosure: "Gidenler kurucusuyla sahiplik ilişkisi vardır.",
    en: {
      eyebrow: "Contemporary pide",
      note: "Four pide options, dough rested for about 36 hours, and a Galata address that has grown by word of mouth.",
      sourceLabel: "Official website",
      disclosure: "Gidenler's founder has an ownership interest in this restaurant.",
    },
  },
  {
    slug: "menemen-besiktas",
    name: "Menemen",
    district: "Sinanpaşa · Beşiktaş",
    eyebrow: "Kahvaltı · Menemen",
    note: "Şair Veysi Sokağı'nda menemenin başrolde olduğu küçük kahvaltıcı; sade adı ve odaklı menüsüyle seçkinin yerel durağı.",
    sourceLabel: "Resmî Instagram",
    sourceUrl: "https://www.instagram.com/menemenbreakfast/",
    en: {
      eyebrow: "Breakfast · Menemen",
      note: "A small breakfast spot on Şair Veysi Sokağı, where menemen takes centre stage. A simple name and a focused menu make this the local stop in our selection.",
      sourceLabel: "Official Instagram",
    },
  },
  {
    slug: "neolokal-beyoglu",
    name: "Neolokal",
    district: "Salt Galata · Beyoğlu",
    eyebrow: "MICHELIN yıldızlı",
    note: "Maksut Aşkar'ın Anadolu mutfak mirasını çağdaş tekniklerle geleceğe taşıyan, yerel üretici odaklı masası.",
    sourceLabel: "MICHELIN Rehberi",
    sourceUrl: "https://guide.michelin.com/tr/tr/istanbul-province/istanbul/restaurant/neolokal",
    en: {
      eyebrow: "MICHELIN-starred",
      note: "Maksut Aşkar connects Anatolian food traditions with contemporary techniques and local producers.",
      sourceLabel: "MICHELIN Guide",
    },
  },
  {
    slug: "nicole-beyoglu",
    name: "Nicole",
    district: "Tomtom · Beyoğlu",
    eyebrow: "MICHELIN yıldızlı",
    note: "Türkiye'nin farklı bölgelerinden reçeteleri rafine ve mevsimsel bir fine-dining deneyiminde yeniden yorumluyor.",
    sourceLabel: "MICHELIN Rehberi",
    sourceUrl: "https://guide.michelin.com/tr/tr/istanbul-province/istanbul/restaurant/nicole",
    en: {
      eyebrow: "MICHELIN-starred",
      note: "Traditional recipes from across Türkiye, reinterpreted through refined, seasonal fine dining.",
      sourceLabel: "MICHELIN Guide",
    },
  },
  {
    slug: "mikla-turkey-fusion-beyoglu",
    name: "Mikla",
    district: "Tepebaşı · Beyoğlu",
    eyebrow: "MICHELIN yıldızlı",
    note: "Yeni Anadolu Mutfağı yaklaşımını yerel ürünler, modern teknikler ve 18. kattaki İstanbul manzarasıyla birleştiriyor.",
    sourceLabel: "MICHELIN Rehberi",
    sourceUrl: "https://guide.michelin.com/tr/tr/istanbul-province/istanbul/restaurant/mikla",
    en: {
      eyebrow: "MICHELIN-starred",
      note: "A New Anatolian approach built on local ingredients and modern techniques, with Istanbul views from the 18th floor.",
      sourceLabel: "MICHELIN Guide",
    },
  },
  {
    slug: "yeni-lokanta-beyoglu",
    name: "Yeni Lokanta",
    district: "Kumbaracı Yokuşu · Beyoğlu",
    eyebrow: "MICHELIN seçkisi",
    note: "Civan Er'in sebze, yerel ürün ve Türk şarabı eksenindeki yaratıcı mutfağı; canlı, çağdaş ve paylaşmaya açık.",
    sourceLabel: "MICHELIN Rehberi",
    sourceUrl: "https://guide.michelin.com/tr/tr/istanbul-province/istanbul/restaurant/yeni-lokanta",
    en: {
      eyebrow: "MICHELIN selection",
      note: "Civan Er's creative cooking centres on vegetables, local produce and Turkish wine, in a lively setting made for sharing.",
      sourceLabel: "MICHELIN Guide",
    },
  },
];
