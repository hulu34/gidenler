import { NextResponse } from "next/server";
import { z } from "zod";
import { createReview } from "@/lib/community/reviews";
import { rulesFor } from "@/lib/community/reviewRules";
import { H, ReviewBody, fail, guard, lockOnce, refresh } from "@/lib/community/reviewApi";
import { countable, recordSignal } from "@/lib/signals";

/* POST /api/reviews — deneyim yayınla. Giriş zorunlu; kullanıcı başına saatte 5, aynı mekân ve aynı ziyaret ayı için tek etkin deneyim; aynı gönderimin tekrarı tek kayıt. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = ReviewBody.extend({ slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/) }).strict();

export async function POST(req: Request) {
  const g = await guard(req, { write: true, limit: { key: "rvc", max: 5, windowSec: 3600 } });
  if (g instanceof NextResponse) return g;
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: H }); }
  const p = Body.safeParse(raw);
  if (!p.success) return NextResponse.json({ error: "invalid_body", message: "Form eksik ya da hatalı." }, { status: 400, headers: H });
  const { slug, ...input } = p.data;
  const rules = rulesFor(slug);
  if (!rules) return fail("unknown_place", 404);
  if (!(await lockOnce(`${g.user.id}:${slug}`))) return NextResponse.json({ error: "busy", message: "Deneyimin zaten gönderiliyor." }, { status: 409, headers: H });
  const r = await createReview(g.db, g.user, slug, input, rules);
  if (!r.ok) return r.error === "exists" ? NextResponse.json({ error: "exists", id: r.id, message: "Bu ay için bu mekâna zaten bir deneyimin var; onu düzenleyebilirsin. Başka bir ziyaret için farklı ayı seç." }, { status: 409, headers: H }) : fail(r.error, r.error === "unknown_place" ? 404 : 400);
  /* aynı gönderimin tekrarı: yeni kayıt yok, puan yeniden hesaplanmaz */
  if (r.replay) return NextResponse.json(r, { status: 200, headers: H });
  refresh(slug);
  /* keşif sinyali: yalnız yayımlanan deneyim, gerçek kullanıcı (test/işletme hesabı değil), test isteği değil */
  if (r.status === "published" && (g.user as { kind?: string | null }).kind !== "test" && (g.user as { kind?: string | null }).kind !== "business" && countable(req.headers))
    await recordSignal(g.db, { slug, kind: "review", who: [`kullanici:${g.user.id}`] }).catch(() => {});
  return NextResponse.json(r, { status: 201, headers: H });
}
