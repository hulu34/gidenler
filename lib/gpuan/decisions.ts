import { desc } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { googleRatingDecisions } from "@/lib/db/schema";
import type { Decision } from "./core";

/** Google puanı yönetici kararları: mekân başına SON karar (hafif; sayfa okuması da kullanır). */
export async function latestDecisions(db: Db): Promise<Map<string, Decision>> {
  const rows = await db.select().from(googleRatingDecisions).orderBy(desc(googleRatingDecisions.createdAt));
  const out = new Map<string, Decision>();
  for (const r of rows) if (!out.has(r.slug)) out.set(r.slug, { slug: r.slug, placeId: r.placeId, decision: r.decision as Decision["decision"], note: r.note, actor: r.actor, at: r.createdAt.toISOString() });
  return out;
}
