import { NextResponse } from "next/server";
import { z } from "zod";
import { H, guard } from "@/lib/community/reviewApi";
import { staffRole } from "@/lib/media/photoArchive";
import { DECISIONS, decideSuggestion } from "@/lib/oneri";

/* YÖNETİM · MEKÂN ÖNERİSİ KARARI — personel oturumu şart; karar denetim kaydına yazılır. Kabul mekân OLUŞTURMAZ:
   öneri doğrulama listesine alınır (OSM + Google sayfası güçlü eşleşme + kapanma denetimi ayrı veri hattında). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Body = z.object({ id: z.string().regex(/^oneri_[0-9a-f-]{36}$/), decision: z.enum(DECISIONS), slug: z.string().regex(/^[a-z0-9-]{2,120}$/).optional(), note: z.string().max(300).optional() }).strict();

export async function POST(req: Request) {
  const g = await guard(req, { write: true, limit: { key: "mko", max: 300, windowSec: 3600 } });
  if (g instanceof NextResponse) return g;
  if (!(await staffRole(g.db, g.user.id))) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: H });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400, headers: H });
  const r = await decideSuggestion(g.db, `user:${g.user.id}`, p.data.id, p.data.decision, p.data.slug, p.data.note);
  return NextResponse.json(r, { status: r.ok ? 200 : 400, headers: H });
}
