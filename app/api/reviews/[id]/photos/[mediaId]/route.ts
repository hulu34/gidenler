import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { H, guard } from "@/lib/community/reviewApi";
import { getStorage } from "@/lib/media/storage";
import { removeOwnPhoto } from "@/lib/media/photoArchive";
import { TAG_PHOTOS, TAG_COVERS } from "@/lib/live";

/* DELETE — yükleyen kendi fotoğrafını kaldırır. Başkasınınki "bulunamadı" döner. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function DELETE(req: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const g = await guard(req, { write: true, limit: { key: "pdl", max: 30, windowSec: 3600 } });
  if (g instanceof NextResponse) return g;
  const storage = getStorage();
  if (!storage) return NextResponse.json({ error: "storage_not_configured" }, { status: 503, headers: H });
  const r = await removeOwnPhoto(g.db, storage, g.user.id, mediaId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "not_found" ? 404 : 409, headers: H });
  revalidateTag(TAG_PHOTOS); revalidateTag(TAG_COVERS);
  return NextResponse.json({ ok: true, filesDeleted: r.filesDeleted }, { headers: H });
}
