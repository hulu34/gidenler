import type { ModelProvider, ProviderId } from "../types";
import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import { groqProvider, mistralProvider, openaiProvider } from "./openai";

/** Kayıt defteri — yeni sağlayıcı (self-hosted/open-source dâhil) tek satırla eklenir. */
export const PROVIDERS: Record<Exclude<ProviderId, "none">, ModelProvider> = {
  anthropic: anthropicProvider, openai: openaiProvider, gemini: geminiProvider, mistral: mistralProvider, groq: groqProvider,
};
export const getProvider = (id: ProviderId): ModelProvider | null => (id === "none" ? null : PROVIDERS[id] ?? null);
