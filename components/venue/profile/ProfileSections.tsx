import type { Entity } from "@/lib/types";
import type { PlaceProfile, ProfileField } from "@/lib/profile";
import { trHours } from "@/components/venue/VenueInfo";

/* ──────────────────────────────────────────────────────────────────────────
   GERÇEK RESTORAN PROFİLİ — veritabanındaki kaynaklı içerik (lib/profile): tanıtım, bilgiler, kurallar,
   olanaklar ve resmî menü. Her bilginin yanında kaynağı ve son kontrol tarihi yazılır; kaynakta olmayan
   bilgi gösterilmez (tahmin yok). İçerik değişince bu dosya değil, content/profiles/<slug>.json değişir.
   ────────────────────────────────────────────────────────────────────────── */

const PROVIDER: Record<string, string> = { official_site: "İşletmenin resmî sitesi", business: "İşletmenin sağladığı bilgi", official_social: "İşletmenin resmî hesabı" };
const AMENITY: Record<string, [string, string]> = {
  rezervasyon: ["Rezervasyon alınıyor", "Rezervasyon alınmıyor"],
  evcil_hayvan: ["Evcil hayvan kabul ediliyor", "Evcil hayvan kabul edilmiyor"],
  teras: ["Teras / açık alan var", "Teras yok"], bahce: ["Bahçe var", "Bahçe yok"],
  cocuk: ["Çocuk dostu", "Çocuk alanı yok"], otopark: ["Otopark / vale var", "Otopark yok"],
  alkol: ["Alkollü içecek servis ediliyor", "Alkollü içecek yok"], vegan: ["Vegan seçenek var", "Vegan seçenek yok"],
  engelli: ["Engelli erişimine uygun", "Engelli erişimi yok"], paket: ["Paket servis var", "Paket servis yok"],
};
export const trDate = (d: string) => { const [y, m, g] = d.split("-"); return `${g}.${m}.${y}`; };
const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").split(/[/#?]/)[0];

function Src({ f }: { f: { provider: string; url: string; checkedAt: string } }) {
  return (
    <span className="text-[11px] text-ink-3">
      Kaynak: <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline decoration-line-2 underline-offset-2 hover:text-ink">{PROVIDER[f.provider] ?? f.provider} ({host(f.url)})</a> · son kontrol {trDate(f.checkedAt)}
    </span>
  );
}

/** Profil verisini sayfanın diğer bölümleri (rezervasyon iletişim bağlantıları, veri tamlığı) için kimliğe işler. */
export function withProfile(e: Entity, p: PlaceProfile | null): Entity {
  if (!p) return e;
  return {
    ...e,
    ...(p.address ? { address: p.address.value } : {}),
    ...(p.hours ? { hours: p.hours.value } : {}),
    contact: {
      ...e.contact,
      ...(p.phone ? { phone: p.phone.value } : {}),
      ...(p.website ? { website: p.website.value } : {}),
      ...(p.instagram ? { instagram: p.instagram.value } : {}),
      ...(p.hours ? { openingHours: p.hours.value } : {}),
    },
  };
}

