import { NextResponse } from "next/server";
import { getEntity } from "@/data/entities";
import { listPlaceVideos } from "@/lib/media/store";

/* GET /api/media/<slug> — mekânın onaylı videoları (yalnız platform + kimlik + atıf). Google'a ya da video
   platformlarına istek ATMAZ; kendi veritabanımızı okur. Kısa süre CDN önbelleği. */
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = getEntity(slug);
  if (!e || !e.isReal) return NextResponse.json({ videos: [] }, { headers: { "Cache-Control": "public, s-maxage=300" } });
  const videos = await listPlaceVideos(slug).catch(() => []);
  return NextResponse.json({ videos }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
