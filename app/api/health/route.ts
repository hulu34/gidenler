import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { places, placeIdentifiers } from "@/lib/db/schema";
import { getRedis } from "@/lib/usage/redis";
import { usageSnapshot } from "@/lib/usage/counter";
import { authConfigured } from "@/lib/auth";
import { googleEnabled } from "@/lib/providers/google";

/* GET /api/health — altyapı durumu. Gizli değer DÖNDÜRMEZ; yalnız açık/kapalı, sayılar ve gecikme. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = { at: new Date().toISOString(), region: process.env.VERCEL_REGION ?? null };
  const db = getDb();
  if (!db) out.db = { configured: false };
  else {
    const t0 = Date.now();
    try {
      const [p] = await db.select({ n: sql<number>`count(*)::int` }).from(places);
      const [pilot] = await db.select({ n: sql<number>`count(*)::int` }).from(places).where(sql`${places.isPilot} = true`);
      const ids = await db.select({ provider: placeIdentifiers.provider, status: placeIdentifiers.status, n: sql<number>`count(*)::int` })
        .from(placeIdentifiers).groupBy(placeIdentifiers.provider, placeIdentifiers.status);
      out.db = { configured: true, ok: true, ms: Date.now() - t0, places: Number(p.n), pilot: Number(pilot.n), identifiers: ids };
    } catch (e) {
      out.db = { configured: true, ok: false, ms: Date.now() - t0, error: e instanceof Error ? e.message.slice(0, 120) : "error" };
    }
  }
  const r = getRedis();
  if (!r) out.redis = { configured: false };
  else {
    const t0 = Date.now();
    try { await r.set("health:ping", String(Date.now()), { ex: 60 }); out.redis = { configured: true, ok: true, ms: Date.now() - t0, usage: await usageSnapshot() }; }
    catch { out.redis = { configured: true, ok: false, ms: Date.now() - t0 }; }
  }
  out.auth = { configured: authConfigured() };
  out.google = { enabled: googleEnabled() };
  out.gemini = { configured: !!process.env.GEMINI_API_KEY };
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
