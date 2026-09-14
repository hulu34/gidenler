import type { TasteEdits } from "@/lib/types";

/* ──────────────────────────────────────────────────────────────────────────
   GİZLİLİK — modele kişisel veri gitmez.
   · Ad, telefon, e-posta, kullanıcı kimliği, TC no vb. modele ulaşmadan silinir.
   · Kullanıcı profili ham hâliyle değil, sayısal özet olarak gider:
       { city, district, partySize, tasteProfile: { quiet: 0.8, value: 0.7 } }
   · Kimlik ve geçmiş Gidenler'de kalır; modelin "kim" olduğunu bilmesine gerek yok.
   ────────────────────────────────────────────────────────────────────────── */

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const PHONE = /(\+?\d[\d\s().-]{8,}\d)/g;
const TCKN = /\b\d{11}\b/g;
const HANDLE = /(^|\s)@[\w.]{2,}/g;
const USER_ID = /\b(u|usr|user)[-_]?[0-9a-f]{4,}\b/gi;
const URL_WITH_QUERY = /https?:\/\/[^\s]+/g;

/** Serbest metinden PII kalıplarını temizler. Modele giden HER metin (kullanıcı sorgusu dahil) buradan geçer. */
export function scrubPII(text: string): string {
  return String(text ?? "")
    .replace(EMAIL, "[e-posta]")
    .replace(PHONE, "[telefon]")
    .replace(TCKN, "[kimlik]")
    .replace(HANDLE, " [kullanıcı]")
    .replace(USER_ID, "[kullanıcı]")
    .replace(URL_WITH_QUERY, "[bağlantı]");
}

/** Modele gönderilen profil özeti — kimlik yok, yalnızca karar için gereken sinyaller. */
export interface ProfileSummary {
  city?: string;
  district?: string;
  partySize?: number;
  /** 0–1 ölçekli tercih ağırlıkları; yalnızca varsayılandan sapanlar. */
  tasteProfile: Record<string, number>;
  /** Kaçınılanlar: "kalabalık", "gürültü" gibi genel etiketler (serbest metin değil). */
  avoid: string[];
}

const ALLOWED_DIMS = new Set(["quiet", "value", "service", "taste", "atmosphere", "cleanliness", "speed", "family", "romantic", "authentic"]);
const ALLOWED_AVOID = new Set(["kalabalık", "gürültü", "sigara", "bekleme", "pahalı", "karanlık", "kalabalik", "gurultu"]);

export function summarizeProfile(taste?: TasteEdits | null, ctx: { city?: string; district?: string; partySize?: number } = {}): ProfileSummary {
  const tasteProfile: Record<string, number> = {};
  for (const [k, v] of Object.entries(taste?.dimensions ?? {})) {
    if (!ALLOWED_DIMS.has(k) || typeof v !== "number") continue;
    tasteProfile[k] = Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
  }
  const avoid = (taste?.dislikes ?? []).filter((d) => ALLOWED_AVOID.has(String(d).toLocaleLowerCase("tr"))).slice(0, 5);
  return {
    city: ctx.city ? scrubPII(ctx.city).slice(0, 40) : undefined,
    district: ctx.district ? scrubPII(ctx.district).slice(0, 40) : undefined,
    partySize: ctx.partySize && ctx.partySize > 0 && ctx.partySize < 50 ? Math.round(ctx.partySize) : undefined,
    tasteProfile, avoid,
  };
}

/** İstek kimliği — loglarda kullanıcı kimliği yerine bu kullanılır (rastgele, geri çözülemez). */
export function requestId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID().slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

/** Rate limit anahtarı için IP/oturumu tek yönlü karma yapar (düz IP kaydedilmez). */
export function hashKey(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
