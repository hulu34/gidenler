import type { AISummary, ThemeSignal } from "@/lib/types";

/**
 * AI ÖZETİ — DEMO.
 * Kural: AI insan yerine deneyim yazmaz. Yalnızca var olan deneyimleri
 * sayar ve özetler; her özet kaç deneyime dayandığını ve hangilerinden
 * çıktığını taşır. Regüle kategorilerde bu blok hiç üretilmez.
 */
export const aiSummaries: Record<string, AISummary> = {
  "ent.moda-lokantasi": {
    entityId: "ent.moda-lokantasi",
    basedOnCount: 184,
    windowDays: 90,
    generatedAt: "2026-09-01",
    lines: [
      "En çok övülen konu lezzet: 184 deneyimin 151'i yemekten olumlu bahsediyor.",
      "En sık eleştirilen konu bekleme süresi; şikayetlerin neredeyse tamamı hafta sonu öğle saatlerine ait.",
      "Fiyat algısı son 90 günde sertleşti — 'değer' puanı 8.4'ten 8.0'a indi.",
      "Menü mevsime göre değişiyor; 22 deneyimde aranan yemeğin o gün olmadığı belirtilmiş.",
    ],
    sourceExperienceIds: ["exp.101", "exp.102", "exp.103", "exp.107"],
  },
  "ent.asma-teras": {
    entityId: "ent.asma-teras",
    basedOnCount: 69,
    windowDays: 90,
    generatedAt: "2026-09-01",
    lines: [
      "Puan on iki ayda 8.6'dan 5.4'e düştü; düşüş kesintisiz ve mutfakla ilgili.",
      "Atmosfer hâlâ en güçlü boyut: manzaradan olumlu bahseden 58 deneyim var.",
      "Fiyat/performans en zayıf boyut ve düşmeye devam ediyor.",
      "Şubat 2026'dan sonra 'eskisi gibi değil' ifadesi 31 ayrı deneyimde geçiyor.",
    ],
    sourceExperienceIds: ["exp.201", "exp.202", "exp.203"],
  },
  "ent.sakura-omakase": {
    entityId: "ent.sakura-omakase",
    basedOnCount: 41, windowDays: 90, generatedAt: "2026-09-01",
    lines: [
      "41 deneyimin 38'i teknik kaliteyi olumlu değerlendirmiş; şikayet mutfağa değil.",
      "En sık eleştirilen konu fiyat: 22 deneyimde 'yılda bir kez' benzeri ifade geçiyor.",
      "Japon mutfağı uzmanlığı yüksek dört kullanıcı da 9 ve üzeri vermiş.",
      "Atmosfer konusunda görüşler ayrışıyor: 'fazla sessiz' ifadesi 9 deneyimde var.",
    ],
    sourceExperienceIds: ["exp.109", "exp.110", "exp.111"],
  },
  "ent.ates-steak": {
    entityId: "ent.ates-steak",
    basedOnCount: 76, windowDays: 90, generatedAt: "2026-09-01",
    lines: [
      "Etin kendisi 76 deneyimin 64'ünde olumlu; sorun mutfakta değil salonda.",
      "Bekleme süresi ve bilgilendirme eksikliği son 90 günde en hızlı büyüyen şikayet.",
      "Öğle menüsünün akşamla aynı mutfak olduğu 11 ayrı deneyimde belirtilmiş.",
      "Gürültü seviyesi tekrar eden bir konu; 18 deneyimde geçiyor.",
    ],
    sourceExperienceIds: ["exp.113", "exp.114", "exp.115"],
  },
  "ent.koz-durum": {
    entityId: "ent.koz-durum",
    basedOnCount: 113, windowDays: 90, generatedAt: "2026-09-01",
    lines: [
      "113 deneyimin 104'ü olumlu; Gidenler'de en yüksek görüş birliğine sahip mekânlardan.",
      "Gece 00.00 sonrası gidenlerin oranı %41 — bu saatte alternatifi az.",
      "Fiyat bu yıl üç kez arttı; 29 deneyimde belirtilmiş ama tekrar gitme oranını düşürmemiş.",
      "Oturma alanı olmaması bir şikayet değil, beklenti olarak kabul edilmiş görünüyor.",
    ],
    sourceExperienceIds: ["exp.116", "exp.117", "exp.118"],
  },
  "ent.demlik-roastery": {
    entityId: "ent.demlik-roastery",
    basedOnCount: 58, windowDays: 90, generatedAt: "2026-09-01",
    lines: [
      "Filtre kahve tarafı 58 deneyimin 52'sinde övülmüş; espresso bazlı içecekler ayrışıyor.",
      "Kavurma tarihinin pakete yazılması 14 deneyimde ayrıca not edilmiş.",
      "Fiyat semt ortalamasının üzerinde; 19 deneyimde geçiyor.",
    ],
    sourceExperienceIds: ["exp.126", "exp.127"],
  },
  "ent.balikci-sokagi": {
    entityId: "ent.balikci-sokagi",
    basedOnCount: 47,
    windowDays: 90,
    generatedAt: "2026-09-01",
    lines: [
      "Kalabalık grup deneyimi en çok övülen konu: 47 deneyimin 29'u grup halinde gitmiş.",
      "Fiyat yüksek bulunuyor ama şeffaf bulunuyor — 'kalem kalem hesap' 12 deneyimde geçiyor.",
      "Son 90 günde belirgin bir değişim yok.",
    ],
    sourceExperienceIds: ["exp.301", "exp.302"],
  },
};

