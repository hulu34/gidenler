import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { opsCounters } from "@/lib/db/schema";

/* ÜRÜN SAĞLIĞI SAYAÇLARI — ücretli analitik yok; yalnız gün + olay adı + sayı. Hata sayacı işlemi asla bozmaz. */
export const OPS_CLIENT_KEYS = ["search:empty", "page:error", "review:send_failed", "upload:client_failed"] as const;
export async function countOp(key: string) {
  try {
    const db = getDb();
    if (!db) return;
    await db.insert(opsCounters).values({ day: new Date().toISOString().slice(0, 10), key: key.slice(0, 60), n: 1 }).onConflictDoUpdate({ target: [opsCounters.day, opsCounters.key], set: { n: sql`${opsCounters.n} + 1` } });
  } catch { /* tablo yoksa ya da bağlantı yoksa sayılmaz */ }
}
export async function opsLastDays(days = 7): Promise<Array<{ key: string; n: number }>> {
  const db = getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  return db.select({ key: opsCounters.key, n: sql<number>`sum(${opsCounters.n})::int` }).from(opsCounters).where(sql`${opsCounters.day} >= ${since}`).groupBy(opsCounters.key).orderBy(opsCounters.key);
}
