import raw from "@/data/real/kapanis.json";

/* ──────────────────────────────────────────────────────────────────────────
   KALICI KAPANMA KAYDI (data/real/kapanis.json) — elle doğrulanan kanıtla tutulur, silme yok.
   · closed_confirmed: doğru eşleşmenin Google kaydı kalıcı kapalı ve çelişen kanıt yok →
     aktif önerilerde (ana sayfa, Keşfet), Sor Gidenler sonuçlarında ve popüler listelerde GÖSTERİLMEZ.
     Profil sayfası, yorumlar, bağlantılar ve geçmiş korunur; profilde "kalıcı olarak kapandı" notu çıkar.
   · closed_suspected: sitede değişiklik yok; yalnız elle inceleme listesinde.
   · Yeniden açıldığı doğrulanırsa satır "reopened" yapılır ya da silinir; mekân kendiliğinden listelere döner.
   ────────────────────────────────────────────────────────────────────────── */
export type ClosureState = "closed_confirmed" | "closed_suspected" | "reopened";
export interface Closure { state: ClosureState; checkedAt: string; google: string; match: string; official: string; confidence: string; note: string }
const ALL = Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([k]) => !k.startsWith("_"))) as Record<string, Closure>;
export const CLOSURES: Readonly<Record<string, Closure>> = ALL;
export const CLOSED_CONFIRMED: ReadonlySet<string> = new Set(Object.entries(ALL).filter(([, v]) => v.state === "closed_confirmed").map(([k]) => k));
export const closureOf = (slug: string): Closure | null => ALL[slug] ?? null;
export const isClosed = (slug: string) => CLOSED_CONFIRMED.has(slug);
