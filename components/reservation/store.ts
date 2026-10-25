"use client";

import { useSyncExternalStore } from "react";
import type { StoredReservation } from "@/lib/reservation";

/* Kullanıcının rezervasyon kayıtları — tarayıcıda (hesap sistemi gelene kadar). Kişisel veri (ad/telefon) SAKLANMAZ. */
const KEY = "gidenler.reservations";
const subs = new Set<() => void>();
let cache: StoredReservation[] | null = null;

function read(): StoredReservation[] {
  if (cache) return cache;
  try { cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]"); } catch { cache = []; }
  return cache!;
}
export function saveReservation(r: StoredReservation) {
  const next = [r, ...read().filter((x) => x.code !== r.code)].slice(0, 50);
  cache = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* özel pencere vb. */ }
  subs.forEach((f) => f());
}
const EMPTY: StoredReservation[] = [];
export function useReservations(): StoredReservation[] {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, read, () => EMPTY);
}