/** Övülen konular — deneyim metinlerinden çıkarılan tema sinyalleri. */
export const praisedThemes: Record<string, ThemeSignal[]> = {
  "ent.moda-lokantasi": [
    { key: "taste", label: "Yemeğin kendisi", count: 151, negativeCount: 8, direction: "flat" },
    { key: "portion", label: "Porsiyon", count: 74, negativeCount: 6, direction: "up" },
    { key: "seasonal", label: "Mevsim menüsü", count: 52, negativeCount: 11, direction: "flat" },
    { key: "cleanliness", label: "Temizlik", count: 38, negativeCount: 2, direction: "up" },
  ],
  "ent.asma-teras": [
    { key: "view", label: "Manzara", count: 58, negativeCount: 1, direction: "flat" },
    { key: "cocktail", label: "Kokteyller", count: 24, negativeCount: 3, direction: "down" },
  ],
  "ent.balikci-sokagi": [
    { key: "group", label: "Kalabalık grup", count: 29, negativeCount: 1, direction: "up" },
    { key: "transparency", label: "Hesap şeffaflığı", count: 12, negativeCount: 0, direction: "flat" },
  ],
  "ent.sakura-omakase": [
    { key: "technique", label: "Teknik ustalık", count: 38, negativeCount: 1, direction: "flat" },
    { key: "sourcing", label: "Ürün şeffaflığı", count: 21, negativeCount: 2, direction: "up" },
    { key: "pace", label: "Servis temposu", count: 17, negativeCount: 3, direction: "flat" },
  ],
  "ent.ates-steak": [
    { key: "meat", label: "Etin kendisi", count: 64, negativeCount: 5, direction: "flat" },
    { key: "lunch", label: "Öğle menüsü", count: 11, negativeCount: 0, direction: "up" },
  ],
  "ent.koz-durum": [
    { key: "consistency", label: "Tutarlılık", count: 97, negativeCount: 3, direction: "flat" },
    { key: "late", label: "Gece saatleri", count: 46, negativeCount: 2, direction: "up" },
    { key: "value", label: "Fiyat / performans", count: 71, negativeCount: 9, direction: "down" },
  ],
  "ent.demlik-roastery": [
    { key: "filter", label: "Filtre kahve", count: 52, negativeCount: 2, direction: "flat" },
    { key: "roastdate", label: "Kavurma tarihi", count: 14, negativeCount: 0, direction: "up" },
  ],
};

