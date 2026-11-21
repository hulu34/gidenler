import { publishedScores } from "@/lib/live";
import { PublishedProvider } from "@/components/score/PublishedProvider";
import { GoogleRatingsProvider } from "@/components/google/GoogleRatings";
import { googleRatingMap } from "@/lib/gpuan/read";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { ornekPuanAcik, ornekPuanlar } from "@/lib/harita/ornekPuan";

/* Araç sayfası: bağlantılar izlenir, sayfa dizine girmez. */
export const metadata = { robots: { index: false, follow: !DEMO_VISIBLE } };

export default async function HaritaLayout({ children }: { children: React.ReactNode }) {
  const ornek = ornekPuanAcik();
  const [p, g] = await Promise.all([publishedScores(), ornek ? ornekPuanlar() : googleRatingMap()]);
  return (
    <PublishedProvider value={p}>
      <GoogleRatingsProvider value={g}>
        {ornek && <p data-ornek-puan className="bg-warn-soft px-4 py-2 text-center text-[12.5px] font-semibold text-warn">Yerel önizleme: Google puanları örnek veridir, gerçek değildir.</p>}
        {children}
      </GoogleRatingsProvider>
    </PublishedProvider>
  );
}
