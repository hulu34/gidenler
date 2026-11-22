import { norm, type Mahalle, type Yaka } from "./semt";

export type Durum = { yaka?: Yaka; ilce?: string; mahalleKey?: string };
export type MahalleDosya = { ilce: string; mahalleler: Mahalle[] };
export type MahalleYukleme =
  | { ilce: string; durum: "bekliyor" | "hata" }
  | { ilce: string; durum: "hazir"; dosya: MahalleDosya };

/** Share only concurrent/successful imports; a transient failure must be retryable. */
export function mahalleYukleyici(load: (slug: string) => Promise<MahalleDosya>) {
  const cache = new Map<string, Promise<MahalleDosya>>();
  return (slug: string) => {
    const cached = cache.get(slug);
    if (cached) return cached;
    const request = Promise.resolve().then(() => load(slug)).catch((error: unknown) => {
      if (cache.get(slug) === request) cache.delete(slug);
      throw error;
    });
    cache.set(slug, request);
    return request;
  };
}

export function mahalleGorunumu(d: Durum, yukleme: MahalleYukleme | null) {
  const seciliYukleme = d.ilce && yukleme?.ilce === d.ilce ? yukleme : null;
  const mah = seciliYukleme?.durum === "hazir" ? seciliYukleme.dosya : null;
  const mahalle = mah && d.mahalleKey
    ? mah.mahalleler.find((m) => norm(m.ad) === d.mahalleKey)?.ad
    : undefined;
  return {
    mah,
    mahalle,
    // Preserve a deep link until we can validate it in the requested district.
    urlMahalle: d.ilce ? (mah ? (mahalle ? norm(mahalle) : undefined) : d.mahalleKey) : undefined,
    yuklemeDurumu: d.ilce ? (seciliYukleme?.durum ?? "bekliyor") : null,
  };
}

export function haritaSorgusu(d: Durum, urlMahalle: string | undefined, filtre: string) {
  const p = new URLSearchParams();
  if (d.ilce) {
    p.set("ilce", d.ilce);
    if (urlMahalle) p.set("mahalle", urlMahalle);
  } else if (d.yaka) p.set("yaka", d.yaka);
  if (filtre !== "tumu") p.set("tur", filtre);
  return p.toString();
}
