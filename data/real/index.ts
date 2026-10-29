import type { Entity } from "@/lib/types";
import raw from "./venues.json";
import isletme from "./isletme.json";

/* ==========================================================================
   GERÇEK MEKÂNLAR (V8) — kimlik verisi OpenStreetMap'ten (© OpenStreetMap katkıcıları, ODbL).
   Kurallar:
   · Yalnızca kaynakta yayımlanmış kimlik bilgisi: ad, tür, konum, adres, iletişim, açılış saatleri.
   · Puan, trend, yorum, uzman onayı, şikâyet ÜRETİLMEZ. Gidenler puanı gerçek deneyimlerle doğar.
   · Fotoğraf: yalnızca açık lisanslı (Wikimedia Commons) ya da işletme/kullanıcı izniyle.
   · venues.json scripts/import-osm.mjs ile üretilir; elle düzenlenmez.
   · isletme.json: yöneticinin kaynağını kontrol ederek eklediği, OSM'de olmayan mekânlar (kimlik "isletme/<slug>").
     Kaynak: resmî site ya da işletme beyanı (sourceKind + sourceUrl zorunlu). OSM kimliği yalnız gerçekten varsa (osmRef).
     Konum ancak açık bir kaynaktan gelirse yazılır (location); yoksa kayıt adresle açılır, harita noktası "yok" gösterilir.
     Google'dan gelen konum ya da bilgi bu dosyaya yazılmaz.
   · Mükerrer koruma: aynı mekân sonradan OSM aktarımında gelirse YALNIZ doğrulanmış dış kimlikle (osmRef) OSM kopyası
     listeye alınmaz; Gidenler kimliği korunur, OSM ek kimlik olur. Ad/semt/yakınlık benzerliği yalnız inceleme adayıdır.
   ========================================================================== */

/* Açık lisanslı (Commons) kapak fotoğrafları kendi alan adımızdan, WebP boyut adımlarıyla sunulur
   (public/media/commons): ilk ekrandaki en büyük öğe (LCP) üçüncü taraf bağlantısı beklemeden ve küçük iner.
   Atıf, lisans ve kaynak bağlantısı korunur; lisans gereği uyarlama ("boyutlandırıldı/kırpıldı") belirtilir. */
