/* İstemci + sunucu ortak: mekân adı anahtarı (mükerrer denetimi ve öneri taslağının sonradan mekâna bağlanması). */
export const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const STOP = /\b(restoran|restaurant|lokantasi|lokanta|cafe|kafe|meyhanesi|meyhane|kebap|kebapcisi|ocakbasi|balik|evi|sofrasi|mutfagi|bistro|the|ve)\b/g;
export const nameKey = (s: string) => fold(s).replace(STOP, " ").replace(/\s+/g, " ").trim() || fold(s);

/** Öneri taslağı — YALNIZ bu tarayıcıda. Mekân doğrulanıp eklendiğinde aynı ad + ilçeyle deneyim formu açılırsa önerilir. */
export interface SuggestionDraft { nameKey: string; name: string; district: string; body: string; savedAt: string }
const DKEY = "gidenler.oneriTaslak";
export function loadSuggestionDrafts(): SuggestionDraft[] {
  try { const v = JSON.parse(localStorage.getItem(DKEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function saveSuggestionDraft(d: SuggestionDraft): boolean {
  try {
    const all = loadSuggestionDrafts().filter((x) => !(x.nameKey === d.nameKey && x.district === d.district));
    localStorage.setItem(DKEY, JSON.stringify([d, ...all].slice(0, 10)));
    return true;
  } catch { return false; }
}
export function takeSuggestionDraft(name: string, district?: string): SuggestionDraft | null {
  const k = nameKey(name);
  return loadSuggestionDrafts().find((x) => x.nameKey === k && (!district || x.district === district || x.district === "Bilmiyorum")) ?? null;
}
export function dropSuggestionDraft(d: SuggestionDraft) {
  try { localStorage.setItem(DKEY, JSON.stringify(loadSuggestionDrafts().filter((x) => !(x.nameKey === d.nameKey && x.district === d.district)))); } catch { /* yok */ }
}
