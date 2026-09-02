import type { Entity } from "@/lib/types";

/**
 * DEMO VERİ. Buradaki işletmelerin hiçbiri gerçek değildir; isimler,
 * adresler ve deneyimler ürünü göstermek için üretilmiştir.
 */
const ist = (district: string, lat?: number, lng?: number) => ({
  city: "İstanbul", district, geo: lat && lng ? { lat, lng } : undefined,
});

export const entities: Entity[] = [
  {
    id: "ent.moda-lokantasi", slug: "moda-lokantasi", name: "Moda Lokantası",
    categoryId: "cat.restaurant", isDemo: true, experienceTotal: 214,
    location: ist("Kadıköy", 40.9819, 29.0257),
    address: "Caferağa Mah., Moda Cad. (demo adres)", hours: "11.00 – 23.00", priceLevel: 2,
    facets: ["Esnaf lokantası"], tags: ["ev yemeği", "öğle menüsü"],
    business: { claimed: true, claimedAt: "2025-11-04", subscription: "panel" },
    openedAt: "2016-04-01",
  },
  {
    id: "ent.sakura-omakase", slug: "sakura-omakase", name: "Sakura Omakase",
    categoryId: "cat.restaurant", isDemo: true, experienceTotal: 96,
    location: ist("Şişli"), address: "Teşvikiye Mah. (demo adres)",
    hours: "19.00 – 23.00 · iki oturum", priceLevel: 4,
    facets: ["Japon mutfağı", "Fine dining"], tags: ["omakase", "rezervasyonlu", "sayaç"],
    business: { claimed: true, subscription: "none" }, openedAt: "2023-10-12",
  },
  {
    id: "ent.ates-steak", slug: "ates-steak", name: "Ateş Steakhouse",
    categoryId: "cat.restaurant", isDemo: true, experienceTotal: 173,
    location: ist("Beşiktaş"), address: "Vişnezade Mah. (demo adres)",
    hours: "18.00 – 00.00", priceLevel: 4,
    facets: ["Steakhouse", "Fine dining"], tags: ["et", "dry age"],
    business: { claimed: false }, openedAt: "2021-05-20",
  },
  {
    id: "ent.koz-durum", slug: "koz-durum", name: "Köz Dürüm",
    categoryId: "cat.restaurant", isDemo: true, experienceTotal: 341,
    location: ist("Kadıköy"), address: "Rasimpaşa Mah. (demo adres)",
    hours: "11.00 – 03.00", priceLevel: 1,
    facets: ["Sokak lezzeti"], tags: ["dürüm", "gece", "ayakta"],
    business: { claimed: false }, openedAt: "2009-08-01",
  },
  {
    id: "ent.asma-teras", slug: "asma-teras", name: "Asma Teras",
    categoryId: "cat.restaurant", isDemo: true, experienceTotal: 184,
    location: ist("Beşiktaş"), address: "Sinanpaşa Mah. (demo adres)",
    hours: "17.00 – 01.00", priceLevel: 3,
    facets: ["Manzara"], tags: ["kokteyl", "akşam yemeği"],
    business: { claimed: false }, openedAt: "2022-09-15",
  },
  {
    id: "ent.balikci-sokagi", slug: "balikci-sokagi", name: "Balıkçı Sokağı",
    categoryId: "cat.restaurant", isDemo: true, experienceTotal: 142,
    location: ist("Beyoğlu"), address: "Kemankeş Mah. (demo adres)",
    hours: "12.00 – 24.00", priceLevel: 3,
    facets: ["Balık"], tags: ["meyhane", "grup"],
    business: { claimed: true, subscription: "panel" }, openedAt: "2011-06-01",
  },
  {
    id: "ent.kuzey-kahve", slug: "kuzey-kahve", name: "Kuzey Kahve",
    categoryId: "cat.cafe", isDemo: true, experienceTotal: 97,
    location: ist("Kadıköy"), address: "Moda Cad. (demo adres)",
    hours: "08.00 – 20.00", priceLevel: 2,
    facets: ["Filtre kahve"], tags: ["çalışılır", "sabah"],
    business: { claimed: false }, openedAt: "2019-02-20",
  },
  {
    id: "ent.demlik-roastery", slug: "demlik-roastery", name: "Demlik Roastery",
    categoryId: "cat.cafe", isDemo: true, experienceTotal: 128,
    location: ist("Beşiktaş"), address: "Akaretler (demo adres)",
    hours: "07.30 – 19.00", priceLevel: 3,
    facets: ["Filtre kahve"], tags: ["kendi kavurması", "tadım"],
    business: { claimed: false }, openedAt: "2020-07-01",
  },
  {
    id: "ent.tas-firin-cihangir", slug: "tas-firin-cihangir", name: "Taş Fırın Cihangir",
    categoryId: "cat.cafe", isDemo: true, experienceTotal: 118,
    location: ist("Beyoğlu"), address: "Cihangir Cad. (demo adres)",
    hours: "07.30 – 21.00", priceLevel: 2,
    facets: ["Fırın ve ekmek", "Kahvaltı"], tags: ["hafta sonu"],
    business: { claimed: false }, openedAt: "2014-11-05",
  },
  {
    id: "ent.hotel-payitaht", slug: "hotel-payitaht", name: "Hotel Payitaht",
    categoryId: "cat.hotel", isDemo: true, experienceTotal: 64,
    location: ist("Beyoğlu"), address: "Meşrutiyet Cad. (demo adres)",
    hours: "24 saat resepsiyon", priceLevel: 3,
    tags: ["butik", "merkezi"], business: { claimed: true, subscription: "panel" },
    openedAt: "2018-03-10",
  },
  {
    id: "ent.dr-demo", slug: "dr-a-y-dermatoloji", name: "Dr. A.Y. (dermatoloji · Şişli)",
    categoryId: "cat.physician", isDemo: true, experienceTotal: 142,
    location: ist("Şişli"), address: "Muayenehane (demo kayıt)",
    hours: "Randevulu · 09.00 – 17.00",
    business: { claimed: true, subscription: "none" },
  },
];

export const getEntity = (slug: string) => entities.find((e) => e.slug === slug);
export const getEntityById = (id: string) => entities.find((e) => e.id === id);
