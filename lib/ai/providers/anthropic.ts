import { providerKey } from "../config";
import type { ChatRequest, ChatResponse, ModelProvider } from "../types";
import { now, postJson } from "./http";

/** Anthropic Messages API — SDK'sız. system ayrı alan; JSON istenirse yönergeye eklenir. */
export const anthropicProvider: ModelProvider = {
  id: "anthropic",
  isConfigured: () => !!providerKey("anthropic"),
  async chat(req: ChatRequest): Promise<ChatResponse> {
    const t0 = now();
    const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n") + (req.json ? "\n\nYanıtı YALNIZCA geçerli JSON olarak ver; açıklama, kod bloğu ya da ek metin ekleme." : "");
    const messages = req.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));
    const data = await postJson<{ content: Array<{ type: string; text?: string }>; usage: { input_tokens: number; output_tokens: number }; stop_reason?: string }>(
      "anthropic", (process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com").replace(/\/$/, "") + "/v1/messages",
      { "x-api-key": providerKey("anthropic")!, "anthropic-version": "2023-06-01" },
      { model: req.model, max_tokens: req.maxTokens ?? 1200, temperature: req.temperature ?? 0.2, system: system || undefined, messages },
      req.timeoutMs ?? 18000, req.signal,
    );
    const text = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    return { text, usage: { inputTokens: data.usage?.input_tokens ?? 0, outputTokens: data.usage?.output_tokens ?? 0 }, provider: "anthropic", model: req.model, latencyMs: now() - t0, finishReason: data.stop_reason };
  },
};
