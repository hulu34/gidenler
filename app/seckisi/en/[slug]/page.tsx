import { ArticleView, articleMetadata, staticParams } from "../../sayfa";

export const dynamicParams = false;
export const generateStaticParams = staticParams;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { return articleMetadata("en", (await params).slug); }
export default async function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) { return <ArticleView lang="en" slug={(await params).slug} />; }
