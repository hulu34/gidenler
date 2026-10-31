import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/community/http";
import { strictHit } from "@/lib/usage/rate";
import { hashKey } from "@/lib/ai/privacy";
import { countOp, OPS_CLIENT_KEYS } from "@/lib/ops";

/* POST /api/ops/event — sayaç. İzinli olay adları dışında bir şey kaydedilmez; gövdede sorgu metni ya da kimlik yok. */
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new NextResponse(null, { status: 403 });
  const key = (await req.json().catch(() => null) as { key?: string } | null)?.key;
  if (!key || !(OPS_CLIENT_KEYS as readonly string[]).includes(key)) return new NextResponse(null, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (!(await strictHit(`ops:${hashKey(ip)}`, 30, 3600).catch(() => true))) return new NextResponse(null, { status: 429 });
  await countOp(key);
  return new NextResponse(null, { status: 204 });
}
