import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { rateStore } from "@/lib/ai/ratelimit";
import { sameOrigin } from "@/lib/community/http";
import { PLACE_STATES, importPlaceStates, listPlaceStates, setPlaceState } from "@/lib/community/placeStatus";

/* /api/me/places — oturumdaki kullanıcının Kaydet / Gitmek istiyorum / Gittim durumları.
   · Yalnız giriş yapmış kullanıcı, yalnız kendi kaydı (kullanıcı kimliği oturumdan; istemciden alınmaz).
   · Yazma: aynı kökenden gelmeli (Origin = site), JSON gövde, kullanıcı başına dakikada 60 istek.
   · Hiçbir yanıt önbelleğe alınmaz. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const H = { "cache-control": "no-store" };
const slug = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/);
const state = z.enum(PLACE_STATES);
const Body = z.union([
  z.object({ slug, state }).strict(),
  z.object({ import: z.array(z.object({ slug, state }).strict()).max(500) }).strict(),
]);

async function who(req: Request) {
  const db = getDb();
  if (!db) return { res: NextResponse.json({ error: "no_database" }, { status: 503, headers: H }) };
  const user = await currentUser(req.headers);
  if (!user) return { res: NextResponse.json({ error: "unauthorized" }, { status: 401, headers: H }) };
  return { db, user };
}

export async function GET(req: Request) {
  const w = await who(req);
  if ("res" in w) return w.res;
  return NextResponse.json({ states: await listPlaceStates(w.db, w.user.id) }, { headers: H });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: H });
  const w = await who(req);
  if ("res" in w) return w.res;
  const minute = Math.floor(Date.now() / 60000);
  if ((await rateStore().incr(`ps:${w.user.id}:m${minute}`, 70)) > 60) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: H });
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: H }); }
  const p = Body.safeParse(raw);
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: H });
  if ("import" in p.data) {
    const added = await importPlaceStates(w.db, w.user.id, p.data.import);
    return NextResponse.json({ added, states: await listPlaceStates(w.db, w.user.id) }, { headers: H });
  }
  const r = await setPlaceState(w.db, w.user.id, p.data.slug, p.data.state);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 404, headers: H });
  return NextResponse.json(r, { headers: H });
}
