"use client";

import { useSyncExternalStore } from "react";

/* Hesap durumu (istemci): AccountSync yazar, arayüz okur. "off" = kimlik kapalı (ör. demo, yerel geliştirme). */
export type AccountStatus = "unknown" | "off" | "anon" | "in";
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
