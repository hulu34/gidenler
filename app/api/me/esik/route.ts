import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { rateStore } from "@/lib/ai/ratelimit";
import { sameOrigin } from "@/lib/community/http";
import { deleteWatch, getWatch, listWatches, parseThreshold, setWatch, setWatchActive } from "@/lib/community/scoreWatch";

/* /api/me/esik — oturumdaki kullanıcının deneme eşikleri (kişisel takip; restoran değerlendirmesi değil).
   · Kimlik yalnız oturumdan; gövdede kullanıcı alanı kabul edilmez (strict). Yazma yalnız aynı kökenden, dakikada 30.
   · GET ?slug= tek mekân (takip + yayımlanmış puan) · GET listesi · POST {slug, threshold} kur/değiştir
     · PATCH {slug, active} kapat/aç · DELETE {slug} sil. Hiçbir yanıt önbelleğe alınmaz. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const H = { "cache-control": "no-store" };
const slug = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/);
const Post = z.object({ slug, threshold: z.union([z.number(), z.string().max(8)]) }).strict();
const Patch = z.object({ slug, active: z.boolean() }).strict();
const Del = z.object({ slug }).strict();

async function who(req: Request) {
  const db = getDb();
  if (!db) return { res: NextResponse.json({ error: "no_database" }, { status: 503, headers: H }) };
  const user = await currentUser(req.headers);
  if (!user) return { res: NextResponse.json({ error: "unauthorized" }, { status: 401, headers: H }) };
  return { db, user };
}
/* tablo henüz yoksa (geçiş uygulanmadan) sayfa bozulmaz: "hazır değil" */
const notReady = () => NextResponse.json({ error: "not_ready" }, { status: 503, headers: H });

type Writer = { res: NextResponse } | { res?: undefined; db: NonNullable<ReturnType<typeof getDb>>; user: { id: string }; raw: unknown };
async function write(req: Request): Promise<Writer> {
  if (!sameOrigin(req)) return { res: NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: H }) };
  const w = await who(req);
  if (w.res) return { res: w.res };
  const minute = Math.floor(Date.now() / 60000);
  if ((await rateStore().incr(`esik:${w.user.id}:m${minute}`, 70)) > 30) return { res: NextResponse.json({ error: "rate_limited" }, { status: 429, headers: H }) };
  let raw: unknown;
  try { raw = await req.json(); } catch { return { res: NextResponse.json({ error: "invalid_json" }, { status: 400, headers: H }) }; }
  return { db: w.db, user: w.user, raw };
}

export async function GET(req: Request) {
  const w = await who(req);
  if ("res" in w) return w.res;
  const s = new URL(req.url).searchParams.get("slug");
  try {
    if (s !== null) {
      if (!slug.safeParse(s).success) return NextResponse.json({ error: "invalid_slug" }, { status: 400, headers: H });
      const r = await getWatch(w.db, w.user.id, s);
      return r.ok ? NextResponse.json(r, { headers: H }) : NextResponse.json({ error: r.error }, { status: 404, headers: H });
    }
    return NextResponse.json({ watches: await listWatches(w.db, w.user.id) }, { headers: H });
  } catch { return notReady(); }
}

export async function POST(req: Request) {
  const w = await write(req);
  if (w.res) return w.res;
  const p = Post.safeParse(w.raw);
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: H });
  const t = parseThreshold(p.data.threshold);
  if (t === null) return NextResponse.json({ error: "invalid_threshold" }, { status: 400, headers: H });
  try {
    const r = await setWatch(w.db, w.user.id, p.data.slug, t);
    return r.ok ? NextResponse.json(r, { headers: H }) : NextResponse.json({ error: r.error }, { status: r.error === "unknown_place" ? 404 : 400, headers: H });
  } catch { return notReady(); }
}

export async function PATCH(req: Request) {
  const w = await write(req);
  if (w.res) return w.res;
  const p = Patch.safeParse(w.raw);
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: H });
  try {
    const r = await setWatchActive(w.db, w.user.id, p.data.slug, p.data.active);
    return r.ok ? NextResponse.json(r, { headers: H }) : NextResponse.json({ error: r.error }, { status: 404, headers: H });
  } catch { return notReady(); }
}

export async function DELETE(req: Request) {
  const w = await write(req);
  if (w.res) return w.res;
  const p = Del.safeParse(w.raw);
  if (!p.success) return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: H });
  try {
    const r = await deleteWatch(w.db, w.user.id, p.data.slug);
    return r.ok ? NextResponse.json(r, { headers: H }) : NextResponse.json({ error: "not_found" }, { status: 404, headers: H });
  } catch { return notReady(); }
}
