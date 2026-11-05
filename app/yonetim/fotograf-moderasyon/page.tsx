import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { staffRole } from "@/lib/media/photoArchive";
import { PhotoModeration } from "./PhotoModeration";

/* YÖNETİM · FOTOĞRAF MODERASYONU — yetki sunucuda: oturum + staff_roles. Yetkisiz kişi sayfanın varlığını da görmez. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yönetim · fotoğraf moderasyonu", robots: { index: false, follow: false } };

export default async function Page() {
  const db = getDb();
  const u = db ? await currentUser(await headers()) : null;
  if (!db || !u || !(await staffRole(db, u.id).catch(() => null))) notFound();
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-7">
      <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Fotoğraf moderasyonu</h1>
      <p className="mt-1 max-w-[70ch] text-[13px] text-ink-3">Doğru restoran, hak beyanı, yüz ve kişisel veri burada gözle kontrol edilir. Onay kapağı değiştirmez; kapak ayrı seçilir. Her karar denetim kaydına yazılır.</p>
      <PhotoModeration />
    </div>
  );
}
