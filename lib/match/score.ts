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
/* Web sitesi: kayıtlı alan adı karşılaştırılır (siparis.marka.com = marka.com); marka.com ile marka.com.tr da
   aynı marka sayılır. Zincirlerde bütün şubeler aynı siteyi paylaştığı için web eşleşmesi şubeyi KANITLAMAZ. */
const SLD = new Set(["com", "net", "org", "gen", "biz", "web", "info", "av", "bel", "name", "tv", "co", "edu", "gov"]);
export function siteKey(u?: string | null) {
  let h = "";
  try { h = u ? new URL(/^https?:/i.test(u) ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, "") : ""; } catch { return ""; }
  const l = h.split(".").filter(Boolean);
  if (l.length < 2) return h;
  const two = l.length >= 3 && l.at(-1)!.length === 2 && SLD.has(l.at(-2)!);
  return l.slice(two ? -3 : -2).join(".");
}
const brandLabel = (k: string) => k.split(".")[0];

export interface MatchInput { name: string; lat: number; lng: number; phone?: string | null; website?: string | null; address?: string | null }

/* Adres benzerliği: sokak/cadde adı ve kapı numarası belirteçlerinin örtüşmesi (0–1). İlçe/şehir sayılmaz. */
const ADDR_STOP = new Set(["no", "sk", "sok", "sokak", "sokagi", "cd", "cad", "cadde", "caddesi", "mah", "mahallesi", "mh", "istanbul", "turkiye", "turkey", "kat", "d"]);
export function addressSimilarity(a?: string | null, b?: string | null) {
  const toks = (s: string) => new Set(normName(s).split(" ").filter((w) => w.length > 1 && !ADDR_STOP.has(w)));
  if (!a || !b) return null;
  const A = toks(a), B = toks(b);
  if (!A.size || !B.size) return null;
  let hit = 0; for (const t of A) if (B.has(t)) hit++;
  return hit / Math.min(A.size, B.size);
}

export type Signal = "match" | "conflict" | "unknown";
export interface MatchResult {
  score: number; name: number; distanceM: number; decision: "auto" | "review" | "reject";
  phone: Signal; website: Signal; address: number | null;
}

export function matchScore(place: MatchInput, cand: MatchInput): MatchResult {
  const name = nameSimilarity(place.name, cand.name);
  const d = distanceM(place, cand);
  if (d > 200) return { score: 0, name, distanceM: Math.round(d), decision: "reject", phone: "unknown", website: "unknown", address: null };
  const dist = d <= 75 ? 1 : 1 - (d - 75) / 125;
  let score = 0.6 * name + 0.4 * dist;
  /* telefon ve web: eşleşme destekler; iki tarafta da var ve farklıysa otomatik onay verilmez */
  const ph: Signal = digits(place.phone) && digits(cand.phone) ? (digits(place.phone) === digits(cand.phone) ? "match" : "conflict") : "unknown";
  const sa = siteKey(place.website), sb = siteKey(cand.website);
  const web: Signal = sa && sb ? (sa === sb || brandLabel(sa) === brandLabel(sb) ? "match" : "conflict") : "unknown";
  const addr = addressSimilarity(place.address, cand.address);
  if (ph === "match") score += 0.1;
  if (web === "match") score += 0.1;
  if (addr !== null && addr >= 0.5) score += 0.05;
  score = Math.min(1, score);
  let decision: MatchResult["decision"] = score >= 0.9 ? "auto" : score >= 0.6 ? "review" : "reject";
  if (decision === "auto" && (ph === "conflict" || web === "conflict") && ph !== "match" && web !== "match") decision = "review";
  return { score: Math.round(score * 1000) / 1000, name: Math.round(name * 1000) / 1000, distanceM: Math.round(d), decision, phone: ph, website: web, address: addr === null ? null : Math.round(addr * 100) / 100 };
}

/* ──────────────────────────────────────────────────────────────────────────
   KARAR KATMANI (toplu eşleştirme) — katı; yanlış işletmenin yorumunu göstermektense onaya göndermek iyidir.
   · Güçlü eşleşme (Enterprise çağrısı YOK): ad ≥ 0,95, ≤ 40 m, zincir/şube işareti yok, yakında rakip aday yok,
     kapı numarası çelişmiyor.
   · Değilse ve bizde telefon/web varsa: Enterprise ile doğrula.
     – Zincir ya da şube adı farkı: yalnız TELEFON eşleşirse ve ≤ 40 m ise otomatik (web bütün şubelerde aynıdır).
     – Diğerleri: telefon ya da web eşleşmesi, ad ≥ 0,80, ≤ 75 m.
   · Telefon farkı tek başına ret/ön engel değildir (şube ve merkez numaraları farklı olur); yalnız destek vermez.
   · 100 m üstü asla otomatik değildir. Geri kalan her şey manuel onaya gider.
   ────────────────────────────────────────────────────────────────────────── */

