import type { Group } from "@/lib/types";

/**
 * BİRLİKTE NEREYE? — demo grup.
 * Dört kişi; zevk farkları bilerek işe yarar: sonuç bariz olmasın,
 * sistem gerçekten uzlaşma arıyormuş gibi hissettirsin.
 */
export const demoGroup: Group = {
  id: "abc123",
  title: "Cumartesi akşamı",
  question: "Cumartesi 4 kişi nereye gidelim?",
  context: "friends",
  when: "Cumartesi akşamı",
  district: "Kadıköy",
  createdAt: "2026-09-01",
  isDemo: true,
  members: [
    { id: "m.you", name: "Sen", isYou: true, tasteUserId: "u.atlasdemo", district: "Kadıköy" },
    { id: "m.ece", name: "Ece", tasteUserId: "u.grp-ece", budget: 2, needsVegetarian: true, district: "Kadıköy", note: "Vejetaryen seçenek olsun" },
    { id: "m.mert", name: "Mert", tasteUserId: "u.grp-mert", budget: 4, district: "Kadıköy" },
    { id: "m.selin", name: "Selin", tasteUserId: "u.grp-selin", budget: 3, district: "Kadıköy" },
  ],
};

export const getGroup = (id: string) => (id === demoGroup.id ? demoGroup : undefined);

/** Deneyimlerden çıkarılan demo işaret: vejetaryen seçenek anlatılıyor mu? */
export const vegetarianOption: Record<string, boolean> = {
  "ent.moda-lokantasi": true, "ent.sakura-omakase": false, "ent.ates-steak": false, "ent.koz-durum": false,
  "ent.asma-teras": true, "ent.balikci-sokagi": true, "ent.kuzey-kahve": true, "ent.demlik-roastery": true,
  "ent.tas-firin-cihangir": true, "ent.hotel-payitaht": true,
};
