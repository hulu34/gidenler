import type { ModelProvider, ProviderId } from "../types";
import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import { mistralProvider, openaiProvider } from "./openai";

/** Kayıt defteri — yeni sağlayıcı (self-hosted/open-source dâhil) tek satırla eklenir. */
export const PROVIDERS: Record<Exclude<ProviderId, "none">, ModelProvider> = {
  anthropic: anthropicProvider, openai: openaiProvider, gemini: geminiProvider, mistral: mistralProvider,
};
export const getProvider = (id: ProviderId): ModelProvider | null => (id === "none" ? null : PROVIDERS[id] ?? null);
