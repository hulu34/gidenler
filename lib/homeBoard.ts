import { unstable_cache } from "next/cache";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLog, googleRatingHistory, menuItems, places, reviews, user } from "@/lib/db/schema";
import { activeEntities, realEntities } from "@/data/real";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { liveCovers, publishedScores } from "@/lib/live";
import { googleRatingMap, MIN_RANK_REVIEWS, TAG_GPUAN, type GRatingMap } from "@/lib/gpuan/read";
import { computeBoards, dayOf, loadSignalRows, SIGNAL_RULES, type Boards } from "@/lib/signals";
import type { RankItem, RankSection } from "@/lib/rankings";
import { placeOf } from "@/lib/rankings";
import { HOME_EXCLUDE, HOME_SKIP, pickDiverse } from "@/components/home/HomeDiscover";
import type { GoogleTheme } from "@/components/home/TopRated";
import { HOME_LIST } from "@/lib/homeConfig";
import { computeHype, googleCategories, googleChanges, type GCategory, type GChanges, type HistRow, type HypeItem } from "@/lib/homeRank";

/* ──────────────────────────────────────────────────────────────────────────
   GERÇEK ANA SAYFA PANOSU — demodaki "board" tasarımı, gerçek veriyle.
   Her kolon yalnız kendi gerçek kaynağını okur; veri yetmezse kolon liste UYDURMAZ, nedenini yazar.
   · Haftanın Popülerleri / Yükselenler → lib/signals (gerçek Gidenler etkileşimi; Google sayısı değil)
   · En Yüksek Puanlılar → yalnız yayımlanmış GİDENLER puanı (10 üzerinden). Google puanı buraya karışmaz.
   · En Çok Konuşulanlar → son 30 günde yayımlanan gerçek deneyim sayısı (test/işletme hesabı hariç)
   · Kaynaklı profiller → kaynağı kayıtlı tanıtım/menü bilgisi olan mekânlar (editoryal keşif; sıralama değil)
   Ana sayfa vitrin kuralı: kurucuyla ilişkili mekân (HOME_EXCLUDE) panoda da öne çıkarılmaz.
   ────────────────────────────────────────────────────────────────────────── */

const BY_SLUG = new Map(realEntities.map((e) => [e.slug, e]));
let GMAP: GRatingMap = {};
const itemOf = (slug: string, signal: string, score: number | null = null, count = 0): RankItem | null => {
  const e = BY_SLUG.get(slug);
  if (!e || HOME_EXCLUDE.has(slug)) return null;
  const g = GMAP[slug];
  return { slug, name: e.name, kind: e.subcategory ?? "Restoran", where: e.location?.district ?? "", place: [e.subcategory, e.location?.district].filter(Boolean).join(" · ") || placeOf(e.location), categoryId: e.categoryId, score, delta: 0, count, reason: signal, signal, google: g ? { rating: g.rating, checkedAt: g.checkedAt } : null };
};
const ok = <T,>(x: T | null): x is T => x !== null;

/* gerçek etkileşim: Popülerler + İlgisi artanlar (computeBoards) ve En Hype (niyet sinyalleri) aynı satırlardan */
const signalBoards = unstable_cache(async (): Promise<(Boards & { hype: HypeItem[]; hypeReason: string | null }) | null> => {
  const db = getDb();
  if (!db || DEMO_VISIBLE) return null;
  try {
    const rows = await loadSignalRows(db), today = dayOf(new Date());
    const real = (s: string) => BY_SLUG.has(s) && !HOME_SKIP.has(s);
    const h = computeHype(rows, today, real);
    return { ...computeBoards(rows, today, real), hype: h.items, hypeReason: h.reason };
  } catch { return null; }
}, ["home-signal-boards-v2"], { revalidate: 600 });

/* Google puanı geçmişi (günlük Excel aktarımlarının değişen değerleri) → yükselen / düşen */
const googleHistory = unstable_cache(async (): Promise<HistRow[]> => {
  const db = getDb();
  if (!db || DEMO_VISIBLE) return [];
  try {
    const rows = await db.select({ slug: googleRatingHistory.slug, rating: googleRatingHistory.rating, checkedAt: googleRatingHistory.checkedAt }).from(googleRatingHistory)
      .where(gte(googleRatingHistory.checkedAt, new Date(Date.now() - 120 * 864e5)));
    return rows.map((r) => ({ slug: r.slug, rating: r.rating, checkedAt: r.checkedAt.toISOString() }));
  } catch { return []; }
}, ["home-google-history-v1"], { revalidate: 3600, tags: [TAG_GPUAN] });

