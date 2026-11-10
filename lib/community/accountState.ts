"use client";

import { useSyncExternalStore } from "react";

/* Hesap durumu (istemci): AccountSync yazar, arayüz okur. "off" = kimlik YAPILANDIRILMAMIŞ (sunucu 503 auth_not_configured;
   ör. demo, yerel geliştirme). "error" = oturum sorgusu GEÇİCİ olarak başarısız (ağ, 5xx): durum bilinmiyor, yeniden denenebilir. */
export type AccountStatus = "unknown" | "off" | "anon" | "in" | "error";
let status: AccountStatus = "unknown";
let userId: string | null = null;
const subs = new Set<() => void>();
export function setAccountStatus(s: AccountStatus, id: string | null = null) { if (s !== status || id !== userId) { status = s; userId = id; subs.forEach((f) => f()); } }
/** Oturumdaki kullanıcının kimliği (kendi deneyim kartını tanımak için); yoksa null. */
export function useAccountUserId(): string | null {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => userId, () => null);
}
export function useAccountStatus(): AccountStatus {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => status, () => "unknown");
}

/* geçici hatada oturum sorgusunu yeniden çalıştırmak için: AccountSync kaydeder, arayüz (ör. deneyim formu) çağırır */
let retry: (() => void) | null = null;
export function setAccountRetry(f: (() => void) | null) { retry = f; }
export function retryAccountStatus() { if (status !== "error") return; status = "unknown"; subs.forEach((f) => f()); retry?.(); }
/** get-session yanıtından durum: yalnız 503 + auth_not_configured "off" (kimlik kapalı); diğer başarısızlıklar "error". */
export function sessionStatus(res: { ok: boolean; status: number } | null, body: unknown): "off" | "error" | null {
  if (res?.ok) return null;
  if (res && res.status === 503 && (body as { error?: string } | null)?.error === "auth_not_configured") return "off";
  return "error";
}
