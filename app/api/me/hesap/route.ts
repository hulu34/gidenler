import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { accountDeleteEnabled, closeAccount, CLOSE_CONFIRM } from "@/lib/community/account";
import { H, guard, reviewsTag } from "@/lib/community/reviewApi";
import { getStorage } from "@/lib/media/storage";
import { TAG_COVERS, TAG_PHOTOS, scoreTags } from "@/lib/live";

/* GET /api/me/hesap — hesap kapatma açık mı · DELETE /api/me/hesap { confirm: "HESABIMI KAPAT" } — kendi hesabını kapat.
   Kimlik yalnız oturumdan; başka hesabın kimliği gönderilemez. Production'da ACCOUNT_DELETE_ENABLED=1 olmadan 404. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ enabled: accountDeleteEnabled(), confirm: CLOSE_CONFIRM }, { headers: H });
}

export async function DELETE(req: Request) {
  if (!accountDeleteEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404, headers: H });
  const g = await guard(req, { write: true, limit: { key: "acct", max: 3, windowSec: 3600 } });
  if (g instanceof NextResponse) return g;
  let confirm = "";
  try { confirm = String(((await req.json()) as { confirm?: unknown }).confirm ?? ""); } catch { /* boş */ }
  if (confirm !== CLOSE_CONFIRM) return NextResponse.json({ error: "confirm_required", message: `Onay için "${CLOSE_CONFIRM}" yaz.` }, { status: 400, headers: H });
  const r = await closeAccount(g.db, getStorage(), g.user.id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 404, headers: H });
  for (const s of r.places) { revalidateTag(reviewsTag(s)); for (const t of scoreTags(s)) revalidateTag(t); }
  if (r.photos) { revalidateTag(TAG_PHOTOS); revalidateTag(TAG_COVERS); }
  const res = NextResponse.json({ ok: true, reviews: r.reviews, photos: r.photos }, { headers: H });
  for (const n of ["better-auth.session_token", "__Secure-better-auth.session_token"]) res.cookies.set(n, "", { maxAge: 0, path: "/" });
  return res;
}
