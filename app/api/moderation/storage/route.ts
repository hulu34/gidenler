import { NextResponse } from "next/server";
import { H, guard } from "@/lib/community/reviewApi";
import { getStorage, storageConfigIssue } from "@/lib/media/storage";
import { checkStorage } from "@/lib/media/storageCheck";
import { staffRole } from "@/lib/media/photoArchive";

/* POST — depolama denemesi. Yalnız yönetici. Gerçek kovaya küçük test dosyası yazar ve siler. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(req: Request) {
  const g = await guard(req, { write: true, limit: { key: "pck", max: 20, windowSec: 3600 } });
  if (g instanceof NextResponse) return g;
  if ((await staffRole(g.db, g.user.id)) !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403, headers: H });
  const issue = storageConfigIssue();
  if (issue) return NextResponse.json({ ok: false, error: issue }, { status: 409, headers: H });
  const storage = getStorage();
  if (!storage) return NextResponse.json({ ok: false, error: "storage_not_configured" }, { status: 503, headers: H });
  return NextResponse.json(await checkStorage(storage), { headers: H });
}
