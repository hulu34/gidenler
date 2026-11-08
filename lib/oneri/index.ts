/* MEKÂN ÖNERİSİ — kullanıcının Gidenler'de bulamadığı yer. Öneri YAYIMLANMAZ, Google puanı ALMAZ, mekân oluşturmaz.
   Yönetici kuyruğuna girer; "kabul" yalnız mekânın doğrulama listesine alındığını gösterir (doğrulama ayrı veri hattıdır:
   OSM kaydı + Google sayfası güçlü eşleşme + kapanma denetimi). Mükerrer denetimi: var olan mekânlar ve açık öneriler. */
import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/client";
import { auditLog, venueSuggestions } from "@/lib/db/schema";
import { activeEntities, realEntities } from "@/data/real";
import { searchV3 } from "@/lib/search";

import { nameKey } from "./key";
export { nameKey };

export const DISTRICTS: string[] = [...new Set(activeEntities.map((e) => e.location?.district).filter((d): d is string => !!d))].sort((a, b) => a.localeCompare(b, "tr"));

export interface Candidate { slug: string; name: string; district: string | null; area: string | null; same: boolean; exact: boolean }
/** Var olan mekânlarda olası eşleşmeler: ad katmanında eşleşen (ilçe aynıysa `same`). Kesin kapalılar da gösterilir. */
export function candidatesFor(name: string, district: string): Candidate[] {
  const key = nameKey(name);
  const r = searchV3(name, { limit: 12 }).exact.filter((h) => h.matched.some((m) => m.endsWith(":ad")));
  const byKey = realEntities.filter((e) => nameKey(e.name) === key);
  const seen = new Set<string>(); const out: Candidate[] = [];
  for (const e of [...byKey, ...r.map((h) => h.card.entity)]) {
    if (seen.has(e.slug)) continue; seen.add(e.slug);
    out.push({ slug: e.slug, name: e.name, district: e.location?.district ?? null, area: e.location?.neighborhood ?? null, same: (e.location?.district ?? "") === district, exact: nameKey(e.name) === key });
  }
  return out.sort((a, b) => Number(b.same && b.exact) - Number(a.same && a.exact) || Number(b.exact) - Number(a.exact) || Number(b.same) - Number(a.same)).slice(0, 6);
}

export type SuggestResult =
  | { ok: true; id: string; merged: boolean }
  | { ok: false; error: "exists"; matches: Candidate[] };

export async function suggestVenue(db: Db, i: { name: string; district: string; locationNote?: string | null; userId?: string | null; force?: boolean }): Promise<SuggestResult> {
  const name = i.name.replace(/\s+/g, " ").trim();
  const cands = candidatesFor(name, i.district);
  /* aynı ilçede adı birebir aynı (anahtar) mekân varsa kullanıcıya sorulur; "farklı bir yer" derse (force) kuyruğa girer, adaylarla */
  if (!i.force && cands.some((c) => c.same && c.exact)) return { ok: false, error: "exists", matches: cands };
  const key = nameKey(name);
  const open = await db.select({ id: venueSuggestions.id }).from(venueSuggestions)
    .where(and(eq(venueSuggestions.nameKey, key), eq(venueSuggestions.district, i.district), eq(venueSuggestions.status, "open"))).limit(1);
  if (open[0]) {
    await db.update(venueSuggestions).set({ requests: sql`${venueSuggestions.requests} + 1` }).where(eq(venueSuggestions.id, open[0].id));
    return { ok: true, id: open[0].id, merged: true };
  }
  const id = `oneri_${randomUUID()}`;
  await db.insert(venueSuggestions).values({ id, name, nameKey: key, district: i.district, locationNote: i.locationNote?.trim() || null, userId: i.userId ?? null, candidates: cands });
  return { ok: true, id, merged: false };
}

export async function suggestionQueue(db: Db, status = "open", limit = 200) {
  return db.select().from(venueSuggestions).where(eq(venueSuggestions.status, status)).orderBy(desc(venueSuggestions.requests), desc(venueSuggestions.createdAt)).limit(limit);
}
export async function suggestionCounts(db: Db) {
  const rows = await db.select({ status: venueSuggestions.status, n: sql<number>`count(*)::int`, r: sql<number>`coalesce(sum(${venueSuggestions.requests}),0)::int` }).from(venueSuggestions).groupBy(venueSuggestions.status);
  return Object.fromEntries(rows.map((r) => [r.status, { n: r.n, requests: r.r }])) as Record<string, { n: number; requests: number }>;
}

export const DECISIONS = ["accepted", "duplicate", "rejected"] as const;
export async function decideSuggestion(db: Db, actor: string, id: string, decision: (typeof DECISIONS)[number], matchedSlug?: string | null, note?: string) {
  if (decision === "duplicate" && (!matchedSlug || !realEntities.some((e) => e.slug === matchedSlug))) return { ok: false as const, error: "slug_required" };
  const now = new Date();
  const r = await db.update(venueSuggestions).set({ status: decision, matchedSlug: decision === "duplicate" ? matchedSlug : null, decidedBy: actor, decidedAt: now })
    .where(and(eq(venueSuggestions.id, id), eq(venueSuggestions.status, "open"))).returning({ id: venueSuggestions.id, name: venueSuggestions.name });
  if (!r[0]) return { ok: false as const, error: "not_open" };
  await db.insert(auditLog).values({ id: `audit_${randomUUID()}`, actor, action: `venue_suggestion:${decision}`, refTable: "venue_suggestions", refId: id, detail: { matchedSlug: matchedSlug ?? null, note: note ?? null } });
  return { ok: true as const };
}
