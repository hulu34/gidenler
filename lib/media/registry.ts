import { desc, eq, and } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { Db } from "@/lib/db/client";
import { auditLog, fieldProvenance, places, photoAssets } from "@/lib/db/schema";
import { atomic } from "@/lib/profile";
import { realEntities } from "@/data/real";
import type { RegistryState } from "./cover";

/* İZİNLİ FOTOĞRAF EDİTÖRÜ — dosyadaki hak kayıtlı fotoğraflar için yönetici kararı: kapak, yayında, yayında değil.
   Yeni dosya ya da yeni hak kaydı buradan eklenemez; onlar kaynak denetimiyle izinli-fotograflar.json'a girer.
   Yer: field_provenance "media.registry" (yeni tablo yok). Ekleme yönlü; en yeni satır geçerlidir, geçmiş kalır. */
export const REGISTRY_FIELD = "media.registry";

const parse = (v: string | null): RegistryState | null => {
  try {
    const j = JSON.parse(v ?? "") as RegistryState;
    return Array.isArray(j.hidden) ? { cover: typeof j.cover === "string" ? j.cover : undefined, hidden: j.hidden.filter((x) => typeof x === "string") } : null;
  } catch { return null; }
};

export async function readRegistry(db: Db, slug?: string) {
  const rows = await db.select({ slug: places.slug, value: fieldProvenance.value }).from(fieldProvenance).innerJoin(places, eq(places.id, fieldProvenance.placeId))
    .where(slug ? and(eq(fieldProvenance.field, REGISTRY_FIELD), eq(places.slug, slug)) : eq(fieldProvenance.field, REGISTRY_FIELD)).orderBy(desc(fieldProvenance.fetchedAt), desc(fieldProvenance.id));
  const out = new Map<string, RegistryState>();
  const seen = new Set<string>();
  for (const r of rows) { if (seen.has(r.slug)) continue; seen.add(r.slug); const st = parse(r.value); if (st) out.set(r.slug, st); }
  return out;
}

export type RegistryAction = "cover" | "cover_clear" | "hide" | "show";
export async function setRegistry(db: Db, actor: string, slug: string, action: RegistryAction, src: string) {
  const e = realEntities.find((x) => x.slug === slug);
  if (!e || !(e.photos ?? []).some((p) => p.src === src)) return { ok: false as const, error: "not_found" };
  const [place] = await db.select({ id: places.id }).from(places).where(eq(places.slug, slug)).limit(1);
  if (!place) return { ok: false as const, error: "not_found" };
  const now = (await readRegistry(db, slug)).get(slug) ?? { hidden: [] };
  const next: RegistryState = { cover: now.cover, hidden: [...now.hidden] };
  if (action === "cover") { next.cover = src; next.hidden = next.hidden.filter((x) => x !== src); }
  if (action === "cover_clear" && next.cover === src) next.cover = undefined;
  if (action === "hide") { next.hidden = [...new Set([...next.hidden, src])]; if (next.cover === src) next.cover = undefined; }
  if (action === "show") next.hidden = next.hidden.filter((x) => x !== src);
  const stamp = new Date();
  await atomic(db, (q) => [
    q.insert(fieldProvenance).values({ id: uuidv7(), placeId: place.id, field: REGISTRY_FIELD, value: JSON.stringify(next), provider: "admin", fetchedAt: stamp }),
    q.insert(auditLog).values({ id: uuidv7(), actor, action: `registry_${action}`, refTable: "places", refId: place.id, detail: { slug, src, state: next } }),
  ]);
  /* yönetici kayıtlı fotoğrafı kapak yaptıysa, kullanıcı fotoğrafından seçilmiş kapak iner: tek kapak kuralı */
  if (action === "cover") await db.update(photoAssets).set({ isCover: false }).where(and(eq(photoAssets.placeId, place.id), eq(photoAssets.isCover, true))).catch(() => {});
  return { ok: true as const, state: next };
}
