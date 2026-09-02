const AYLAR = [
  "ocak", "şubat", "mart", "nisan", "mayıs", "haziran",
  "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık",
];

export const nf = (n: number) => n.toLocaleString("tr-TR");

/** 8.7 → "8,7" — Türkçe ondalık ayracı. */
export const score1 = (n: number) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "2026-08" → "ağustos 2026" */
export function periodLabel(period: string) {
  const [y, m] = period.split("-");
  return `${AYLAR[Number(m) - 1]} ${y}`;
}

/** "2026-08" → "ağu" */
export function periodShort(period: string) {
  const [, m] = period.split("-");
  return AYLAR[Number(m) - 1].slice(0, 3);
}

/** "2026-08-14" → "ağustos 2026" */
export function monthOf(iso: string) {
  return periodLabel(iso.slice(0, 7));
}

/** Bugüne göre kabaca "3 hafta önce". Demo sabit tarih: 2026-09-02. */
const TODAY = new Date("2026-09-02T00:00:00Z");
export function relative(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  const days = Math.max(0, Math.round((+TODAY - +d) / 86400000));
  if (days === 0) return "bugün";
  if (days === 1) return "dün";
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.round(days / 7)} hafta önce`;
  if (days < 365) return `${Math.round(days / 30)} ay önce`;
  return `${Math.floor(days / 365)} yıl önce`;
}

export const pct = (n: number) => `%${Math.round(n)}`;

export const priceLabel = (n?: 1 | 2 | 3 | 4) =>
  n ? "₺".repeat(n) : undefined;
