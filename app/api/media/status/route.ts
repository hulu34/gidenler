import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getStorage } from "@/lib/media/storage";
import { MAX_PER_REVIEW } from "@/lib/media/photoArchive";
import { MAX_BYTES } from "@/lib/media/photoProcess";

/* GET /api/media/status — yükleme açık mı? Kalıcı depolama yapılandırılmamış Production'da kapalıdır; form alanı hiç görünmez. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ enabled: !!getDb() && !!getStorage(), max: MAX_PER_REVIEW, maxBytes: MAX_BYTES }, { headers: { "cache-control": "no-store" } });
}
