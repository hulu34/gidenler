import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { entities } from "@/data/entities";
import { MediaAdmin } from "./MediaAdmin";

/* YÖNETİM · MEKÂN VİDEOLARI — yönetim ucu (/api/admin/db) ile aynı kural: yalnız dağıtımın kendine özgü,
   Vercel korumalı adresinde açılır; herkese açık alan adlarında (gidenler.com, gidenler.vercel.app) 404. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yönetim · videolar", robots: { index: false, follow: false } };

export default async function Page() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  const allowed = process.env.VERCEL ? !!process.env.VERCEL_URL && host === process.env.VERCEL_URL.toLowerCase() : process.env.DB_ADMIN_LOCAL === "1";
  if (!allowed) notFound();
  const venues = entities.filter((e) => e.isReal).map((e) => ({ slug: e.slug, name: e.name, district: e.location?.district ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return (
    <div className="mx-auto max-w-[900px] px-5 pb-24 pt-8 sm:px-7">
      <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">Mekân videoları</h1>
      <p className="mt-1 max-w-[64ch] text-[13px] text-ink-3">
        YouTube (Shorts dahil), Instagram Reels ve TikTok bağlantısı yapıştır. Yalnız platform, video kimliği ve atıf saklanır;
        video resmî oynatıcıyla sitede oynar. YouTube ve TikTok bağlantıları platformun kendi oEmbed servisiyle doğrulanır.
        Ortam: <b>{process.env.VERCEL_ENV ?? "local"}</b>
      </p>
      <MediaAdmin venues={venues} env={process.env.VERCEL_ENV ?? "local"} />
    </div>
  );
}
