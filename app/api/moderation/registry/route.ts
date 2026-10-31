import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { H, guard } from "@/lib/community/reviewApi";
import { staffRole } from "@/lib/media/photoArchive";
import { readRegistry, setRegistry } from "@/lib/media/registry";
import { TAG_COVERS } from "@/lib/live";

/* İZİNLİ FOTOĞRAF KARARI — yalnız yönetici; rol sunucuda okunur. Bilinmeyen fotoğraf reddedilir, yeni dosya eklenemez. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Body = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,120}$/), src: z.string().max(300), action: z.enum(["cover", "cover_clear", "hide", "show"]) }).strict();

export async function GET(req: Request) {
  const g = await guard(req, { write: false });
  if (g instanceof NextResponse) return g;
  if ((await staffRole(g.db, g.user.id)) !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403, headers: H });
  return NextResponse.json({ state: Object.fromEntries(await readRegistry(g.db)) }, { headers: H });
}

export async function POST(req: Request) {
  const g = await guard(req, { write: true, limit: { key: "prg", max: 120, windowSec: 3600 } });
  if (g instanceof NextResponse) return g;
  if ((await staffRole(g.db, g.user.id)) !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403, headers: H });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: H });
  const r = await setRegistry(g.db, `user:${g.user.id}`, p.data.slug, p.data.action, p.data.src);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 404, headers: H });
  revalidateTag(TAG_COVERS);
  return NextResponse.json(r, { headers: H });
}
