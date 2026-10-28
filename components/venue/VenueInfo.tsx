import type { Entity } from "@/lib/types";
import { fmtBand, priceBandsOf } from "@/lib/venue";

/* OSM opening_hours → okunur Türkçe (yalnızca gün/ibare çevirisi; saatler aynen). */
const DAY: Record<string, string> = { Mo: "Pzt", Tu: "Sal", We: "Çar", Th: "Per", Fr: "Cum", Sa: "Cmt", Su: "Paz" };
export function trHours(h: string): string {
  return h
    .replace(/\bMo-Su\b/g, "Her gün")
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (d) => DAY[d])
    .replace(/\bPH\s+(closed|off)\b/gi, "resmî tatillerde kapalı")
    .replace(/\b(closed|off)\b/gi, "kapalı")
    .replace(/\s*;\s*/g, " · ")
    .replace(/(\d{2}):(\d{2})/g, "$1.$2");
}

/* MEKÂN BİLGİSİ — Tabelog'un "店舗情報" tablosundan: tür, adres, saat, bütçe, iletişim.
   Yalnızca bilinen alanlar; boş satır çizilmez. Gerçek mekânda kaynak satırı eklenir. */
export function VenueInfo({ entity }: { entity: Entity }) {
  const b = priceBandsOf(entity);
  const c = entity.contact;
  const rows: Array<[string, React.ReactNode]> = [];
  rows.push(["Tür", entity.subcategory ?? "—"]);
  if (entity.address) rows.push(["Adres", entity.address]);
  else if (entity.location?.district) rows.push(["Semt", [entity.location.neighborhood, entity.location.district].filter(Boolean).join(", ")]);
  if (entity.hours) rows.push(["Saatler", <span key="h" className="tnum">{entity.isReal ? trHours(entity.hours) : entity.hours}</span>]);
  if (b && (b.lunch || b.dinner)) rows.push(["Bütçe (kişi başı)", (
    <span key="b" className="flex flex-col gap-0.5 tnum">
      {b.lunch && <span><span className="mr-1.5 text-ink-3">Öğle</span>{fmtBand(b.lunch)}</span>}
      {b.dinner && <span><span className="mr-1.5 text-ink-3">Akşam</span>{fmtBand(b.dinner)}</span>}
      {b.basis === "demo" && <span className="text-[11px] text-ink-3">demo kayıt: örnek bütçe</span>}
      {b.basis === "deneyim" && <span className="text-[11px] text-ink-3">gidenlerin beyanlarından</span>}
    </span>
  )]);
  if (c?.phone) rows.push(["Telefon", <a key="p" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="tnum hover:text-accent-ink">{c.phone}</a>]);
  if (c?.website) rows.push(["Web", <a key="w" href={c.website} target="_blank" rel="noopener noreferrer" className="break-all hover:text-accent-ink">{c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>]);
  if (c?.instagram) rows.push(["Instagram", <a key="i" href={`https://www.instagram.com/${c.instagram}/`} target="_blank" rel="noopener noreferrer" className="hover:text-accent-ink">@{c.instagram}</a>]);

  return (
    <div className="flex flex-col">
      <dl className="divide-y divide-line border-y border-line text-[13.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5">
            <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">{k}</dt>
            <dd className="min-w-0 break-words text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {entity.isReal && entity.source && (
        <p className="mt-2 text-[11.5px] leading-snug text-ink-3">
          Kimlik bilgisi: <a href={`https://www.openstreetmap.org/${entity.source.ref}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">© OpenStreetMap katkıcıları</a> (ODbL) · {entity.source.importedAt}. Bilgi değişmiş olabilir; yanlışsa{" "}
          <a href={`https://www.openstreetmap.org/edit?${entity.source.ref.replace("/", "=")}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">kaynakta düzelt</a>.
        </p>
      )}
    </div>
  );
}