/** Genel bakış: tanıtım + bilgi tablosu + kurallar + olanaklar. Rezervasyon ortaklığından bağımsız gösterilir. */
export function ProfileOverview({ entity, p, googleHours }: { entity: Entity; p: PlaceProfile; googleHours: boolean }) {
  const rows: Array<[string, React.ReactNode, ProfileField | undefined]> = [];
  rows.push(["Tür", entity.subcategory ?? "Restoran", undefined]);
  if (p.address ?? entity.address) rows.push(["Adres", p.address?.value ?? entity.address, p.address]);
  rows.push(["Saatler", p.hours
    ? <span className="tnum">{trHours(p.hours.value)}</span>
    : <span className="text-ink-2">İşletmenin resmî kaynağında yayımlanmıyor.{googleHours ? " Google'daki saatler aşağıdaki Google bölümünde." : ""}</span>, p.hours]);
  if (p.phone) rows.push(["Telefon", <a key="p" href={`tel:${p.phone.value.replace(/[^\d+]/g, "")}`} className="tnum hover:text-accent-ink">{p.phone.value}</a>, p.phone]);
  if (p.website) rows.push(["Web", <a key="w" href={p.website.value} target="_blank" rel="noopener noreferrer" className="break-all hover:text-accent-ink">{host(p.website.value)}</a>, p.website]);
  if (p.instagram) rows.push(["Instagram", <a key="i" href={`https://www.instagram.com/${p.instagram.value}/`} target="_blank" rel="noopener noreferrer" className="hover:text-accent-ink">@{p.instagram.value}</a>, p.instagram]);
  if (p.reservation) rows.push(["Rezervasyon", p.reservation.value, p.reservation]);
  const amen = p.amenities ? Object.entries(p.amenities.items).filter(([k]) => AMENITY[k]).map(([k, v]) => AMENITY[k][v ? 0 : 1]) : [];
  /* aynı kaynak ve gün tek satırda: bilgi tablosunun altında */
  const srcs = [...new Map([p.description, ...rows.map((r) => r[2]), ...p.notes, p.amenities ?? undefined].filter((f): f is NonNullable<typeof f> => !!f).map((f) => [`${f.provider}|${host(f.url)}|${f.checkedAt}`, f])).values()];
  return (
    <div className="flex flex-col gap-5">
      {p.description && <p className="prose-exp max-w-[68ch] text-[16.5px] leading-[1.55]">{p.description.value}</p>}
      <dl className="divide-y divide-line border-y border-line text-[13.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5">
            <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">{k}</dt>
            <dd className="min-w-0 break-words text-ink">{v}</dd>
          </div>
        ))}
        {amen.length > 0 && (
          <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5">
            <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">Olanaklar</dt>
            <dd className="flex flex-wrap gap-1.5">{amen.map((a) => <span key={a} className="rounded-full border border-line-2 px-2.5 py-0.5 text-[12.5px]">{a}</span>)}</dd>
          </div>
        )}
        {p.notes.length > 0 && (
          <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5">
            <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">Bilmen gerekenler</dt>
            <dd><ul className="flex flex-col gap-1">{p.notes.map((n) => <li key={n.value}>{n.value}</li>)}</ul></dd>
          </div>
        )}
      </dl>
      <p className="flex flex-col gap-0.5">
        {srcs.map((f) => <Src key={`${f.url}${f.checkedAt}`} f={f} />)}
        <span className="text-[11px] text-ink-3">Kaynakta yayımlanmayan bilgi gösterilmez. Bilgi değişmiş olabilir; gitmeden önce işletmeyle doğrula.</span>
      </p>
    </div>
  );
}

const tl = (n: number) => `${n.toLocaleString("tr-TR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} ₺`;

/** Resmî menü: işletmenin yayımladığı bölüm ve yemek adları; fiyat yalnız kaynakta varsa. */
export function ProfileMenu({ m }: { m: NonNullable<PlaceProfile["menu"]> }) {
  const n = m.sections.reduce((a, s) => a + s.items.length, 0);
  return (
    <div className="flex flex-col gap-6">
      <p className="border-l-2 border-accent pl-3 text-[13px] leading-snug text-ink-2">
        <strong className="font-semibold text-ink">Resmî menü</strong> · {n} kalem
        {m.validFrom && <> · menüye göre {trDate(m.validFrom)} tarihinden itibaren geçerli</>}
        {" · "}{m.pricesPublished ? <>fiyatlar kaynaktaki gibi; son kontrol {trDate(m.checkedAt)}</> : <>işletme bu menüde fiyat yayımlamıyor</>}.
        <br />
        <span className="text-[11.5px] text-ink-3">
          Kaynak: <a href={m.url} target="_blank" rel="noopener noreferrer" className="underline decoration-line-2 underline-offset-2 hover:text-ink">{PROVIDER[m.provider] ?? m.provider} — menü ({host(m.url)})</a> · son kontrol {trDate(m.checkedAt)}. Günün durumu ve fiyat için işletmeye danış.
        </span>
      </p>
      <div className="gap-x-10 sm:columns-2 [&>section]:mb-6">
        {m.sections.map((s) => (
          <section key={s.title} aria-label={s.title} className="min-w-0 break-inside-avoid">
            <h3 className="border-b border-line pb-1.5 text-[12px] font-bold uppercase tracking-[0.16em]">{s.title}</h3>
            <ul className="mt-1">
              {s.items.map((it) => (
                <li key={it.name + (it.description ?? "")} className="flex items-baseline justify-between gap-3 border-b border-line/60 py-1.5">
                  <span className="min-w-0">
                    <span className="text-[14.5px] font-semibold">{it.name}</span>
                    {it.description && <span className="text-[12.5px] text-ink-3"> · {it.description}</span>}
                  </span>
                  {it.priceTry !== undefined && <span className="tnum shrink-0 text-[13.5px] font-semibold">{tl(it.priceTry)}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
