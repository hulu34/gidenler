import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { olcumOku } from "@/lib/sor/beta";

/* GET /api/sor/olcum — Sor Gidenler Beta ölçümü (Bearer SOR_OLCUM_TOKEN). Token tanımlı değilse uç nokta yok (404).
   Yalnız günlük sayaçlar: istek, AI yanıtı, kurallı yanıt nedenleri, süre aralıkları, kullanılan AI hakkı. Kişisel veri, sorgu metni, mekân yok. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const H = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const token = process.env.SOR_OLCUM_TOKEN;
  if (!token) return NextResponse.json({ error: "not_found" }, { status: 404, headers: H });
  const auth = req.headers.get("authorization") ?? "", given = Buffer.from(auth.startsWith("Bearer ") ? auth.slice(7) : ""), want = Buffer.from(token);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: H });
  const gun = Math.max(1, Math.min(35, Number(new URL(req.url).searchParams.get("gun") ?? 7) || 7));
  return NextResponse.json({ gunler: await olcumOku(gun), uretildi: new Date().toISOString() }, { headers: H });
}
