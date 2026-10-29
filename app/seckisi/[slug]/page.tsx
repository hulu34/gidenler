import { ArticleView, articleMetadata, staticParams } from "../sayfa";

export const dynamicParams = false;
export const generateStaticParams = staticParams;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { return articleMetadata("tr", (await params).slug); }
export default async function SeckiArticlePage({ params }: { params: Promise<{ slug: string }> }) { return <ArticleView lang="tr" slug={(await params).slug} />; }
