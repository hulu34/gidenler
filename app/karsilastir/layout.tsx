import { DEMO_VISIBLE } from "@/data/demoFlag";
import { PublishedProvider } from "@/components/score/PublishedProvider";
import { GoogleRatingsProvider } from "@/components/google/GoogleRatings";
import { googleRatingMap } from "@/lib/gpuan/read";
import { publishedScores } from "@/lib/live";

/* Araç sayfası: bağlantılar izlenir, sayfa dizine girmez. */
export const metadata = { robots: { index: false, follow: !DEMO_VISIBLE } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [p, g] = await Promise.all([publishedScores(), googleRatingMap()]);
  return <PublishedProvider value={p}><GoogleRatingsProvider value={g}>{children}</GoogleRatingsProvider></PublishedProvider>;
}
