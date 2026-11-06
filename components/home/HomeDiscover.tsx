import Link from "next/link";
import { realEntities } from "@/data/real";
import { CLOSED_CONFIRMED } from "@/lib/closure";
import { coverOf, type LiveCoverMap } from "@/lib/media/cover";
import { VenueCover } from "@/components/venue/VenueCover";
import { liveCovers, publishedScores } from "@/lib/live";
import { fmtPublished } from "@/lib/score/publishedCards";
import type { Entity } from "@/lib/types";

/* ANA SAYFA · KEŞİF — farklı mutfaklardan ve farklı semtlerden gerçek mekânlar. Sıralama ya da "en iyi" iddiası DEĞİLDİR.
   Seçim kuralı (deterministik): yalnız gerçek restoranlar; her tür ve her semt en çok bir kez; kendi izinli kapağı olanlar önce.
   Kurucuyla ilişkili mekân ana sayfa vitrinine alınmaz (tarafsızlık). Bu yalnız vitrin kuralıdır:
   arama ve Sor Gidenler sonuçlarında bu mekâna ayrıcalık ya da ceza uygulanmaz. Görsel yalnız mekânın kendi kapağıdır. */
export const HOME_EXCLUDE = new Set(["japon-erdal-beyoglu"]);
/** Ana sayfa panoları ve vitrinine girmeyenler: vitrin kuralı (HOME_EXCLUDE) + kalıcı kapandığı doğrulananlar. */
export const HOME_SKIP: ReadonlySet<string> = new Set([...HOME_EXCLUDE, ...CLOSED_CONFIRMED]);
const GENERIC = new Set(["Restoran", ""]);

/** Fotoğraflı vitrin: YALNIZ kendi izinli kapağı olan gerçek restoranlar. Önce her tür ve semt bir kez (katı);
    4 karta yetmezse semt tekrarına izin verilir (tür yine tekrarlanmaz). 4'ten az kart çıkarsa vitrin hiç çizilmez:
    fotoğrafsız mekân bu vitrine yazı karosu olarak konmaz (onlar panoda ve semt keşfinde). */
export function pickDiverse(list: Entity[], covers: LiveCoverMap, n = 6, min = 4): Entity[] {
  const pool = list.filter((e) => e.categoryId === "cat.restaurant" && !HOME_SKIP.has(e.slug) && !GENERIC.has(e.subcategory ?? "") && coverOf(e, covers[e.slug]));
  const out: Entity[] = [], kinds = new Set<string>(), districts = new Set<string>();
  for (const strictDistrict of [true, false]) {
    if (!strictDistrict && out.length >= min) break;
    for (const e of pool) {
      if (out.length >= n) break;
      if (out.includes(e)) continue;
      const k = e.subcategory ?? "", d = e.location?.district ?? "";
      if (kinds.has(k) || (strictDistrict && districts.has(d))) continue;
      out.push(e); kinds.add(k); districts.add(d);
    }
  }
  return out.length >= min ? out : [];
}

export async function HomeDiscover() {
  const [published, covers] = await Promise.all([publishedScores(), liveCovers()]);
  const pick = pickDiverse(realEntities, covers);
  if (!pick.length) return null;
  return (
    <section aria-labelledby="h-kesif" className="reveal" data-ana-kesif>
      <div className="kunye">
        <h2 id="h-kesif">Farklı semtlerden, farklı mutfaklardan</h2>
        <Link href="/kesfet/" className="text-[12px] font-semibold text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-ink">Keşfet →</Link>
      </div>
      <p className="mt-2 max-w-[62ch] text-[14px] leading-snug text-ink-3">Editoryal seçim, sıralama ya da reklam değil: kendi fotoğrafı izinli olan mekânlardan her türden bir örnek. Fotoğraf sahipleri karelerde yazılı.</p>
      <ul className="mt-5 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        {pick.map((e) => {
          const p = published[e.slug];
          return (
            <li key={e.id} data-ana-kesif-kart={e.slug}>
              <Link href={`/mekan/${e.slug}/`} className="group flex h-full flex-col gap-1.5">
                <VenueCover entity={e} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 290px" className="mb-1 rounded-[10px]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{e.subcategory} · {e.location?.district}</span>
                <span className="text-[19px] font-bold leading-tight tracking-[-0.015em] group-hover:text-accent-ink">{e.name}</span>
                {p?.score != null
                  ? <span className="tnum text-[13px] font-semibold">Gidenler puanı {fmtPublished(p.score)}/10 · {p.reviewCount} deneyim</span>
                  : <span className="text-[12.5px] text-ink-3">Henüz Gidenler puanı yok</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
