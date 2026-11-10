/* UYGULAMA İÇİ TARAYICI — Instagram, Facebook, TikTok vb. bağlantıları kendi gömülü tarayıcılarında (WebView) açar.
   Google, gömülü tarayıcılarda OAuth girişini engeller ("403: disallowed_useragent"): kullanıcı Google ekranında hata görür
   ve geri döner. Bu yüzden bu tarayıcılarda Google'a HİÇ yönlendirmeyiz; kullanıcıya sayfayı gerçek tarayıcıda açmasını
   söyleriz. Taslak ve kampanya kodu, adres çubuğundaki # parçasıyla taşınır (# sunucuya gönderilmez).
   Saf işlevler: hem istemcide hem testte çalışır. */

export type InAppName = "Instagram" | "Facebook" | "TikTok" | "LinkedIn" | "Snapchat" | "X" | "Pinterest" | "Uygulama";
export interface InApp { name: InAppName; android: boolean; ios: boolean }

const RULES: Array<[RegExp, InAppName]> = [
  [/Instagram/i, "Instagram"],
  [/FBAN|FBAV|FB_IAB|FBIOS|FB4A|\bMessenger/i, "Facebook"],
  [/musical_ly|BytedanceWebview|TikTok|Trill/i, "TikTok"],
  [/LinkedInApp/i, "LinkedIn"],
  [/Snapchat/i, "Snapchat"],
  [/Twitter|TwitterAndroid/i, "X"],
  [/Pinterest/i, "Pinterest"],
];

/** Gömülü tarayıcı mı? Android'de genel WebView işareti "; wv)" de yakalanır. Normal Safari/Chrome → null. */
export function inAppBrowser(ua: string): InApp | null {
  if (!ua) return null;
  const android = /Android/i.test(ua), ios = /iPhone|iPad|iPod/i.test(ua);
  for (const [re, name] of RULES) if (re.test(ua)) return { name, android, ios };
  if (android && /; wv\)/.test(ua)) return { name: "Uygulama", android, ios };
  return null;
}

/** Android: varsayılan tarayıcıda açan intent bağlantısı (Chrome yoksa aynı adrese düşer). iOS'ta karşılığı yok. */
export function androidIntent(href: string): string {
  const u = new URL(href);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(":", "")};S.browser_fallback_url=${encodeURIComponent(href)};end`;
}

/* ── # ile aktarım: taslak + kampanya kodu ───────────────────────────────── */
export interface Handoff { b?: string; m?: string; o?: number | null; r?: Record<string, number>; ri?: string | null; rel?: string; k?: string | null }
const HKEY = "aktar=";
/** Taşınabilen en uzun metin = deneyim API'sinin sınırı (lib/community/reviewApi.ts body.max). Yayınlanabilen her metin
    eksiksiz taşınır; daha uzunu zaten yayınlanamaz ve kullanıcı aktarmadan önce uyarılır. */
export const HANDOFF_MAX = 6000;
/** Adreste aktarım parçası var mı (çözülebilir olsun olmasın) — bozuk bağlantıyı ayırt etmek için. */
export const isHandoffHash = (hash: string) => hash.includes(HKEY);

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s); let bin = "";
  for (const x of bytes) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** "#aktar=…" parçası (metin HANDOFF_MAX ile sınırlı). Boş taslakta yalnız kod taşınır. */
export function encodeHandoff(h: Handoff): string {
  const v: Handoff = { ...h, b: h.b?.slice(0, HANDOFF_MAX) };
  for (const k of Object.keys(v) as Array<keyof Handoff>) if (v[k] === undefined || v[k] === null || v[k] === "") delete v[k];
  return `#${HKEY}${b64urlEncode(JSON.stringify(v))}`;
}

