import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { realEntities } from "@/data/real";
import izinli from "@/data/real/izinli-fotograflar.json";
import { staffRole } from "@/lib/media/photoArchive";
import { RegistryEditor, type EditorVenue } from "./RegistryEditor";

/* YÖNETİM · İZİNLİ FOTOĞRAFLAR — yalnız yönetici. Kaynak, yazar, lisans ve hak kaydı dosyadan gelir; burada yalnız kapak ve yayın kararı verilir. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yönetim · izinli fotoğraflar", robots: { index: false, follow: false } };

export default async function Page() {
  const db = getDb();
  const u = db ? await currentUser(await headers()) : null;
  if (!db || !u || (await staffRole(db, u.id).catch(() => null)) !== "admin") notFound();
  const refs = izinli as unknown as Record<string, Array<{ src: string; rightsRef: string }>>;
  const venues: EditorVenue[] = realEntities.filter((e) => e.photos?.length).map((e) => ({
    slug: e.slug, name: e.name, district: e.location?.district ?? "",
    photos: (e.photos ?? []).map((p) => ({ src: p.src, alt: p.alt, credit: p.credit, license: p.license ?? null, sourceUrl: p.sourceUrl ?? null, addedBy: p.addedBy, rightsRef: refs[e.slug]?.find((r) => r.src === p.src)?.rightsRef ?? (p.license ? `Açık lisans: ${p.license}` : null) })),
  }));
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-7">
      <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">İzinli fotoğraflar</h1>
      <p className="mt-1 max-w-[70ch] text-[13px] text-ink-3">Hak kaydı olan fotoğrafların hangi restoranda göründüğü. Yeni dosya ve yeni restoran bağı buradan eklenmez; önce kaynak ve hak denetiminden geçip dosyaya işlenir. Her karar denetim kaydına yazılır.</p>
      <RegistryEditor venues={venues} />
    </div>
  );
}
