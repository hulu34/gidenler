import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getStorage } from "@/lib/media/storage";
import { assetAccess, staffRole } from "@/lib/media/photoArchive";

/* GET /api/media/file/<anahtar> — Dosya sunumu. public/ yalnız onaylı fotoğraf; pending/ yalnız yükleyen ve personel.
   Özel alan adı varsa onaylı dosyalar CDN'den gelir; yoksa onaylı dosyalar da bu uçtan 10 dakika önbellekle sunulur. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const nf = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });

export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!/^(pending|public)\/[0-9a-f-]{36}\/\d{2,4}\.webp$/.test(key)) return nf();
  const db = getDb(), storage = getStorage();
  if (!db || !storage) return nf();
  const a = await assetAccess(db, key);
  if (!a || !a.known) return nf();
  const isPublic = key.startsWith("public/") && a.status === "approved";
  if (!isPublic) {
    const u = await currentUser(req.headers);
    if (!u) return nf();
    if (u.id !== a.uploaderId && !(await staffRole(db, u.id))) return nf();
  }
  const o = await storage.get(key).catch(() => null);
  if (!o) return nf();
  return new Response(new Uint8Array(o.bytes), { headers: {
    "content-type": "image/webp", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox",
    "cache-control": isPublic ? "public, max-age=600, s-maxage=600" : "private, no-store",
    ...(isPublic ? {} : { "x-robots-tag": "noindex" }),
  } });
}