/** Bozuk / yabancı # parçasında null; alanlar tip denetiminden geçer (adres çubuğu güvenilir veri değildir). */
export function decodeHandoff(hash: string): Handoff | null {
  const i = hash.indexOf(HKEY);
  if (i < 0) return null;
  try {
    const raw = JSON.parse(b64urlDecode(hash.slice(i + HKEY.length))) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return null;
    const out: Handoff = {};
    if (typeof raw.b === "string") out.b = raw.b.slice(0, HANDOFF_MAX);
    if (typeof raw.m === "string" && /^\d{4}-\d{2}$/.test(raw.m)) out.m = raw.m;
    if (typeof raw.o === "number" && raw.o >= 1 && raw.o <= 10) out.o = Math.round(raw.o);
    if (raw.r && typeof raw.r === "object") {
      const r: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw.r as Record<string, unknown>)) if (/^[a-z_-]{1,24}$/.test(k) && typeof v === "number" && v >= 1 && v <= 10) r[k] = Math.round(v);
      out.r = r;
    }
    if (typeof raw.ri === "string" && raw.ri.length <= 16) out.ri = raw.ri;
    if (typeof raw.rel === "string" && raw.rel.length <= 16) out.rel = raw.rel;
    if (typeof raw.k === "string" && /^[a-z0-9-]{1,24}$/.test(raw.k)) out.k = raw.k;
    return out;
  } catch { return null; }
}

/* ── hedef tarayıcıda karar: aktarım mevcut taslağın üzerine YAZMAZ ───────── */
export interface DraftLike { body: string; month: string; ratings: Record<string, number>; overall?: number | null; returnIntent: string | null; relationship: string }
const RETURNS = ["evet", "hayır", "emin değil"];
const RELS = ["none", "invited", "gifted", "sponsored", "owner_related"];

/** Aktarım → taslak alanları (bilinmeyen dönüş/ilişki değerleri varsayılana düşer). */
export function handoffToDraft(h: Handoff, defaultMonth: string): DraftLike {
  return {
    body: h.b ?? "", month: h.m ?? defaultMonth, ratings: h.r ?? {}, overall: h.o ?? null,
    returnIntent: RETURNS.includes(h.ri ?? "") ? (h.ri as string) : null,
    relationship: RELS.includes(h.rel ?? "") ? (h.rel as string) : "none",
  };
}

/** İçerik aynı mı (boşluk farkı yok sayılır): aynıysa seçim sorulmaz. */
export function sameDraft(a: DraftLike, b: DraftLike): boolean {
  const n = (s: string) => s.replace(/\s+/g, " ").trim();
  return n(a.body) === n(b.body) && (a.overall ?? null) === (b.overall ?? null) && a.month === b.month
    && a.returnIntent === b.returnIntent && a.relationship === b.relationship
    && JSON.stringify(Object.entries(a.ratings ?? {}).sort()) === JSON.stringify(Object.entries(b.ratings ?? {}).sort());
}

export type HandoffPlan =
  | { kind: "none" }                       // adreste aktarım yok
  | { kind: "broken" }                     // aktarım var ama okunamadı → mevcut taslak olduğu gibi kalır
  | { kind: "code" }                       // yalnız kampanya kodu (taslak içeriği yok)
  | { kind: "apply"; draft: DraftLike }    // hedefte taslak yok ya da aynısı → tek adımda uygula
  | { kind: "choose"; draft: DraftLike }   // hedefte FARKLI taslak var → kullanıcı seçer; seçene kadar mevcut korunur
  | { kind: "hold"; draft: DraftLike };   // kullanıcı YAYIMLANMIŞ deneyimini düzenliyor → gelen taslak forma uygulanmaz, ayrı bekler

/** editing: form yayımlanmış bir deneyimin düzenleme kipinde. O zaman gelen taslak hiçbir koşulda forma yazılmaz. */
export function handoffPlan(hash: string, local: DraftLike | null, defaultMonth: string, editing = false): HandoffPlan {
  if (!isHandoffHash(hash)) return { kind: "none" };
  const h = decodeHandoff(hash);
  if (!h) return { kind: "broken" };
  if (!h.b?.trim() && !h.o) return { kind: "code" };
  const draft = handoffToDraft(h, defaultMonth);
  if (editing) return { kind: "hold", draft };
  if (!local || (!local.body.trim() && local.overall == null) || sameDraft(local, draft)) return { kind: "apply", draft };
  return { kind: "choose", draft };
}
