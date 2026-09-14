import type { ModelRole, ProviderId } from "./types";

/* Sunucu dışı ortamda (tarayıcı) yüklenirse anında patlat: anahtar okuyan modül istemci paketine giremez. */
if (typeof window !== "undefined") throw new Error("lib/ai/config yalnızca sunucuda yüklenir.");

/* ──────────────────────────────────────────────────────────────────────────
   YAPILANDIRMA — yalnızca sunucu. Model adları koda gömülmez; env'den okunur.
   Hiçbir değer istemciye gitmez (tarayıcıda yüklenirse modül kendini kapatır; `route.api.ts` dışından import edilmez).

   AI_PRIMARY_PROVIDER / AI_PRIMARY_MODEL   → kullanıcıya görünen karar ve açıklama
   AI_FAST_PROVIDER    / AI_FAST_MODEL      → niyet ayrıştırma, sınıflandırma (ucuz)
   AI_JUDGE_PROVIDER   / AI_JUDGE_MODEL     → örneklemeli kalite denetimi
   AI_GROUNDING_PROVIDER                    → dış kaynak doğrulama (şimdilik yalnızca "gemini" ya da "none")
   ────────────────────────────────────────────────────────────────────────── */

const PROVIDERS: ProviderId[] = ["anthropic", "openai", "gemini", "mistral", "none"];
const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && v !== undefined && v !== "" ? n : d; };
const providerOf = (v: string | undefined): ProviderId => (PROVIDERS.includes((v ?? "") as ProviderId) ? (v as ProviderId) : "none");

export interface RoleConfig { provider: ProviderId; model: string }

export interface AIConfig {
  roles: Record<ModelRole, RoleConfig>;
  /** Yedek zincir: birincil sağlayıcı düşerse sırayla denenir (yalnızca anahtarı olanlar). */
  fallbackChain: ProviderId[];
  /** Aylık bütçe (USD) ve eşikler. */
  budgetUsd: number;
  warnRatio: number;      // 0.7 → admin uyarısı
  degradeRatio: number;   // 0.9 → judge/eval kısılır
  hardRatio: number;      // 1.0 → pahalı model kapanır, deterministik motor
  /** Kalite denetimi örnekleme oranı 0–1. */
  judgeSampleRate: number;
  /** Niyet ayrıştırma: local | fast | hybrid (belirsizse hızlı model). */
  intentMode: "local" | "fast" | "hybrid";
  /** Sınırlar. */
  maxInputChars: number;
  maxToolCalls: number;
  requestTimeoutMs: number;
  modelTimeoutMs: number;
  /** Rate limit: pencere başına istek (IP ve oturum ayrı ayrı). */
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  /** Cache TTL (sn) — zaman duyarlı sorgular için kısa. */
  cacheTtlSec: number;
  cacheTtlTimeSensitiveSec: number;
  /** Bütçe defteri dosyası (isteğe bağlı; Vercel'de KV önerilir). */
  ledgerFile?: string;
  /** Admin uç noktası için bearer token (yoksa admin kapalı). */
  adminToken?: string;
}

let cached: AIConfig | null = null;

