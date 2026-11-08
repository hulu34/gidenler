import { headers } from "next/headers";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { staffRole } from "@/lib/media/photoArchive";

/** Korumalı dağıtım adresi (Vercel Authentication arkasında): rapor salt okunur görülebilir; karar yine personel oturumu ister. */
function protectedHost(h: Headers) {
  if (!process.env.VERCEL) return false;
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  return [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].map((x) => (x ?? "").toLowerCase()).filter((x) => x.endsWith(".vercel.app")).includes(host);
}
/** Yönetim sayfası erişimi: personel oturumu ya da korumalı dağıtım (salt okunur). Yetkisizse null → sayfa 404. */
export async function adminAccess() {
  const db = getDb();
  const h = await headers();
  const u = db ? await currentUser(h).catch(() => null) : null;
  const role = db && u ? await staffRole(db, u.id).catch(() => null) : null;
  if (!db || (!role && !protectedHost(h))) return null;
  return { db, role, host: (h.get("x-forwarded-host") ?? h.get("host") ?? "www.gidenler.com").toLowerCase() };
}
