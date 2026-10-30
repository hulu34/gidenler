import type { MetadataRoute } from "next";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { realEntities } from "@/data/real";
import { articles, hrefOf } from "@/lib/seckisi";
import { placeProfile } from "@/lib/live";
import { SITE, inVenueSitemap } from "@/lib/seo";

/* Yeni mekân ve yayımlanan yazı derlemede kendiliğinden girer. Taslak, kontrol bekleyen yazı ve demo girmez.
   Mekânlarda lastmod yok: gerçek içerik güncelleme tarihi tutulmuyor, aktarım tarihi onun yerine geçmez. */
const STATIC = ["/", "/gercek/", "/kesfet/", "/kategori/restoran/", "/kategori/kafe/", "/kategori/bar/", "/nasil-calisir/", "/kurallar/"];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (DEMO_VISIBLE) return [];
  const list = articles(false);
  /* Kimlikte adresi olmayan mekânın adresi kaynaklı profilden gelebilir; sayfa da onu gösterir. */
  const addressed = await Promise.all(realEntities.filter((e) => e.isReal && !e.isDemo).map(async (e) => (inVenueSitemap(e) || (await placeProfile(e.slug))?.address ? e : null)));
  const pair = (slug?: string) => ({ tr: `${SITE}${hrefOf("tr", slug)}`, en: `${SITE}${hrefOf("en", slug)}` });
  return [
    ...STATIC.map((p) => ({ url: `${SITE}${p}` })),
    ...addressed.flatMap((e) => (e ? [{ url: `${SITE}/mekan/${e.slug}/` }] : [])),
    ...(list.length ? (["tr", "en"] as const).map((l) => ({ url: `${SITE}${hrefOf(l)}`, alternates: { languages: pair() } })) : []),
    ...list.flatMap((a) => (["tr", "en"] as const).map((l) => ({
      url: `${SITE}${hrefOf(l, a.slug)}`,
      lastModified: a.updatedAt ?? a.publishedAt ?? undefined,
      alternates: { languages: pair(a.slug) },
    }))),
  ];
}
