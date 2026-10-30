import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { articleBySlug, articles, hrefOf, readableArticles, reviewVisible, sections, upcomingEvents, type Lang } from "@/lib/seckisi";
import { SeckiArticle, SeckiHome } from "@/components/seckisi/Seckisi";
import { UI } from "@/components/seckisi/ui";
import { JsonLd } from "@/components/seo/JsonLd";

/* /seckisi/ (TR) ve /seckisi/en/ (EN) aynı sayfa kodunu kullanır; dil yoldan gelir.
   Kontrol bekleyen yazılar yalnız Preview'da; her durumda arama motorlarına kapalı. */

const SITE = "https://www.gidenler.com";
const alternates = (slug?: string) => ({
  canonical: hrefOf("tr", slug),
  languages: { tr: hrefOf("tr", slug), en: hrefOf("en", slug), "x-default": hrefOf("tr", slug) },
});

export function homeMetadata(lang: Lang): Metadata {
  const review = reviewVisible();
  const any = articles(review).length > 0;
  return {
    title: UI.brand[lang],
    description: UI.intro[lang],
    alternates: { ...alternates(), canonical: hrefOf(lang) },
    metadataBase: new URL(SITE),
    /* Yayında yazı yoksa ya da önizlemedeyse dizine eklenmez. */
    ...(review || !any || DEMO_VISIBLE ? { robots: { index: false, follow: false } } : {}),
  };
}

export function HomeView({ lang }: { lang: Lang }) {
  if (DEMO_VISIBLE) notFound();
  const review = reviewVisible();
  const list = articles(review);
  if (!list.length) notFound();
  const events = upcomingEvents();
  return <SeckiHome lang={lang} list={list} groups={sections(list, events)} review={review && list.some((a) => a.status === "kontrol")} />;
}

export const staticParams = () => readableArticles().map((a) => ({ slug: a.slug }));

export function articleMetadata(lang: Lang, slug: string): Metadata {
  const a = articleBySlug(slug);
  if (!a) return {};
  return {
    title: `${a.title[lang]} · ${UI.brand[lang]}`,
    description: a.dek[lang],
    alternates: { ...alternates(a.slug), canonical: hrefOf(lang, a.slug) },
    metadataBase: new URL(SITE),
    ...(a.publishedAt ? { other: { "article:published_time": a.publishedAt, ...(a.updatedAt ? { "article:modified_time": a.updatedAt } : {}) } } : {}),
    ...(a.status !== "yayinda" || reviewVisible() || DEMO_VISIBLE ? { robots: { index: false, follow: false } } : {}),
  };
}

export function ArticleView({ lang, slug }: { lang: Lang; slug: string }) {
  if (DEMO_VISIBLE) notFound();
  const review = reviewVisible();
  const a = articleBySlug(slug, review);
  if (!a) notFound();
  /* "Seçkiden": aynı türden olmayanlar önce, en çok üç. */
  const more = articles(review).filter((x) => x.slug !== a.slug).sort((x, y) => Number(x.kind === a.kind) - Number(y.kind === a.kind)).slice(0, 3);
  return (
    <>
      {a.status === "yayinda" && <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: a.title[lang],
        description: a.dek[lang],
        inLanguage: lang,
        url: `${SITE}${hrefOf(lang, a.slug)}`,
        datePublished: a.publishedAt,
        ...(a.updatedAt ? { dateModified: a.updatedAt } : {}),
        ...(a.cover.state === "var" ? { image: `${SITE}${a.cover.src}` } : {}),
        author: { "@type": "Organization", name: a.editorial.desk[lang] },
        publisher: { "@type": "Organization", name: "Gidenler", url: SITE },
      }} />}
      <SeckiArticle a={a} lang={lang} review={review} more={more} />
    </>
  );
}
