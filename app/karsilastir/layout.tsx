import { DEMO_VISIBLE } from "@/data/demoFlag";
import { PublishedProvider } from "@/components/score/PublishedProvider";
import { publishedScores } from "@/lib/live";

/* Araç sayfası: bağlantılar izlenir, sayfa dizine girmez. */
export const metadata = { robots: { index: false, follow: !DEMO_VISIBLE } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  return <PublishedProvider value={await publishedScores()}>{children}</PublishedProvider>;
}
