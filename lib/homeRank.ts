/* ANA SAYFA V8 · SAF SIRALAMA KATMANI (veritabanısız, test edilir).
   · En İyiler (Google puanına göre): yalnız siteye açık, doğrulanmış Google puanları (googleRatingMap: onaylı/otomatik eşleşme,
     gizlenmemiş, 45 günden yeni, kesin kapalı değil). Değerlendirme sayısı doğrulanamadığı için sıra YALNIZ puandır;
     eşitlikte daha yeni doğrulama, sonra Türkçe ad sırası (deterministik). Sayı varmış gibi davranılmaz.
   · Kategoriler gerçek kayıt türünden (OSM türü + mutfak etiketi) üretilir; uydurma kategori yok. Bir mekân birden çok
     kategoriye girebilir (ör. "kebap" etiketli bir lokanta hem Lokanta hem Kebap); bu, kaydın kendisine dayanır.
   · Yükselenler/Düşenler (Google): yalnız google_rating_history'deki iki gerçek okuma arasındaki fark; en az 7 gün arayla.
   · En Hype: son 7 günün NİYET sinyalleri (kaydet/gitmek istiyorum 3, yönlendirme 2, deneyim 5); profil bakışı sayılmaz.
   Google puanı 5 üzerinden; Gidenler puanına (10 üzerinden) hiçbir yerde dönüştürülmez. */
import { GOOGLE_CHANGE, HOME_LIST, HYPE_RULES } from "@/lib/homeConfig";
import { SIGNAL_WEIGHT, type SignalRow } from "@/lib/signals";

export interface GRating { rating: number; count: number | null; checkedAt: string; mapsUrl: string | null }
export interface RankEntity { slug: string; name: string; categoryId: string; subcategory?: string; tags?: string[]; location?: { district?: string } }
export interface GItem { slug: string; name: string; kind: string; district: string; rating: number; count: number | null; checkedAt: string; mapsUrl: string | null }
export interface GCategory { key: string; label: string; items: GItem[]; pool: number }

const has = (e: RankEntity, ...tags: string[]) => (e.tags ?? []).some((t) => tags.includes(t));
const kindIs = (e: RankEntity, ...kinds: string[]) => kinds.includes(e.subcategory ?? "");
const rest = (e: RankEntity) => e.categoryId === "cat.restaurant";
/** Kategori tanımları — yalnız kaydın kendi türü ve OSM mutfak etiketleri. */
export const G_CATEGORIES: Array<{ key: string; label: string; test: (e: RankEntity) => boolean }> = [
  { key: "hepsi", label: "Tüm restoranlar", test: rest },
  { key: "turk", label: "Türk mutfağı", test: (e) => rest(e) && (has(e, "turkish", "regional", "local") || kindIs(e, "Lokanta", "Mantıcı", "Pideci", "Kebapçı / Ocakbaşı", "Dönerci")) },
  { key: "lokanta", label: "Esnaf lokantaları", test: (e) => rest(e) && (kindIs(e, "Lokanta") || /lokanta|esnaf/i.test(e.name)) },
  { key: "kebap", label: "Kebap ve ocakbaşı", test: (e) => rest(e) && (kindIs(e, "Kebapçı / Ocakbaşı") || has(e, "kebab", "barbecue")) },
  { key: "balik", label: "Balık ve deniz ürünleri", test: (e) => rest(e) && (kindIs(e, "Balık restoranı") || has(e, "seafood", "fish")) },
  { key: "meyhane", label: "Meyhaneler", test: (e) => rest(e) && kindIs(e, "Meyhane") },
  { key: "pide", label: "Pide ve lahmacun", test: (e) => rest(e) && (kindIs(e, "Pideci") || has(e, "pide", "lahmacun")) },
  { key: "italyan", label: "İtalyan ve pizza", test: (e) => rest(e) && (kindIs(e, "Pizza") || has(e, "italian", "pizza", "pasta")) },
  { key: "asya", label: "Japon ve Asya", test: (e) => rest(e) && (kindIs(e, "Sushi / Japon", "Ramen") || has(e, "sushi", "japanese", "chinese", "asian", "indian", "thai", "korean", "ramen")) },
  { key: "kahvalti", label: "Kahvaltı", test: (e) => rest(e) && (kindIs(e, "Kahvaltı") || has(e, "breakfast")) },
  { key: "et", label: "Steak ve et", test: (e) => rest(e) && (kindIs(e, "Steakhouse") || has(e, "steak_house", "steak")) },
  { key: "burger", label: "Burger", test: (e) => rest(e) && (kindIs(e, "Burger") || has(e, "burger")) },
  { key: "doner", label: "Döner", test: (e) => rest(e) && (kindIs(e, "Dönerci") || has(e, "doner")) },
  { key: "tatli", label: "Tatlı", test: (e) => kindIs(e, "Tatlıcı", "Pastane") || has(e, "dessert", "ice_cream", "cake") },
  { key: "kafe", label: "Kafeler", test: (e) => e.categoryId === "cat.cafe" },
  { key: "bar", label: "Barlar", test: (e) => e.categoryId === "cat.bar" },
];
/** Kamu kurumu sosyal tesisleri Google sıralamasına alınmaz (giriş koşullu, herkese açık restoran değil). */
const SOSYAL = /sosyal tesis/i;

