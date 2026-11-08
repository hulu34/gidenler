import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/community/http";
import { softHit } from "@/lib/usage/rate";
import { hashKey } from "@/lib/ai/privacy";
import { getDb } from "@/lib/db/client";
import { CLIENT_STEPS, isCode } from "@/lib/kampanya";
import { recordCampaign } from "@/lib/kampanya/server";

/* POST /api/kampanya — akış adımı sayacı { code, step }. Yalnız izinli kod ve istemci adımı; gövdede başka veri kabul edilmez.
   "tamam" (deneyim kaydı) ve "oneri" (mekân önerisi) burada YAZILAMAZ; sunucu gerçek kayıt oluşunca kendisi yazar. */
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new NextResponse(null, { status: 403 });
  const b = await req.json().catch(() => null) as { code?: unknown; step?: unknown } | null;
  if (!b || !isCode(b.code) || !(CLIENT_STEPS as unknown[]).includes(b.step)) return new NextResponse(null, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (!(await softHit(`kmp:${hashKey(ip)}`, 60, 3600))) return new NextResponse(null, { status: 429 });
  const db = getDb();
  if (db) await recordCampaign(db, b.code, b.step as (typeof CLIENT_STEPS)[number], req.headers).catch(() => false);
  return new NextResponse(null, { status: 204 });
}
