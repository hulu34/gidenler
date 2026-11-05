import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { sameOrigin } from "@/lib/community/http";
import { CLIENT_KINDS, countable, recordSignal, type SignalKind } from "@/lib/signals";
import { realEntities } from "@/data/real";
import { DEMO_VISIBLE } from "@/data/demoFlag";

/* POST /api/sinyal — gerçek mekân profilinde anlamlı etkileşim (ziyaret, gitmek istiyorum, dış yönlendirme).
   Yalnız sitenin kendi sayfasından; bot, test ve önyükleme istekleri sayılmaz. Yanıt her zaman 204 (bilgi sızdırmaz). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const REAL = new Set(realEntities.map((e) => e.slug));
const Body = z.object({ slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/), kind: z.enum(CLIENT_KINDS as [SignalKind, ...SignalKind[]]) }).strict();
const none = () => new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  if (DEMO_VISIBLE || !sameOrigin(req) || !countable(req.headers)) return none();
  let raw: unknown; try { raw = JSON.parse(await req.text()); } catch { return none(); }
  const p = Body.safeParse(raw);
  if (!p.success || !REAL.has(p.data.slug)) return none();
  const db = getDb(); if (!db) return none();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  try { await recordSignal(db, { slug: p.data.slug, kind: p.data.kind, who: [ip, req.headers.get("user-agent") ?? ""] }); } catch { /* sinyal yazılamazsa sayfa etkilenmez */ }
  return none();
}