const talked30 = unstable_cache(async (): Promise<Array<{ slug: string; n: number }>> => {
  const db = getDb();
  if (!db || DEMO_VISIBLE) return [];
  try {
    const since = new Date(Date.now() - 30 * 864e5);
    const rows = await db.select({ slug: places.slug, n: sql<number>`count(*)::int` }).from(reviews)
      .innerJoin(places, eq(places.id, reviews.placeId)).innerJoin(user, eq(user.id, reviews.userId))
      .where(and(eq(reviews.status, "published"), eq(user.kind, "user"), gte(reviews.createdAt, since))).groupBy(places.slug);
    return rows.map((r) => ({ slug: r.slug, n: Number(r.n) })).sort((a, b) => b.n - a.n || a.slug.localeCompare(b.slug));
  } catch { return []; }
}, ["home-talked-30-v1"], { revalidate: 600 });

/* kaynaklı profil = yönetimden kaynağıyla uygulanmış restoran profili (profile_apply denetim kaydı); menü kalemi sayısı derinliktir */
const sourcedProfiles = unstable_cache(async (): Promise<Array<{ slug: string; fields: number }>> => {
  const db = getDb();
  if (!db || DEMO_VISIBLE) return [];
  try {
    const applied = await db.selectDistinct({ id: auditLog.refId }).from(auditLog).where(eq(auditLog.action, "profile_apply"));
    const ids = new Set(applied.map((r) => r.id));
    const menu = await db.select({ placeId: menuItems.placeId, n: sql<number>`count(*)::int` }).from(menuItems).groupBy(menuItems.placeId);
    const depth = new Map(menu.map((m) => [m.placeId, Number(m.n)]));
    const rows = await db.select({ id: places.id, slug: places.slug }).from(places);
    return rows.filter((r) => ids.has(r.id)).map((r) => ({ slug: r.slug, fields: depth.get(r.id) ?? 0 }));
  } catch { return []; }
}, ["home-sourced-profiles-v2"], { revalidate: 3600 });

/** Kaynaklı profillerden tür ve semt dengeli, deterministik seçim (sıralama değil). */
function balancedProfiles(list: Array<{ slug: string; fields: number }>, n: number) {
  const sorted = [...list].filter((x) => BY_SLUG.has(x.slug) && !HOME_EXCLUDE.has(x.slug)).sort((a, b) => b.fields - a.fields || a.slug.localeCompare(b.slug));
  const out: string[] = [], kinds = new Set<string>(), ds = new Set<string>();
  for (const strict of [true, false]) for (const x of sorted) {
    if (out.length >= n || out.includes(x.slug)) continue;
    const e = BY_SLUG.get(x.slug)!; const k = e.subcategory ?? "", d = e.location?.district ?? "";
    if (strict && (kinds.has(k) || ds.has(d))) continue;
    out.push(x.slug); kinds.add(k); ds.add(d);
  }
  return out;
}

/* Google sekmesi: Google puanı tablosundan (günlük Excel aktarımı) tür başına sıralama. Sayfa açılışında Google'a
   istek GİTMEZ, kullanıcı sorgu sınırına takılmaz. Google puanı 5 üzerinden; Gidenler puanına katılmaz.
   En az MIN_RANK_REVIEWS değerlendirmesi olan sıralanır; azı ayrı ve sırasız gösterilir. */
