/* ADAY HAVUZU — OSM öğesinden katalog adayı; mevcut kayıtlarla karşılaştırma ve ret nedenleri.
   Hiçbir alan tahmin edilmez: ad, konum, adres, iletişim ve tür yalnız OSM etiketlerinden ya da resmî siteden gelir. */
import { auditCuisine, type MutfakDenetimi } from "./mutfak";

export const fold = (s: string) => (s ?? "").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const GENERIC_WORDS = /\b(restoran|restaurant|restorant|lokanta|lokantasi|cafe|kafe|kafeterya|bar|pub|bistro|kebap|kebapcisi|kebab|ocakbasi|balik|balikcisi|pide|pidecisi|salonu|evi|steakhouse|steak|house|et|burger|pizza|pizzeria|ve|the|and|coffee|kahve|kahvesi|tatlici|pastanesi|pastane|doner|donercisi|cafe|bakery|firin|firini|sofrasi|mutfagi|kitchen|grill|izgara|cigkofte|kofte|koftecisi|corba|corbacisi|iskembe|nargile|cay|bahcesi)\b/g;
export const coreName = (n: string) => fold(n).replace(GENERIC_WORDS, " ").replace(/\s+/g, " ").trim();
export const GENERIC_NAME = /^(cafe|kafe|restaurant|restoran|bar|pub|bufe|büfe|kahve|lokanta|kebap|döner|doner|pide|cay ocagi|çay ocağı|kantin|yemekhane|cafeteria|kafeterya|nargile)$/i;
export const meters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
export const phoneKey = (p?: string) => { const d = (p ?? "").replace(/\D/g, ""); return d.length >= 10 ? d.slice(-10) : null; };
export const siteKey = (u?: string) => { try { const h = new URL(u!.startsWith("http") ? u! : `https://${u}`).hostname.replace(/^www\./, ""); return SOCIAL.test(h) ? null : h; } catch { return null; } };
export const SOCIAL = /(^|\.)(instagram\.com|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok\.com|linktr\.ee|wa\.me|whatsapp\.com|youtube\.com|google\.[a-z.]+|goo\.gl|g\.page|yemeksepeti\.com|getir\.com|trendyolyemek\.com|tripadvisor\.[a-z.]+|foursquare\.com|zomato\.com|sites\.google\.com|business\.site|maps\.app\.goo\.gl)$/i;

export interface OsmEl { type: "node" | "way" | "relation"; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string>; timestamp?: string; version?: number }
export interface Mevcut { slug: string; ref: string; name: string; district: string; lat?: number; lng?: number; phone?: string; website?: string; address?: string; osmRef?: string; wave?: number }

export interface Aday {
  ref: string; name: string; amenity: string; district: string; lat: number; lng: number;
  street?: string; housenumber?: string; neighbourhood?: string; postcode?: string;
  phone?: string; website?: string; instagram?: string; openingHours?: string; cuisine?: string;
  checkDate?: string; lastEdit?: string; version?: number; wikidata?: string;
  mutfak: MutfakDenetimi;
  ret: string[];          // kesin ret nedenleri (pakete girmez)
  inceleme: string[];     // elle bakılmalı (C'ye düşürür)
  esles?: { slug: string; neden: string; m?: number };
}

