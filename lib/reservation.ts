import type { Entity } from "@/lib/types";

/* ==========================================================================
   REZERVASYON (V8) — istemci + sunucu ortak; gizli değer yok.
   Gelir modeli (Tabelog'dan uyarlama): Gidenler üzerinden gelen ve GERÇEKLEŞEN
   rezervasyonda işletme, oturan kişi başına sabit ücret öder.
   · Müşteriden ücret alınmaz. · Gelmeyen (no-show) ve iptal edilen rezervasyon ücretsizdir.
   · Ücret puanı, sıralamayı, görünürlüğü ETKİLEMEZ (bkz. /kurallar).
   ========================================================================== */

export const RESERVATION_FEES = {
  /** 16.00'dan önce başlayan oturum: öğle. */
  lunch: 25,
  dinner: 50,
  currency: "₺",
  lunchUntil: "16:00",
} as const;

export type Meal = "lunch" | "dinner";
export const mealOf = (time: string): Meal => (time < RESERVATION_FEES.lunchUntil ? "lunch" : "dinner");
export const feeFor = (time: string, party: number) => (mealOf(time) === "lunch" ? RESERVATION_FEES.lunch : RESERVATION_FEES.dinner) * party;

const FOOD = new Set(["cat.restaurant", "cat.cafe", "cat.bar"]);

/** Gidenler rezervasyon ortağı mı? Gerçek mekânda yalnızca işletme sözleşmesiyle (mode: "gidenler").
 *  Demo kayıtlarda: sahiplenilmiş yeme-içme işletmeleri ortağı temsil eder. */
export function isPartner(e: Entity): boolean {
  if (e.reservation) return e.reservation.mode === "gidenler";
  return !!e.isDemo && !!e.business?.claimed && FOOD.has(e.categoryId);
}

export const canReserve = (e: Entity) => FOOD.has(e.categoryId);

const DEFAULT_LUNCH = ["12:00", "12:30", "13:00", "13:30", "14:00"];
const DEFAULT_DINNER = ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];

export function slotsOf(e: Entity): { lunch: string[]; dinner: string[] } {
  const r = e.reservation;
  const opensLate = /^(1[7-9]|2\d)[.:]/.test(e.hours ?? "");
  return {
    lunch: r?.lunchSlots ?? (opensLate ? [] : DEFAULT_LUNCH),
    dinner: r?.dinnerSlots ?? DEFAULT_DINNER,
  };
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export type Availability = "open" | "few" | "full" | "closed";
/** Günlük doluluk (Tabelog takvimi: ○ boş · △ az yer · × dolu).
 *  Demo kayıtta deterministik örnek; gerçek ortakta işletme takviminden gelir (şimdilik: talep usulü, hepsi "open"). */
export function availabilityOf(e: Entity, isoDate: string): Availability {
  const d = new Date(isoDate + "T12:00:00");
  if (e.reservation?.closedDays?.includes(d.getDay())) return "closed";
  if (!e.isDemo) return "open";
  const x = hash(e.id + isoDate) % 100;
  const weekend = d.getDay() === 5 || d.getDay() === 6;
  if (x < (weekend ? 22 : 6)) return "full";
  if (x < (weekend ? 55 : 25)) return "few";
  return "open";
}
/** Saat bazında: dolu günde hepsi dolu; "az yer" gününde bazı saatler dolu. */
export function slotOpen(e: Entity, isoDate: string, time: string): boolean {
  const a = availabilityOf(e, isoDate);
  if (a === "full" || a === "closed") return false;
  if (a === "few") return hash(e.id + isoDate + time) % 3 !== 0;
  return true;
}

export const AVAIL_MARK: Record<Availability, { mark: string; label: string }> = {
  open: { mark: "○", label: "Yer var" },
  few: { mark: "△", label: "Az yer" },
  full: { mark: "×", label: "Dolu" },
  closed: { mark: "—", label: "Kapalı" },
};

/** Rezervasyon kodu: GDN-XXXXXX (karıştırılabilir harfler yok). */
export function reservationCode(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const buf = new Uint32Array(6);
  globalThis.crypto.getRandomValues(buf);
  for (const n of buf) s += A[n % A.length];
  return `GDN-${s}`;
}

export interface ReservationRequest {
  entitySlug: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM
  party: number;
  name: string;
  phone: string;
  note?: string;
  consent: true;
}

export interface StoredReservation {
  code: string;
  entitySlug: string;
  entityName: string;
  date: string;
  time: string;
  party: number;
  status: "talep" | "onaylandı" | "önizleme";
  createdAt: string;
}
