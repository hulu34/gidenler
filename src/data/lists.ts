import type { CuratedList } from "@/lib/types";

/**
 * Creator listeleri — büyüme döngüsünün kalbi:
 * creator → liste → mekân → yeni ziyaretçi → hesap → deneyim.
 * Liste bir algoritma çıktısı değil, birinin görüşüdür; o yüzden not taşır.
 */
export const lists: CuratedList[] = [
  {
    id: "list.1", slug: "istanbulda-japon-mutfagi-2026",
    title: "İstanbul'da Japon mutfağı · 2026",
    subtitle: "Bu yıl gittiğim otuz beş yerden geriye kalan altısı",
    authorId: "u.denizyer",
    entityIds: ["ent.sakura-omakase", "ent.ates-steak", "ent.balikci-sokagi"],
    note: "Sıralama benim tercihime göre, puana göre değil. Fiyat/performans arıyorsan bu liste sana göre değil.",
    updatedAt: "2026-08-28", isDemo: true,
  },
  {
    id: "list.2", slug: "tekrar-gidecegim-mekanlar",
    title: "2026'da tekrar gideceğim 8 mekân",
    subtitle: "Bir kez gitmek yetmedi",
    authorId: "u.denizyer",
    entityIds: ["ent.sakura-omakase", "ent.moda-lokantasi", "ent.demlik-roastery"],
    note: "Tekrar gitme niyeti bende puandan daha güçlü bir sinyal. Bu listedeki her yere en az iki kez gittim.",
    updatedAt: "2026-08-15", isDemo: true,
  },
  {
    id: "list.3", slug: "kadikoy-gece-yemekleri",
    title: "Kadıköy'de gece 00.00'dan sonra",
    subtitle: "Açık olan çok, gidilecek olan az",
    authorId: "u.sokakvesofra",
    entityIds: ["ent.koz-durum", "ent.moda-lokantasi"],
    note: "Gece açık olmak bir meziyet değil. Bu listedekiler gece de aynı işi yapıyor.",
    updatedAt: "2026-08-25", isDemo: true,
  },
  {
    id: "list.4", slug: "kadikoy-fiyat-performans",
    title: "Kadıköy fiyat/performans mekânları",
    subtitle: "Cüzdanı yakmadan doyuran yerler",
    authorId: "u.sokakvesofra",
    entityIds: ["ent.koz-durum", "ent.moda-lokantasi", "ent.kuzey-kahve"],
    note: "Ucuz demiyorum, hak ediyor diyorum. İkisi aynı şey değil.",
    updatedAt: "2026-07-30", isDemo: true,
  },
  {
    id: "list.5", slug: "istanbulda-filtre-kahve",
    title: "İstanbul'da gerçekten iyi filtre kahve",
    subtitle: "Üç kez gitmeden listeye almadım",
    authorId: "u.filtrekayit",
    entityIds: ["ent.demlik-roastery", "ent.kuzey-kahve", "ent.tas-firin-cihangir"],
    note: "Bir fincan hiçbir şey anlatmaz. Buradaki her mekâna en az üç ayrı sabah gittim.",
    updatedAt: "2026-08-27", isDemo: true,
  },
  {
    id: "list.6", slug: "kadikoy-favorilerim",
    title: "Kadıköy favorilerim",
    subtitle: "Burada büyüdüm, hâlâ buradayım",
    authorId: "u.nazli-ada",
    entityIds: ["ent.moda-lokantasi", "ent.koz-durum", "ent.kuzey-kahve"],
    note: "Instagram'da 512 takipçim var ama Kadıköy'de 94 mekâna gittim. Bu liste ikincisinden çıktı.",
    updatedAt: "2026-08-20", isDemo: true,
  },
];

export const getList = (slug: string) => lists.find((l) => l.slug === slug);
export const listsByAuthor = (authorId: string) => lists.filter((l) => l.authorId === authorId);
