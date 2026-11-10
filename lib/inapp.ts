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

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s); let bin = "";
  for (const x of bytes) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** "#aktar=…" parçası (metin 3.000 karakterle sınırlı: adres uzunluğu sınırları). Boş taslakta yalnız kod taşınır. */
export function encodeHandoff(h: Handoff): string {
  const v: Handoff = { ...h, b: h.b?.slice(0, 3000) };
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
    if (typeof raw.b === "string") out.b = raw.b.slice(0, 3000);
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