export const gItem = (e: RankEntity, g: GRating): GItem => ({ slug: e.slug, name: e.name, kind: e.subcategory ?? "", district: e.location?.district ?? "", rating: g.rating, count: g.count, checkedAt: g.checkedAt, mapsUrl: g.mapsUrl });
/** Deterministik sıra: puan ↓, doğrulama tarihi ↓ (daha yeni), ad (Türkçe) ↑, slug ↑. Değerlendirme sayısı KULLANILMAZ. */
export const byGoogle = (a: GItem, b: GItem) => b.rating - a.rating || b.checkedAt.localeCompare(a.checkedAt) || a.name.localeCompare(b.name, "tr") || a.slug.localeCompare(b.slug);

export function googleCategories(entities: RankEntity[], map: Record<string, GRating>, skip: ReadonlySet<string> = new Set(), n: number = HOME_LIST.size): GCategory[] {
  const rated = entities.filter((e) => map[e.slug] && !skip.has(e.slug) && !SOSYAL.test(e.name));
  return G_CATEGORIES.map((c) => {
    const pool = rated.filter(c.test).map((e) => gItem(e, map[e.slug]!)).sort(byGoogle);
    return { key: c.key, label: c.label, items: pool.slice(0, n), pool: pool.length };
  }).filter((c) => c.pool >= HOME_LIST.minCategory);
}

/* ───── Google puanı değişimi (yükselen / düşen) ───── */
export interface HistRow { slug: string; rating: number; checkedAt: string }
export interface GChange { slug: string; from: number; to: number; delta: number; fromAt: string; toAt: string; days: number }
export interface GChanges { rising: GChange[]; falling: GChange[]; firstAt: string | null; spanDays: number; readyAt: string | null }
const dayMs = 864e5;
export function googleChanges(rows: HistRow[], valid: (slug: string) => boolean, now = new Date(), n: number = HOME_LIST.size): GChanges {
  const since = now.getTime() - GOOGLE_CHANGE.lookbackDays * dayMs;
  const by = new Map<string, HistRow[]>();
  let first: string | null = null;
  for (const r of rows) {
    if (!first || r.checkedAt < first) first = r.checkedAt;
    if (Date.parse(r.checkedAt) < since || !valid(r.slug)) continue;
    by.set(r.slug, [...(by.get(r.slug) ?? []), r]);
  }
  const out: GChange[] = [];
  for (const [slug, xs] of by) {
    xs.sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
    const last = xs[xs.length - 1];
    /* karşılaştırma: son okumadan en az minSpanDays önceki EN YENİ okuma (en uzak değil — "son bir hafta" anlamı korunur) */
    const base = [...xs].reverse().find((x) => Date.parse(last.checkedAt) - Date.parse(x.checkedAt) >= GOOGLE_CHANGE.minSpanDays * dayMs);
    if (!base) continue;
    const delta = Math.round((last.rating - base.rating) * 10) / 10;
    if (Math.abs(delta) < GOOGLE_CHANGE.minDelta) continue;
    out.push({ slug, from: base.rating, to: last.rating, delta, fromAt: base.checkedAt, toAt: last.checkedAt, days: Math.round((Date.parse(last.checkedAt) - Date.parse(base.checkedAt)) / dayMs) });
  }
  const sort = (a: GChange, b: GChange) => Math.abs(b.delta) - Math.abs(a.delta) || b.to - a.to || a.slug.localeCompare(b.slug);
  const spanDays = first ? Math.floor((now.getTime() - Date.parse(first)) / dayMs) : 0;
  return {
    rising: out.filter((x) => x.delta > 0).sort(sort).slice(0, n),
    falling: out.filter((x) => x.delta < 0).sort(sort).slice(0, n),
    firstAt: first, spanDays,
    readyAt: first ? new Date(Date.parse(first) + GOOGLE_CHANGE.minSpanDays * dayMs).toISOString() : null,
  };
}

/* ───── En Hype: gerçek niyet sinyalleri (son 7 gün) ───── */
export interface HypeItem { slug: string; points: number; saves: number; outbound: number; reviews: number }
export function computeHype(rows: SignalRow[], today: string, isReal: (slug: string) => boolean = () => true, n: number = HOME_LIST.size): { items: HypeItem[]; reason: string | null } {
  const d7 = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * dayMs).toISOString().slice(0, 10);
  const m = new Map<string, HypeItem>();
  for (const r of rows) {
    if (r.kind === "view" || r.day < d7 || r.day > today || !isReal(r.slug)) continue;
    const x = m.get(r.slug) ?? { slug: r.slug, points: 0, saves: 0, outbound: 0, reviews: 0 };
    x.points += (SIGNAL_WEIGHT[r.kind] ?? 0) * r.n;
    if (r.kind === "save") x.saves += r.n; else if (r.kind === "outbound") x.outbound += r.n; else if (r.kind === "review") x.reviews += r.n;
    m.set(r.slug, x);
  }
  const kinds = (x: HypeItem) => [x.saves, x.outbound, x.reviews].filter((v) => v > 0).length;
  const all = [...m.values()].filter((x) => x.points >= HYPE_RULES.minPoints && (kinds(x) >= HYPE_RULES.minKinds || x.saves + x.outbound + x.reviews >= 3))
    .sort((a, b) => b.points - a.points || b.reviews - a.reviews || a.slug.localeCompare(b.slug));
  const items = all.length >= HYPE_RULES.minItems ? all.slice(0, n) : [];
  return { items, reason: items.length ? null : `Son 7 günde gerçek kaydetme, yol tarifi ve deneyim sinyali yeterli ${HYPE_RULES.minItems} mekân oluşunca liste açılır.` };
}
