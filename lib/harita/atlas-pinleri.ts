export interface AtlasNokta { slug: string; xy: readonly [number, number] }
export interface AtlasKume<T extends AtlasNokta> {
  id: string;
  xy: [number, number];
  yerler: T[];
}

/** Group intersecting hit regions in screen space. Never move a venue's own coordinates. */
export function atlasKumeleri<T extends AtlasNokta>(points: readonly T[], projectUnitsPerPx: number): AtlasKume<T>[] {
  const thresholdSquared = (32 * projectUnitsPerPx) ** 2;
  const bySlug = [...points].sort((a, b) => a.slug.localeCompare(b.slug));
  const parent = bySlug.map((_, i) => i);
  function root(i: number): number {
    if (parent[i] !== i) parent[i] = root(parent[i]);
    return parent[i];
  }
  for (let i = 0; i < bySlug.length; i++) {
    const [x, y] = bySlug[i].xy;
    for (let j = 0; j < i; j++) {
      const [xx, yy] = bySlug[j].xy;
      if ((x - xx) ** 2 + (y - yy) ** 2 < thresholdSquared) parent[root(i)] = root(j);
    }
  }
  const groups = new Map<number, T[]>();
  bySlug.forEach((p, i) => {
    const k = root(i);
    const group = groups.get(k);
    if (group) group.push(p); else groups.set(k, [p]);
  });
  function kume(yerler: T[]): AtlasKume<T> {
    let x = 0, y = 0;
    yerler.forEach((p) => { x += p.xy[0]; y += p.xy[1]; });
    return { id: yerler[0].slug, xy: [x / yerler.length, y / yerler.length], yerler };
  }
  const result = [...groups.values()].map(kume);
  // Group centroids can themselves collide even when all original cross-group
  // venue pairs are separate (for example, a ring and an isolated point).
  for (;;) {
    let merged = false;
    find: for (let i = 0; i < result.length; i++) {
      for (let j = 0; j < i; j++) {
        const [x, y] = result[i].xy, [xx, yy] = result[j].xy;
        if ((x - xx) ** 2 + (y - yy) ** 2 < thresholdSquared) {
          result[j] = kume([...result[j].yerler, ...result[i].yerler]);
          result.splice(i, 1);
          merged = true;
          break find;
        }
      }
    }
    if (!merged) return result;
  }
}
