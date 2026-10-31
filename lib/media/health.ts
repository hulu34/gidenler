import { sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { realEntities } from "@/data/real";
import { coverOf } from "./cover";
import { allowedGoogleSlugs } from "@/lib/providers/googlePolicy";
import { coverCandidates } from "./photoArchive";
import type { MediaStorage } from "./storage";

/* MEDYA SAĞLIĞI — yalnız okuma; sayılar kayıtlardan hesaplanır, üretilmez. Tablo yoksa ya da depolama yoksa ilgili alan null döner. */
export interface MediaHealth {
  total: number; ownCover: number; ownBySource: Record<string, number>; selectedCover: number; googleOnly: number | null; noCover: number | null;
  archive: { pending: number; approved: number; rejected: number; removed: number; bySource: Record<string, number>; missingRights: number; approvedLast7: number; withGallery: number; broken: number | null } | null;
  suspiciousBranch: number | null; topRestaurants: Array<{ slug: string; n: number }>; storage: string | null;
}

export async function mediaHealth(db: Db | null, storage: MediaStorage | null): Promise<MediaHealth> {
  const live = db && storage ? await coverCandidates(db, storage).catch(() => ({} as Awaited<ReturnType<typeof coverCandidates>>)) : {};
  const toLive = (slug: string) => { const v = live[slug]; return v ? { src: v.photo.src, srcSet: v.photo.srcSet, credit: v.photo.credit, focus: v.photo.focus, selected: v.selected } : undefined; };
  const covers = realEntities.map((e) => ({ slug: e.slug, c: coverOf(e, toLive(e.slug)) }));
  const own = covers.filter((x) => x.c);
  const ownBySource: Record<string, number> = {};
  for (const x of own) ownBySource[x.c!.source] = (ownBySource[x.c!.source] ?? 0) + 1;
  const ownSet = new Set(own.map((x) => x.slug));
  const allowed = db ? await allowedGoogleSlugs(db).catch(() => null) : null;
  const allowedList = allowed ? [...allowed] : null;
  const googleOnly = allowedList ? allowedList.filter((s) => !ownSet.has(s)).length : null;
  const out: MediaHealth = {
    total: realEntities.length, ownCover: own.length, ownBySource, selectedCover: Object.values(live).filter((v) => v.selected).length, googleOnly,
    noCover: googleOnly === null ? null : realEntities.length - own.length - googleOnly, archive: null, suspiciousBranch: null, topRestaurants: [], storage: storage?.provider ?? null,
  };
  if (!db) return out;
  try {
    const rows = (await db.execute(sql`select m.status, m.source, count(*)::int n, sum(case when coalesce(a.rights_statement,'')='' then 1 else 0 end)::int nr,
      sum(case when a.approved_at > now() - interval '7 days' and m.status='approved' then 1 else 0 end)::int d7 from photo_assets a join media_items m on m.id=a.media_id group by 1,2`)) as unknown as { rows?: Array<{ status: string; source: string; n: number; nr: number; d7: number }> };
    const list = rows.rows ?? (rows as unknown as Array<{ status: string; source: string; n: number; nr: number; d7: number }>);
    const a = { pending: 0, approved: 0, rejected: 0, removed: 0, bySource: {} as Record<string, number>, missingRights: 0, approvedLast7: 0, withGallery: 0, broken: null as number | null };
    for (const r of list) {
      if (r.status in a) (a as unknown as Record<string, number>)[r.status] += r.n;
      if (r.status === "approved") { a.bySource[r.source] = (a.bySource[r.source] ?? 0) + r.n; a.missingRights += r.nr; }
      a.approvedLast7 += r.d7;
    }
    const top = (await db.execute(sql`select p.slug, count(*)::int n from photo_assets a join media_items m on m.id=a.media_id join places p on p.id=a.place_id where m.status='approved' group by 1 order by 2 desc limit 10`)) as unknown as { rows?: Array<{ slug: string; n: number }> };
    out.topRestaurants = top.rows ?? (top as unknown as Array<{ slug: string; n: number }>);
    a.withGallery = out.topRestaurants.length === 10
      ? (((await db.execute(sql`select count(distinct a.place_id)::int n from photo_assets a join media_items m on m.id=a.media_id where m.status='approved'`)) as unknown as { rows: Array<{ n: number }> }).rows?.[0]?.n ?? 10) : out.topRestaurants.length;
    if (storage) {
      /* kırık: onaylı kaydın en küçük dosyası depoda yok (en çok 50 örnek) */
      const sample = (await db.execute(sql`select a.variants from photo_assets a join media_items m on m.id=a.media_id where m.status='approved' order by a.created_at desc limit 50`)) as unknown as { rows?: Array<{ variants: Array<{ key: string }> }> };
      let broken = 0;
      for (const s of sample.rows ?? []) if (!(await storage.get(s.variants[0].key).catch(() => null))) broken++;
      a.broken = broken;
    }
    out.archive = a;
  } catch { /* tablo henüz yok: arşiv alanı null */ }
  return out;
}
