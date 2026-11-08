"use client";
/* İstemci tarafı kampanya kaynağı. İlk temas kuralı: bağlantıdaki ?k= (ya da utm_source) kodu 14 gün bu tarayıcıda tutulur;
   ana sayfa bölümünden başlayan akış "site" olarak, yalnız o oturum boyunca işaretlenir. Hiçbir kişisel veri yok.
   Yerel kayıt kapalıysa (gizli pencere) ölçüm sessizce atlanır; akış yine çalışır. */
import { CLIENT_STEPS, isCode, type Step } from "./index";

const KEY = "gidenler.kampanya";
const FLOW = "gidenler.akis";
const TTL = 14 * 864e5;
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function captureCampaign(search: string, fallback: "dogrudan" | "site"): string {
  const q = new URLSearchParams(search);
  const fromUrl = (q.get("k") ?? q.get("utm_source") ?? "").toLowerCase();
  try {
    if (isCode(fromUrl) && fromUrl !== "site" && fromUrl !== "dogrudan") {
      localStorage.setItem(KEY, JSON.stringify({ code: fromUrl, at: Date.now() }));
      sessionStorage.setItem(FLOW, fromUrl);
      return fromUrl;
    }
    const kept = activeCampaign();
    const code = kept ?? fallback;
    sessionStorage.setItem(FLOW, code);
    return code;
  } catch { return fromUrl && isCode(fromUrl) ? fromUrl : fallback; }
}

function activeCampaign(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as { code?: string; at?: number } | null;
    if (v?.code && isCode(v.code) && Date.now() - (v.at ?? 0) < TTL) return v.code;
  } catch { /* yok */ }
  return null;
}

/** Bu oturumda akış (bölüm ya da kampanya bağlantısı) üzerinden mi gelindi? Gelinmediyse ölçülmez. */
export function flowCode(): string | null {
  try { const f = sessionStorage.getItem(FLOW); if (f && isCode(f)) return f; } catch { /* yok */ }
  return activeCampaign();
}

const sent = new Set<string>();
/** Adım bildirimi — aynı sayfa yüklemesinde aynı adım bir kez gönderilir; sunucu da günlük tekil sayar. */
export function track(step: Step, code = flowCode()) {
  if (!code || !CLIENT_STEPS.includes(step)) return;
  const k = `${code}:${step}`;
  if (sent.has(k)) return;
  sent.add(k);
  void fetch(`${BASE}/api/kampanya/`, { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ code, step }) }).catch(() => {});
}
