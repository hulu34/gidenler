import Link from "next/link";
import type { Entity } from "@/lib/types";
import { areaKindRank, g100Rank, G100 } from "@/lib/venue";
import { PlaceStatusButtons } from "./PlaceStatusButtons";
import { CONFIDENCE_TEXT, SCORE_WAITING, fmtPublished } from "@/lib/score/publishedCards";

/* Tabelog'un "Hyakumeiten" ve bölge sıralaması rozetlerinden: kanıta dayalı, satın alınamaz. */
export function VenueBadges({ entityId }: { entityId: string }) {
  const g = g100Rank(entityId);
  const r = areaKindRank(entityId);
  if (!g && !r) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      {g && (
        <Link href="/gidenler-100/" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-paper hover:bg-accent">
          <span aria-hidden>✦</span> Gidenler 100 · {G100.year} <span className="tnum opacity-70">#{g}</span>
        </Link>
      )}
      {r && (
        <Link href={`/ara/?q=${encodeURIComponent(`${r.district} ${r.kind}`)}`} className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-2.5 py-1 text-[11px] font-semibold text-ink-2 hover:border-ink hover:text-ink">
          {r.district} · {r.kind} <span className="tnum font-bold text-ink">#{r.rank}</span><span className="tnum text-ink-3">/ {r.of}</span>
        </Link>
      )}
    </div>
  );
}

/* Gerçek mekân, henüz deneyim yok: puan uydurulmaz; ilk deneyime çağrı. */
const QUICK = "inline-flex h-11 items-center rounded-[3px] border border-line-2 px-3.5 text-[14px] font-semibold hover:border-ink";

export function RealVenueNotice({ entity, reviewCount = 0, score = null, scoredFrom = null, confidence = null, mapsUrl, hasMenu = false }: { mapsUrl?: string; hasMenu?: boolean; entity: Entity; reviewCount?: number; score?: number | null; scoredFrom?: number | null; confidence?: string | null }) {
  return (
    <div className="flex flex-col gap-3 border-l-2 border-pos pl-4">
      {score !== null ? (
        /* yayımlanmış Gidenler puanı (rating_history) — deneme eşiği bildirimiyle aynı kaynak ve aynı yuvarlama */
        <p className="max-w-[62ch] text-[16px] leading-[1.45]">
          <b>Gidenler puanı <span className="tnum text-[20px] font-extrabold">{fmtPublished(score)}</span><span className="tnum text-[13px] font-semibold text-ink-3">/10</span></b>
          {confidence && CONFIDENCE_TEXT[confidence] && <span className="ml-2 inline-flex items-center border border-line-2 px-1.5 py-px align-middle text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-2">{CONFIDENCE_TEXT[confidence]}</span>}
          {" "}· puana giren <a href="#deneyimler" className="font-semibold underline decoration-line-2 underline-offset-4">{scoredFrom ?? reviewCount} deneyimden</a>; yalnız Gidenler kullanıcılarının kendi deneyimleri.
        </p>
      ) : (
      <p className="max-w-[62ch] text-[15px] leading-[1.45]">
        <b>{SCORE_WAITING}</b>{" "}
        {reviewCount > 0 ? <><a href="#deneyimler" className="font-semibold underline decoration-line-2 underline-offset-4">{reviewCount} deneyim</a> yazıldı.</> : "Henüz deneyim yok; ilkini sen yazabilirsin."}
      </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/yaz/${entity.slug}/`} className="inline-flex h-11 items-center rounded-[3px] bg-accent px-4 text-[14px] font-semibold text-on-accent">Deneyim yaz</Link>
        {hasMenu && <a href="#menu" className={QUICK}>Menü</a>}
        {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={QUICK}>Yol tarifi</a>}
        {entity.contact?.phone && <a href={`tel:${entity.contact.phone.replace(/[^+\d]/g, "")}`} className={QUICK}>Ara</a>}
      </div>
      <PlaceStatusButtons entityId={entity.id} />
    </div>
  );
}
