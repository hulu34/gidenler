import { NextResponse } from "next/server";
import { z } from "zod";
import { reportReview } from "@/lib/community/reviews";
import { H, fail, guard } from "@/lib/community/reviewApi";

/* POST /api/reviews/:id/report — deneyimi bildir (moderasyon kuyruğuna). Giriş zorunlu; günde 20. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ reason: z.enum(["spam", "sahte", "hakaret", "kisisel_veri", "alakasiz", "diger"]), note: z.string().max(300).optional() }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return fail("not_found", 404);
  const g = await guard(req, { write: true, limit: { key: "rvr", max: 20, windowSec: 86400 } });
  if (g instanceof NextResponse) return g;
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: H }); }
  const p = Body.safeParse(raw);
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: H });
  const r = await reportReview(g.db, g.user.id, id, `${p.data.reason}${p.data.note ? `: ${p.data.note}` : ""}`);
  if (!r.ok) return fail(r.error, r.error === "not_found" ? 404 : 409);
  return NextResponse.json({ ok: true }, { headers: H });
}
