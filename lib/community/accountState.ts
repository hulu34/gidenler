"use client";

import { useSyncExternalStore } from "react";

/* Hesap durumu (istemci): AccountSync yazar, arayüz okur. "off" = kimlik kapalı (ör. demo, yerel geliştirme). */
export type AccountStatus = "unknown" | "off" | "anon" | "in";
let status: AccountStatus = "unknown";
const subs = new Set<() => void>();
export function setAccountStatus(s: AccountStatus) { if (s !== status) { status = s; subs.forEach((f) => f()); } }
export function useAccountStatus(): AccountStatus {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => status, () => "unknown");
}
