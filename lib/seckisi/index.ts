import { RAW_ARTICLES, RAW_EVENTS } from "@/content/seckisi";
import { Article, Event } from "./schema";
import { DEMO_VISIBLE } from "@/data/demoFlag";

export type { Article, Event, Block } from "./schema";
export type Lang = "tr" | "en";

/* ──────────────────────────────────────────────────────────────────────────
   GİDENLER SEÇKİSİ — görünürlük kuralları (tek yer).
     taslak   → hiçbir sayfada, listede, akışta görünmez.
     kontrol  → yalnız Preview/yerel geliştirmede, "kontrol bekliyor" etiketiyle ve noindex.
     yayinda  → herkese açık.
     arsiv    → listelerde yok; adresi bilinen yazı "arşiv" notuyla açılır.
   Geçersiz içerik derlemeyi durdurur (sessizce atlanmaz).
   ────────────────────────────────────────────────────────────────────────── */

const parse = <T>(schema: { parse: (x: unknown) => T }, raw: unknown, name: string): T => {
  try { return schema.parse(raw); }
  catch (e) { throw new Error(`Seçki içeriği geçersiz (${name}): ${e instanceof Error ? e.message : String(e)}`); }
};

export const ALL_ARTICLES: Article[] = RAW_ARTICLES.map((r, i) => parse(Article, r, (r as { slug?: string }).slug ?? `#${i}`));
export const ALL_EVENTS: Event[] = RAW_EVENTS.map((r, i) => parse(Event, r, (r as { id?: string }).id ?? `#${i}`));
{
  const seen = new Set<string>();
  for (const a of ALL_ARTICLES) { if (seen.has(a.slug)) throw new Error(`Seçki: yinelenen slug ${a.slug}`); seen.add(a.slug); }
  if (ALL_ARTICLES.filter((a) => a.featured && a.status === "yayinda").length > 1) throw new Error("Seçki: birden fazla yayındaki öne çıkan hikâye");
}

/** Kontrol bekleyen yazılar yalnız Preview dağıtımında ve yerel geliştirmede görünür. */
export function reviewVisible(env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env) {
  return env.VERCEL_ENV === "preview" || (!env.VERCEL_ENV && env.NODE_ENV === "development");
}

export function listable(a: Article, review = reviewVisible()) {
  return a.status === "yayinda" || (review && a.status === "kontrol");
}
/** Ayrıntı sayfası açılabilir mi (arşiv yalnız daha önce yayımlanmışsa). */
export function readable(a: Article, review = reviewVisible()) {
  return listable(a, review) || (a.status === "arsiv" && !!a.publishedAt);
}

export function articles(review = reviewVisible(), all = ALL_ARTICLES) {
  return all.filter((a) => listable(a, review))
    .sort((x, y) => (y.publishedAt ?? y.preparedAt).localeCompare(x.publishedAt ?? x.preparedAt) || x.slug.localeCompare(y.slug));
}
export function readableArticles(review = reviewVisible(), all = ALL_ARTICLES) {
  return all.filter((a) => readable(a, review));
}
export function articleBySlug(slug: string, review = reviewVisible(), all = ALL_ARTICLES) {
  return all.find((a) => a.slug === slug && readable(a, review)) ?? null;
}

/** Gezinmede "Seçki" bağlantısı: yalnız okunacak en az bir yazı varsa; yatırımcı demosunda hiç yok. */
export function seckiNavVisible(review = reviewVisible()) {
  return !DEMO_VISIBLE && articles(review).length > 0;
}

/** Yaklaşan deneyimler: iptal edilenler ve bitmiş olanlar çıkar; ertelenenler yeni tarihiyle kalır. */
export function upcomingEvents(now = new Date(), all = ALL_EVENTS) {
  return all.filter((e) => e.status !== "iptal" && Date.parse(e.endsAt) > now.getTime())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export type SectionKey = "hikaye" | "puan" | "kesif" | "sefin-masasi" | "deneyimler" | "semt";
/** Bölüm sırası sabittir; içerik yoksa bölüm hiç görünmez (doldurmak için içerik üretilmez). */
export const SECTION_ORDER: SectionKey[] = ["hikaye", "puan", "kesif", "sefin-masasi", "deneyimler", "semt"];

export function sections(list: Article[], events: Event[]) {
  const featured = list.find((a) => a.featured) ?? list.find((a) => a.kind === "hikaye") ?? null;
  const rest = list.filter((a) => a !== featured);
  const byKind = (k: Article["kind"]) => rest.filter((a) => a.kind === k);
  const out: Array<{ key: SectionKey; articles: Article[]; events: Event[] }> = [];
  for (const key of SECTION_ORDER) {
    if (key === "hikaye") { if (featured) out.push({ key, articles: [featured, ...byKind("hikaye")], events: [] }); continue; }
    if (key === "deneyimler") { if (events.length) out.push({ key, articles: [], events }); continue; }
    /* Puan bölümü: yalnız sıralama kaynağı tanımlı yazılar (şema da bunu zorunlu tutar). */
    const arts = key === "puan" ? byKind("puan").filter((a) => a.ranking) : byKind(key);
    if (arts.length) out.push({ key, articles: arts, events: [] });
  }
  return out;
}

export const SECTION_LABEL: Record<SectionKey, Record<Lang, string>> = {
  hikaye: { tr: "Haftanın Hikâyesi", en: "Story of the Week" },
  puan: { tr: "Puanlarda Öne Çıkanlar", en: "Rising in the Scores" },
  kesif: { tr: "Yeni Keşifler", en: "New Finds" },
  "sefin-masasi": { tr: "Şefin Masasında", en: "At the Chef's Table" },
  deneyimler: { tr: "Yaklaşan Deneyimler", en: "Upcoming Experiences" },
  semt: { tr: "Semtin İçinden", en: "Inside the Neighbourhood" },
};

export const KIND_LABEL: Record<Article["kind"], Record<Lang, string>> = {
  hikaye: { tr: "Restoran hikâyesi", en: "Restaurant story" },
  puan: { tr: "Puan hareketi", en: "Score movement" },
  kesif: { tr: "Yeni keşif", en: "New find" },
  "sefin-masasi": { tr: "Tadım menüsü", en: "Tasting menu" },
  semt: { tr: "Semt rehberi", en: "Neighbourhood guide" },
};

export const hrefOf = (lang: Lang, slug?: string) => (lang === "en" ? `/seckisi/en/${slug ? `${slug}/` : ""}` : `/seckisi/${slug ? `${slug}/` : ""}`);

const MONTHS: Record<Lang, string[]> = {
  tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
/** Takvim günü (YYYY-AA-GG) — saat dilimi kayması olmadan. */
export function fmtDay(d: string, lang: Lang) {
  const [y, m, dd] = d.split("-").map(Number);
  return `${dd} ${MONTHS[lang][m - 1]} ${y}`;
}
/** Etkinlik saati İstanbul saatiyle. */
export function fmtStamp(s: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-GB", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", weekday: "long" }).format(new Date(s));
}
