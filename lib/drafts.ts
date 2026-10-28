/* ==========================================================================
   DENEYİM TASLAĞI — yayınlama açılana kadar yalnız bu tarayıcıda.
   --------------------------------------------------------------------------
   Taslak kimseye gösterilmez, sunucuya gitmez, "yayınlandı" ya da "doğrulandı" sayılmaz.
   Yayınlama (hesapla, sunucuda) açıldığında form taslağı buradan yükler.
   ========================================================================== */

import type { CommercialRelationship, ReturnIntent } from "@/lib/types";

export interface ExperienceDraft {
  body: string;
  month: string;                       // YYYY-MM (ziyaret ayı)
  ratings: Record<string, number>;
  returnIntent: ReturnIntent | null;
  relationship: CommercialRelationship;
  savedAt: string;                     // ISO
}

const KEY = "gidenler.taslak.v1";
const AYLAR = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];

/** Ziyaret ayı seçenekleri: bu aydan geriye `count` ay (en yeni önce). Gelecek ay seçilemez. */
export function visitMonths(now = new Date(), count = 24): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push([`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, `${AYLAR[d.getMonth()]} ${d.getFullYear()}`]);
  }
  return out;
}

function readAll(): Record<string, ExperienceDraft> {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}

export function loadDraft(slug: string): ExperienceDraft | null {
  const d = readAll()[slug];
  return d && typeof d.body === "string" ? d : null;
}

/** Kaydedilebildiyse true (gizli pencere / kapalı depolama → false; form yine çalışır). */
export function saveDraft(slug: string, d: Omit<ExperienceDraft, "savedAt">): boolean {
  try {
    const all = readAll();
    all[slug] = { ...d, body: d.body.slice(0, 5000), savedAt: new Date().toISOString() };
    window.localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch { return false; }
}

export function deleteDraft(slug: string) {
  try {
    const all = readAll();
    delete all[slug];
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* depolama kapalı */ }
}
