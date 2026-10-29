import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { rateStore } from "@/lib/ai/ratelimit";
import { sameOrigin } from "@/lib/community/http";
import { listNotifications, markNotificationsRead } from "@/lib/community/scoreWatch";

/* /api/me/bildirimler — oturumdaki kullanıcının site içi bildirimleri (e-posta/SMS/push yok).
   GET liste + okunmamış sayısı · POST {read: "<id>" | "all"} okundu işaretle (yalnız kendi bildirimleri). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const H = { "cache-control": "no-store" };
const Body = z.object({ read: z.string().min(1).max(200) }).strict();

async function who(req: Request) {
  const db = getDb();
  if (!db) return { res: NextResponse.json({ error: "no_database" }, { status: 503, headers: H }) };
  const user = await currentUser(req.headers);
  if (!user) return { res: NextResponse.json({ error: "unauthorized" }, { status: 401, headers: H }) };
  return { db, user };
}

export async function GET(req: Request) {
  const w = await who(req);
  if ("res" in w) return w.res;
  try { return NextResponse.json(await listNotifications(w.db, w.user.id), { headers: H }); }
  catch { return NextResponse.json({ error: "not_ready" }, { status: 503, headers: H }); }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: H });
  const w = await who(req);
  if ("res" in w) return w.res;
  const minute = Math.floor(Date.now() / 60000);
  if ((await rateStore().incr(`bildirim:${w.user.id}:m${minute}`, 70)) > 60) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: H });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: H }); }
  const p = Body.safeParse(raw);
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: H });
  try { return NextResponse.json(await markNotificationsRead(w.db, w.user.id, p.data.read), { headers: H }); }
  catch { return NextResponse.json({ error: "not_ready" }, { status: 503, headers: H }); }
}
