import type { Entity } from "@/lib/types";

/**
 * KÜÇÜK MONOKROM KATEGORİ İŞARETİ
 * 16px çizgi ikon, currentColor. Fotoğraf değil, avatar değil, renk değil —
 * yalnızca "bu bir lokanta / otel / sahne" diyen sessiz bir işaret.
 */
type Family = "dining" | "cafe" | "hotel" | "bar" | "place" | "culture" | "show" | "venue" | "travel" | "film" | "service" | "professional";

const FAMILY_OF: Record<string, Family> = {
  "cat.restaurant": "dining", "cat.cafe": "cafe", "cat.hotel": "hotel", "cat.bar": "bar",
  "cat.place": "place", "cat.culture": "culture", "cat.show": "show", "cat.venue": "venue",
  "cat.travel": "travel", "cat.film": "film", "cat.service": "service",
  "cat.physician": "professional", "cat.dentist": "professional", "cat.lawyer": "professional",
};

export function glyphFamily(e: Pick<Entity, "categoryId" | "subcategory">): Family {
  const base = FAMILY_OF[e.categoryId] ?? "place";
  const sub = e.subcategory ?? "";
  if (base === "show" && sub === "Sergi") return "culture";
  if (base === "venue" && sub === "Sinema") return "film";
  return base;
}

const P: Record<Family, string> = {
  dining: "M4 2v6a2 2 0 0 0 2 2v4M6 2v4M8 2v4M12 2c-1.5 1.5-1.5 4 0 6v6",
  cafe: "M3 6h8v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM11 7h1.5a1.5 1.5 0 0 1 0 3H11M4 3.5v1M6.5 3v1.5M9 3.5v1",
  hotel: "M3 14V4h10v10M6 7h1M9 7h1M6 10h1M9 10h1M7 14v-2h2v2",
  bar: "M4 3h8l-4 5zM8 8v5M6 13h4",
  place: "M2 13h12M3 13V8h2v5M6 13V6h3v7M10 13V9h3v4M7.5 6V4",
  culture: "M3 3h10v9H3zM5 10l2.5-3 2 2 1.5-2 1 3",
  show: "M2 3h12M3 3c0 4 1 6 3 8v2M13 3c0 4-1 6-3 8v2M8 5v2",
  venue: "M2 12h12M3 12V9h2v3M6.5 12V8h3v4M11 12V9h2v3M4 4h8v2H4z",
  travel: "M2 11h12M4 11c1-3 3-4 5-3s3 2 4 3M11 4.5a2 2 0 1 0 0 .01",
  film: "M2 3h12v10H2zM2 6h12M2 10h12M5 3v10M11 3v10",
  service: "M3 6l1-3h8l1 3M3 6h10v7H3zM7 9h2v4H7z",
  professional: "M4 2h8v12H4zM6 5h4M6 8h4M6 11h2",
};

export function CategoryGlyph({ entity, className = "" }: { entity: Pick<Entity, "categoryId" | "subcategory">; className?: string }) {
  const f = glyphFamily(entity);
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" className={`inline-block shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={P[f]} />
    </svg>
  );
}
