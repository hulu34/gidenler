import Link from "next/link";
import type { PublicReview } from "@/lib/community/reviews";
import type { RatingDimensionDef } from "@/lib/types";
import { ReviewCardActions } from "./ReviewCardActions";

/* GİDENLER DENEYİMLERİ — gerçek kullanıcıların yayınladığı deneyimler. Google yorumlarından TAMAMEN ayrı;
   Google içeriği burada hiç kullanılmaz. Ziyaret doğrulaması henüz yok: her kart "Doğrulanmamış ziyaret" taşır.
   Puan ÜRETİLMEZ: yetersiz deneyimde ortalama ya da yıldız gösterilmez; her kart yalnız yazarın kendi puanını taşır. */

const AYLAR = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];
const monthOf = (d: string) => { const [y, m] = d.split("-"); return `${AYLAR[Number(m) - 1]} ${y}`; };
const DISCLOSURE: Record<string, string> = {
  invited: "İşletmenin davetiyle gitti", gifted: "Ürün ya da hizmet sağlandı", sponsored: "Sponsorlu iş birliği",
  owner_related: "İşletmeyle bağı var · puana girmez", employee: "İşletme çalışanı · puana girmez",
};

export function GidenlerExperiences({ slug, name, reviews, dimensions, showScores }: {
  slug: string; name: string; reviews: PublicReview[]; dimensions: RatingDimensionDef[]; showScores: boolean;
}) {
  const label = Object.fromEntries(dimensions.map((d) => [d.key, d.label]));
  if (!reviews.length) {
    return (
      <p className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-4 text-[13.5px] text-ink-2">
        <span>{name} için henüz Gidenler deneyimi yok. Gittiysen ilk deneyimi sen yaz; puan, yeterli sayıda deneyim birikince oluşur.</span>
        <Link href={`/yaz/${slug}/`} className="font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">İlk deneyimi sen yaz</Link>
      </p>
    );
  }
  return (
    <ol className="flex flex-col" aria-label="Gidenler deneyimleri">
      {reviews.map((r) => (
        <li key={r.id} id={`deneyim-${r.id}`} className="flex flex-col gap-2.5 border-b border-line py-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[15px] font-bold">{r.author}</span>
            <span className="text-[12.5px] text-ink-3">{monthOf(r.visitedOn)}&apos;de gitti{r.visitNo > 1 ? ` · ${r.visitNo}. ziyaret` : ""}</span>
            <span className="rounded-full border border-line-2 px-2 py-px text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-3" title="Ziyaret doğrulaması henüz yok; yazarın kendi beyanı.">Doğrulanmamış ziyaret</span>
            {DISCLOSURE[r.disclosure] && <span className="rounded-full border border-neg/40 px-2 py-px text-[10.5px] font-semibold uppercase tracking-[0.1em] text-neg-ink">{DISCLOSURE[r.disclosure]}</span>}
          </div>
          {showScores && r.overall > 0 && (
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px] text-ink-2">
              <span><b className="tnum text-[17px] text-ink">{r.overall}</b><span className="text-ink-3">/10 genel</span></span>
              {Object.entries(r.ratings).filter(([k]) => label[k]).map(([k, v]) => (
                <span key={k} className="tnum">{label[k]} <b className="text-ink">{v}</b></span>
              ))}
            </p>
          )}
          <p className="prose-exp whitespace-pre-line text-[16px] leading-[1.55]">{r.body}</p>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12.5px] text-ink-3">
            <span>
              {r.returnIntent && <>Tekrar gider mi: <b className="font-semibold text-ink-2">{r.returnIntent}</b></>}
              {r.edited && <span> · düzenlendi</span>}
            </span>
            <ReviewCardActions id={r.id} authorId={r.authorId} slug={slug} />
          </div>
        </li>
      ))}
    </ol>
  );
}
