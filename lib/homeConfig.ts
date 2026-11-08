/* ANA SAYFA MERKEZİ AYARLARI (V8) — liste boyu ve düzen tek yerden.
   Bütün gerçek ana sayfa listeleri (En İyiler, Popülerler, Hype, Konuşulanlar, Yükselenler/Düşenler, Sana göre)
   bu değerleri okur. Yatırımcı demosunun sıralamaları (lib/rankings RANK_CONFIG) ayrıdır ve değişmez. */
export const HOME_LIST = {
  /** Her listede en çok kaç mekân (Top 10). */
  size: 10,
  /** Mobilde ilk açılışta görünen satır; "Tümünü gör" ile 10'a açılır. */
  mobileCollapsed: 5,
  /** Bir kategori sekmesi en az bu kadar doğrulanmış Google puanlı mekân varsa açılır (tek-iki kayıtlık "liste" yapılmaz). */
  minCategory: 3,
} as const;

/** Google puanı yükseliş/düşüş: karşılaştırma için en az bu kadar gün arayla iki doğrulanmış okuma ve en az bu kadar fark. */
export const GOOGLE_CHANGE = { minSpanDays: 7, minDelta: 0.1, lookbackDays: 90 } as const;

/** En Hype: son 7 günde gerçek NİYET sinyalleri (kaydet / gitmek istiyorum, yönlendirme, deneyim). */
export const HYPE_RULES = { minPoints: 6, minKinds: 2, minItems: 3 } as const;
