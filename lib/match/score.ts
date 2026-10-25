/* ──────────────────────────────────────────────────────────────────────────
   SAĞLAYICI EŞLEŞTİRME PUANI — bir Gidenler mekânı ile sağlayıcı adayı aynı yer mi?
   · Ad benzerliği (Türkçe normalleştirme, ek ve genel sözcükler atılır, ikili harf Dice katsayısı)
   · Mesafe (75 m altı güçlü, 200 m üstü ret)
   · Telefon ve web sitesi alan adı eşleşmesi destekleyici
   Karar: ≥ 0,90 otomatik · 0,60–0,90 manuel onay · < 0,60 ret.
   ────────────────────────────────────────────────────────────────────────── */

const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
const STOP = new Set(["restoran", "restaurant", "lokanta", "lokantasi", "cafe", "kafe", "bar", "the", "ve", "and", "&", "istanbul", "kadikoy", "beyoglu", "besiktas"]);

export function normName(s: string) {
  return s.toLocaleLowerCase("tr").split("").map((c) => TR[c] ?? c).join("")
    .replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).join(" ");
}

function bigrams(s: string) {
  const t = s.replace(/\s+/g, " "); const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
}

export function nameSimilarity(a: string, b: string) {
  const x = normName(a), y = normName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.92;
  const A = bigrams(x), B = bigrams(y);
  const pool = [...B]; let hit = 0;
  for (const g of A) { const i = pool.indexOf(g); if (i >= 0) { hit++; pool.splice(i, 1); } }
  return (2 * hit) / (A.length + B.length || 1);
}

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "").slice(-10);
const host = (u?: string | null) => { try { return u ? new URL(u).hostname.replace(/^www\./, "") : ""; } catch { return ""; } };

export interface MatchInput { name: string; lat: number; lng: number; phone?: string | null; website?: string | null }

export function matchScore(place: MatchInput, cand: MatchInput) {
  const name = nameSimilarity(place.name, cand.name);
  const d = distanceM(place, cand);
  if (d > 200) return { score: 0, name, distanceM: Math.round(d), decision: "reject" as const };
  const dist = d <= 75 ? 1 : 1 - (d - 75) / 125;
  let score = 0.6 * name + 0.4 * dist;
  if (digits(place.phone) && digits(place.phone) === digits(cand.phone)) score += 0.1;
  if (host(place.website) && host(place.website) === host(cand.website)) score += 0.1;
  score = Math.min(1, score);
  const decision = score >= 0.9 ? "auto" as const : score >= 0.6 ? "review" as const : "reject" as const;
  return { score: Math.round(score * 1000) / 1000, name: Math.round(name * 1000) / 1000, distanceM: Math.round(d), decision };
}
