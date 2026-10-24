import { NextResponse } from "next/server";
import { analytics } from "@/lib/ai/budget";
import { aiConfig } from "@/lib/ai/config";
import { observability } from "@/lib/ai/feedback";
import { status } from "@/lib/ai/orchestrator";

/* GET /api/ai/admin — gözlemlenebilirlik (Bearer AI_ADMIN_TOKEN). Token yoksa uç nokta kapalıdır (404).
   Döndürülen veri: toplam sorgu, başarı/fallback oranı, gecikme, maliyet, sağlayıcı/model dağılımı, sorgu sınıfları,
   sonuçsuz/düşük güven/olumsuz geri bildirim sayıları. Kişisel veri, sorgu metni, anahtar YOK. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function GET(req: Request) {
  const token = aiConfig().adminToken;
  if (!token) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!given || !timingSafeEqual(given, token)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [s, cost, obs] = await Promise.all([status(), analytics(), observability()]);
  return NextResponse.json({ status: s, cost, observability: obs, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
