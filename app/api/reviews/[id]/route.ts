import { revalidateTag } from "next/cache";
import { getStorage } from "@/lib/media/storage";
import { removeReviewPhotos } from "@/lib/media/photoArchive";
import { TAG_COVERS, TAG_PHOTOS } from "@/lib/live";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { deleteReview, updateReview } from "@/lib/community/reviews";
import { rulesFor } from "@/lib/community/reviewRules";
import { H, ReviewBody, fail, guard, refresh } from "@/lib/community/reviewApi";
import { places, reviews } from "@/lib/db/schema";

/* PATCH /api/reviews/:id — kendi deneyimini düzenle · DELETE — kendi deneyimini sil (kamudan kalkar). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const ID = /^[0-9a-f-]{36}$/;

async function slugOfOwn(db: Parameters<typeof updateReview>[0], userId: string, id: string) {
  const [r] = await db.select({ slug: places.slug }).from(reviews).innerJoin(places, eq(places.id, reviews.placeId)).where(and(eq(reviews.id, id), eq(reviews.userId, userId)));
  return r?.slug ?? null;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!ID.test(id)) return fail("not_found", 404);
  const g = await guard(req, { write: true, limit: { key: "rve", max: 30, windowSec: 3600 } });
  if (g instanceof NextResponse) return g;
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: H }); }
  const p = ReviewBody.safeParse(raw);
  if (!p.success) return NextResponse.json({ error: "invalid_body", message: "Form eksik ya da hatalı." }, { status: 400, headers: H });
  const slug = await slugOfOwn(g.db, g.user.id, id);
  const rules = slug ? rulesFor(slug) : null;
  if (!slug || !rules) return fail("not_found", 404);
  const r = await updateReview(g.db, g.user, id, p.data, rules);
  if (!r.ok) return fail(r.error, r.error === "not_found" ? 404 : r.error === "moderated" ? 403 : 400);
  refresh(slug);
  return NextResponse.json(r, { headers: H });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!ID.test(id)) return fail("not_found", 404);
  const g = await guard(req, { write: true, limit: { key: "rvd", max: 30, windowSec: 3600 } });
  if (g instanceof NextResponse) return g;
  const slug = await slugOfOwn(g.db, g.user.id, id);
  const r = await deleteReview(g.db, g.user.id, id);
  if (!r.ok) return fail(r.error, 404);
  if (slug) refresh(slug);
  /* deneyim silinince fotoğrafları da yayından çıkar */
  const storage = getStorage();
  if (storage) { await removeReviewPhotos(g.db, storage, g.user.id, id).catch(() => {}); revalidateTag(TAG_PHOTOS); revalidateTag(TAG_COVERS); }
  return NextResponse.json({ ok: true }, { headers: H });
}
