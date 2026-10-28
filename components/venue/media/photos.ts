"use client";

import { useCallback, useEffect, useState } from "react";
import type { VenuePhoto } from "@/lib/types";

/* Görüntüleyicinin ortak fotoğraf biçimi: her fotoğraf KAYNAĞIYLA taşınır, kaynak ekranda her zaman yazılır. */
export type PhotoSource = "gidenler" | "isletme" | "commons" | "google";
export type PhotoCat = "yemek" | "ic" | "dis" | "menu" | "diger";
export interface ViewPhoto {
  src: string; alt: string; source: PhotoSource; category: PhotoCat;
  author?: string; authorUri?: string; authorPhoto?: string; license?: string; sourceUrl?: string; w?: number; h?: number;
}

export const CAT_LABEL: Record<PhotoCat, string> = { yemek: "Yemekler", ic: "İç mekân", dis: "Dış cephe", menu: "Menü", diger: "Diğer" };
export const SOURCE_LABEL: Record<PhotoSource, string> = { gidenler: "Gidenler kullanıcısı", isletme: "İşletme", commons: "Açık lisans · Wikimedia Commons", google: "Google Maps" };

export function fromVenuePhotos(list: VenuePhoto[] = []): ViewPhoto[] {
  return list.map((p) => ({
    src: p.src, alt: p.alt, category: p.category === "icecek" ? "diger" : p.category,
    source: p.addedBy === "commons" ? "commons" : p.addedBy === "işletme" ? "isletme" : "gidenler",
    author: p.credit, license: p.license, sourceUrl: p.sourceUrl,
  }));
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
type GState = "check" | "none" | "ready" | "loading" | "limited";

/** Google fotoğrafları — yalnız kullanıcı isteyince, sayfa sayfa (her fotoğraf ayrı ücretli istek, bütçe sayacından geçer).
    Hiçbir şey saklanmaz; Google'ın verdiği geçici adres doğrudan gösterilir, sahibi ve "Google Maps" atfıyla. */
export function useGooglePhotos(slug: string, enabled: boolean) {
  const [state, setState] = useState<GState>(enabled ? "check" : "none");
  const [photos, setPhotos] = useState<ViewPhoto[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [mapsUri, setMapsUri] = useState<string | undefined>();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    /* Google'a istek değil: yalnız onaylı Google kaydı var mı (kendi veritabanımız) */
    fetch(`${BASE}/api/google/place/?slug=${encodeURIComponent(slug)}&part=status`)
      .then((r) => r.json()).then((j) => alive && setState(j?.available ? "ready" : "none")).catch(() => alive && setState("none"));
    return () => { alive = false; };
  }, [slug, enabled]);
  const load = useCallback((n = 5) => {
    setState("loading");
    fetch(`${BASE}/api/google/place/?slug=${encodeURIComponent(slug)}&part=photos&from=${photos.length}&n=${n}`, { cache: "no-store" })
      .then(async (r) => ({ status: r.status, j: await r.json().catch(() => null) }))
      .then(({ status, j }) => {
        if (status === 200 && j?.photos) {
          const add: ViewPhoto[] = j.photos.map((p: { src: string; author: string; authorUri?: string; authorPhoto?: string; w?: number; h?: number }) =>
            ({ src: p.src, alt: "Google Haritalar fotoğrafı", source: "google", category: "diger", author: p.author, authorUri: p.authorUri, authorPhoto: p.authorPhoto, w: p.w, h: p.h }));
          setPhotos((x) => [...x, ...add]); setTotal(j.photoTotal ?? null); setMapsUri(j.mapsUri); setState("ready");
          if (add.length) window.dispatchEvent(new CustomEvent("gidenler:google"));
        } else setState(j?.limited ? "limited" : "none");
      }).catch(() => setState("none"));
  }, [slug, photos.length]);
  const more = total === null || photos.length < total;
  return { state, photos, total, mapsUri, load, more };
}
