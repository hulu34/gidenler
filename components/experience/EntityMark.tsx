/**
 * Görsel aile — uzaktan resim yok, performans bozulmaz.
 * Kategoriye göre ton + baş harf: kartlar birbirinin kopyası görünmez,
 * ama fotoğraf varmış gibi de davranmaz.
 */
const HUE: Record<string, string> = {
  "cat.restaurant": "#8f6206", "cat.cafe": "#6b4a1f", "cat.hotel": "#1f4b6b", "cat.bar": "#4a2a6b", "cat.place": "#2f6b3a",
  "cat.culture": "#6b1f3a", "cat.show": "#8a2b1f", "cat.venue": "#3a3a6b", "cat.travel": "#1f6b66", "cat.service": "#5a5a5a",
  "cat.film": "#2b2b2b", "cat.physician": "#4a5a6b", "cat.dentist": "#4a5a6b", "cat.lawyer": "#4a5a6b",
};
export function EntityMark({ name, categoryId, size = 28 }: { name: string; categoryId: string; size?: number }) {
  const c = HUE[categoryId] ?? "#555";
  const letter = name.replace(/^(Dr|Dt|Av)\.\s*/, "").replace(/^["“]/, "").trim().charAt(0).toLocaleUpperCase("tr");
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center font-extrabold leading-none text-white"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${c}, ${c}cc)`, fontSize: Math.round(size * 0.46), borderRadius: 3 }}>
      {letter}
    </span>
  );
}