const G_THEMES: Array<{ key: string; label: string; re: RegExp }> = [
  { key: "hepsi", label: "Tümü", re: /./ },
  { key: "balik", label: "Balık", re: /^Balık restoranı$/ }, { key: "meyhane", label: "Meyhane", re: /^Meyhane$/ },
  { key: "kebap", label: "Kebap", re: /^Kebapçı \/ Ocakbaşı$/ }, { key: "lokanta", label: "Lokanta", re: /^Lokanta$/ },
  { key: "pide", label: "Pide", re: /^Pideci$/ }, { key: "kahvalti", label: "Kahvaltı", re: /^Kahvaltı$/ },
];
const G_TOP = HOME_LIST.size;
/** shown: ana sayfada (vitrin + pano) zaten görünen mekânlar — Google sekmesinde tekrar edilmez. */
export function googleRankedThemes(map: GRatingMap, shown: Set<string> = new Set()): GoogleTheme[] {
  const item = (e: (typeof realEntities)[number]) => {
    const g = map[e.slug]!;
    return { slug: e.slug, name: e.name, place: [e.subcategory, e.location?.district].filter(Boolean).join(" · "), rating: g.rating, count: g.count, mapsUrl: g.mapsUrl, checkedAt: g.checkedAt };
  };
  return G_THEMES.map((t) => {
    const pool = realEntities.filter((e) => map[e.slug] && !HOME_EXCLUDE.has(e.slug) && !shown.has(e.slug) && !/sosyal tesis/i.test(e.name) && t.re.test(e.subcategory ?? ""));
    const ranked = pool.filter((e) => (map[e.slug]!.count ?? 0) >= MIN_RANK_REVIEWS).map(item).sort((a, b) => b.rating - a.rating || (b.count ?? 0) - (a.count ?? 0) || a.slug.localeCompare(b.slug)).slice(0, G_TOP);
    /* sayısı az ya da görünmeyenler: sıralama izlenimi vermesin diye ADA göre */
    const few = pool.filter((e) => (map[e.slug]!.count ?? 0) < MIN_RANK_REVIEWS).map(item).sort((a, b) => a.name.localeCompare(b.name, "tr")).slice(0, 5);
    return { key: t.key, label: t.label, items: ranked, few, pool: pool.length };
  }).filter((t) => t.items.length + t.few.length >= (t.key === "hepsi" ? 1 : 3));
}

export interface BoardSection extends RankSection { note?: string | null; fallback?: { title: string; items: RankItem[] } | null; tabs?: Array<{ key: string; label: string; items: RankItem[]; note?: string | null; fallback?: { title: string; items: RankItem[] } | null }> }
export interface RealBoard { sections: BoardSection[]; measuredDays: number; googleThemes: GoogleTheme[]; top: GCategory[]; changes: GChanges; googleTotal: number; newest: string | null }

const f1 = (x: number) => x.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dShort = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });

