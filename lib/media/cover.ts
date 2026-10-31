import type { Entity, VenuePhoto } from "@/lib/types";

/* KAPAK KARARI — tek yer. Ana sayfa, arama, kart ve profil buradan okur; sayfalar kendi seçimini yapmaz.
   Sıra: 1) editörün seçtiği Gidenler kapağı 2) hak kaydı olan mevcut kapak (işletme, kullanıcı, açık lisans)
   3) editörün kapak adayı işaretlediği onaylı fotoğraf.
   Yeni yüklenen fotoğraf kapağı kendiliğinden DEĞİŞTİRMEZ; yalnız onaylı galeride görünür.
   Google görseli burada SEÇİLMEZ ve sunucuda hiç çekilmez: yalnız izinli mekânda, kapıdan geçerek profilde gelir.
   Kapak yoksa null: yer tutucu ya da başka yerin görseli gösterilmez. */
export interface Cover { src: string; srcSet?: string; alt: string; credit: string; license?: string; source: "isletme" | "gidenler" | "commons"; focus?: string }
export interface LiveCover { src: string; srcSet?: string; credit: string; focus: string | null; selected: boolean; license?: string; alt?: string; source?: Cover["source"]; hideRegistry?: boolean }
/** Yönetici kararı: izinli fotoğraflardan hangisi kapak, hangileri yayında değil. Dosyaya ve hak kaydına dokunmaz. */
export interface RegistryState { cover?: string; hidden: string[] }
export function applyRegistry(photos: VenuePhoto[], st?: RegistryState | null): VenuePhoto[] {
  if (!st) return photos;
  const shown = photos.filter((p) => !st.hidden.includes(p.src));
  return st.cover ? [...shown.filter((p) => p.src === st.cover), ...shown.filter((p) => p.src !== st.cover)] : shown;
}
export type LiveCoverMap = Record<string, LiveCover>;

const fromLive = (name: string, c: LiveCover): Cover => ({ src: c.src, srcSet: c.srcSet, alt: c.alt ?? `${name}: Gidenler kullanıcısının fotoğrafı`, credit: c.credit, license: c.license, source: c.source ?? "gidenler", focus: c.focus ?? undefined });

export function coverOf(e: Entity, live?: LiveCover | null): Cover | null {
  if (!e.isReal || e.isDemo) return null;
  if (live?.selected && live.src) return fromLive(e.name, live);
  const list = live?.hideRegistry ? [] : e.photos ?? [];
  const p = list.find((x) => x.addedBy === "kullanıcı") ?? list.find((x) => x.addedBy === "işletme") ?? list.find((x) => x.addedBy === "commons");
  if (p) return { src: p.src, srcSet: p.srcSet, alt: p.alt, credit: p.credit, license: p.license, focus: p.focus, source: p.addedBy === "işletme" ? "isletme" : p.addedBy === "commons" ? "commons" : "gidenler" };
  return live?.src ? fromLive(e.name, live) : null;
}

export interface LivePhoto { id: string; src: string; srcSet: string; credit: string; isCover: boolean; coverCandidate: boolean; focus: string | null }
/** Profil sırası: seçili kapak, mevcut hak kayıtlı fotoğraflar, kapak adayları, diğer onaylılar.
    hasCover yanlışsa onaylı fotoğraf yalnız galeri içindir: Google kapağı varsa ilk karede o kalır. */
export function profilePhotos(e: Entity, live: LivePhoto[], reg?: RegistryState | null): { photos: VenuePhoto[]; hasCover: boolean } {
  const registry = applyRegistry(e.photos ?? [], reg);
  const toV = (p: LivePhoto): VenuePhoto => ({ src: p.src, srcSet: p.srcSet, category: "diger", alt: `${e.name}: Gidenler kullanıcısının fotoğrafı`, credit: p.credit, addedBy: "kullanıcı", focus: p.focus ?? undefined, mediaId: p.id });
  const selected = live.filter((p) => p.isCover), cand = live.filter((p) => !p.isCover && p.coverCandidate), rest = live.filter((p) => !p.isCover && !p.coverCandidate);
  return { photos: [...selected.map(toV), ...registry, ...cand.map(toV), ...rest.map(toV)], hasCover: selected.length + registry.length + cand.length > 0 };
}
