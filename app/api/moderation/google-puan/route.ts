import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { H, guard } from "@/lib/community/reviewApi";
import { staffRole } from "@/lib/media/photoArchive";
import { dailyReport, recordDecision } from "@/lib/gpuan/store";
import { TAG_GPUAN } from "@/lib/gpuan/read";

/* YÖNETİM · GOOGLE PUANI — yetki her istekte sunucuda: oturum + staff_roles. Karar gerekçesiyle denetim kaydına yazılır. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const forbidden = () => NextResponse.json({ error: "forbidden" }, { status: 403, headers: H });

export async function GET(req: Request) {
  const g = await guard(req, { write: false });
  if (g instanceof NextResponse) return g;
  if (!(await staffRole(g.db, g.user.id))) return forbidden();
  return NextResponse.json(await dailyReport(g.db), { headers: H });
}

const Body = z.object({ slug: z.string().regex(/^[a-z0-9-]{2,120}$/), placeId: z.string().regex(/^[A-Za-z0-9_-]{16,300}$/), decision: z.enum(["onay", "ret"]), note: z.string().min(12).max(500) }).strict();
export async function POST(req: Request) {
  const g = await guard(req, { write: true, limit: { key: "gpk", max: 200, windowSec: 3600 } });
  if (g instanceof NextResponse) return g;
  const role = await staffRole(g.db, g.user.id);
  if (role !== "admin") return forbidden();
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid", message: "Gerekçe en az 12 karakter olmalı." }, { status: 400, headers: H });
  const r = await recordDecision(g.db, { ...p.data, actor: `user:${g.user.id}` });
  if (r.ok) revalidateTag(TAG_GPUAN);
  return NextResponse.json(r, { status: r.ok ? 200 : 400, headers: H });
}
