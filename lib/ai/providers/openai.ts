import { providerKey } from "../config";
import type { ChatRequest, ChatResponse, ModelProvider } from "../types";
import { now, postJson } from "./http";

/** OpenAI Chat Completions — SDK'sız; JSON modu `response_format`. Mistral da aynı biçimi konuşur (aşağıda). */
function openAICompatible(id: "openai" | "mistral", defaultUrl: string): ModelProvider {
  /* Taban URL env ile değiştirilebilir → self-hosted / OpenAI uyumlu uç noktalar (vLLM, Ollama, proxy). */
  const url = () => (process.env[`${id.toUpperCase()}_BASE_URL`] ?? defaultUrl.replace(/\/chat\/completions$/, "")).replace(/\/$/, "") + "/chat/completions";
  return {
    id,
    isConfigured: () => !!providerKey(id),
    async chat(req: ChatRequest): Promise<ChatResponse> {
      const t0 = now();
      const data = await postJson<{ choices: Array<{ message: { content: string | null }; finish_reason?: string }>; usage?: { prompt_tokens: number; completion_tokens: number } }>(
        id, url(), { authorization: `Bearer ${providerKey(id)}` },
        { model: req.model, messages: req.messages, temperature: req.temperature ?? 0.2, max_tokens: req.maxTokens ?? 1200, ...(req.json ? { response_format: { type: "json_object" } } : {}) },
        req.timeoutMs ?? 18000, req.signal,
      );
      const c = data.choices?.[0];
      return { text: c?.message?.content ?? "", usage: { inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 }, provider: id, model: req.model, latencyMs: now() - t0, finishReason: c?.finish_reason };
    },
  };
}
export const openaiProvider = openAICompatible("openai", "https://api.openai.com/v1");
export const mistralProvider = openAICompatible("mistral", "https://api.mistral.ai/v1");
