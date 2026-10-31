import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { H, guard } from "@/lib/community/reviewApi";
import { getStorage } from "@/lib/media/storage";
import { approvePhoto, clearCover, dismissPhotoReports, moderationList, openPhotoReports, rejectPhoto, removePhoto, setCover, setCoverCandidate, staffRole, type Decided } from "@/lib/media/photoArchive";
import { TAG_COVERS, TAG_PHOTOS } from "@/lib/live";

/* MODERASYON — yetki her istekte sunucuda: oturum + staff_roles. İstemcinin söylediği rol okunmaz. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const forbidden = () => NextResponse.json({ error: "forbidden" }, { status: 403, headers: H });

export async function GET(req: Request) {
  const g = await guard(req, { write: false });
  if (g instanceof NextResponse) return g;
  if (!(await staffRole(g.db, g.user.id))) return forbidden();
  const st = new URL(req.url).searchParams.get("status");
  const status = st === "approved" || st === "rejected" || st === "removed" ? st : "pending";
  const rows = await moderationList(g.db, status);
  const storage = getStorage();
  return NextResponse.json({ status, reported: await openPhotoReports(g.db), rows: rows.map((r) => ({ ...r, preview: storage && r.variants.length ? (r.status === "approved" ? storage.publicUrl(r.variants[r.variants.length - 1].key) : `/api/media/file/${r.variants[r.variants.length - 1].key}`) : null, variants: undefined })) }, { headers: H });
}

const Body = z.object({ id: z.string().regex(/^[0-9a-f-]{36}$/), action: z.enum(["approve", "reject", "remove", "candidate", "candidate_off", "cover", "cover_clear", "dismiss_reports"]), reason: z.string().max(300).optional(), focus: z.string().regex(/^\d{1,3}% \d{1,3}%$/).nullable().optional() }).strict();

export async function POST(req: Request) {
  const g = await guard(req, { write: true, limit: { key: "pmo", max: 300, windowSec: 3600 } });
  if (g instanceof NextResponse) return g;
  if (!(await staffRole(g.db, g.user.id))) return forbidden();
  const storage = getStorage();
  if (!storage) return NextResponse.json({ error: "storage_not_configured" }, { status: 503, headers: H });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: H });
  const { id, action, reason = "", focus } = p.data;
  const actor = `user:${g.user.id}`;
  let r: Decided | { ok: true; slug?: string };
  switch (action) {
    case "approve": r = await approvePhoto(g.db, storage, actor, id); break;
    case "reject": r = await rejectPhoto(g.db, storage, actor, id, reason); break;
    case "remove": r = await removePhoto(g.db, storage, actor, id, reason); break;
    case "candidate": r = await setCoverCandidate(g.db, actor, id, true); break;
    case "candidate_off": r = await setCoverCandidate(g.db, actor, id, false); break;
    case "cover": r = await setCover(g.db, actor, id, focus); break;
    case "cover_clear": r = await clearCover(g.db, actor, id); break;
    case "dismiss_reports": await dismissPhotoReports(g.db, actor, id); r = { ok: true }; break;
  }
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "not_found" ? 404 : 409, headers: H });
  revalidateTag(TAG_PHOTOS); revalidateTag(TAG_COVERS);
  return NextResponse.json(r, { headers: H });
}