const t = (x: Record<string, string>, ...ks: string[]) => { for (const k of ks) if (x[k]?.trim()) return x[k].trim(); return undefined; };
const site = (x: Record<string, string>) => { const v = t(x, "contact:website", "website", "url"); if (!v) return undefined; const s = v.split(";")[0].trim(); return /^https?:\/\//i.test(s) ? s : `https://${s}`; };

/** Tarih etiketleri: check_date / survey:date / check_date:opening_hours (en yenisi). */
export const checkDateOf = (x: Record<string, string>) => ["check_date", "survey:date", "check_date:opening_hours", "survey_date", "source:date"]
  .map((k) => x[k]).filter((v): v is string => !!v && /^\d{4}(-\d{2})?(-\d{2})?$/.test(v.trim())).sort().pop();

export function toCandidate(e: OsmEl, district: string): Aday {
  const x = e.tags;
  const lat = e.lat ?? e.center!.lat, lng = e.lon ?? e.center!.lon;
  const a: Aday = {
    ref: `${e.type}/${e.id}`, name: x.name.trim(), amenity: x.amenity, district, lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6,
    street: t(x, "addr:street"), housenumber: t(x, "addr:housenumber"), neighbourhood: t(x, "addr:neighbourhood", "addr:suburb", "addr:quarter"), postcode: t(x, "addr:postcode"),
    phone: t(x, "contact:phone", "phone", "contact:mobile")?.split(";")[0].trim(), website: site(x), instagram: t(x, "contact:instagram", "instagram"),
    openingHours: t(x, "opening_hours"), cuisine: t(x, "cuisine"), checkDate: checkDateOf(x), lastEdit: e.timestamp?.slice(0, 10), version: e.version, wikidata: t(x, "wikidata"),
    mutfak: auditCuisine({ name: x.name, amenity: x.amenity, cuisine: x.cuisine }), ret: [], inceleme: [],
  };
  if (t(x, "brand", "brand:wikidata", "brand:en")) a.ret.push("zincir_marka_etiketi");
  if (x.disused === "yes" || t(x, "disused:amenity", "was:amenity", "abandoned:amenity") || x.opening_hours === "closed" || x["opening_hours"] === "off") a.ret.push("osm_kapali_isareti");
  if (GENERIC_NAME.test(a.name) || fold(a.name).length < 3) a.ret.push("genel_ad");
  if (/\b(otel|hotel|hastane|universite|okul|yurt|kantin|yemekhane|avm|cami|benzin|petrol|opet|shell|market)\b/.test(fold(a.name)) || x.access === "private") a.ret.push("restoran_disi_ya_da_kapali_alan");
  if (/\b(nargile|hookah|shisha|sisha)\b/.test(fold(a.name)) || x["shisha"] === "yes") a.inceleme.push("nargile_kafe_kapsam_disi_olabilir");
  if (x.amenity === "fast_food" && !a.cuisine) a.inceleme.push("fast_food_turu_belirsiz");
  /* addaki tür kelimesi kaynakla çelişse de kaynak esas alınır (Japon Erdal kuralı); çelişki yalnız not olarak raporlanır */
  return a;
}

/** Küçük yazım farkı (Levenshtein) — "Sultanahamet" / "Sultanahmet", "Kızıl Kayalar" / "Kızılkayalar". */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
const compact = (s: string) => fold(s).replace(/\s+/g, "");
/** Adres anahtarı: sokak kökü + kapı numarasının sayı kısmı ("No:2/K" → "2"). */
export function addressKey(street?: string, house?: string, address?: string): string | null {
  let st = street, no = house;
  if (!st && address) { const m = /^(.+?)\s+No\s*[:.]?\s*([0-9]+)/i.exec(address); if (m) { st = m[1]; no = m[2]; } }
  const n = /\d+/.exec(no ?? "")?.[0];
  if (!st || !n) return null;
  const core = fold(st).replace(/\b(caddesi|cadde|cad|cd|sokagi|sokak|sk|sok|bulvari|bulvar|blv|yolu|yokusu|meydani|mahallesi|mah)\b/g, " ").replace(/\s+/g, "");
  return core.length >= 3 ? `${core}#${n}` : null;
}

/** Mevcut katalogla eşleşme: aynı OSM kaydı → kesin mükerrer; aynı ad 150 m / aynı telefon / aynı site alanı → mükerrer şüphesi. */
export function matchExisting(a: Aday, all: Mevcut[]): Aday["esles"] {
  const byRef = all.find((m) => m.ref === a.ref || m.osmRef === a.ref);
  if (byRef) return { slug: byRef.slug, neden: "ayni_osm_kaydi" };
  const cn = coreName(a.name), fn = fold(a.name);
  for (const m of all) {
    if (typeof m.lat !== "number" || typeof m.lng !== "number") continue;
    const d = meters(a, { lat: m.lat, lng: m.lng });
    if (d > 400) continue;
    const mc = coreName(m.name);
    if (fold(m.name) === fn && d <= 150) return { slug: m.slug, neden: "ayni_ad_150m", m: Math.round(d) };
    if (cn && mc && cn.length >= 4 && (cn === mc || (d <= 80 && (cn.includes(mc) || mc.includes(cn))))) return { slug: m.slug, neden: "benzer_ad_yakin", m: Math.round(d) };
    const ca = compact(a.name), cb = compact(m.name);
    if (d <= 150 && ca.length >= 6 && (ca === cb || editDistance(ca, cb) <= (ca.length >= 12 ? 2 : 1))) return { slug: m.slug, neden: "yazim_farki_yakin", m: Math.round(d) };
    const ka = addressKey(a.street, a.housenumber), kb = addressKey(undefined, undefined, m.address);
    if (ka && kb && ka === kb && d <= 60) return { slug: m.slug, neden: "ayni_bina_adresi", m: Math.round(d) };
  }
  const pk = phoneKey(a.phone); if (pk) { const m = all.find((x) => phoneKey(x.phone) === pk); if (m) return { slug: m.slug, neden: "ayni_telefon" }; }
  const sk = siteKey(a.website); if (sk) { const m = all.find((x) => siteKey(x.website) === sk); if (m) return { slug: m.slug, neden: "ayni_site_alani" }; }
  return undefined;
}