const MEDIA = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/media/commons`;
const LOCAL_COVER = new Set(["ismet-baba-uskudar", "beyti-lokanta-bakirkoy"]);

export interface RealVenueRecord {
  ref: string;            // "node/123" ya da işletme beyanı için "isletme/<slug>"
  slug: string;
  name: string;
  categoryId: "cat.restaurant" | "cat.cafe" | "cat.bar";
  kind: string;           // "Meyhane", "Kahve", "Balık"…
  district: string;
  neighborhood?: string;
  /** OSM kaydında zorunlu; işletme kaydında yalnız location kaynağı varsa */
  lat?: number;
  lng?: number;
  address?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  openingHours?: string;
  cuisine?: string[];
  image?: { src: string; credit: string; license: string; sourceUrl: string };
  importedAt: string;
  /** OSM'deki tür. 1.000 restoran hedefine yalnız "restaurant" sayılır. */
  osmAmenity?: "restaurant" | "cafe" | "bar" | "pub" | "fast_food";
  /** Aktarım dalgası: 0 = Faz 0 (148), 1 = 400, 2 = 700, 3 = 1.000. */
  wave?: number;
  /** yalnız isletme kaydı: kaynak türü ve kontrol edilen sayfa */
  sourceKind?: "official_site" | "business";
  sourceUrl?: string;
  /** yalnız isletme kaydı: lat/lng'nin kaynağı (ör. OSM'deki bina/adres noktası) */
  location?: { provider: "osm"; ref: string; precision: "address" | "building" };
  /** yalnız isletme kaydı: mekânın OSM'de GERÇEKTEN var olan kaydı (sonradan eşleşirse) */
  osmRef?: string;
}

const OSM_REF = /^(node|way|relation)\/\d+$/;
const REF = /^((node|way|relation)\/\d+|isletme\/[a-z0-9-]+)$/;
/** Kimlik kaynağı: OSM ya da işletmenin kendi beyanı. */
export const sourceOf = (r: Pick<RealVenueRecord, "ref">): "osm" | "business" => (r.ref.startsWith("isletme/") ? "business" : "osm");
const CATS = new Set(["cat.restaurant", "cat.cafe", "cat.bar"]);
/** Zorunlu alanlar: ad, konum (lat/lng + semt, İstanbul içinde), kategori, kaynak (OSM ref ya da işletme), slug. */
const inIstanbul = (r: RealVenueRecord) => typeof r.lat === "number" && typeof r.lng === "number" && r.lat >= 40.8 && r.lat <= 41.6 && r.lng >= 27.9 && r.lng <= 29.95;
export function invalidRecord(r: RealVenueRecord): string | null {
  if (!r.name?.trim()) return "name";
  if (r.ref?.startsWith("isletme/")) {
    /* işletme kaydı: kaynak sayfası zorunlu; konum ya hiç yok (adres zorunlu) ya da kaynaklı ve İstanbul içinde */
    if (r.sourceKind !== "official_site" && r.sourceKind !== "business") return "source";
    if (!/^https:\/\/[^\s]+$/.test(r.sourceUrl ?? "")) return "source";
    if (r.ref !== `isletme/${r.slug}`) return "source";
    if (r.osmRef !== undefined && !OSM_REF.test(r.osmRef)) return "source";
    const hasGeo = r.lat !== undefined || r.lng !== undefined;
    if (hasGeo && (!inIstanbul(r) || r.location?.provider !== "osm" || !OSM_REF.test(r.location.ref))) return "location";
    if (!hasGeo && !r.address?.trim()) return "address";
  } else if (!inIstanbul(r)) return "location";
  if (!r.district) return "district";
  if (!CATS.has(r.categoryId)) return "category";
  if (!REF.test(r.ref)) return "source";
  if (!r.slug) return "slug";
  return null;
}
export const isRestaurantTarget = (r: RealVenueRecord) => r.osmAmenity === "restaurant";

/* mükerrer karşılaştırma yardımcıları */
const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const meters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
/** Mükerrer kararı. Yalnız DOĞRULANMIŞ dış kimlik birleştirir: işletme kaydında yöneticinin girdiği osmRef, OSM kaydının
    kendisiyse OSM kopyası listeye alınmaz. Aynı ad + aynı ilçe ya da aynı ad + 150 m tek başına birleştirme nedeni DEĞİLDİR
    (aynı adlı farklı işletme ya da yakın iki şube olabilir): iki kayıt da kalır, çift inceleme adayı olarak raporlanır. */
export function duplicateOfBusiness(o: RealVenueRecord, biz: RealVenueRecord[]): RealVenueRecord | null {
  return biz.find((b) => !!b.osmRef && b.osmRef === o.ref) ?? null;
}
export function reviewCandidate(o: RealVenueRecord, b: RealVenueRecord): "ayni_slug" | "ayni_ad_150m" | "ayni_ad_ayni_ilce" | null {
  if (b.slug === o.slug) return "ayni_slug";
  if (fold(b.name) !== fold(o.name)) return null;
  if (typeof b.lat === "number" && typeof b.lng === "number" && typeof o.lat === "number" && typeof o.lng === "number"
    && meters({ lat: b.lat, lng: b.lng }, { lat: o.lat, lng: o.lng }) <= 150) return "ayni_ad_150m";
  return b.district === o.district ? "ayni_ad_ayni_ilce" : null;
}
export function mergeRealVenues(osm: RealVenueRecord[], biz: RealVenueRecord[]) {
  const dropped = osm.filter((o) => duplicateOfBusiness(o, biz));
  const review: { business: string; osm: string; reason: string }[] = [];
  const kept = osm.filter((o) => !dropped.includes(o)).map((o) => {
    let rec = o;
    for (const b of biz) {
      const why = reviewCandidate(o, b);
      if (!why) continue;
      /* ayrı kayıt korunur; slug çakışıyorsa OSM kaydı kaynağına bağlı ayırt edici slug alır */
      if (why === "ayni_slug") rec = { ...rec, slug: `${o.slug}-${o.ref.replace("/", "-")}` };
      review.push({ business: b.slug, osm: rec.slug, reason: why });
    }
    return rec;
  });
  return { records: [...kept, ...biz], dropped, review };
}
const merged = mergeRealVenues(raw as RealVenueRecord[], isletme as RealVenueRecord[]);
/** İnceleme adayı çiftler (otomatik birleştirilmez). */
export const realVenueReview = merged.review;
export const realVenueRecords = merged.records;

export const realEntities: Entity[] = realVenueRecords.map((r) => ({
  id: `ent.r.${r.slug}`,
  slug: r.slug,
  name: r.name,
  categoryId: r.categoryId,
  isDemo: false,
  isReal: true,
  tier: "B",
  subcategory: r.kind,
  experienceTotal: 0,
  location: { city: "İstanbul", district: r.district, neighborhood: r.neighborhood, geo: typeof r.lat === "number" && typeof r.lng === "number" ? { lat: r.lat, lng: r.lng } : undefined },
  address: r.address,
  hours: r.openingHours,
  tags: r.cuisine,
  source: { provider: sourceOf(r), ref: r.ref, importedAt: r.importedAt },
  contact: { phone: r.phone, website: r.website, instagram: r.instagram, openingHours: r.openingHours },
  reservation: { mode: "contact" },
  business: { claimed: false },
  photos: r.image ? [LOCAL_COVER.has(r.slug)
    ? { src: `${MEDIA}/${r.slug}-kapak-960.webp`, srcSet: [480, 960, 1440].map((w) => `${MEDIA}/${r.slug}-kapak-${w}.webp ${w}w`).join(", "), full: `${MEDIA}/${r.slug}-1440.webp`,
        category: "dis" as const, alt: `${r.name} — dış cephe`, credit: r.image.credit, license: `${r.image.license} · boyutlandırıldı/kırpıldı`, sourceUrl: r.image.sourceUrl, addedBy: "commons" as const }
    : { src: r.image.src, category: "dis" as const, alt: `${r.name} — dış cephe`, credit: r.image.credit, license: r.image.license, sourceUrl: r.image.sourceUrl, addedBy: "commons" as const }] : undefined,
  image: r.image ? { src: LOCAL_COVER.has(r.slug) ? `${MEDIA}/${r.slug}-kapak-480.webp` : r.image.src, alt: r.name, credit: `${r.image.credit} · ${r.image.license}` } : undefined,
}));
