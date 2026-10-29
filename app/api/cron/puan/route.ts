import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getDb } from "@/lib/db/client";
import { rateStore } from "@/lib/ai/ratelimit";
import { reconcileScores, scorePublishEnabled } from "@/lib/score/compute";
import { scoreTag } from "@/lib/live";

/* GÜNLÜK PUAN UZLAŞTIRMA (Vercel Cron, günde bir; vercel.json) — yalnız veritabanı, dış servis çağrısı YOK.
   Kaçan olay sonrası telafi ve tazelik etkisi. Yazma yalnız SCORE_PUBLISH=1 iken ve sonuç değiştiyse (recordScore).
   CRON_SECRET tanımlıysa Authorization: Bearer zorunlu; değilse saatte en çok 2 çalıştırma (tekrar zararsız).
   Yanıt yalnız sayılar içerir. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const H = { "cache-control": "no-store" };

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: H });
  if (!secret && (await rateStore().incr(`puan-cron:h${Math.floor(Date.now() / 3600_000)}`, 3700)) > 2) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: H });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_database" }, { status: 503, headers: H });
  try {
    const r = await reconcileScores(db);
    for (const x of r) if (x.action === "written" && x.slug) revalidateTag(scoreTag(x.slug));
    const n = (a: string) => r.filter((x) => x.action === a).length;
    return NextResponse.json({ publish: scorePublishEnabled(), places: r.length, written: n("written"), unchanged: n("unchanged"), dryRun: n("dry_run") }, { headers: H });
  } catch { return NextResponse.json({ error: "failed" }, { status: 500, headers: H }); }
}
