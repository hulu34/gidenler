import { publishedScores } from "@/lib/live";
import { PublishedProvider } from "@/components/score/PublishedProvider";

export default async function HaritaLayout({ children }: { children: React.ReactNode }) {
  return <PublishedProvider value={await publishedScores()}>{children}</PublishedProvider>;
}
