export type SeckiRestaurant = {
  slug: string;
  name: string;
  district: string;
  eyebrow: string;
  note: string;
  sourceLabel: string;
  sourceUrl: string;
  disclosure?: string;
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
  },
  {
    slug: "menemen-besiktas",
    name: "Menemen",
    district: "Sinanpaşa · Beşiktaş",
    eyebrow: "Kahvaltı · Menemen",
    note: "Şair Veysi Sokağı'nda menemenin başrolde olduğu küçük kahvaltıcı; sade adı ve odaklı menüsüyle seçkinin yerel durağı.",
    sourceLabel: "Resmî Instagram",
    sourceUrl: "https://www.instagram.com/menemenbreakfast/",
  },
  {
    slug: "neolokal-beyoglu",
    name: "Neolokal",
    district: "Salt Galata · Beyoğlu",
    eyebrow: "MICHELIN yıldızlı",
    note: "Maksut Aşkar'ın Anadolu mutfak mirasını çağdaş tekniklerle geleceğe taşıyan, yerel üretici odaklı masası.",
    sourceLabel: "MICHELIN Rehberi",
    sourceUrl: "https://guide.michelin.com/tr/tr/istanbul-province/istanbul/restaurant/neolokal",
  },
  {
    slug: "nicole-beyoglu",
    name: "Nicole",
    district: "Tomtom · Beyoğlu",
    eyebrow: "MICHELIN yıldızlı",
    note: "Türkiye'nin farklı bölgelerinden reçeteleri rafine ve mevsimsel bir fine-dining deneyiminde yeniden yorumluyor.",
    sourceLabel: "MICHELIN Rehberi",
    sourceUrl: "https://guide.michelin.com/tr/tr/istanbul-province/istanbul/restaurant/nicole",
  },
  {
    slug: "mikla-turkey-fusion-beyoglu",
    name: "Mikla",
    district: "Tepebaşı · Beyoğlu",
    eyebrow: "MICHELIN yıldızlı",
    note: "Yeni Anadolu Mutfağı yaklaşımını yerel ürünler, modern teknikler ve 18. kattaki İstanbul manzarasıyla birleştiriyor.",
    sourceLabel: "MICHELIN Rehberi",
    sourceUrl: "https://guide.michelin.com/tr/tr/istanbul-province/istanbul/restaurant/mikla",
  },
  {
    slug: "yeni-lokanta-beyoglu",
    name: "Yeni Lokanta",
    district: "Kumbaracı Yokuşu · Beyoğlu",
    eyebrow: "MICHELIN seçkisi",
    note: "Civan Er'in sebze, yerel ürün ve Türk şarabı eksenindeki yaratıcı mutfağı; canlı, çağdaş ve paylaşmaya açık.",
    sourceLabel: "MICHELIN Rehberi",
    sourceUrl: "https://guide.michelin.com/tr/tr/istanbul-province/istanbul/restaurant/yeni-lokanta",
  },
];
