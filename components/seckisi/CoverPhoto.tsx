import type { Article, Lang } from "@/lib/seckisi";

type PhotoCover = Extract<Article["cover"], { state: "var" }>;

/** Kaynak fotoğraflar değiştirilmeden, aynı kapak çerçevesinde gösterilir. */
export function CoverPhoto({ cover, lang, lazy = false }: { cover: PhotoCover; lang: Lang; lazy?: boolean }) {
  const photos = cover.leadingPhoto ? [cover.leadingPhoto, cover] : [cover];
  return (
    <span className={`absolute inset-0 ${photos.length > 1 ? "grid grid-cols-2 gap-1 bg-paper" : "block"}`}>
      {photos.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={p.src} src={p.src} alt={p.alt[lang]} loading={lazy ? "lazy" : undefined} decoding="async"
          className="h-full min-h-0 w-full min-w-0 object-cover" />
      ))}
    </span>
  );
}
