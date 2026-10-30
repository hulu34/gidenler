import type { Entity } from "@/lib/types";
import { SCORE_WAITING, fmtPublished } from "@/lib/score/publishedCards";

/* ARAMA MOTORU KURALLARI — saf yardımcılar (veritabanı ve ağ yok).
   · Yalnız sayfada gerçekten bulunan bilgi söylenir ve işaretlenir. Google kaynaklı veri (puan, saat, fotoğraf) buraya girmez;
     kimlik alanları OSM, işletme ya da kaynaklı profilden gelir.
   · Puan yalnız yayımlanmış Gidenler puanıdır; yoksa işaretleme de yoktur. Gidenler'le sahiplik ilişkisi olan mekânda
     puan işaretlenmez: kendi kendini değerlendirme sayılabilir. */

export const SITE = "https://www.gidenler.com";

export interface PublishedScore { score: number | null; reviewCount: number }

const joinTr = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ve ${xs[xs.length - 1]}`);

/** Meta açıklama: yalnız sayfada bulunan alanları sayar. */
export function venueDescription(e: Entity, ps: PublishedScore | null, hasMenu: boolean) {
  const where = [e.subcategory, e.location?.district].filter(Boolean).join(" · ");
  const has = [
    ...(hasMenu ? ["menü"] : []),
    ...(e.address ? ["adres"] : []),
    ...(e.contact?.phone || e.contact?.website ? ["iletişim"] : []),
    ...(e.contact?.openingHours ?? e.hours ? ["çalışma saatleri"] : []),
  ];
  const head = `${e.name}${where ? ` (${where}, İstanbul)` : ""}`;
  const score = ps?.score != null ? `Gidenler puanı ${fmtPublished(ps.score)}/10 (${ps.reviewCount} deneyim).` : SCORE_WAITING;
  return `${head}${has.length ? `: ${joinTr(has)} bilgisi` : ""}. ${score}`;
}

const DAY: Record<string, string> = { Mo: "Monday", Tu: "Tuesday", We: "Wednesday", Th: "Thursday", Fr: "Friday", Sa: "Saturday", Su: "Sunday" };
const ORDER = Object.keys(DAY);
const expandDays = (spec: string) => {
  const out: string[] = [];
  for (const part of spec.split(",")) {
    const [a, b] = part.split("-");
    if (!(a in DAY) || (b !== undefined && !(b in DAY))) return null;
    if (b === undefined) { out.push(a); continue; }
    for (let i = ORDER.indexOf(a); ; i = (i + 1) % 7) { out.push(ORDER[i]); if (ORDER[i] === b) break; }
  }
  return out;
};

/** OSM biçimindeki saatler: yalnız gün ve saati açık, basit biçim çevrilir; emin olunmayan her şeyde tamamı atlanır (null). */
export function openingHoursSpec(raw?: string | null) {
  if (!raw) return null;
  const spec: { "@type": "OpeningHoursSpecification"; dayOfWeek: string[]; opens: string; closes: string }[] = [];
  for (const rule of raw.split(";").map((s) => s.trim()).filter(Boolean)) {
    const m = rule.match(/^([A-Z][a-z](?:[-,][A-Z][a-z])*) (\d{2}:\d{2}-\d{2}:\d{2}(?:, ?\d{2}:\d{2}-\d{2}:\d{2})*)$/);
    const days = m && expandDays(m[1]);
    if (!m || !days) return null;
    for (const t of m[2].split(",")) {
      const [opens, closes] = t.trim().split("-");
      if ([opens, closes].some((x) => x > "23:59")) return null;
      spec.push({ "@type": "OpeningHoursSpecification", dayOfWeek: days.map((d) => DAY[d]), opens, closes });
    }
  }
  return spec.length ? spec : null;
}

const TYPE: Record<string, string> = { "cat.restaurant": "Restaurant", "cat.cafe": "CafeOrCoffeeShop", "cat.bar": "BarOrPub" };

/** Restoran işaretlemesi. Google'ın zorunlu alanı adres: adresi olmayan kayıtta üretilmez. */
export function venueJsonLd(e: Entity, ps: PublishedScore | null, ownershipRelated: boolean) {
  if (!e.isReal || e.isDemo || !e.address || !TYPE[e.categoryId]) return null;
  const geo = e.location?.geo;
  const hours = openingHoursSpec(e.contact?.openingHours ?? e.hours);
  return {
    "@context": "https://schema.org",
    "@type": TYPE[e.categoryId],
    name: e.name,
    url: `${SITE}/mekan/${e.slug}/`,
    address: { "@type": "PostalAddress", streetAddress: e.address, addressLocality: e.location?.district, addressRegion: "İstanbul", addressCountry: "TR" },
    ...(geo ? { geo: { "@type": "GeoCoordinates", latitude: geo.lat, longitude: geo.lng } } : {}),
    ...(e.contact?.phone ? { telephone: e.contact.phone } : {}),
    ...(hours ? { openingHoursSpecification: hours } : {}),
    ...(ps?.score != null && !ownershipRelated
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: ps.score, ratingCount: ps.reviewCount, bestRating: 10, worstRating: 1 } }
      : {}),
  };
}

/** Site haritasına girecek mekân: gerçek ve adresi var. Adressiz kayıt adres tamamlanınca kendiliğinden girer. */
export const inVenueSitemap = (e: Entity) => !!e.isReal && !e.isDemo && !!e.address;
