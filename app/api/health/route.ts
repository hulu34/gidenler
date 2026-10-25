import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getRedis } from "@/lib/usage/redis";

/* GET /api/health — herkese açık, en az bilgi: yalnız "çalışıyor mu".
   Sürüm, bölge, sayılar, hata metni, yapılandırma ayrıntısı DÖNDÜRMEZ.
   Ayrıntılı durum yalnız korumalı Preview yönetim ucunda (/api/admin/db). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ping(fn: () => Promise<unknown>) {
  try { await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]); return "ok"; }
  catch { return "fail"; }
}

export async function GET() {
  const db = getDb(), r = getRedis();
  const [dbState, redisState] = await Promise.all([
    db ? ping(() => db.execute(sql`select 1`)) : Promise.resolve("off"),
    r ? ping(() => r.get("health:ping")) : Promise.resolve("off"),
  ]);
  const ok = dbState !== "fail" && redisState !== "fail";
  return NextResponse.json({ ok, db: dbState, redis: redisState }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
