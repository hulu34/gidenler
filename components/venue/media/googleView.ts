"use client";

import { useEffect, useState } from "react";
import type { ViewPhoto } from "./photos";

/* ──────────────────────────────────────────────────────────────────────────
   GOOGLE GÖRÜNÜMÜ — yalnız kullanıcı isteyince (requestGoogleView) ve sayfa başına TEK istek; bütün parçalar paylaşır.
   · Sayfa açılışı ücretli çağrı yapmaz; izinli mekânda bile düğmeye basılana kadar istek yok. Sunucuda izin kapısı ayrıca çalışır.
   · Puan rozeti, kapak mozaiği, yorum bölümü ve fotoğraflar sayfası aynı sözü (promise) kullanır:
     aynı sayfada ikinci istek yok; mekân → fotoğraflar sayfası geçişinde de tekrar istek yok.
   · Bellekte yalnız bu sekmenin ömrü boyunca tutulur (sayfa yenilenince biter); hiçbir yere yazılmaz.
   · Hata, bütçe sınırı ya da eşleşme yoksa "off/limited": parçalar sessizce Gidenler verisine döner.
   ────────────────────────────────────────────────────────────────────────── */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export interface GReview { author: string; authorUri?: string; authorPhoto?: string; rating: number; text: string; when: string; uri?: string; flagUri?: string; translated?: boolean }
export interface GRef { name: string; w?: number; h?: number; author: string; authorUri?: string; authorPhoto?: string; mapsUri?: string; flagUri?: string }
export interface GView { rating?: number; count?: number; mapsUri?: string; hours: string[]; reviews: GReview[]; photos: ViewPhoto[]; refs: GRef[]; total: number }
export type GState = { k: "idle" } | { k: "loading" } | { k: "ok"; v: GView } | { k: "off" } | { k: "limited" };

type Raw = { src: string; author: string; authorUri?: string; authorPhoto?: string; w?: number; h?: number; mapsUri?: string; flagUri?: string };
/* sourceUrl = fotoğrafın Google Haritalar'daki kaynağı (zorunlu doğrudan erişim); flagUri = içerik bildirme */
const toPhoto = (p: Raw): ViewPhoto => ({ src: p.src, alt: "Google Haritalar fotoğrafı", source: "google", category: "diger", author: p.author, authorUri: p.authorUri, authorPhoto: p.authorPhoto, w: p.w, h: p.h, sourceUrl: p.mapsUri, flagUri: p.flagUri });

const cache = new Map<string, Promise<GState>>();
export function loadGoogleView(slug: string): Promise<GState> {
  let p = cache.get(slug);
  if (!p) {
    p = fetch(`${BASE}/api/google/place/?slug=${encodeURIComponent(slug)}&part=view`, { cache: "no-store" })
      .then(async (r) => ({ status: r.status, j: await r.json().catch(() => null) }))
      .then(({ status, j }): GState => {
        if (status === 200 && j && !j.disabled && !j.error && !j.unmatched) {
          return { k: "ok", v: { rating: j.rating, count: j.count, mapsUri: j.mapsUri, hours: j.hours ?? [], reviews: j.reviews ?? [], photos: (j.photos ?? []).map(toPhoto), refs: j.refs ?? [], total: j.photoTotal ?? 0 } };
        }
        return j?.limited ? { k: "limited" } : { k: "off" };
      })
      .catch((): GState => ({ k: "off" }));
    /* başarısız sonuç önbellekte kalmaz: sonraki sayfa açılışında yeniden denenebilir */
    p.then((s) => { if (s.k !== "ok") cache.delete(slug); });
    cache.set(slug, p);
  }
  return p;
}

/* Tek kapak: ayrı ve ucuz yol (Details yalnız photos + 1 Photo). Puan ve yorum isteğinden bağımsız. */
export type CoverState = { k: "idle" | "loading" | "off" | "limited" } | { k: "ok"; photos: ViewPhoto[]; refs: GRef[]; total: number };
const coverCache = new Map<string, Promise<CoverState>>();
export function useGoogleCover(slug: string, enabled: boolean) {
  const [s, setS] = useState<CoverState>({ k: enabled ? "idle" : "off" });
  const request = () => {
    if (!enabled) return;
    setS({ k: "loading" });
    let p = coverCache.get(slug);
    if (!p) {
      p = fetch(`${BASE}/api/google/place/?slug=${encodeURIComponent(slug)}&part=cover`, { cache: "no-store" })
        .then(async (r) => ({ status: r.status, j: await r.json().catch(() => null) }))
        .then(({ status, j }): CoverState => (status === 200 && j && !j.disabled && !j.error && !j.unmatched
          ? { k: "ok", photos: (j.photos ?? []).map(toPhoto), refs: j.refs ?? [], total: j.photoTotal ?? 0 }
          : j?.limited ? { k: "limited" } : { k: "off" }))
        .catch((): CoverState => ({ k: "off" }));
      p.then((v) => { if (v.k !== "ok") coverCache.delete(slug); });
      coverCache.set(slug, p);
    }
    p.then(setS);
  };
  return { state: s, request };
}

/* Kullanıcı isteği: bu sekmede hangi mekân için Google içeriği istendi. Yalnız bu çağrı isteği başlatır. */
const requested = new Set<string>();
const listeners = new Set<() => void>();
export function requestGoogleView(slug: string) {
  requested.add(slug);
  listeners.forEach((l) => l());
}

export function useGoogleView(slug: string, enabled: boolean): GState {
  const [s, setS] = useState<GState>(enabled ? { k: "idle" } : { k: "off" });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const start = () => {
      if (!requested.has(slug)) return;
      setS({ k: "loading" });
      loadGoogleView(slug).then((r) => {
        if (!alive) return;
        setS(r);
        /* Google içeriği gösteriliyor: Google olmayan harita (OSM) gizlenir */
        if (r.k === "ok") window.dispatchEvent(new CustomEvent("gidenler:google"));
      });
    };
    start();
    listeners.add(start);
    return () => { alive = false; listeners.delete(start); };
  }, [slug, enabled]);
  return s;
}

/** Galeride kalan Google fotoğrafları (yalnız Photo istekleri; en çok 5'er). */
export async function loadMoreGooglePhotos(slug: string, refs: GRef[]): Promise<ViewPhoto[] | null> {
  if (!refs.length) return [];
  try {
    const r = await fetch(`${BASE}/api/google/place/?slug=${encodeURIComponent(slug)}&part=media`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refs: refs.slice(0, 5) }),
    });
    const j = await r.json().catch(() => null);
    return r.ok && Array.isArray(j?.photos) ? j.photos.map(toPhoto) : null;
  } catch { return null; }
}
