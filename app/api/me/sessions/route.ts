import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { rateStore } from "@/lib/ai/ratelimit";
import { sameOrigin } from "@/lib/community/http";
import { listSessions, revokeOtherSessions, revokeSession } from "@/lib/community/sessions";

/* /api/me/sessions — oturumdaki kullanıcının aktif cihazları.
   GET: liste (oturum anahtarı ve IP gönderilmez) · POST { revoke: id } ya da { others: true }.
   Yalnız kendi oturumları; yazma aynı kökenden, kullanıcı başına dakikada 20. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const H = { "cache-control": "no-store" };
const Body = z.union([z.object({ revoke: z.string().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/) }).strict(), z.object({ others: z.literal(true) }).strict()]);

async function who(req: Request) {
  const db = getDb();
  if (!db) return { res: NextResponse.json({ error: "no_database" }, { status: 503, headers: H }) };
  const s = await currentSession(req.headers);
  if (!s) return { res: NextResponse.json({ error: "unauthorized" }, { status: 401, headers: H }) };
  return { db, userId: s.user.id, sessionId: s.session.id };
}

export async function GET(req: Request) {
  const w = await who(req);
  if ("res" in w) return w.res;
  return NextResponse.json({ sessions: await listSessions(w.db, w.userId, w.sessionId) }, { headers: H });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: H });
  const w = await who(req);
  if ("res" in w) return w.res;
  if ((await rateStore().incr(`ses:${w.userId}:m${Math.floor(Date.now() / 60000)}`, 70)) > 20) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: H });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: H }); }
  const p = Body.safeParse(raw);
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: H });
  if ("others" in p.data) {
    const closed = await revokeOtherSessions(w.db, w.userId, w.sessionId);
    return NextResponse.json({ ok: true, closed, sessions: await listSessions(w.db, w.userId, w.sessionId) }, { headers: H });
  }
  const r = await revokeSession(w.db, w.userId, p.data.revoke, w.sessionId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "current" ? 400 : 404, headers: H });
  return NextResponse.json({ ok: true, sessions: await listSessions(w.db, w.userId, w.sessionId) }, { headers: H });
}
