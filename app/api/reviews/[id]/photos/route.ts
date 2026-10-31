import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { H, guard } from "@/lib/community/reviewApi";
import { getStorage } from "@/lib/media/storage";
import { addReviewPhoto, myReviewPhotos, MAX_PER_REVIEW, type UploadError } from "@/lib/media/photoArchive";
import { MAX_BYTES } from "@/lib/media/photoProcess";
import { TAG_PHOTOS } from "@/lib/live";

/* POST /api/reviews/:id/photos — kendi deneyimine fotoğraf ekle. Mekân deneyimden türetilir, istemciden alınmaz.
   GET — kendi deneyiminin fotoğrafları ve durumları. Yüklemek moderasyona düşer; hemen yayımlanmaz. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
type Ctx = { params: Promise<{ id: string }> };
const ID = /^[0-9a-f-]{36}$/;
const MESSAGE: Record<UploadError, string> = {
  empty: "Dosya boş.", too_large: "Dosya çok büyük (en çok 4 MB).", bad_type: "Yalnız JPEG, PNG ya da WebP fotoğraf yüklenebilir.", corrupt: "Dosya bozuk; açılamadı.",
  too_small: "Fotoğraf çok küçük (kısa kenar en az 400 piksel).", not_found: "Deneyim bulunamadı.", not_owner: "Yalnız kendi deneyimine fotoğraf ekleyebilirsin.",
  review_closed: "Bu deneyime fotoğraf eklenemez.", limit: `Bir deneyime en çok ${MAX_PER_REVIEW} fotoğraf eklenebilir.`, duplicate: "Bu fotoğraf bu mekân için zaten yüklenmiş.",
  storage_failed: "Fotoğraf kaydedilemedi; yeniden dene.", rights_required: "Fotoğrafın sana ait olduğunu onaylaman gerekiyor.",
};
const STATUS: Record<UploadError, number> = { empty: 400, too_large: 413, bad_type: 415, corrupt: 422, too_small: 422, not_found: 404, not_owner: 403, review_closed: 409, limit: 409, duplicate: 409, storage_failed: 502, rights_required: 400 };

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "not_found", message: MESSAGE.not_found }, { status: 404, headers: H });
  const g = await guard(req, { write: true, limit: { key: "pup", max: 30, windowSec: 3600 } });
  if (g instanceof NextResponse) return g;
  const storage = getStorage();
  if (!storage) return NextResponse.json({ error: "storage_not_configured", message: "Fotoğraf yükleme şu an kapalı." }, { status: 503, headers: H });
  /* gövde okunmadan önce: bellek korunur */
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: "too_large", message: MESSAGE.too_large }, { status: 413, headers: H });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "empty", message: MESSAGE.empty }, { status: 400, headers: H }); }
  const file = form.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "empty", message: MESSAGE.empty }, { status: 400, headers: H });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large", message: MESSAGE.too_large }, { status: 413, headers: H });
  const r = await addReviewPhoto(g.db, storage, g.user.id, id, Buffer.from(await file.arrayBuffer()), { confirmed: form.get("rights") === "own" });
  if (!r.ok) return NextResponse.json({ error: r.error, message: MESSAGE[r.error] }, { status: STATUS[r.error], headers: H });
  revalidateTag(TAG_PHOTOS);
  return NextResponse.json({ ok: true, id: r.id, status: r.status }, { status: 201, headers: H });
}

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ photos: [] }, { headers: H });
  const g = await guard(req, { write: false });
  if (g instanceof NextResponse) return g;
  if (!getStorage()) return NextResponse.json({ photos: [] }, { headers: H });
  const list = await myReviewPhotos(g.db, g.user.id, id);
  return NextResponse.json({ photos: list.map((p) => ({ id: p.id, status: p.status, rejectReason: p.rejectReason, thumb: p.variants[0]?.key ?? null })) }, { headers: H });
}
