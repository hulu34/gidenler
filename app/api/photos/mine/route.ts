import { NextResponse } from "next/server";
import { H, guard } from "@/lib/community/reviewApi";
import { getStorage } from "@/lib/media/storage";
import { myPhotos } from "@/lib/media/photoArchive";

/* GET — yalnız oturumdaki kullanıcının fotoğrafları. Başka kullanıcı kimliği parametre olarak alınmaz. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const g = await guard(req, { write: false });
  if (g instanceof NextResponse) return g;
  if (!getStorage()) return NextResponse.json({ enabled: false, photos: [] }, { headers: H });
  const rows = await myPhotos(g.db, g.user.id);
  return NextResponse.json({ enabled: true, photos: rows.map((p) => ({ id: p.id, status: p.status, rejectReason: p.rejectReason, reviewId: p.reviewId, slug: p.slug, name: p.name, thumb: p.status !== "rejected" && p.variants[0] ? `/api/media/file/${p.variants[0].key}` : null })) }, { headers: H });
}
