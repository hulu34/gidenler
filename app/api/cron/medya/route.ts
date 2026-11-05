import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { TAG_COVERS, TAG_PHOTOS } from "@/lib/live";
import { getDb } from "@/lib/db/client";
import { getStorage } from "@/lib/media/storage";
import { runCleanup, sweepPhotos } from "@/lib/media/photoArchive";
import { rateStore } from "@/lib/ai/ratelimit";

/* Günlük medya bakımı: sahipsiz fotoğraf taraması ve silme kuyruğu. Depolama yoksa hiçbir sorgu çalışmaz. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret ? req.headers.get("authorization") !== `Bearer ${secret}` : (await rateStore().incr(`medya-cron:h${Math.floor(Date.now() / 3600_000)}`, 3700)) > 2) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = getDb(), storage = getStorage();
  if (!db || !storage) return NextResponse.json({ skipped: "no_storage" });
  try {
    const sweep = await sweepPhotos(db, storage), cleanup = await runCleanup(db, storage);
    if (sweep.removed) { revalidateTag(TAG_PHOTOS); revalidateTag(TAG_COVERS); }
    return NextResponse.json({ sweep, cleanup });
  }
  catch { return NextResponse.json({ error: "failed" }, { status: 500 }); }
}
