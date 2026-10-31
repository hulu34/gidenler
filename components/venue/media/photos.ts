"use client";

import type { VenuePhoto } from "@/lib/types";

/* Görüntüleyicinin ortak fotoğraf biçimi: her fotoğraf KAYNAĞIYLA taşınır, kaynak ekranda her zaman yazılır. */
export type PhotoSource = "gidenler" | "isletme" | "commons" | "google";
export type PhotoCat = "yemek" | "ic" | "dis" | "menu" | "diger";
export interface ViewPhoto {
  focus?: string;
  src: string; alt: string; source: PhotoSource; category: PhotoCat;
  author?: string; authorUri?: string; authorPhoto?: string; license?: string; sourceUrl?: string; w?: number; h?: number;
  /** hazır boyut adımları (kendi sunduğumuz görseller) ve tam ekran sürümü */
  srcSet?: string; full?: string;
  /** Google fotoğrafı: içerik bildirme bağlantısı */
  flagUri?: string;
}

export const CAT_LABEL: Record<PhotoCat, string> = { yemek: "Yemekler", ic: "İç mekân", dis: "Dış cephe", menu: "Menü", diger: "Diğer" };
export const SOURCE_LABEL: Record<PhotoSource, string> = { gidenler: "Gidenler kullanıcısı", isletme: "İşletme", commons: "Açık lisans · Wikimedia Commons", google: "Google Maps" };

/** Wikimedia Commons küçük resimleri boyut adımlarıyla sunulur (…/1280px-Dosya.jpg): tarayıcı ekrana uygun olanı seçer.
    Kapak fotoğrafı ilk ekranda olduğu için tam boy yerine ekran genişliğine yakın sürüm iner (LCP). */
export function responsive(p: ViewPhoto, sizes: string): { srcSet?: string; sizes?: string } {
  if (p.srcSet) return { srcSet: p.srcSet, sizes };
  if (p.source !== "commons" || !/\/thumb\/.+\/\d+px-[^/]+$/.test(p.src)) return {};
  const at = (w: number) => p.src.replace(/\/\d+px-([^/]+)$/, `/${w}px-$1`);
  return { srcSet: [500, 960, 1280].map((w) => `${at(w)} ${w}w`).join(", "), sizes };
}

export function fromVenuePhotos(list: VenuePhoto[] = []): ViewPhoto[] {
  return list.map((p) => ({
    src: p.src, alt: p.alt, category: p.category === "icecek" ? "diger" : p.category,
    source: p.addedBy === "commons" ? "commons" : p.addedBy === "işletme" ? "isletme" : "gidenler",
    author: p.credit, license: p.license, sourceUrl: p.sourceUrl, srcSet: p.srcSet, full: p.full, focus: p.focus,
  }));
}
