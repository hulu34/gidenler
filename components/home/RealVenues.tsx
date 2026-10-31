import Link from "next/link";
import { realEntities } from "@/data/real";
import { coverOf } from "@/lib/media/cover";
import { VenueCover } from "@/components/venue/VenueCover";
import { liveCovers, publishedScores } from "@/lib/live";
import { fmtPublished } from "@/lib/score/publishedCards";

/* GERÇEK İSTANBUL — yeni eklenen gerçek mekânlar (OSM). Puan yok; ilk deneyimleri bekliyorlar. */
export async function RealVenues({ limit = 12 }: { limit?: number }) {
  const [published, covers] = await Promise.all([publishedScores(), liveCovers()]);
  if (!realEntities.length) return null;
  /* semtler arasında dönüşümlü seçim: tek semt vitrini kaplamasın */
  const byD = new Map<string, typeof realEntities>();
  for (const e of realEntities) { const d = e.location?.district ?? ""; (byD.get(d) ?? byD.set(d, []).get(d)!).push(e); }
  const pick: typeof realEntities = [];
  for (let i = 0; pick.length < limit && i < 40; i++) for (const arr of byD.values()) { if (arr[i] && pick.length < limit) pick.push(arr[i]); }
  /* gerçek kapağı olan mekânlar vitrinde önce: bütün kapaklılar, sonra semtlere dengeli seçim */
  const withCover = realEntities.filter((e) => coverOf(e, covers[e.slug]));
  const rest = pick.filter((e) => !coverOf(e, covers[e.slug])).slice(0, Math.max(0, limit - withCover.length));
  const line = (e: (typeof realEntities)[number]) => published[e.slug]?.score != null
    ? <span className="tnum mt-auto pt-2 text-[13px] font-semibold">Gidenler puanı {fmtPublished(published[e.slug].score!)}/10 · {published[e.slug].reviewCount} deneyim</span>
    : <span className="mt-auto pt-2 text-[12px] text-ink-3">Puan için deneyim bekleniyor</span>;
  return (
    <section aria-labelledby="h-real" className="reveal">
      <div className="kunye">
        <h2 id="h-real">İstanbul&apos;dan mekânlar</h2>
        <Link href="/gercek/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">{realEntities.length} mekânın tümü →</Link>
      </div>
      {withCover.length > 0 && (
        <ul className="-mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {withCover.map((e) => (
            <li key={e.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
              <Link href={`/mekan/${e.slug}/`} className="group flex h-full flex-col gap-1">
                <VenueCover entity={e} sizes="(max-width: 640px) 78vw, 300px" className="mb-1" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{e.subcategory} · {e.location?.district}</span>
                <span className="text-[18px] font-bold leading-tight tracking-[-0.015em] group-hover:text-accent-ink">{e.name}</span>
                {line(e)}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-6 grid border-t border-line sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
        {rest.map((e) => (
          <li key={e.id} className="border-b border-line">
            <Link href={`/mekan/${e.slug}/`} className="group flex min-h-14 items-center justify-between gap-3 py-2">
              <span className="min-w-0"><span className="block truncate text-[16px] font-bold group-hover:text-accent-ink">{e.name}</span><span className="block truncate text-[12px] text-ink-3">{e.subcategory} · {e.location?.district}</span></span>
              {published[e.slug]?.score != null && <span className="tnum shrink-0 text-[15px] font-bold">{fmtPublished(published[e.slug].score!)}</span>}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 max-w-[62ch] text-[14px] leading-snug text-ink-2">Puanı gidenler verir; yeterli deneyim oluşunca burada görünür. <Link href="/ara/?yaz=1" className="font-semibold underline decoration-line-2 underline-offset-4">Gittiğin bir yeri yaz</Link></p>
      <p className="mt-2 text-[11.5px] text-ink-3">Kimlik bilgileri © OpenStreetMap katkıcıları (ODbL).</p>
    </section>
  );
}
