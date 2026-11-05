import { NextResponse } from "next/server";
import { z } from "zod";
import { getEntity } from "@/data/entities";
import { fetchGoogleRating, googleEnabled, type GoogleRating } from "@/lib/providers/google";
import { strictHit } from "@/lib/usage/rate";
import { hashKey } from "@/lib/ai/privacy";
import { sameOrigin } from "@/lib/community/http";

/* POST /api/google/puanlar { slugs } — ana sayfa "Google puanı" sekmesi. YALNIZ kullanıcı tıklayınca.
   En çok 5 mekân · kişi başı saatte 3 istek (en çok 15 Google çağrısı) · bot/otomasyon yok · yanıt saklanmaz, önbellek yok. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const H = { "Cache-Control": "no-store" };
const MAX = 5;
const Body = z.object({ slugs: z.array(z.string().min(1).max(120).regex(/^[a-z0-9-]+$/)).min(1).max(MAX) }).strict();
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|headless|lighthouse|pagespeed|preview|curl|wget|python|axios|node-fetch|playwright/i;

export async function POST(req: Request) {
  if (!googleEnabled()) return NextResponse.json({ disabled: true }, { headers: H });
  if (!sameOrigin(req) || BOT.test(req.headers.get("user-agent") ?? "")) return NextResponse.json({ disabled: true }, { headers: H });
  let raw: unknown; try { raw = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: H }); }
  const p = Body.safeParse(raw);
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: H });
  const slugs = [...new Set(p.data.slugs)].filter((s) => getEntity(s)?.isReal);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  if (!(await strictHit(`gpr:${hashKey("ip:" + ip)}:h${Math.floor(Date.now() / 3_600_000)}`, 3, 3700))) return NextResponse.json({ limited: true, reason: "rate" }, { status: 429, headers: H });
  const out: GoogleRating[] = []; let limited = false;
  for (const s of slugs) {
    const r = await fetchGoogleRating(s);
    if (r.state === "ok") out.push(r.data);
    else if (r.state === "limit") { limited = true; break; }
  }
  return NextResponse.json({ ratings: out, limited }, { headers: H });
}
