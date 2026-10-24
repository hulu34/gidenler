import { NextResponse } from "next/server";
import { feedbackStore } from "@/lib/ai/feedback";
import { FeedbackSchema } from "@/lib/ai/schema";
import { checkRate } from "@/lib/ai/ratelimit";

/* POST /api/ai/feedback — anonim sinyal (click | save | choose_other | helpful | unhelpful | wrong_info). Kimlik, IP, metin kaydedilmez. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const p = FeedbackSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const rl = await checkRate(ip, null);
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });
  await feedbackStore().addFeedback({ ...p.data, ts: Date.now() });
  return NextResponse.json({ ok: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
