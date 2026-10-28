import type { Entity } from "@/lib/types";
import { RESERVATION_FEES, isPartner } from "@/lib/reservation";
import { nf } from "@/lib/format";

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/* İŞLETME PANELİ · REZERVASYON — örnek bir ayın (simüle) özeti ve ay sonu ücret dökümü.
   Demo işletmede sayılar deterministik örnektir (etiketli); gerçek ortakta rezervasyon kayıtlarından gelir. */
export function BusinessReservations({ entity }: { entity: Entity }) {
  if (!isPartner(entity)) return null;
  const h = hash(entity.id + "rz");
  const lunchGuests = entity.hours && /^(1[7-9]|2\d)/.test(entity.hours) ? 0 : 20 + (h % 60);
  const dinnerGuests = 60 + ((h >> 8) % 140);
  const requests = Math.round((lunchGuests + dinnerGuests) / 2.6) + ((h >> 4) % 9);
  const noShow = 2 + ((h >> 12) % 6);
  const F = RESERVATION_FEES;
  const fee = lunchGuests * F.lunch + dinnerGuests * F.dinner;
  return (
    <section className="mt-11 border-t-2 border-line-strong pt-7" aria-labelledby="h-panel-rz">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="h-panel-rz" className="text-[13px] font-bold uppercase tracking-[0.2em]">Gidenler rezervasyonları · örnek ay (simüle)</h2>
        {entity.isDemo && <span className="text-[11.5px] text-ink-3">demo işletme: örnek sayılar</span>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-5">
        <div><dt className="label">Talep</dt><dd className="tnum text-[24px] font-extrabold">{nf(requests)}</dd></div>
        <div><dt className="label">Öğle · kişi</dt><dd className="tnum text-[24px] font-extrabold">{nf(lunchGuests)}</dd></div>
        <div><dt className="label">Akşam · kişi</dt><dd className="tnum text-[24px] font-extrabold">{nf(dinnerGuests)}</dd></div>
        <div><dt className="label">Gelmeyen</dt><dd className="tnum text-[24px] font-extrabold text-ink-3">{noShow}</dd></div>
        <div><dt className="label">Ay sonu ücret</dt><dd className="tnum text-[24px] font-extrabold text-accent-ink">{nf(fee)} {F.currency}</dd></div>
      </dl>
      <p className="mt-3 text-[12.5px] text-ink-3 tnum">
        {nf(lunchGuests)} × {F.lunch} {F.currency} + {nf(dinnerGuests)} × {F.dinner} {F.currency}. Gelmeyen ve iptal edilen rezervasyonlar ücretlendirilmez; KDV hariç. Ücret puanı ve sıralamayı etkilemez.
      </p>
    </section>
  );
}
