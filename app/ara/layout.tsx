import { publishedScores } from "@/lib/live";
import { PublishedProvider } from "@/components/score/PublishedProvider";
import { GoogleRatingsProvider } from "@/components/google/GoogleRatings";
import { googleRatingMap } from "@/lib/gpuan/read";
import { DEMO_VISIBLE } from "@/data/demoFlag";

/* Araç sayfası: bağlantılar izlenir, sayfa dizine girmez. */
export const metadata = { robots: { index: false, follow: !DEMO_VISIBLE } };

export default async function AraLayout({ children }: { children: React.ReactNode }) {
  const [p, g] = await Promise.all([publishedScores(), googleRatingMap()]);
  return <PublishedProvider value={p}><GoogleRatingsProvider value={g}>{children}</GoogleRatingsProvider></PublishedProvider>;
}
