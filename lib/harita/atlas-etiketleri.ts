export interface AtlasEtiketKonumu { id: string; ad: string; x: number; y: number; n: number }

/** Reduce label noise on narrow city maps without hiding any region or control. */
export function mobilAtlasEtiketleri<T extends AtlasEtiketKonumu>(
  candidates: readonly T[],
  frame: { x: number; y: number; w: number; h: number },
  widthPx: number,
): T[] {
  const scale = widthPx / frame.w;
  const heightPx = frame.h * scale;
  const accepted: { label: T; left: number; right: number; top: number; bottom: number }[] = [];
  for (const label of [...candidates].sort((a, b) => b.n - a.n || a.id.localeCompare(b.id))) {
    const x = (label.x - frame.x) * scale;
    const y = (label.y - frame.y) * scale;
    // Conservative width bound for our 10px labels and a small visual gutter.
    const halfWidth = 7 + label.ad.length * 3.4;
    const rect = { label, left: x - halfWidth, right: x + halfWidth, top: y - 12, bottom: y + 6 };
    if (rect.left < 9 || rect.right > widthPx - 9 || rect.top < 12 || rect.bottom > heightPx - 9) continue;
    if (accepted.some((a) => rect.left < a.right && rect.right > a.left && rect.top < a.bottom && rect.bottom > a.top)) continue;
    accepted.push(rect);
    if (accepted.length >= 10) break;
  }
  return accepted.map((x) => x.label);
}