/** İstanbul ilçeleri ve sık şube adları: aday adında bizde olmayan bu sözcükler "başka şube" işaretidir. */
const BRANCH_BASE = ["sube", "subesi", "adalar", "arnavutkoy", "atasehir", "avcilar", "bagcilar", "bahcelievler", "bakirkoy", "basaksehir", "bayrampasa",
  "besiktas", "beykoz", "beylikduzu", "beyoglu", "buyukcekmece", "catalca", "cekmekoy", "esenler", "esenyurt", "eyup", "eyupsultan", "fatih",
  "gaziosmanpasa", "gungoren", "kadikoy", "kagithane", "kartal", "kucukcekmece", "maltepe", "pendik", "sancaktepe", "sariyer", "silivri",
  "sultanbeyli", "sultangazi", "sile", "sisli", "tuzla", "umraniye", "uskudar", "zeytinburnu", "acibadem", "suadiye", "bebek", "cihangir",
  "nisantasi", "etiler", "moda", "caddebostan", "goztepe", "erenkoy", "bostanci", "levent", "maslak", "ortakoy", "karakoy", "taksim", "galata",
  "kurtulus", "atakoy", "yesilkoy", "florya", "kalamis", "fenerbahce", "cengelkoy", "kuzguncuk", "emirgan", "istinye", "tarabya", "yenikoy",
  "mecidiyekoy", "bomonti", "sultanahmet", "eminonu", "balat", "bagdat", "zorlu", "akasya", "kanyon", "vadi", "metropol", "avm"];
export const BRANCH_WORDS = new Set(BRANCH_BASE);

/** Markanın çekirdeği: normalleştirilmiş adın ilk iki sözcüğü (şube eki çıkarılmış). */
export function brandKey(name: string) {
  return normName(name).split(" ").filter((w) => !BRANCH_WORDS.has(w)).slice(0, 2).join(" ");
}

/** Aday adında olup bizde olmayan şube sözcükleri (ör. "Ali Ocakbaşı" ↔ "Ali Ocakbaşı Suadiye" → ["suadiye"]). */
export function branchDiff(ours: string, theirs: string, extra: Set<string> = new Set()) {
  /* normName ilçe adlarını (Kadıköy, Beyoğlu…) attığı için burada ayrı, durak sözcüksüz belirteçleme */
  const toks = (s: string) => s.toLocaleLowerCase("tr").split("").map((ch) => TR[ch] ?? ch).join("").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/);
  const a = new Set(toks(ours)), b = toks(theirs);
  const known = b.filter((w) => w && !a.has(w) && (BRANCH_WORDS.has(w) || extra.has(w)));
  /* Bizim adımız adayın içinde aynen geçiyor ve aday fazladan sözcük taşıyorsa ("Bambi Cafe" ↔ "Bambi Cafe
     Gayrettepe") bu ek, listede olmasa da şube işaretidir. Genel sözcükler (restoran, cafe…) sayılmaz. */
  const core = normName(ours).split(" ").filter(Boolean), cand = new Set(normName(theirs).split(" "));
  const suffix = core.length && core.every((w) => cand.has(w)) ? [...cand].filter((w) => w.length > 2 && !core.includes(w)) : [];
  return [...new Set([...known, ...suffix])];
}

/** Kapı numarası çelişkisi: iki adreste de numara var ve sayısal kısmı farklı (5A ↔ 5 çelişki değildir). */
export function houseNoConflict(a?: string | null, b?: string | null) {
  const no = (s?: string | null) => s?.match(/\bno\s*[:.]?\s*(\d+)/i)?.[1] ?? null;
  const x = no(a), y = no(b);
  return !!x && !!y && x !== y;
}

export interface MatchContext { chain: boolean; branch: string[]; rival: boolean; addrConflict: boolean }
export type Decision = { decision: "auto" | "review" | "reject"; needsVerify: boolean; reason: string };

/** Enterprise çağrısından ÖNCE: güçlü mü, doğrulama gerekir mi, onaya mı gider? */
export function preDecide(m: MatchResult, c: MatchContext, haveContact: boolean): Decision {
  if (m.decision === "reject") return { decision: "reject", needsVerify: false, reason: "puan_dusuk_ya_da_uzak" };
  const flags = c.chain || c.branch.length > 0 || c.rival || c.addrConflict;
  if (m.name >= 0.95 && m.distanceM <= 40 && !flags) return { decision: "auto", needsVerify: false, reason: "guclu_ad_konum" };
  if (m.distanceM > 100) return { decision: "review", needsVerify: false, reason: "uzak" };
  if (c.rival) return { decision: "review", needsVerify: false, reason: "yakinda_baska_aday" };
  if (!haveContact) return { decision: "review", needsVerify: false, reason: "dogrulanacak_iletisim_yok" };
  return { decision: "review", needsVerify: true, reason: "dogrulama" };
}

/** Enterprise (telefon, web) sonucu geldikten SONRA son karar. */
export function postDecide(m: MatchResult, c: MatchContext): Decision {
  if (m.decision === "reject") return { decision: "reject", needsVerify: false, reason: "puan_dusuk_ya_da_uzak" };
  if (c.addrConflict) return { decision: "review", needsVerify: false, reason: "kapi_no_celiskisi" };
  if (c.chain || c.branch.length) {
    const ok = m.phone === "match" && m.distanceM <= 40 && m.name >= 0.8;
    return { decision: ok ? "auto" : "review", needsVerify: false, reason: ok ? "zincir_telefon_eslesti" : "zincir_sube_belirsiz" };
  }
  const ok = (m.phone === "match" || m.website === "match") && m.distanceM <= 75 && m.name >= 0.8;
  return { decision: ok ? "auto" : "review", needsVerify: false, reason: ok ? "iletisim_eslesti" : "iletisim_eslesmedi" };
}
