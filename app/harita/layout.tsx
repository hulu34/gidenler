import { publishedScores } from "@/lib/live";
import { PublishedProvider } from "@/components/score/PublishedProvider";
import { DEMO_VISIBLE } from "@/data/demoFlag";

/* Araç sayfası: bağlantılar izlenir, sayfa dizine girmez. */
export const metadata = { robots: { index: false, follow: !DEMO_VISIBLE } };

export default async function HaritaLayout({ children }: { children: React.ReactNode }) {
  return <PublishedProvider value={await publishedScores()}>{children}</PublishedProvider>;
}
