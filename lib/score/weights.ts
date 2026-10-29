/* ==========================================================================
   GİDENLER PUANI — DENEYİM AĞIRLIĞI (algoritma sürümü: v0-prototip)
   --------------------------------------------------------------------------
   KAMUYA AÇIK İLKE: Puanı yalnız deneyimin kendisi ve yazarının güvenilirliği belirler.
   İşletmenin Gidenler ile ticari ilişkisi — panel aboneliği, reklam/sponsorlu yerleşim,
   rezervasyon ortaklığı, ödeme — puana HİÇBİR YOLDAN girmez. Bu dosya yalnız aşağıdaki
   izin listesindeki alanları okur; işletme kaydını (Entity.business, reservation,
   sponsored_placements, business_accounts) parametre olarak bile almaz.

   Faktörler (her biri çarpan; açıklamaları /nasil-calisir sayfasında yayımlanır):
   1. Tazelik      — ziyaret ne kadar yeniyse o kadar etkili (24 ayda en düşük 0,35'e iner).
   2. Doğrulama    — ziyareti doğrulanmış deneyim daha etkili (×1,35).
   3. Yazar güveni — yazarın itibar sinyali (0,85–1,25).
   4. Bağımsızlık  — YAZARIN işletmeyle kendi beyan ettiği ilişkisi (davet, hediye, sponsorlu iş birliği).
                     Bu, Gidenler'in işletmeyle ticari ilişkisi DEĞİLDİR; yorumun tarafsızlığıyla ilgilidir.
                     İşletme sahibi ya da çalışanı olan yazarın deneyimi puana hiç girmez (Tabelog: sektör hesabı).
   ========================================================================== */

import type { CommercialRelationship } from "@/lib/types";

export const ALGORITHM_VERSION = "v0-prototip";

/** Puan hesabının okuyabildiği alanlar — izin listesi. */
export interface ScoreInput {
  visitedAt: string;
  verified: boolean;
  /** 0–100; yazar bulunamazsa undefined */
  authorReputation?: number;
  /** Yazarın beyanı (deneyim formundaki "çıkar ilişkisi"). */
  authorDisclosure: CommercialRelationship;
}

export const INDEPENDENCE: Record<CommercialRelationship, number> = {
  none: 1,
  unknown: 0.6,
  invited: 0.5,
  gifted: 0.5,
  sponsored: 0.5,
  employee: 0,          // işletme çalışanı: puana girmez
  owner_related: 0,     // işletme sahibi / yakını: puana girmez
};

export function factors(x: ScoreInput, today: Date) {
  const months = (today.getTime() - new Date(x.visitedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return {
    recency: Math.max(0.35, 1 - months / 24),
    verification: x.verified ? 1.35 : 1,
    authorTrust: x.authorReputation === undefined ? 1 : 0.85 + (x.authorReputation / 100) * 0.4,
    independence: INDEPENDENCE[x.authorDisclosure] ?? 0.6,
  };
}

export function experienceWeight(x: ScoreInput, today: Date): number {
  const f = factors(x, today);
  return f.recency * f.verification * f.authorTrust * f.independence;
}

/** Yayımlanan metodoloji (sayfada gösterilir). Teknik eşikler ve kötüye kullanım tespiti açıklanmaz. */
export const PUBLIC_FACTORS = [
  { key: "recency", title: "Tazelik", text: "Yakın tarihli ziyaretler daha etkili; eski deneyimler zamanla etkisini kaybeder ama silinmez." },
  { key: "verification", title: "Doğrulanmış ziyaret", text: "Ziyareti birden fazla sinyalle doğrulanan deneyimler daha etkilidir. Tek başına rezervasyon kodu yeterli sayılmaz." },
  { key: "authorTrust", title: "Yazarın güvenilirliği", text: "Düzenli, tutarlı ve faydalı bulunan deneyimler yazan kişilerin etkisi biraz daha yüksektir. Henüz uygulanmıyor: yazar güveni verisi oluşana kadar her yazarın etkisi eşittir." },
  { key: "independence", title: "Bağımsızlık", text: "Davetli, hediye almış ya da sponsorlu yazarların deneyimi daha az etkilidir; işletme sahibi ve çalışanlarınınki puana hiç girmez." },
  { key: "evidence", title: "Yeterli kanıt", text: "Az deneyimi olan mekânda puan gösterilmez; puan, en az 5 farklı kişinin deneyiminden sonra oluşur. Test hesapları ve işletmeyle bağı olan yazarların deneyimleri puana girmez." },
] as const;

export const NEVER_AFFECTS = [
  "İşletmenin Gidenler'e ödediği abonelik ya da panel ücreti",
  "Reklam ve sponsorlu yerleşimler (her zaman \"Sponsorlu\" etiketiyle, ayrı alanda)",
  "Gidenler üzerinden rezervasyon ortaklığı ve rezervasyon komisyonu",
  "Google, Tripadvisor ya da başka bir platformun puanı",
] as const;
