import { providerKey } from "../config";
import type { ChatRequest, ChatResponse, ModelProvider } from "../types";
import { now, postJson } from "./http";

const GEMINI_BASE = () => (process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com").replace(/\/$/, "");

/** Google Gemini generateContent — SDK'sız. JSON istenirse responseMimeType. Anahtar başlıkta (URL'de değil: loglara sızmasın). */
export const geminiProvider: ModelProvider = {
  id: "gemini",
  isConfigured: () => !!providerKey("gemini"),
  async chat(req: ChatRequest): Promise<ChatResponse> {
    const t0 = now();
    const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contents = req.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const data = await postJson<{ candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }>(
      "gemini", `${GEMINI_BASE()}/v1beta/models/${encodeURIComponent(req.model)}:generateContent`,
      { "x-goog-api-key": providerKey("gemini")! },
      { ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents, generationConfig: { temperature: req.temperature ?? 0.2, maxOutputTokens: req.maxTokens ?? 1200, ...(req.json ? { responseMimeType: "application/json" } : {}) } },
      req.timeoutMs ?? 18000, req.signal,
    );
    const c = data.candidates?.[0];
    const text = (c?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    return { text, usage: { inputTokens: data.usageMetadata?.promptTokenCount ?? 0, outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0 }, provider: "gemini", model: req.model, latencyMs: now() - t0, finishReason: c?.finishReason };
  },
};

/**
 * Dış kaynak doğrulama (grounding) — Google Search aracı ile tek soru. Sonuç KANIT değil, "dış not"tur;
 * puanı/uyumu değiştirmez, yalnızca dikkat satırına girer ve "doğrulanmadı" etiketiyle gösterilir.
 */
export async function geminiGround(model: string, question: string, timeoutMs = 12000): Promise<{ note: string; sources: string[] } | null> {
  if (!providerKey("gemini")) return null;
  const data = await postJson<{ candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }> }>(
    "gemini", `${GEMINI_BASE()}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { "x-goog-api-key": providerKey("gemini")! },
    { contents: [{ role: "user", parts: [{ text: question }] }], tools: [{ googleSearch: {} }], generationConfig: { temperature: 0, maxOutputTokens: 200 } },
    timeoutMs,
  );
  const c = data.candidates?.[0];
  const note = (c?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  const sources = (c?.groundingMetadata?.groundingChunks ?? []).map((g) => g.web?.uri ?? "").filter(Boolean).slice(0, 3);
  return note ? { note: note.slice(0, 240), sources } : null;
}
