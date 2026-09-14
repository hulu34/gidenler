"use client";

import { summarizeProfile } from "./privacy";
import type { AIResponse, AskRequest, FeedbackEvent } from "./schema";
import type { TasteEdits } from "@/lib/types";

/* ──────────────────────────────────────────────────────────────────────────
   İSTEMCİ KÖPRÜSÜ — tarayıcıdan Gidenler AI API'ye. Bu dosya istemci paketine girer:
   burada anahtar, model adı, sağlayıcı ayarı YOKTUR ve olamaz (yalnızca fetch + tipler).
   · Statik yayında (GitHub Pages) /api/ai yoktur → ilk 404/ağ hatasından sonra "yok" diye işaretlenir,
     bileşen yerel deterministik motorla devam eder.
   · Profil ham hâliyle değil `summarizeProfile` özetiyle gider; kimlik yok.
   ────────────────────────────────────────────────────────────────────────── */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
let unavailableUntil = 0;

const sessionId = (): string | undefined => {
  try {
    const k = "gidenler.ai.session"; let v = window.localStorage.getItem(k);
    if (!v) { v = Math.random().toString(36).slice(2, 14) + Date.now().toString(36); window.localStorage.setItem(k, v); }
    return v;
  } catch { return undefined; }
};

export type AskOutcome = { status: "ok"; data: AIResponse } | { status: "unavailable" } | { status: "error"; code: string; message: string };

export async function askServer(input: { query: string; structured?: AskRequest["structured"]; followUp?: AskRequest["followUp"]; taste?: TasteEdits; partySize?: number }, timeoutMs = 20000): Promise<AskOutcome> {
  if (Date.now() < unavailableUntil) return { status: "unavailable" };
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const profile = summarizeProfile(input.taste, { partySize: input.partySize });
    const body: AskRequest = { query: input.query, structured: input.structured, followUp: input.followUp ?? null, profile, sessionId: sessionId() };
    const r = await fetch(`${BASE}/api/ai/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
    if (r.status === 404 || r.status === 405 || r.status === 501) { unavailableUntil = Date.now() + 10 * 60 * 1000; return { status: "unavailable" }; }
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) { unavailableUntil = Date.now() + 10 * 60 * 1000; return { status: "unavailable" }; }
    const j = (await r.json()) as AIResponse & { error?: string; message?: string };
    if (!r.ok) return { status: "error", code: j.error ?? String(r.status), message: j.message ?? "Gidenler AI yanıt veremedi." };
    return { status: "ok", data: j };
  } catch {
    /* ağ yok / iptal: kısa süre denemeyi bırak */
    unavailableUntil = Date.now() + 60 * 1000;
    return { status: "unavailable" };
  } finally { clearTimeout(t); }
}

/** Anonim geri bildirim; hata sessizce yutulur (UX'i etkilemez). */
export function sendFeedback(ev: FeedbackEvent) {
  if (Date.now() < unavailableUntil) return;
  try { void fetch(`${BASE}/api/ai/feedback/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(ev), keepalive: true }).catch(() => { /* yok say */ }); } catch { /* yok say */ }
}
