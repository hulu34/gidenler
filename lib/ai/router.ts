import { aiConfig, costOf } from "./config";
import { budgetStatus, record } from "./budget";
import { getProvider } from "./providers";
import { ProviderError, type ChatMessage, type ChatResponse, type ModelRole, type ProviderId } from "./types";

/* ──────────────────────────────────────────────────────────────────────────
   AI ROUTER / GATEWAY — rol → (sağlayıcı, model). Bütçe kapısı, yedek zincir, zaman aşımı, telemetri.
   Çağıran kod sağlayıcı bilmez: `route("primary", messages, {json:true})`.
   ────────────────────────────────────────────────────────────────────────── */

export interface RouteOptions { json?: boolean; maxTokens?: number; temperature?: number; kind: string; signal?: AbortSignal }

export class NotConfiguredError extends Error { constructor(role: ModelRole) { super(`AI provider yapılandırılmamış (${role})`); this.name = "NotConfiguredError"; } }
export class BudgetExceededError extends Error { constructor() { super("Aylık AI bütçesi doldu"); this.name = "BudgetExceededError"; } }

/** Rol için aday (sağlayıcı, model) listesi: birincil + anahtarı olan yedekler (aynı model adı yedek sağlayıcıda geçerli olmayabilir → AI_FALLBACK_MODEL_<ROLE>). */
export function candidatesFor(role: ModelRole): Array<{ provider: ProviderId; model: string }> {
  const cfg = aiConfig();
  const main = cfg.roles[role];
  const out: Array<{ provider: ProviderId; model: string }> = [];
  if (main.provider !== "none" && main.model && getProvider(main.provider)?.isConfigured()) out.push(main);
  for (const p of cfg.fallbackChain) {
    if (p === main.provider) continue;
    const m = process.env[`AI_FALLBACK_MODEL_${role.toUpperCase()}_${p.toUpperCase()}`] ?? process.env[`AI_FALLBACK_MODEL_${p.toUpperCase()}`];
    if (m && getProvider(p)?.isConfigured()) out.push({ provider: p, model: m });
  }
  return out;
}

export const isRoleAvailable = (role: ModelRole) => candidatesFor(role).length > 0;

/**
 * Bir rolü çağırır. Bütçe "critical" ise pahalı roller (primary/judge/grounding) reddedilir → çağıran deterministik motora düşer.
 * "degraded" seviyesinde judge reddedilir. Her deneme kaydedilir (başarılı/başarısız).
 */
export async function route(role: ModelRole, messages: ChatMessage[], opts: RouteOptions): Promise<ChatResponse> {
  const cfg = aiConfig();
  const cands = candidatesFor(role);
  if (!cands.length) throw new NotConfiguredError(role);
  const b = await budgetStatus();
  if (b.level === "critical" && role !== "fast") throw new BudgetExceededError();
  if (b.level === "degraded" && role === "judge") throw new BudgetExceededError();

  let lastErr: unknown = null;
  for (const c of cands) {
    const p = getProvider(c.provider)!;
    const t0 = Date.now();
    try {
      const res = await p.chat({ model: c.model, messages, json: opts.json, maxTokens: opts.maxTokens, temperature: opts.temperature, timeoutMs: cfg.modelTimeoutMs, signal: opts.signal });
      await record({ ts: t0, role, provider: c.provider, model: c.model, inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens, costUsd: costOf(c.provider, c.model, res.usage.inputTokens, res.usage.outputTokens), latencyMs: res.latencyMs, ok: true, kind: opts.kind });
      return res;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      await record({ ts: t0, role, provider: c.provider, model: c.model, inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: Date.now() - t0, ok: false, error: msg.slice(0, 160), kind: opts.kind });
      /* Kalıcı hata (4xx, 429 hariç) → yedeğe geç; iptal → dur. */
      if (opts.signal?.aborted) break;
      if (e instanceof ProviderError && !e.retryable && e.status !== 401 && e.status !== 403) break;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("AI çağrısı başarısız");
}

/** Yanıt metninden JSON çıkar: kod bloğu, öncül/artçı metin toleranslı. Geçersizse null (çağıran fallback'e düşer). */
export function extractJson(text: string): unknown {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : t;
  try { return JSON.parse(body); } catch { /* aşağıda dene */ }
  const a = body.indexOf("{"), z = body.lastIndexOf("}");
  if (a >= 0 && z > a) { try { return JSON.parse(body.slice(a, z + 1)); } catch { return null; } }
  return null;
}
