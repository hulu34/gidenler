import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PhotoReview } from "./PhotoReview";

/* YÖNETİM · FOTOĞRAF ADAYLARI — /yonetim/medya ile aynı kural: yalnız dağıtımın kendi korumalı adresinde. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yönetim · fotoğraflar", robots: { index: false, follow: false } };

export default async function Page() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  const allowed = process.env.VERCEL ? !!process.env.VERCEL_URL && host === process.env.VERCEL_URL.toLowerCase() : process.env.DB_ADMIN_LOCAL === "1";
  if (!allowed) notFound();
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-7">
      <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Fotoğraf adayları</h1>
      <p className="mt-1 max-w-[70ch] text-[13px] text-ink-3">
        Görseller kaynak sitesinden önizlenir, kopyalanmaz. Sitede bulunmak yeniden kullanım izni değildir: onay için izin türü ve kanıtı zorunlu.
        Yüz, filigran ve doğru şube burada gözle kontrol edilir. Ortam: <b>{process.env.VERCEL_ENV ?? "local"}</b>
      </p>
      <PhotoReview env={process.env.VERCEL_ENV ?? "local"} />
    </div>
  );
}
