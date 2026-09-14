/* ──────────────────────────────────────────────────────────────────────────
   GİDENLER INTELLIGENCE LAYER — sağlayıcı bağımsız sözleşme.
   Kodun geri kalanı yalnızca bu tipleri görür; Anthropic/OpenAI/Gemini/Mistral
   ayrıntıları `providers/` altında kalır ve SDK'sız (fetch) konuşulur.
   ────────────────────────────────────────────────────────────────────────── */

export type ProviderId = "anthropic" | "openai" | "gemini" | "mistral" | "none";
export type ModelRole = "primary" | "fast" | "judge" | "grounding";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  /** JSON üretmesi istenen çağrılar: sağlayıcı destekliyorsa JSON modu açılır; yine de çıktı zod ile doğrulanır. */
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  /** ms — sağlayıcıya iletilen üst sınır; router AbortController ile de keser. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface Usage { inputTokens: number; outputTokens: number }

export interface ChatResponse {
  text: string;
  usage: Usage;
  provider: ProviderId;
  model: string;
  latencyMs: number;
  /** Sağlayıcının raporladığı bitiş nedeni (varsa). */
  finishReason?: string;
}

export interface ModelProvider {
  id: ProviderId;
  /** Ortam değişkeni ile anahtar var mı — yoksa router bu sağlayıcıyı hiç denemez. */
  isConfigured(): boolean;
  chat(req: ChatRequest): Promise<ChatResponse>;
}

/** Bir çağrının maliyet/telemetri kaydı — kişisel veri YOK. */
export interface CallRecord {
  ts: number;
  role: ModelRole;
  provider: ProviderId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
  /** İstek sınıfı (ör. "recommend", "intent", "judge") — sorgu metni değil. */
  kind: string;
}

export class ProviderError extends Error {
  constructor(message: string, public readonly provider: ProviderId, public readonly status?: number, public readonly retryable = false) {
    super(message);
    this.name = "ProviderError";
  }
}
