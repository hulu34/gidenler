import Link from "next/link";
import { realEntities } from "@/data/real";
import { GoogleMapsLogo } from "@/components/venue/media/GoogleAttribution";
import { MIN_RANK_REVIEWS, type GRatingMap } from "@/lib/gpuan/read";

/* Google puanına göre sıralı kısa liste (sunucu). Fotoğrafsız büyük kart yok: yalın satır.
   Google puanı 5 üzerinden, kaynak ve son kontrol tarihi görünür; Gidenler puanı değildir. */
const f1 = (x: number) => x.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export function GoogleTopList({ map, n = 10, exclude = new Set<string>(), id = "k-google" }: { map: GRatingMap; n?: number; exclude?: Set<string>; id?: string }) {
  const list = realEntities.filter((e) => map[e.slug] && (map[e.slug].count ?? 0) >= MIN_RANK_REVIEWS && !exclude.has(e.slug) && !/sosyal tesis/i.test(e.name))
    .sort((a, b) => map[b.slug].rating - map[a.slug].rating || (map[b.slug].count ?? 0) - (map[a.slug].count ?? 0) || a.slug.localeCompare(b.slug)).slice(0, n);
  if (!list.length) return null;
  const newest = Object.values(map).reduce((m, g) => (g.checkedAt > m ? g.checkedAt : m), "");
  return (
    <section aria-labelledby={id} data-google-top>
      <div className="kunye"><h2 id={id}>Google&apos;da yüksek puanlılar</h2><span className="text-[12px] text-ink-3">Google puanı · 5 üzerinden</span></div>
      <ol className="mt-2 grid gap-x-8 sm:grid-cols-2">
        {list.map((e, i) => { const g = map[e.slug]; return (
          <li key={e.slug} className="grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-start gap-x-2 border-b border-line py-2.5">
            <span className="tnum pt-[3px] text-[11px] font-bold text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            <Link href={`/mekan/${e.slug}/`} className="group flex min-w-0 flex-col gap-0.5">
              <span className="line-clamp-2 text-[15px] font-semibold leading-[1.25] group-hover:text-accent-ink">{e.name}</span>
              <span className="truncate text-[11px] text-ink-3">{[e.subcategory, e.location?.district].filter(Boolean).join(" · ")}</span>
            </Link>
            <a href={g.mapsUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="flex shrink-0 flex-col items-end gap-0.5 hover:underline" aria-label={`${e.name}: Google puanı ${f1(g.rating)} / 5, Google Haritalar'da aç`}>
              <span className="tnum text-[15px] font-extrabold">★ {f1(g.rating)}<span className="text-[11px] font-semibold text-ink-3">/5</span></span>
              <span className="tnum text-[11px] text-ink-3">{(g.count ?? 0).toLocaleString("tr-TR")} değerlendirme</span>
            </a>
          </li>); })}
      </ol>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug text-ink-3">
        <GoogleMapsLogo />
        <span>Kaynak: Google Maps. Gidenler puanı değildir. En az {MIN_RANK_REVIEWS} Google değerlendirmesi olanlar sıralanır.{newest ? ` Son kontrol ${new Date(newest).toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" })}.` : ""}</span>
      </p>
    </section>
  );
}