export async function realBoard(): Promise<RealBoard> {
  const [b, scores, talked, profiles, covers, gmap, hist] = await Promise.all([signalBoards(), publishedScores(), talked30(), sourcedProfiles(), liveCovers(), googleRatingMap(), googleHistory()]);
  GMAP = gmap;
  const L = HOME_LIST.size;
  /* En İyiler: aktif (kesin kapalı hariç) mekânlar, doğrulanmış Google puanı, vitrin kuralı */
  const top = googleCategories(activeEntities, gmap, HOME_SKIP);
  const changes = googleChanges(hist, (s) => !!gmap[s] && BY_SLUG.has(s) && !HOME_SKIP.has(s));
  /* aynı mekân aynı ETKİLEŞİM panosunda iki kez görünmez (En İyiler kategori listesi ayrı bir sıralamadır) */
  const used = new Set<string>();
  const once = (xs: RankItem[]) => xs.filter((x) => (used.has(x.slug) ? false : (used.add(x.slug), true)));
  const popular = once((b?.popular ?? []).map((x) => itemOf(x.slug, `${x.visitors} ziyaretçi · 7 gün`, scores[x.slug]?.score ?? null)).filter(ok));
  const hype = once((b?.hype ?? []).map((x) => itemOf(x.slug, [x.saves ? `${x.saves} kaydetme` : "", x.outbound ? `${x.outbound} yol tarifi/arama` : "", x.reviews ? `${x.reviews} deneyim` : ""].filter(Boolean).join(" · "), scores[x.slug]?.score ?? null)).filter(ok));
  const interest = (b?.rising ?? []).map((x) => itemOf(x.slug, `▲ ${x.points - (x.prev ?? 0)} sinyal`, scores[x.slug]?.score ?? null)).filter(ok);
  const talk = once(talked.filter((x) => x.n >= 2).slice(0, L).map((x) => itemOf(x.slug, `${x.n} deneyim · 30 gün`, scores[x.slug]?.score ?? null, x.n)).filter(ok));
  const gUp = changes.rising.map((c) => itemOf(c.slug, `▲ ${f1(c.from)} → ${f1(c.to)} · ${c.days} gün`)).filter(ok).map((x) => ({ ...x, delta: 1 }));
  const gDown = changes.falling.map((c) => itemOf(c.slug, `▼ ${f1(c.from)} → ${f1(c.to)} · ${c.days} gün`)).filter(ok).map((x) => ({ ...x, delta: -1 }));
  /* yedek keşif listeleri — SIRALAMA DEĞİL, açıkça etiketli */
  const profilePick = balancedProfiles(profiles, L).map((s) => itemOf(s, "kaynaklı profil")).filter(ok);
  const perDistrict = (() => { const seen = new Set<string>(); return (top.find((c) => c.key === "hepsi")?.items ?? []).length ? activeEntities.filter((e) => gmap[e.slug] && e.categoryId === "cat.restaurant" && !HOME_SKIP.has(e.slug) && !/sosyal tesis/i.test(e.name))
    .sort((a, c) => gmap[c.slug]!.rating - gmap[a.slug]!.rating || a.name.localeCompare(c.name, "tr"))
    .filter((e) => { const d = e.location?.district ?? ""; if (seen.has(d)) return false; seen.add(d); return true; }).slice(0, L)
    .map((e) => itemOf(e.slug, "semtinin en yüksek Google puanlısı")).filter(ok) : []; })();
  const sourcedHigh = profilePick.filter((x) => (x.google?.rating ?? 0) >= 4.3);
  const readyDay = changes.readyAt ? dShort(changes.readyAt) : null;
  const gNote = `Google puanı değişimi için aynı mekânın en az 7 gün arayla iki doğrulanmış okuması gerekir. Geçmiş ${changes.firstAt ? `${dShort(changes.firstAt)} tarihinde başladı; ilk karşılaştırma ${readyDay}` : "henüz yok"}.`;
  const newest = Object.values(gmap).reduce<string | null>((m, g) => (!m || g.checkedAt > m ? g.checkedAt : m), null);
  return {
    measuredDays: b?.days ?? 0,
    googleThemes: googleRankedThemes(gmap, new Set(pickDiverse(realEntities, covers).map((e) => e.slug))),
    top, changes, googleTotal: Object.keys(gmap).filter((s) => BY_SLUG.has(s)).length, newest,
    sections: [
      { key: "popular", title: "Haftanın popülerleri", window: "Son 7 gün", hint: "Gidenler'deki gerçek profil ziyareti, kaydetme ve yönlendirmeler; aynı kişinin aynı gün tekrarı tek sayılır.", items: popular, signalKind: "text",
        note: popular.length ? null : b?.reason.popular ?? "Etkileşim ölçümü yeni başladı; yeterli gerçek veri oluşunca liste açılır.",
        fallback: popular.length ? null : { title: "Kaynaklı profiller", items: profilePick } },
      { key: "hype", title: "En hype mekânlar", window: "Niyet · 7 gün", hint: "Kaydetme / gitmek istiyorum, yol tarifi ve arama, yayımlanan deneyim — profil bakışı değil, gitme niyeti. Google'ın toplam değerlendirme sayısı hype değildir.", items: hype, signalKind: "text",
        note: hype.length ? null : b?.hypeReason ?? "Gitme niyeti sinyalleri yeterli olunca liste açılır.",
        fallback: hype.length ? null : { title: "Kaynaklı ve Google'da 4,3+", items: sourcedHigh.length >= 3 ? sourcedHigh : profilePick } },
      { key: "talked", title: "En çok konuşulanlar", window: "Son 30 gün", hint: "Son 30 günde yayımlanan gerçek Gidenler deneyimi sayısı.", items: talk, signalKind: "text",
        note: talk.length ? null : "Son 30 günde iki ya da daha çok deneyim yazılan mekân henüz yok. İlk deneyimi sen yaz." },
      { key: "rising", title: "Yükselenler", window: "Google puanı", hint: "Google puanındaki gerçek değişim (iki doğrulanmış okuma, en az 7 gün arayla). Gidenler ilgisi ayrı sekmede.", items: gUp, signalKind: "trend",
        tabs: [
          { key: "g", label: "Google puanı", items: gUp, note: gUp.length ? null : gNote, fallback: gUp.length ? null : { title: "Her semtin en yüksek Google puanlısı", items: perDistrict } },
          { key: "i", label: "Gidenler ilgisi", items: interest, note: interest.length ? null : b?.reason.rising ?? "İlgi artışı için iki tam haftalık gerçek etkileşim verisi gerekir." },
        ] },
      { key: "falling", title: "Düşenler", window: "Google puanı", hint: "Google puanındaki gerçek düşüş (iki doğrulanmış okuma, en az 7 gün arayla).", items: gDown, signalKind: "trend",
        note: gDown.length ? null : gNote },
    ],
  };
}
