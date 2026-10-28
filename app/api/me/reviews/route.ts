import { NextResponse } from "next/server";
import { listUserReviews } from "@/lib/community/reviews";
import { H, guard } from "@/lib/community/reviewApi";

/* GET /api/me/reviews[?slug=] — oturumdaki kullanıcının kendi deneyimleri (+ kullanıcı kimliği: kendi kartını tanımak için). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req, { write: false });
  if (g instanceof NextResponse) return g;
  const slug = new URL(req.url).searchParams.get("slug");
  const all = await listUserReviews(g.db, g.user.id);
  return NextResponse.json({ userId: g.user.id, reviews: slug ? all.filter((r) => r.slug === slug) : all }, { headers: H });
}
