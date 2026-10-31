import { NextResponse } from "next/server";
import { z } from "zod";
import { H, guard } from "@/lib/community/reviewApi";
import { getStorage } from "@/lib/media/storage";
import { REPORT_REASONS, reportPhoto } from "@/lib/media/photoArchive";

/* POST /api/media/:id/report — fotoğrafı bildir: yanlış restoran, telif, uygunsuz, kişisel veri. Giriş zorunlu; günde 20. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Body = z.object({ reason: z.enum(REPORT_REASONS), note: z.string().max(300).optional() }).strict();
const MSG = { not_found: "Fotoğraf bulunamadı.", own_photo: "Kendi fotoğrafını bildiremezsin; kaldırabilirsin.", already_reported: "Bu fotoğrafı zaten bildirdin." };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "not_found", message: MSG.not_found }, { status: 404, headers: H });
  const g = await guard(req, { write: true, limit: { key: "prp", max: 20, windowSec: 86400 } });
  if (g instanceof NextResponse) return g;
  if (!getStorage()) return NextResponse.json({ error: "not_found", message: MSG.not_found }, { status: 404, headers: H });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: H });
  const r = await reportPhoto(g.db, g.user.id, id, p.data.reason, p.data.note);
  if (!r.ok) return NextResponse.json({ error: r.error, message: MSG[r.error] }, { status: r.error === "not_found" ? 404 : 409, headers: H });
  return NextResponse.json({ ok: true }, { headers: H });
}