/** Şikayet zekâsı — sayı değil, konu + yön. */
export const praisedThemesExtra = {} as const;

export const complaintThemes: Record<string, ThemeSignal[]> = {
  "ent.moda-lokantasi": [
    { key: "wait", label: "Bekleme süresi", count: 61, negativeCount: 61, direction: "up" },
    { key: "price", label: "Fiyat artışı", count: 37, negativeCount: 37, direction: "up" },
    { key: "noise", label: "Gürültü ve masa aralığı", count: 29, negativeCount: 29, direction: "flat" },
    { key: "reservation", label: "Rezervasyon karışıklığı", count: 22, negativeCount: 22, direction: "down" },
  ],
  "ent.asma-teras": [
    { key: "value", label: "Fiyat / performans", count: 54, negativeCount: 54, direction: "up" },
    { key: "kitchen", label: "Mutfak kalitesi", count: 47, negativeCount: 47, direction: "up" },
    { key: "wait", label: "Rezervasyonlu bekleme", count: 31, negativeCount: 31, direction: "flat" },
  ],
  "ent.balikci-sokagi": [
    { key: "price", label: "Fiyat seviyesi", count: 18, negativeCount: 18, direction: "flat" },
    { key: "noise", label: "Gürültü", count: 7, negativeCount: 7, direction: "down" },
  ],
  "ent.kuzey-kahve": [
    { key: "seating", label: "Yer bulma", count: 14, negativeCount: 14, direction: "up" },
  ],
  "ent.tas-firin-cihangir": [
    { key: "weekend", label: "Hafta sonu kuyruğu", count: 21, negativeCount: 21, direction: "up" },
    { key: "price", label: "Hafta sonu fiyatı", count: 16, negativeCount: 16, direction: "up" },
  ],
  "ent.hotel-payitaht": [
    { key: "noise", label: "Ön cephe gürültüsü", count: 11, negativeCount: 11, direction: "flat" },
    { key: "breakfast", label: "Kahvaltı ücreti", count: 9, negativeCount: 9, direction: "flat" },
  ],
  "ent.sakura-omakase": [
    { key: "price", label: "Fiyat seviyesi", count: 22, negativeCount: 22, direction: "flat" },
    { key: "mood", label: "Fazla sessiz atmosfer", count: 9, negativeCount: 9, direction: "up" },
  ],
  "ent.ates-steak": [
    { key: "wait", label: "Bekleme ve bilgilendirme", count: 41, negativeCount: 41, direction: "up" },
    { key: "noise", label: "Gürültü seviyesi", count: 18, negativeCount: 18, direction: "flat" },
    { key: "value", label: "Akşam fiyatları", count: 27, negativeCount: 27, direction: "up" },
  ],
  "ent.koz-durum": [
    { key: "price", label: "Fiyat artışı", count: 29, negativeCount: 29, direction: "up" },
    { key: "queue", label: "Kuyruk", count: 17, negativeCount: 17, direction: "flat" },
  ],
  "ent.demlik-roastery": [
    { key: "price", label: "Fiyat seviyesi", count: 19, negativeCount: 19, direction: "flat" },
    { key: "espresso", label: "Espresso bazlı içecekler", count: 12, negativeCount: 12, direction: "flat" },
  ],
  /* Regüle kategori: özet ve puan yok, yalnızca konu sayımı. */
  "ent.dr-demo": [
    { key: "wait", label: "Randevu ve bekleme süresi", count: 63, negativeCount: 41, direction: "down" },
    { key: "consult", label: "Muayene süresi ve ilgi", count: 48, negativeCount: 5, direction: "flat" },
    { key: "front-desk", label: "Sekretarya iletişimi", count: 31, negativeCount: 24, direction: "down" },
    { key: "transparency", label: "Ücret şeffaflığı", count: 22, negativeCount: 2, direction: "flat" },
  ],
};
