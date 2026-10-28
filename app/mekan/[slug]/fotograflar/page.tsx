import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEntity } from "@/data/entities";
import { PhotoGalleryFull } from "@/components/venue/media/PhotoGalleryFull";
import googleList from "@/data/real/google.json";

const GOOGLE_MATCHED = new Set<string>(googleList.slugs);

/* Fotoğraflar sayfası derlemede üretilmez: ilk ziyarette üretilip önbelleğe alınır (dağıtım boyutu büyümez). */
export const dynamicParams = true;
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = getEntity(slug);
  if (!e) return { title: "Bulunamadı" };
  return { title: `${e.name} — fotoğraflar`, robots: e.isDemo ? { index: false, follow: false } : undefined, alternates: { canonical: `/mekan/${e.slug}/fotograflar/` } };
}

export default async function PhotosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = getEntity(slug);
  if (!e) notFound();
  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-7 sm:px-7 sm:pt-10">
      <nav className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-3">
        <Link href={`/mekan/${e.slug}/`} className="hover:text-ink">← {e.name}</Link>
      </nav>
      <h1 className="mt-2 text-[clamp(1.6rem,5vw,2.4rem)] font-extrabold leading-tight tracking-[-0.04em]">{e.name} · Fotoğraflar</h1>
      <p className="mt-1 max-w-[62ch] text-[13px] text-ink-3">Yalnız izinli kaynaklar: Gidenler kullanıcıları, işletme, açık lisanslı görseller ve Google Maps. Her fotoğrafın kaynağı ve sahibi yazılıdır.</p>
      <div className="mt-6"><PhotoGalleryFull slug={e.slug} name={e.name} photos={e.photos} google={!!e.isReal && GOOGLE_MATCHED.has(e.slug)} /></div>
    </div>
  );
}
