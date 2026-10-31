import { NextResponse } from "next/server";
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
  try { return NextResponse.json({ sweep: await sweepPhotos(db, storage), cleanup: await runCleanup(db, storage) }); }
  catch { return NextResponse.json({ error: "failed" }, { status: 500 }); }
}
