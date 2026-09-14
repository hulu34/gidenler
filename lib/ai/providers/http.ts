import { ProviderError, type ProviderId } from "../types";

/** Ortak HTTP yardımcıları — zaman aşımı, hata sınıflandırma, gövde okuma. Anahtar yalnızca başlıkta; loga yazılmaz. */
export async function postJson<T>(provider: ProviderId, url: string, headers: Record<string, string>, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 300);
      const retryable = res.status === 429 || res.status >= 500;
      throw new ProviderError(`${provider} HTTP ${res.status}: ${text.replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")}`, provider, res.status, retryable);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new ProviderError(`${provider} ${/abort/i.test(msg) ? "timeout" : "network"}: ${msg.slice(0, 120)}`, provider, undefined, true);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export const now = () => Date.now();
