import type { CommunityExpectation, ExperienceIndex } from "@/lib/types";

/**
 * DEMO VERİ — Experience Market katmanı.
 * Endeksler ileride birçok varlığın toplu deneyim zekâsından hesaplanacak;
 * burada prototipin davranışını göstermek için sabit tutuluyor.
 */
export const indices: ExperienceIndex[] = [
  {
    id: "idx.ist-gastro", slug: "istanbul-gastronomi", label: "İstanbul Gastronomi",
    scope: "Şehir · yeme-içme", value: 84.2, deltaPct: 1.4, direction: "up",
    memberCount: 1840, updatedAt: "2026-09-01", isDemo: true,
  },
  {
    id: "idx.kadikoy", slug: "kadikoy-yeme-icme", label: "Kadıköy Yeme-İçme",
    scope: "İlçe · yeme-içme", value: 87.1, deltaPct: 2.1, direction: "up",
    memberCount: 412, updatedAt: "2026-09-01", isDemo: true,
  },
  {
    id: "idx.fine", slug: "fine-dining-istanbul", label: "Fine Dining İstanbul",
    scope: "Alan · fine dining", value: 78.4, deltaPct: -0.8, direction: "down",
    memberCount: 96, updatedAt: "2026-09-01", isDemo: true,
  },
  {
    id: "idx.kahve", slug: "kahve-istanbul", label: "Kahve İstanbul",
    scope: "Alan · kahve", value: 86.7, deltaPct: 0.4, direction: "up",
    memberCount: 274, updatedAt: "2026-09-01", isDemo: true,
  },
];

/**
 * 30 gün sonrası için topluluk ve uzman beklentisi.
 * Bu bir bahis değil; puanın YÖNÜ hakkında görüş. Gidenler puanını
 * değiştirmez, para ve oran içermez.
 */
export const expectations: Record<string, CommunityExpectation> = {
  "ent.moda-lokantasi": {
    entityId: "ent.moda-lokantasi", horizonDays: 30, currentScore: 8.7,
    communityExpected: 8.9, expertExpected: 8.8,
    distribution: { up: 68, same: 21, down: 11 },
    participantCount: 412, expertParticipantCount: 9, isDemo: true,
  },
  "ent.asma-teras": {
    entityId: "ent.asma-teras", horizonDays: 30, currentScore: 5.4,
    communityExpected: 5.2, expertExpected: 5.0,
    distribution: { up: 9, same: 24, down: 67 },
    participantCount: 538, expertParticipantCount: 11, isDemo: true,
  },
  "ent.sakura-omakase": {
    entityId: "ent.sakura-omakase", horizonDays: 30, currentScore: 9.4,
    communityExpected: 9.3, expertExpected: 9.4,
    distribution: { up: 22, same: 58, down: 20 },
    participantCount: 147, expertParticipantCount: 6, isDemo: true,
  },
  "ent.koz-durum": {
    entityId: "ent.koz-durum", horizonDays: 30, currentScore: 9.1,
    communityExpected: 9.1, expertExpected: 9.0,
    distribution: { up: 31, same: 52, down: 17 },
    participantCount: 296, expertParticipantCount: 5, isDemo: true,
  },
  "ent.ates-steak": {
    entityId: "ent.ates-steak", horizonDays: 30, currentScore: 7.9,
    communityExpected: 7.7, expertExpected: 7.6,
    distribution: { up: 18, same: 33, down: 49 },
    participantCount: 224, expertParticipantCount: 7, isDemo: true,
  },
  "ent.kuzey-kahve": {
    entityId: "ent.kuzey-kahve", horizonDays: 30, currentScore: 8.9,
    communityExpected: 9.0, expertExpected: 9.1,
    distribution: { up: 54, same: 38, down: 8 },
    participantCount: 118, expertParticipantCount: 4, isDemo: true,
  },
  "ent.demlik-roastery": {
    entityId: "ent.demlik-roastery", horizonDays: 30, currentScore: 9.1,
    communityExpected: 9.2, expertExpected: 9.2,
    distribution: { up: 47, same: 44, down: 9 },
    participantCount: 132, expertParticipantCount: 4, isDemo: true,
  },
  "ent.balikci-sokagi": {
    entityId: "ent.balikci-sokagi", horizonDays: 30, currentScore: 8.6,
    communityExpected: 8.6, expertExpected: 8.7,
    distribution: { up: 29, same: 57, down: 14 },
    participantCount: 164, expertParticipantCount: 3, isDemo: true,
  },
  "ent.tas-firin-cihangir": {
    entityId: "ent.tas-firin-cihangir", horizonDays: 30, currentScore: 8.6,
    communityExpected: 8.7, expertExpected: 8.8,
    distribution: { up: 41, same: 48, down: 11 },
    participantCount: 97, expertParticipantCount: 3, isDemo: true,
  },
  "ent.hotel-payitaht": {
    entityId: "ent.hotel-payitaht", horizonDays: 30, currentScore: 8.4,
    communityExpected: 8.4, expertExpected: null,
    distribution: { up: 27, same: 60, down: 13 },
    participantCount: 61, expertParticipantCount: 0, isDemo: true,
  },
};