export function aiConfig(): AIConfig {
  if (cached) return cached;
  const e = process.env;
  cached = {
    roles: {
      primary: { provider: providerOf(e.AI_PRIMARY_PROVIDER), model: e.AI_PRIMARY_MODEL ?? "" },
      fast: { provider: providerOf(e.AI_FAST_PROVIDER), model: e.AI_FAST_MODEL ?? "" },
      judge: { provider: providerOf(e.AI_JUDGE_PROVIDER), model: e.AI_JUDGE_MODEL ?? "" },
      grounding: { provider: providerOf(e.AI_GROUNDING_PROVIDER), model: e.AI_GROUNDING_MODEL ?? "" },
    },
    fallbackChain: (e.AI_FALLBACK_CHAIN ?? "").split(",").map((s) => providerOf(s.trim())).filter((p) => p !== "none"),
    budgetUsd: num(e.AI_MONTHLY_BUDGET_USD, 100),
    warnRatio: num(e.AI_BUDGET_WARN_RATIO, 0.7),
    degradeRatio: num(e.AI_BUDGET_DEGRADE_RATIO, 0.9),
    hardRatio: num(e.AI_BUDGET_HARD_RATIO, 1.0),
    judgeSampleRate: Math.max(0, Math.min(1, num(e.AI_JUDGE_SAMPLE_RATE, 0.1))),
    intentMode: (["local", "fast", "hybrid"].includes(e.AI_INTENT_MODE ?? "") ? e.AI_INTENT_MODE : "hybrid") as AIConfig["intentMode"],
    maxInputChars: num(e.AI_MAX_INPUT_CHARS, 600),
    maxToolCalls: num(e.AI_MAX_TOOL_CALLS, 4),
    requestTimeoutMs: num(e.AI_REQUEST_TIMEOUT_MS, 25000),
    modelTimeoutMs: num(e.AI_MODEL_TIMEOUT_MS, 18000),
    rateLimitPerMinute: num(e.AI_RATE_LIMIT_PER_MINUTE, 12),
    rateLimitPerDay: num(e.AI_RATE_LIMIT_PER_DAY, 200),
    cacheTtlSec: num(e.AI_CACHE_TTL_SEC, 3600),
    cacheTtlTimeSensitiveSec: num(e.AI_CACHE_TTL_TIME_SENSITIVE_SEC, 300),
    ledgerFile: e.AI_LEDGER_FILE || undefined,
    adminToken: e.AI_ADMIN_TOKEN || undefined,
  };
  return cached;
}

/** Testler için: env değiştikten sonra yeniden okunsun. */
export function resetAIConfig() { cached = null; }

/** Sağlayıcı anahtarı — yalnızca sunucuda okunur, hiçbir zaman yanıtlara/loglara yazılmaz. */
export function providerKey(p: ProviderId): string | undefined {
  switch (p) {
    case "anthropic": return process.env.ANTHROPIC_API_KEY || undefined;
    case "openai": return process.env.OPENAI_API_KEY || undefined;
    case "gemini": return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || undefined;
    case "mistral": return process.env.MISTRAL_API_KEY || undefined;
    default: return undefined;
  }
}

/**
 * Maliyet tablosu (USD / 1M token). Env ile geçersiz kılınabilir: AI_PRICE_<provider>_<model>="in,out".
 * Bilinmeyen model → sağlayıcının muhafazakâr varsayılanı (bütçeyi olduğundan düşük göstermemek için).
 */
const DEFAULT_PRICES: Record<ProviderId, { in: number; out: number }> = {
  anthropic: { in: 3, out: 15 }, openai: { in: 2.5, out: 10 }, gemini: { in: 1.25, out: 10 }, mistral: { in: 2, out: 6 }, none: { in: 0, out: 0 },
};
const KNOWN_PRICES: Record<string, { in: number; out: number }> = {
  // İsimler eşleşmezse varsayılan devreye girer; tablo env ile güncellenir, kod değişmez.
  "anthropic:claude-sonnet": { in: 3, out: 15 }, "anthropic:claude-haiku": { in: 0.8, out: 4 }, "anthropic:claude-opus": { in: 15, out: 75 },
  "openai:gpt-4o": { in: 2.5, out: 10 }, "openai:gpt-4o-mini": { in: 0.15, out: 0.6 }, "openai:gpt-4.1": { in: 2, out: 8 }, "openai:gpt-4.1-mini": { in: 0.4, out: 1.6 },
  "gemini:gemini-2.5-pro": { in: 1.25, out: 10 }, "gemini:gemini-2.5-flash": { in: 0.3, out: 2.5 }, "gemini:gemini-2.0-flash": { in: 0.1, out: 0.4 },
  "mistral:mistral-large": { in: 2, out: 6 }, "mistral:mistral-small": { in: 0.1, out: 0.3 },
};
export function priceFor(provider: ProviderId, model: string): { in: number; out: number } {
  const env = process.env[`AI_PRICE_${provider.toUpperCase()}_${model.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`];
  if (env) { const [i, o] = env.split(",").map(Number); if (Number.isFinite(i) && Number.isFinite(o)) return { in: i, out: o }; }
  const key = Object.keys(KNOWN_PRICES).find((k) => k.startsWith(provider + ":") && model.startsWith(k.split(":")[1]));
  return key ? KNOWN_PRICES[key] : DEFAULT_PRICES[provider];
}
export const costOf = (provider: ProviderId, model: string, inTok: number, outTok: number) => {
  const p = priceFor(provider, model);
  return (inTok * p.in + outTok * p.out) / 1_000_000;
};
